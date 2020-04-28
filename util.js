const debuggerClient = require('./debugger');
const chalk = require('chalk');
const fs = require('fs');
const childprocess = require('child_process');
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
                console.log(chalk.yellowBright(`${i+1} --> ${lines[i]}`));
            } else {
                console.log(`${i+1}     ${lines[i]}`);
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

async function setBreakPointInteractive() {
    childprocess.execSync('/usr/local/bin/node ./prompts/findfile.js', {stdio: 'inherit', shell: true});
    childprocess.execSync('/usr/local/bin/node ./prompts/linenumber.js', {stdio: 'inherit', shell: true});

    const pathofFilePathJSON = process.cwd() + '/filepath.json';
    const pathofLineNumberJSON = process.cwd() + '/linenumber.json';

    const fullFilePathData = getJSONFile(pathofFilePathJSON); 
    const lineNumberData = getJSONFile(pathofLineNumberJSON);

    if (fullFilePathData && lineNumberData) {
        const fullFilePath = fullFilePathData.path; 
        const lineNumber = lineNumberData.linenumber

        const filePath = fullFilePath.replace(sfccOptions.workspacePath, '');
        const brkPtData = [lineNumber,filePath].join(',');
        await setBreakPoint(brkPtData);
    } else {
        console.log(chalk.red(`Unable to read linenumber & filepath from ${pathofLineNumberJSON} and ${pathofFilePathJSON}`));
    }
}

async function evalOnSFCCServer(cmd, context, filename, callback) {
    const commandWithoutLineBreaks = cmd.replace(/(\r\n|\n|\r)/gm, "");
    if (commandWithoutLineBreaks) {
        const expressionValue = await debuggerClient.getValueByEval(cmd);
        if (expressionValue && expressionValue.result) {
            callback(null, expressionValue.result);
        } else {
            callback('Unable to evaluate expression', null);
        }
    }
}

function getJSONFile(filePath) {
    const data = fs.readFileSync(filePath);
    if (data) {
        return JSON.parse(data.toString());
    }
    return null;
}

module.exports.printLines = printLines;
module.exports.setBreakPoint = setBreakPoint;
module.exports.setBreakPointInteractive = setBreakPointInteractive;
module.exports.evalOnSFCCServer = evalOnSFCCServer;
