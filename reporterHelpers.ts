import path from 'path';
import type { TestResult } from '@playwright/test/reporter';
import { extractFailedCode } from './reporterUtils';

export function processTestFailure(result: TestResult, filePath: string) {
  let errorStack: string | undefined;
  let failureDetails: string | undefined;

  if (result.status === 'failed' && result.error && result.error.stack) {
    errorStack = result.error.stack;

    const failureLocation = errorStack.split('\n').find(line => line.includes(filePath));
    if (failureLocation) {
      const match = failureLocation.match(/:(\d+):(\d+)/);
      if (match) {
        const lineNumber = parseInt(match[1], 10);
        const columnNumber = parseInt(match[2], 10);
        const failedCode = extractFailedCode(filePath, lineNumber);

        if (failedCode) {
          failureDetails = `Failed at line ${lineNumber}, column ${columnNumber}:\n${failedCode}`;
        }
      }
    }
  }

  return { errorStack, failureDetails };
}

export function getAttachments(result: TestResult): string[] {
  const attachments: string[] = [];

  result.attachments.forEach(attachment => {
    if (attachment.path) {
      const folderName = path.basename(path.dirname(attachment.path)); // Get the folder name
      const filename = path.basename(attachment.path); // Get the file name
      attachments.push(`${folderName}/${filename}`); // Combine them for clarity
    }
  });

  return attachments;
}
