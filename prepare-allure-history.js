const fs = require('fs-extra');
const path = require('path');

const allureReportHistory = path.join(__dirname, 'allure-report', 'history');
const allureResultsHistory = path.join(__dirname, 'allure-results', 'history');

if (fs.existsSync(allureReportHistory)) {
  fs.ensureDirSync(allureResultsHistory);
  fs.copySync(allureReportHistory, allureResultsHistory);
  console.log('Allure history copied successfully.');
} else {
  console.log('No Allure history to copy.');
}
