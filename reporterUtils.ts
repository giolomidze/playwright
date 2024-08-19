import fs from 'fs';
import path from 'path';
import type { SpecFileRecord } from './reporterTypes';

export function getProjectName(): string {
  return path.basename(process.cwd());
}

export function saveJsonSummary(
  resultsDir: string,
  projectName: string,
  specFileName: string,
  runId: string,
  datetime: string,
  data: SpecFileRecord,
  status: string // Status as a parameter
): void {
  const fileName = `${projectName}_${specFileName}_runid${runId}_${datetime}_${status}.json`;
  const outputPath = path.join(resultsDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Saved summary result to ${outputPath}`);
}

export function moveArtifacts(baseOutputDir: string, artifactsDir: string): void {
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

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
}

export function extractFailedCode(filePath: string, lineNumber: number): string | undefined {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileLines = fileContent.split('\n');
    return fileLines.slice(Math.max(lineNumber - 2, 0), lineNumber + 1).join('\n');
  }
  return undefined;
}
