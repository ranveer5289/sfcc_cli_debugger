const axios = require('axios');
const sfccConfig = require('./dw.js');

const hostname = sfccConfig.hostname;
const username = sfccConfig.username;
const password = sfccConfig.password;
const SFCC_DEBUGGER_CLIENT_ID = 'sfcc-cli-debugger';

const base64String = Buffer.from(username + ':' + password).toString('base64');
const AUTH_HEADER = `Basic ${base64String}`;
const BASE_DEBUGGER_URL = `https://${hostname}/s/-/dw/debugger/v2_0`;

const instance = axios.create({
    headers : {
        authorization: AUTH_HEADER,
        'x-dw-client-id': SFCC_DEBUGGER_CLIENT_ID,
        'content-type': 'application/json'
    },
    timeout: 5000
});

async function createDebuggerClient() {
    let created = true;
    try {
        const url = BASE_DEBUGGER_URL + '/client';
        const response = await instance.post(url);
        created = (response !== null && response.status === 204);
    } catch (error) {
        console.error('Error creating debugger client ' + error);
        created = false;
    }
    return created;
}

async function deleteDebuggerClient() {
    let deleted = true;
    try {
        const url = BASE_DEBUGGER_URL + '/client';
        const response = await instance.delete(url);
        deleted = (response !== null && response.status === 204);
    } catch (error) {
        console.error('Error deleting debugger client ' + error);
        deleted = false;
    }
    return deleted;
}

async function setBreakpoint(lineNumber, scriptPath) {
    let breakPointIsSet = false;
    try {
        const url = BASE_DEBUGGER_URL + '/breakpoints';
        const data = {
            '_v' : '2.0',
            'breakpoints' : [
                {
                    "line_number" : Number(lineNumber),
                    "script_path" : scriptPath
                }
            ]
        }

        const response = await instance.post(url, data);
        breakPointIsSet = (response !== null && response.status === 200);
    } catch (error) {
        console.error('Error setting breakpoint ' + error);
        breakPointIsSet = false;  
    }
    return breakPointIsSet;
}

async function getCurrentThreadObject() {
    let threadObj = {};
    try {
        const url = BASE_DEBUGGER_URL + '/threads';

        const response = await instance.get(url);
        // console.log(response);
        if (response && response.status === 200 && response.data.script_threads) {
            const scriptThreads = response.data.script_threads.filter(function(thread) {
                return thread.status === 'halted';
            });

            if (scriptThreads  && scriptThreads.length > 0) {
                const scriptThread = scriptThreads[0];
                if (scriptThread) {
                    threadObj.id = scriptThread.id;
                    threadObj.lineNumber = scriptThread.call_stack[0].location.line_number;
                    threadObj.scriptPath = scriptThread.call_stack[0].location.script_path;
                }
            }
        }
    } catch (error) {
        console.error('Error getting current thread id ' + error);
    }
    return threadObj;
}

async function getVariables() {
    let variables = [];
    try {
        const currentThreadObj = await getCurrentThreadObject();
        const url = BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/frames/0/variables';

        const response = await instance.get(url);
        // console.log(response);
        if (response && response.status === 200 && response.data.object_members) {
            variables = response.data.object_members.filter(function(member){
                return member.type !== 'Function';
            }).map(function(member) {
                return {
                    name: member.name,
                    type: member.type,
                    value: member.value
                };
            });
        }
    } catch (error) {
        console.error('Error getting variables from server ' + error);
    }
    return variables;
}

async function getMembersOfVariable(variableName, maxCount) {
    let variables = [];
    try {
        const currentThreadObj = await getCurrentThreadObject();
        const url = BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/frames/0/members?object_path=' + variableName;

        const response = await instance.get(url);
        // console.log(response);
        if (response && response.status === 200 && response.data.object_members) {
            variables = response.data.object_members.filter(function(member) {
                return member.type !== 'Function';
            }).map(function(member) {
                return {
                    name: member.name,
                    type: member.type,
                    value: member.value
                };
            });

            variables = variables.slice(0, maxCount);
        }
    } catch (error) {
        console.error('Error getting members from server ' + error);
    }
    return variables;
}

async function getValueByEval(expression) {
    let value = {};
    try {
        const currentThreadObj = await getCurrentThreadObject();
        const url = BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/frames/0/eval?expr=' + encodeURIComponent(expression);

        const response = await instance.get(url);
        // console.log(response);
        if (response && response.status === 200 && response.data) {
           value = response.data;
        }
    } catch (error) {
        console.error('Error evaluating value from server ' + error);
    }
    return value;
}

async function stepOver() {
    let callStack = {};
    try {
        const currentThreadObj = await getCurrentThreadObject();
        const url = BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/over';

        const response = await instance.post(url);
       if (response !== null && response.status === 200) {
           // todo: handle call stack exhaustion
           const currentCallStack = response.data.call_stack[0];
           return {
               lineNumber: currentCallStack.location.line_number,
               scriptPath: currentCallStack.location.script_path
           }
       }
    } catch (error) {
        console.error('Error in step-over ' + error);
    }
    return callStack;
}

async function resume() {
    let success = false;
    try {
        const currentThreadObj = await getCurrentThreadObject();
        const url = BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/resume';

        const response = await instance.post(url);
       if (response !== null && response.status === 200) {
            success = true;
       }
    } catch (error) {
        console.error('Error in resume ' + error);
    }
    return success;
}

module.exports.createDebuggerClient = createDebuggerClient;
module.exports.deleteDebuggerClient = deleteDebuggerClient;
module.exports.setBreakpoint = setBreakpoint;
module.exports.getCurrentThreadObject = getCurrentThreadObject;
module.exports.getVariables = getVariables;
module.exports.getMembersOfVariable = getMembersOfVariable;
module.exports.getValueByEval = getValueByEval;
module.exports.stepOver = stepOver;
module.exports.resume = resume;
