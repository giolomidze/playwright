import fs from 'fs';
import path from 'path';
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';

interface SpecFileRecord {
  specFileName: string;
  datetime: string;
  tests: { title: string; status: string; }[];
}

class MyReporter implements Reporter {
  private runId: string;
  private suite: Suite;
  private specFileRecords: Map<string, SpecFileRecord>;

  constructor() {
    this.runId = `run_${Date.now()}`;
    this.specFileRecords = new Map();
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    console.log(`Starting the run with ${suite.allTests().length} tests`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    console.log(`Starting test ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`Finished test ${test.title}: ${result.status}`);

    const datetime = new Date().toISOString().replace(/[:.]/g, '-');
    const specFileName = path.basename(test.location.file);

    // If this spec file hasn't been recorded yet, create a new record
    if (!this.specFileRecords.has(specFileName)) {
      this.specFileRecords.set(specFileName, {
        specFileName,
        datetime,
        tests: []
      });
    }

    // Add this test result to the corresponding spec file record
    const record = this.specFileRecords.get(specFileName);
    if (record) {
      record.tests.push({ title: test.title, status: result.status });
    }
  }

  onEnd(result: FullResult) {
    console.log(`Finished the run: ${result.status}`);

    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Iterate through the spec file records and write each one to a JSON file
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
