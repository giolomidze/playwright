import fs from 'fs';
import path from 'path';
import type {
  FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';
import type { SpecFileRecord } from './reporterTypes';
import { getProjectName, saveJsonSummary, moveArtifacts, extractFailedCode } from './reporterUtils';

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
          const failedCode = extractFailedCode(test.location.file, lineNumber);

          if (failedCode) {
            failureDetails = `Failed at line ${lineNumber}, column ${columnNumber}:\n${failedCode}`;
          }
        }
      }
    }

    // Capture attachment filenames with the folder name (retry or initial run)
    result.attachments.forEach(attachment => {
      if (attachment.path) {
        const folderName = path.basename(path.dirname(attachment.path)); // Get the folder name
        const filename = path.basename(attachment.path); // Get the file name
        attachments.push(`${folderName}/${filename}`); // Combine them for clarity
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

    moveArtifacts(path.join(__dirname, 'test-results'), artifactsDir);

    // Save the JSON summary to the main results directory with the project name and runId in the filename
    this.specFileRecords.forEach((record, specFileName) => {
      saveJsonSummary(resultsDir, this.projectName, specFileName, this.runId, record.datetime, record);
    });

    console.log(`Artifacts moved to ${artifactsDir}`);
  }
}

export default MyReporter;
