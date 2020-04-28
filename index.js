const repl = require("repl");
const chalk = require('chalk');


const debuggerClient = require("./debugger");
const util = require('./util');

var replServer = repl.start({
  prompt: "sfcc-cli-debug > ",
  eval: util.evalOnSFCCServer,
  useColors: true
});

replServer.defineCommand('start', {
    help: 'Attach a Debugger Client',
    async action() {
        this.clearBufferedCommand();
        const response = await debuggerClient.createDebuggerClient();
        if (response) {
            console.log(chalk.green('Debugger listening on server'));
        } else {
            console.log('Unable to attach debugger to server');
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('stop', {
    help: 'Detach a Debugger Client',
    async action() {
        this.clearBufferedCommand();
        const response = await debuggerClient.deleteDebuggerClient();
        if (response) {
            console.log(chalk.green('Debugger detached from server'));
        } else {
            console.log('Unable to detach debugger to server');
        }
        this.displayPrompt();
    }
});


replServer.defineCommand('sb', {
    help: 'Add a breakpoint',
    async action(data) {
        this.clearBufferedCommand();
        await util.setBreakPoint(data);
        this.displayPrompt();
    }
});

replServer.defineCommand('sbi', {
    help: 'Add a breakpoint',
    async action(data) {
        this.clearBufferedCommand();
        await util.setBreakPointInteractive();
        this.displayPrompt();
    }
});

replServer.defineCommand('sbr', {
    help: 'Add a breakpoint and resume/continue',
    async action(lineNumber) {
        this.clearBufferedCommand();
        await util.setBreakPoint(lineNumber);
        const success = await debuggerClient.resume();
        if(success) {
            await util.printLines();
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('ct', {
    help: 'Get current thread',
    async action() {
        this.clearBufferedCommand();
        const currentScriptThread = await debuggerClient.getCurrentThreadObject();
        if (currentScriptThread) {
            console.table(currentScriptThread);
        } else {
            console.log('Unable to get current threadId');
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
        } else {
            console.log('Unable to get variables');
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
        } else {
            console.log('Unable to get members');
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
            console.log(expressionValue);
        } else {
            console.log('Unable evaluate');
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('n', {
    help: 'Step Over',
    async action() {
        this.clearBufferedCommand();
        const success = await debuggerClient.stepOver();
        if (success) {
            await util.printLines();
        } else {
            console.log('Unable to step-over');
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('r', {
    help: 'Resume',
    async action() {
        this.clearBufferedCommand();
        const success = await debuggerClient.resume();
        if (success) {
            console.log(chalk.green('Successfully resumed'));
            await util.printLines();
        } else {
            console.log('Unable to resume');
        }
        this.displayPrompt();
    }
});

replServer.defineCommand('l', {
    help: 'where am i',
    async action(offset) {
        this.clearBufferedCommand();
        await util.printLines(offset);
        this.displayPrompt();
    }
});
