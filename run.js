const spawn = require('cross-spawn');

const commands = [
    "npx playwright test",
    "node prepare-allure-history.js",
    "npx allure generate allure-results --clean -o allure-report",
    "npx allure open allure-report"
];

function runCommand(command, callback) {
    const [cmd, ...args] = command.split(' ');
    const process = spawn(cmd, args, {stdio: 'inherit'});

    process.on('close', (code) => {
        console.log(`Command "${command}" exited with code ${code}`);
        callback();
    });

    process.on('error', (err) => {
        console.error(`Failed to start command "${command}": ${err}`);
        callback();
    });
}

function runCommandsSequentially(commands) {
    if (commands.length === 0) return;

    const command = commands.shift();
    runCommand(command, () => {
        runCommandsSequentially(commands);
    });
}

runCommandsSequentially([...commands]);
