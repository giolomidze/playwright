import path from 'path';
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';
import type { SpecFileRecord } from './reporterTypes';
import { getProjectName, saveJsonSummary, moveArtifacts } from './reporterUtils';
import { getAttachments, processTestFailure } from './reporterHelpers';

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
    this.projectName = getProjectName();
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

    const { errorStack, failureDetails } = processTestFailure(result, test.location.file);
    const attachments = getAttachments(result);

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

    moveArtifacts(path.join(__dirname, 'test-results'), artifactsDir);

    // Save the JSON summary to the main results directory with the project name and runId in the filename
    this.specFileRecords.forEach((record, specFileName) => {
      // Ensure the runId is included in the record before saving
      const enrichedRecord = {
        ...record,
        runId: this.runId, // Include runId in the record
      };
      saveJsonSummary(resultsDir, this.projectName, specFileName, this.runId, record.datetime, enrichedRecord);
    });

    console.log(`Artifacts moved to ${artifactsDir}`);
  }
}

export default MyReporter;
