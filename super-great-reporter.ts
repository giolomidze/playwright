import fs from 'fs';
import path from 'path';
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';

interface SpecFileRecord {
  specFileName: string;
  datetime: string;
  tests: { 
    title: string; 
    status: string; 
    duration: number; 
    retry: number;
    errorStack?: string;
    failureDetails?: string;
    attachments?: string[];
  }[];
}

class MyReporter implements Reporter {
  private runId: string;
  private suite: Suite;
  private specFileRecords: Map<string, SpecFileRecord>;
  private testStartTimes: Map<string, number>;
  private projectName: string;

  constructor() {
    this.runId = `${Date.now()}`;
    this.specFileRecords = new Map();
    this.testStartTimes = new Map();
    this.projectName = path.basename(process.cwd()); // Get the project directory name
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    console.log(`Starting the run with ${suite.allTests().length} tests in project ${this.projectName}`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    const specFileName = path.basename(test.location.file);
    console.log(`\nRunning spec file: ${specFileName}`);
    console.log(`Starting test: ${test.title} (Retry: ${result.retry})`);
    this.testStartTimes.set(test.id, Date.now());
  }

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`Finished test: ${test.title} (Retry: ${result.retry}): ${result.status}`);

    const startTime = this.testStartTimes.get(test.id);
    const duration = startTime ? Date.now() - startTime : 0;
    const datetime = new Date().toISOString().replace(/[:.]/g, '-');
    const specFileName = path.basename(test.location.file);

    let errorStack: string | undefined;
    let failureDetails: string | undefined;
    let attachments: string[] = [];

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

    // Capture attachment filenames only
    result.attachments.forEach(attachment => {
      if (attachment.path) {
        const filename = path.basename(attachment.path); // Extract only the filename
        attachments.push(filename);
      }
    });

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
        retry: result.retry,
        errorStack,
        failureDetails,
        attachments
      });
    }
  }

  onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status}`);

    const resultsDir = path.join(__dirname, 'results');
    const artifactsDir = path.join(resultsDir, `run_${this.runId}`);

    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    // Move artifacts from the base outputDir to the custom artifactsDir, avoiding the results directory itself
    const baseOutputDir = path.join(__dirname, 'test-results');
    fs.readdirSync(baseOutputDir).forEach(file => {
      const sourcePath = path.join(baseOutputDir, file);
      const destPath = path.join(artifactsDir, file);

      if (sourcePath !== artifactsDir) {
        if (fs.lstatSync(sourcePath).isDirectory()) {
          fs.renameSync(sourcePath, destPath);
        } else if (fs.lstatSync(sourcePath).isFile()) {
          fs.renameSync(sourcePath, destPath);
        }
      }
    });

    // Save the JSON summary to the main results directory with the project name and runId in the filename
    for (const [specFileName, record] of this.specFileRecords.entries()) {
      const fileName = `${this.projectName}_${specFileName}_runid${this.runId}_${record.datetime}.json`;
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

    console.log(`Artifacts moved to ${artifactsDir}`);
  }
}

export default MyReporter;
