import fs from 'fs';
import path from 'path';
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';

interface TestRecord {
  specFileName: string;
  status: string;
  datetime: string;
}

class MyReporter implements Reporter {
  private runId: string;
  private suite: Suite;
  private testRecords: Map<string, TestRecord>;

  constructor() {
    this.runId = `run_${Date.now()}`;
    this.testRecords = new Map();
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite; // Store the suite for later use
    console.log(`Starting the run with ${suite.allTests().length} tests`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    console.log(`Starting test ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`Finished test ${test.title}: ${result.status}`);
    
    const datetime = new Date().toISOString().replace(/[:.]/g, '-');
    const specFileName = path.basename(test.location.file);

    // Store the result for each test
    this.testRecords.set(test.id, {
      specFileName,
      status: result.status,
      datetime
    });
  }

  onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status}`);

    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    for (const test of this.suite.allTests()) {
      const record = this.testRecords.get(test.id);
      if (record) {
        const fileName = `${this.runId}_${record.specFileName}_${record.datetime}.json`;
        const outputPath = path.join(resultsDir, fileName);
        const data = {
          runId: this.runId,
          specFileName: record.specFileName,
          status: record.status,
          datetime: record.datetime
        };

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`Saved result to ${outputPath}`);
      }
    }
  }
}

export default MyReporter;
