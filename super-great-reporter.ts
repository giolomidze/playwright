import fs from 'fs';
import path from 'path';
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestError
} from '@playwright/test/reporter';

interface SpecFileRecord {
  specFileName: string;
  datetime: string;
  tests: { 
    title: string; 
    status: string; 
    duration: number; 
    errorStack?: string;
    failureDetails?: string;
  }[];
}

class MyReporter implements Reporter {
  private runId: string;
  private suite: Suite;
  private specFileRecords: Map<string, SpecFileRecord>;
  private testStartTimes: Map<string, number>;

  constructor() {
    this.runId = `run_${Date.now()}`;
    this.specFileRecords = new Map();
    this.testStartTimes = new Map();
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    console.log(`Starting the run with ${suite.allTests().length} tests`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    console.log(`Starting test ${test.title}`);
    this.testStartTimes.set(test.id, Date.now());
  }

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`Finished test ${test.title}: ${result.status}`);

    const startTime = this.testStartTimes.get(test.id);
    const duration = startTime ? Date.now() - startTime : 0;
    const datetime = new Date().toISOString().replace(/[:.]/g, '-');
    const specFileName = path.basename(test.location.file);

    let errorStack: string | undefined;
    let failureDetails: string | undefined;

    if (result.status === 'failed' && result.error && result.error.stack) {
      errorStack = result.error.stack;

      const failureLocation = errorStack.split('\n').find(line => line.includes(test.location.file));
      if (failureLocation) {
        const match = failureLocation.match(/:(\d+):(\d+)/);
        if (match) {
          const lineNumber = parseInt(match[1], 10);
          const columnNumber = parseInt(match[2], 10);
          const filePath = path.join(test.location.file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const fileLines = fileContent.split('\n');
          const failedCode = fileLines.slice(Math.max(lineNumber - 2, 0), lineNumber + 1).join('\n');

          failureDetails = `Failed at line ${lineNumber}, column ${columnNumber}:\n${failedCode}`;
        }
      }
    }

    if (!this.specFileRecords.has(specFileName)) {
      this.specFileRecords.set(specFileName, {
        specFileName,
        datetime,
        tests: []
      });
    }

    const record = this.specFileRecords.get(specFileName);
    if (record) {
      record.tests.push({ 
        title: test.title, 
        status: result.status, 
        duration,
        errorStack,
        failureDetails
      });
    }
  }

  onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status}`);

    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    for (const [specFileName, record] of this.specFileRecords.entries()) {
      const fileName = `${this.runId}_${specFileName}_${record.datetime}.json`;
      const outputPath = path.join(resultsDir, fileName);
      const data = {
        runId: this.runId,
        specFileName: record.specFileName,
        datetime: record.datetime,
        tests: record.tests
      };

      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`Saved summary result to ${outputPath}`);
    }
  }
}

export default MyReporter;
