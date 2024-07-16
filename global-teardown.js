// global-teardown.js
const fs = require('fs');
const path = require('path');
const { allure } = require('allure-playwright');

module.exports = async () => {
  const testResultsDir = 'test-results/';
  const videosDir = 'test-results/videos/';

  // Ensure the directories exist
  fs.mkdirSync(videosDir, { recursive: true });

  // Move video files to a specific directory and attach them to Allure
  const files = fs.readdirSync(testResultsDir);
  files.forEach(file => {
    if (file.endsWith('.webm')) {
      const oldPath = path.join(testResultsDir, file);
      const newPath = path.join(videosDir, file);
      fs.renameSync(oldPath, newPath);

      allure.attachment('Video', fs.readFileSync(newPath), 'video/webm');
    }
  });
};
