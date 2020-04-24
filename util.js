const debuggerClient = require('./debugger');
const chalk = require('chalk');
const fs = require('fs');
const sfccOptions = require('./dw.js');

async function printLines(offset) {
    const directory = sfccOptions.workspacePath;
    const currentScriptThread = await debuggerClient.getCurrentThreadObject();
    if(currentScriptThread && typeof currentScriptThread === 'object' && Object.keys(currentScriptThread).length > 0) {
        const scriptPath = currentScriptThread.scriptPath;
        const currentLineNumber = currentScriptThread.lineNumber;
        // todo: handle start,end
        const fullPath = directory + scriptPath;
        const lines = fs.readFileSync(fullPath).toString().split('\n');

        const lineOffSet = Number(offset) || 5;
        const start = currentLineNumber - lineOffSet;
        const end = currentLineNumber + lineOffSet;

        for (var i = 0; i < lines.length; i++) {
            if (i < start || i > end) {
                continue;
            } else if (i === (currentScriptThread.lineNumber - 1)) {
                console.log(chalk.yellowBright(`${i+1} ->> ${lines[i]}`));
            } else {
                console.log(`${i+1} ${lines[i]}`);
            }
        }
    } else {
        console.log(chalk.red('debugger not halted anymore'));
    }
}

async function setBreakPoint(data) {
    const dataParts = data.split(',');
    let lineNumber = dataParts[0];
    let scriptPath;
    // if no script path specified, fallback to existing current script in scope
    if (dataParts.length === 1) {
        const currentScriptThread = await debuggerClient.getCurrentThreadObject();
        scriptPath = currentScriptThread.scriptPath;
    } else {
        scriptPath = dataParts[1];
    }
    const response = await debuggerClient.setBreakpoint(lineNumber, scriptPath);
    if (response) {
        console.log(chalk.green(`Breakpoint set on server at line number ${lineNumber}`));
    } else {
        console.log('Unable to set breakpoint on server');
    }
}

module.exports.printLines = printLines;
module.exports.setBreakPoint = setBreakPoint;
