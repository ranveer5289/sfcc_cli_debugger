const repl = require("repl");
const chalk = require('chalk');

const sfccOptions = require('./dw.js');

const debugMode= sfccOptions.generalConfig.debug || false;

const debuggerApi = require('./sfcc/debugger');
const debuggerClient = new debuggerApi(debugMode, sfccOptions);
const util = require('./util');

var replServer = repl.start({
  prompt: "sfcc-cli-debug > ",
  eval: evalOnSFCCServer,
  useColors: true
});

async function evalOnSFCCServer(cmd, context, filename, callback) {
    const commandWithoutLineBreaks = cmd.replace(/(\r\n|\n|\r)/gm, "");
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
    async action(data) {
        this.clearBufferedCommand();
        await util.setBreakPointInteractive(debuggerClient);
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
        if(success) {
            await util.printLines(null, debuggerClient);
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
        let variableName = dataParts[0];
        let maxCount = dataParts[1];
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
            await util.printLines(null, debuggerClient);
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
            await util.printLines(null, debuggerClient);
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
            await util.printLines(null, debuggerClient);
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
            await util.printLines(null, debuggerClient);
        } 
        this.displayPrompt();
    }
});

replServer.defineCommand('l', {
    help: 'print source code',
    async action(offset) {
        this.clearBufferedCommand();
        await util.printLines(offset, debuggerClient);
        this.displayPrompt();
    }
});

replServer.on('exit', async function() {
    await debuggerClient.delete();
    util.cleanup();
    process.exit();
});
