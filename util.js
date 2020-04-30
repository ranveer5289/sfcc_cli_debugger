const chalk = require('chalk');
const fs = require('fs');
const childprocess = require('child_process');
const sfccOptions = require('./dw.js');
const pathofFilePathJSON = process.cwd() + '/filepath.json';
const pathofLineNumberJSON = process.cwd() + '/linenumber.json';

/**
 * List source code for the current file.
 * The current line in the current frame is indicated by -->
 * @param {string} offset list lines around offset. If not specified 5 lines above/below current are printed
 * @param {Object} client Debugger Client
 */
async function printLines(offset, client) {
    const directory = sfccOptions.generalConfig.workspacePath;
    const currentScriptThread = await client.getCurrentThreadObject();
    if(currentScriptThread && typeof currentScriptThread === 'object' && Object.keys(currentScriptThread).length > 0) {
        const scriptPath = currentScriptThread.scriptPath;
        const currentLineNumber = currentScriptThread.lineNumber;
        // todo: handle start,end
        const fullPath = directory + scriptPath;
        const lines = fs.readFileSync(fullPath).toString().split('\n');

        const lineOffSet = offset ? Number(offset) : 5;
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
    }
}

/**
 * Helper method to set a breakpoint. If no script file is specified assumption is made that
 * breakpoint will be set in current script being executed/halted in debugger
 * @param {Object} data LineNumber & Script path where breakpoint should be added.The absolute path to the script.
 * @param {Object} client Debugger Clientt
 */
async function setBreakPoint(data, client) {
    const dataParts = data.split(',');
    let lineNumber = dataParts[0];
    let scriptPath;
    // if no script path specified, fallback to existing current script in scope
    if (dataParts.length === 1) {
        const currentScriptThread = await client.getCurrentThreadObject();
        scriptPath = currentScriptThread.scriptPath;
    } else {
        scriptPath = dataParts[1];
    }
    await client.setBreakpoint(lineNumber, scriptPath);
}

/**
 * Helper method to interactively search & select the file & add a breakpoint.
 * @param {Object} client Debugger Client
 */
async function setBreakPointInteractive(client) {
    /**
     * This is a hack/workaround for issue - https://github.com/SBoudrias/Inquirer.js/issues/646
     * Inquirer is used for an interactive experience. Inquirer internally also initiates a repl server.
     * If an an Inquirer prompt finishes, it closes the current REPL debugger instance as well.
     */
    childprocess.execSync('/usr/local/bin/node ./prompts/findfile.js', {stdio: 'inherit', shell: true});
    childprocess.execSync('/usr/local/bin/node ./prompts/linenumber.js', {stdio: 'inherit', shell: true});

    /** 
     * childprocess cannot return data for interactive scripts. So, we save the data temporarily in a file.
     * prompts/findfile.js
     * prompts/linenumber.js
    */
    const fullFilePathData = getJSONFile(pathofFilePathJSON); 
    const lineNumberData = getJSONFile(pathofLineNumberJSON);

    if (fullFilePathData && lineNumberData) {
        const fullFilePath = fullFilePathData.path; 
        const lineNumber = lineNumberData.linenumber;

        // SFCC needs absolute path
        const filePath = fullFilePath.replace(sfccOptions.generalConfig.workspacePath, '');
        const brkPtData = [lineNumber,filePath].join(',');
        await setBreakPoint(brkPtData, client);
    } else {
        console.log(chalk.red(`Unable to read linenumber & filepath from ${pathofLineNumberJSON} and ${pathofFilePathJSON}`));
    }
}

/**
 * Read JSON file from local filesystem.
 * requiring a json file had an unwanted caching impact. So, we use fs
 * @param {string} filePath file to read
 * @returns {Object} JSON content
 */
function getJSONFile(filePath) {
    const data = fs.readFileSync(filePath);
    if (data) {
        return JSON.parse(data.toString());
    }
    return null;
}

/** 
 * When prompt is exited perform general cleanup.
*/
function cleanup() {
    if (fs.existsSync(pathofFilePathJSON)) {
        fs.unlinkSync(pathofFilePathJSON);
    }

    if (fs.existsSync(pathofLineNumberJSON)) {
        fs.unlinkSync(pathofLineNumberJSON)
    }
}

module.exports.printLines = printLines;
module.exports.setBreakPoint = setBreakPoint;
module.exports.setBreakPointInteractive = setBreakPointInteractive;
module.exports.cleanup = cleanup;
