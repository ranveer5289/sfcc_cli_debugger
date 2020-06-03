/* eslint-disable import/no-dynamic-require */
const repl = require('repl');
const chalk = require('chalk');
const path = require('path');
const argv = require('yargs').argv;
const fs = require('fs');

const util = require(path.join(__dirname, 'helpers', 'util'));

const dwConfigPath = argv.dwconfig || path.join('config', 'dw.json');
const configPath = argv.config || path.join('config', 'config.js');

const sfccOptions = require(path.join(__dirname, dwConfigPath));
const config = require(path.join(__dirname, configPath));
const debuggerStateFile = path.join(__dirname, 'tmp', 'state.json');

const debugMode = config.debug || false;
const DebuggerApi = require(path.join(__dirname, 'sfcc', 'debugger'));
const debuggerClient = new DebuggerApi(debugMode, sfccOptions);
const allFilesOfWorkspaces = util.getAllFilesFromWorkspaces(config);
if (allFilesOfWorkspaces && allFilesOfWorkspaces.length > 0) {
    console.log(`Total files indexed ${allFilesOfWorkspaces.length}`);
}

async function evalOnSFCCServer(cmd, context, filename, callback) {
    const commandWithoutLineBreaks = cmd.replace(/(\r\n|\n|\r)/gm, '');
    if (commandWithoutLineBreaks.length > 0) {
        const expressionValue = await debuggerClient.getValueByEval(cmd);
        if (expressionValue && expressionValue.result) {
            callback(null, expressionValue.result);
        } else {
            callback('Unable to evaluate expression', null);
        }
    } else {
        callback();
    }
}

const replServer = repl.start({
    prompt: 'sfcc-cli-debug > ',
    eval: evalOnSFCCServer,
    useColors: true
});

replServer.defineCommand('start', {
    help: 'Attach a Debugger Client',
    async action() {
        this.clearBufferedCommand();
        await debuggerClient.create();
        this.displayPrompt();
    }
});

replServer.defineCommand('stop', {
    help: 'Detach a Debugger Client',
    async action() {
        this.clearBufferedCommand();
        await debuggerClient.delete();
        this.displayPrompt();
    }
});

replServer.defineCommand('b', {
    help: 'Add a breakpoint',
    async action(data) {
        this.clearBufferedCommand();
        await util.setBreakPoint(data, debuggerClient);
        this.displayPrompt();
    }
});

replServer.defineCommand('break', {
    help: 'Alias : Add a breakpoint',
    async action(data) {
        this.clearBufferedCommand();
        await util.setBreakPoint(data, debuggerClient);
        this.displayPrompt();
    }
});

replServer.defineCommand('bi', {
    help: 'Add a breakpoint interactively',
    async action() {
        this.clearBufferedCommand();
        await util.setBreakPointInteractive(debuggerClient, config, configPath);
        this.displayPrompt();
    }
});

replServer.defineCommand('sbr', {
    help: 'Add a breakpoint and resume/continue',
    async action(lineNumber) {
        this.clearBufferedCommand();
        await util.setBreakPoint(lineNumber, debuggerClient);
        // debugger will automatically be moved to new breakpoint location
        const success = await debuggerClient.resume();
        if (success) {
            await util.printLines(null, debuggerClient, allFilesOfWorkspaces);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('tbr', {
    help: 'Add a breakpoint temporarily and resume/continue',
    async action(lineNumber) {
        this.clearBufferedCommand();
        const resp = await util.setBreakPoint(lineNumber, debuggerClient);
        // debugger will automatically be moved to new breakpoint location
        const success = await debuggerClient.resume();
        if (success) {
            await util.printLines(null, debuggerClient, allFilesOfWorkspaces);
            // since this is a temporary breakpoint delete it now but in an async way
            if (resp && resp.length > 0) {
                const brkpID = resp[0].id;
                debuggerClient.deleteBreakpoints(brkpID, true);
            }
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('gb', {
    help: 'Display all breakpoints',
    async action() {
        this.clearBufferedCommand();
        await debuggerClient.getBreakpoints();
        this.displayPrompt();
    }
});

replServer.defineCommand('rb', {
    help: 'remove breakpoint(s)',
    async action(id) {
        this.clearBufferedCommand();
        await debuggerClient.deleteBreakpoints(id);
        this.displayPrompt();
    }
});

replServer.defineCommand('ct', {
    help: 'Get current thread',
    async action() {
        this.clearBufferedCommand();
        const response = await debuggerClient.getCurrentThreadObject();
        if (response) {
            console.table(response);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('v', {
    help: 'Get Variables in scope',
    async action() {
        this.clearBufferedCommand();
        const variables = await debuggerClient.getVariables();
        if (variables) {
            console.table(variables);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('m', {
    help: 'Get members of variables',
    async action(data) {
        this.clearBufferedCommand();
        const dataParts = data.split(',');
        const variableName = dataParts[0];
        const maxCount = dataParts[1];
        const members = await debuggerClient.getMembersOfVariable(variableName, maxCount);
        if (members) {
            console.table(members);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('p', {
    help: 'Evaluate On Server and print expression value',
    async action(expression) {
        this.clearBufferedCommand();
        const expressionValue = await debuggerClient.getValueByEval(expression);
        if (expressionValue) {
            console.log(expressionValue.result);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('sn', {
    help: 'Step Over/Next to next line',
    async action() {
        this.clearBufferedCommand();
        const success = await debuggerClient.stepOver();
        if (success) {
            await util.printLines(null, debuggerClient, allFilesOfWorkspaces);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('si', {
    help: 'Step Into',
    async action() {
        this.clearBufferedCommand();
        const success = await debuggerClient.stepInto();
        if (success) {
            await util.printLines(null, debuggerClient, allFilesOfWorkspaces);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('so', {
    help: 'Step Out',
    async action() {
        this.clearBufferedCommand();
        const success = await debuggerClient.stepOut();
        if (success) {
            await util.printLines(null, debuggerClient, allFilesOfWorkspaces);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('r', {
    help: 'Resume and halt at next breakpoint',
    async action() {
        this.clearBufferedCommand();
        const success = await debuggerClient.resume();
        if (success) {
            await util.printLines(null, debuggerClient, allFilesOfWorkspaces);
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('l', {
    help: 'print source code',
    async action(offset) {
        this.clearBufferedCommand();
        await util.printLines(offset, debuggerClient, allFilesOfWorkspaces);
        this.displayPrompt();
    }
});

replServer.defineCommand('save', {
    help: 'Save debugger state',
    async action() {
        this.clearBufferedCommand();
        if (debuggerClient.connected) {
            const breakpoints = await debuggerClient.getBreakpoints();
            if (breakpoints && breakpoints.length > 0) {
                const breakpointObj = breakpoints.map((brk) => ({
                    script_path: brk.script,
                    line_number: brk.line
                }));

                if (fs.existsSync(debuggerStateFile)) {
                    fs.unlinkSync(debuggerStateFile);
                }

                fs.writeFileSync(debuggerStateFile, JSON.stringify(breakpointObj));
                console.log(chalk.green('Debugger current state successfully saved'));
            }
        } else {
            console.log(chalk.red('Debugger not connected'));
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('restore', {
    help: 'Restore debugger state',
    async action() {
        this.clearBufferedCommand();
        if (debuggerClient.connected) {
            const breakpoints = util.getJSONFile(debuggerStateFile);
            if (breakpoints) {
                await debuggerClient.setBreakpoint(breakpoints);
            } else {
                console.log(chalk.red('No saved state found'));
            }
        } else {
            console.log(chalk.red('Debugger not connected'));
        }
        this.displayPrompt();
    }
});

replServer.on('exit', async () => {
    await debuggerClient.delete();
    // util.cleanup();
    process.exit();
});
