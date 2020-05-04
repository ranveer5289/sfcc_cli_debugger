const chalk = require('chalk');
const fs = require('fs');
const childprocess = require('child_process');
const glob = require('glob');
const path = require('path');
var os = require('os')

const pathofFilePathJSON = path.join(process.cwd() , 'filepath.json');
const pathofLineNumberJSON = path.join(process.cwd() , 'linenumber.json');

/**
 * List source code for the current file.
 * The current line in the current frame is indicated by -->
 * @param {string} offset list lines around offset. If not specified 5 lines above/below current are printed
 * @param {Object} client Debugger Client
 */
async function printLines(offset, client, allFilesOfWorkspaces) {
    const currentScriptThread = await client.getCurrentThreadObject();
    if(currentScriptThread && typeof currentScriptThread === 'object' && Object.keys(currentScriptThread).length > 0) {
        const scriptPath = currentScriptThread.scriptPath;
        const currentLineNumber = currentScriptThread.lineNumber;

        const fullPath = getCompleteFilePath(scriptPath, allFilesOfWorkspaces);
        //TODO : handle file not found
        const lines = fs.readFileSync(fullPath).toString().split(os.EOL);

        const lineOffSet = offset ? Number(offset) : 5;
        const start = currentLineNumber - lineOffSet;
        const end = currentLineNumber + lineOffSet;

        console.log(chalk.green(fullPath));
        for (var i = 0; i < lines.length; i++) {
            if (i < start || i > end) {
                continue;
            } else if (i === (currentLineNumber - 1)) {
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
 * @param {Object} config Configuration file
 * @param {string} configPath Path to Configuration file
 */
async function setBreakPointInteractive(client, config, configPath) {
    if (!client.connected) {
        console.log(chalk.red('Debugger not connected'));
        return;
    }
    /**
     * This is a hack/workaround for issue - https://github.com/SBoudrias/Inquirer.js/issues/646
     * Inquirer is used for an interactive experience. Inquirer internally also initiates a repl server.
     * If an an Inquirer prompt finishes, it closes the current REPL debugger instance as well.
     */

    const findFilePath = path.join(__dirname, 'prompts', 'findfile.js');
    const lineNumberPath = path.join(__dirname, 'prompts', 'linenumber.js');

    childprocess.execSync(`node ${findFilePath} --config ${configPath}`, {stdio: 'inherit', shell: true});
    childprocess.execSync(`node ${lineNumberPath}`, {stdio: 'inherit', shell: true});

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

        let filePath;
        const sep = path.sep;
        if (fullFilePath.indexOf(`${sep}cartridges${sep}`) !== -1) {
            // SFCC needs absolute path
            // plugin_wishlists/(cartridges)/plugin_wishlists/cartridge/controllers/Wishlist.js
            // /plugin_wishlists/cartridge/controllers/Wishlist.js
            filePath = sep + fullFilePath.split(`${sep}cartridges${sep}`)[1];
        } else {
            filePath = fullFilePath.replace(config.rootWorkSpacePath, '');
            if (filePath.substr(0, 1) !== sep) {
                filePath = sep + filePath;
            }
        }
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

function getAllFilesFromWorkspaces(config) {
    const foldersToExclude = config.foldersToExcludeFromSearch;
    const childWorkSpaces = config.childWorkSpaces;

    let allFiles = [];
    for (let i = 0; i < childWorkSpaces.length; i++) {
        const workspace = childWorkSpaces[i];
        // todo make it async
        const filesOfWorkspace = glob.sync(`**${path.sep}*.{js,ds}`, {
            cwd: workspace,
            nosort: true,
            nodir: true
        }).filter(function(f){
            for (let i = 0; i < foldersToExclude.length; i++) {
                if (f.includes(foldersToExclude[i])) {
                    return false;
                }
            }
            return true;
        }).map(function(f) {
            return path.join(workspace, f);
        });

        allFiles = allFiles.concat(filesOfWorkspace);
    }
    return allFiles;
}

function getCompleteFilePath(partialPath, allFilesOfWorkspaces) {
    for (let i = 0; i < allFilesOfWorkspaces.length; i++) {
        const f = allFilesOfWorkspaces[i];
        if (f.includes(partialPath)) {
            return f;
        }
    }
    return partialPath;
}

module.exports.printLines = printLines;
module.exports.setBreakPoint = setBreakPoint;
module.exports.setBreakPointInteractive = setBreakPointInteractive;
module.exports.cleanup = cleanup;
module.exports.getAllFilesFromWorkspaces = getAllFilesFromWorkspaces;
