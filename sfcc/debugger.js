const axios = require('axios');
const chalk = require('chalk');
const SFCC_DEBUGGER_CLIENT_ID = 'sfcc-cli-debugger';

/**
 * SFCC Debugger class based on official SDAPI
 *
 * @class Debugger
 */
class Debugger {
    /**
     *Creates an instance of Debugger.
     * @param {boolean} debug run debugger in debug mode. Controlled via config.js
     * @param {Object} config sandbox configuration needed to attach a debugger
     * @memberof Debugger
     */
    constructor (debug, config) {
        const base64String = Buffer.from(config.username + ':' + config.password).toString('base64');
        const AUTH_HEADER = `Basic ${base64String}`;
        this.version = '2_0';
        this.BASE_DEBUGGER_URL = `https://${config.hostname}/s/-/dw/debugger/v${this.version}`;
        this.instance = axios.create({
            headers : {
                authorization: AUTH_HEADER,
                'x-dw-client-id': SFCC_DEBUGGER_CLIENT_ID,
                'content-type': 'application/json'
            },
            timeout: 10000
        });
        this.connected = false;
        this.halted = false;
        this.debug = debug;
    }

    /**
     * Creates the Client and enables the debugger
     *
     * @memberof Debugger
     */
    async create() {
        try {
            const url = this.BASE_DEBUGGER_URL + '/client';
            if (this.debug) {
                console.log(chalk.green('Going to create debugger client ' + url));
            }
            const response = await this.instance.post(url);
            if (response && response.status === 204) {
                this.connected = true;
                console.log(chalk.green('Debugger listening on server'));
            }
        } catch (error) {
            console.error('Error creating debugger client ' + error);
        }
    }

    /**
     * Removes all breakpoints, resumes all halted script threads and 
     * disables the debugger by deleting the Client.
     *
     * @memberof Debugger
     */
    async delete() {
        try {
            const url = this.BASE_DEBUGGER_URL + '/client';
            if (this.debug) {
                console.log(chalk.green('Going to delete debugger client ' + url));
            }
            const response = await this.instance.delete(url);
            if (response !== null && response.status === 204) {
                this.connected = false;
                console.log(chalk.red('Debugger disconnected from server'));
            }
        } catch (error) {
            console.error('Error deleting debugger client ' + error);
        }
    }

    /**
     * Sets breakpoint at the specified location
     *
     * @param {string} lineNumber The line number in the script.
     * @param {string} scriptPath The absolute path to the script. The path starts with the '/' delimiter and ends with the name of the script file.
     * @returns
     * @memberof Debugger
     */
    async setBreakpoint(lineNumber, scriptPath) {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const url = this.BASE_DEBUGGER_URL + '/breakpoints';
            const data = {
                '_v' : this.version,
                'breakpoints' : [
                    {
                        "line_number" : Number(lineNumber),
                        "script_path" : scriptPath
                    }
                ]
            }
            if (this.debug) {
                console.log(chalk.green('Request data for setBreakPoint call: '));
                console.log(data);
            }
            const response = await this.instance.post(url, data);
            if (this.debug & response.data) {
                console.log(chalk.green(response.data));
            }
            if (response !== null && response.status === 200 && response.data) {
                console.log(chalk.green('Breakpoint successfully set on server at line# ' + lineNumber));
                return response.data.breakpoints;
            }
        } catch (error) {
            console.error(chalk.red('Error setting breakpoint ' + error));
        }
        return;
    }

    /**
     * Returns all breakpoints currently set in the debugger.
     *d
     * @returns
     * @memberof Debugger
     */
    async getBreakpoints() {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const url = this.BASE_DEBUGGER_URL + '/breakpoints';
            if (this.debug) {
                console.log(chalk.green('Going to get all breakpoints ' + url));
            }
            const response = await this.instance.get(url);
            if (this.debug & response.data) {
                console.log(response.data.breakpoints);
            }
            if (response !== null && response.status === 200 && response.data.breakpoints) {
                console.log(chalk.green('Breakpoints are set at following locations: '));
                const breakpoints = response.data.breakpoints.map(function(bp) {
                    return {
                        breakpoint_id: bp.id,
                        script: bp.script_path,
                        line: bp.line_number
                    };
                });
                console.table(breakpoints);
            } else {
                console.log(chalk.green('No breakpoints currently set'));
            }
        } catch (error) {
            console.error(chalk.red('Error setting breakpoint ' + error));
        }
    }

    /**
     * Removes all the breakpoints or breakpoint specified from the debugger.
     * if no brkpID all breakpoints are removed
     *
     * @param {string} brkpID optional breakpoint id
     * @param {boolean} silent do not print success message
     * @returns
     * @memberof Debugger
     */
    async deleteBreakpoints(brkpID, silent) {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            let url = this.BASE_DEBUGGER_URL + '/breakpoints';
            if (brkpID) {
                url = url + '/' + brkpID;
            }
            if (this.debug) {
                console.log(chalk.green('Going to delete breakpoints ' + url));
            }
            const response = await this.instance.delete(url);

            if (response !== null && response.status === 204) {
                if (!silent) {
                    brkpID ? console.log(chalk.green('breakpoint removed')) : console.log(chalk.green('All breakpoints removed'));
                }
            } else {
                console.log(chalk.green('No breakpoints currently set'));
            }
        } catch (error) {
            console.error(chalk.red('Error deleting breakpoint ' + error));
        }
    }

    /**
     * Returns the script threads in the script engine.
     * The stack frame at index [0] represents the current location of the execution path
     *
     * @returns {object} thread object with current script & location where debugger is halted
     * @memberof Debugger
     */
    async getCurrentThreadObject() {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        let threadObj = {};
        try {
            const url = this.BASE_DEBUGGER_URL + '/threads';
    
            const response = await this.instance.get(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
            if (response && response.status === 200 && response.data.script_threads) {
                const scriptThreads = response.data.script_threads.filter(function(thread) {
                    return thread.status === 'halted';
                });
    
                if (scriptThreads  && scriptThreads.length > 0) {
                    const scriptThread = scriptThreads[0];
                    if (scriptThread) {
                        this.halted = true;
                        threadObj.id = scriptThread.id;
                        threadObj.lineNumber = scriptThread.call_stack[0].location.line_number;
                        threadObj.scriptPath = scriptThread.call_stack[0].location.script_path;
                    }
                } else {
                    console.log(chalk.red('Debugger not halted'));
                }
            } else {
                console.log(chalk.red('Debugger not halted'));
            }
        } catch (error) {
            console.error(chalk.thread('Error getting current thread id ' + error));
        }
        return threadObj;
    }

    /**
     * Returns the variables in the context of the specified thread and frame scope and all inclosing scopes.
     *
     * @returns {object} all variables
     * @memberof Debugger
     */
    async getVariables() {
        let variables = [];
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/frames/0/variables';
    
            const response = await this.instance.get(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
            if (response && response.status === 200 && response.data.object_members) {
                variables = response.data.object_members.filter(function(member){
                    return member.type !== 'Function';
                }).map(function(member) {
                    return {
                        name: member.name,
                        type: member.type,
                        value: member.value.length > 50 ? member.value.substr(0,50) + '....' : member.value
                    };
                });
            } else {
                console.error(chalk.red('Error getting variables from server'));
            }
        } catch (error) {
            console.error(chalk.red('Error getting variables from server ' + error));
        }
        return variables
    }

    /**
     * Returns the members of the object path in the context of the specified thread and frame
     *
     * @param {string} variableName name of variable for which members are returned
     * @param {Number} maxCount max number of variables to be returned
     * @returns {object} all members of the variables
     * @memberof Debugger
     */
    async getMembersOfVariable(variableName, maxCount) {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }

        let members = [];
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/frames/0/members?object_path=' + variableName;
            if (this.debug) {
                console.log(chalk.green('Going to retrieve members from ') + url);
            }
            const response = await this.instance.get(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
            if (response && response.status === 200 && response.data.object_members) {
                members = response.data.object_members.filter(function(member) {
                    return member.type !== 'Function';
                }).map(function(member) {
                    return {
                        name: member.name,
                        type: member.type,
                        value: member.value.length > 50 ? member.value.substr(0,50) + '....' : member.value
                    };
                });
    
                members = members.slice(0, maxCount);
            } else {
                console.error(chalk.red('Error getting members from server'));
            }
        } catch (error) {
            console.error(chalk.red('Error getting members from server ' + error));
        }
        return members;
    }

    /**
     * Evaluates an expression on the server
     *
     * @param {string} expression to be evaluated
     * @returns {object} expression response
     * @memberof Debugger
     */
    async getValueByEval(expression) {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        let value = {};
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/frames/0/eval?expr=' + encodeURIComponent(expression);
            if (this.debug) {
                console.log(chalk.green('Going to eval expression from ') + expression);
            }
            const response = await this.instance.get(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
            if (response && response.status === 200 && response.data) {
               value = response.data;
            }
        } catch (error) {
            console.error('Error evaluating value from server ' + error);
        }
        return value;
    }

    /**
     * Directs the script thread to step over the current thread location to the next line in the script.
     *
     * @returns
     * @memberof Debugger
     */
    async stepOver() {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/over';
    
            const response = await this.instance.post(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
           if (response !== null && response.status === 200 && response.data) {
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
        return;
    }

    /**
     * Directs the script thread to step into the function at the current thread location
     *
     * @returns
     * @memberof Debugger
     */
    async stepInto() {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/into';
    
            const response = await this.instance.post(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
           if (response !== null && response.status === 200 && response.data) {
               // todo: handle call stack exhaustion
               const currentCallStack = response.data.call_stack[0];
               return {
                   lineNumber: currentCallStack.location.line_number,
                   scriptPath: currentCallStack.location.script_path
               }
           }
        } catch (error) {
            console.error('Error in step-into ' + error);
        }
        return;
    }

    /**
     * Directs the script thread to step out of the current thread location and to return to the parent in the call stack.
     *
     * @returns
     * @memberof Debugger
     */
    async stepOut() {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/out';
    
            const response = await this.instance.post(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
           if (response !== null && response.status === 200 && response.data) {
               // todo: handle call stack exhaustion
               const currentCallStack = response.data.call_stack[0];
               if (currentCallStack && currentCallStack.length > 0) {
                   return {
                       lineNumber: currentCallStack.location.line_number,
                       scriptPath: currentCallStack.location.script_path
                   }
               }
           }
        } catch (error) {
            console.error('Error in step-out ' + error);
        }
        return;
    }

    /**
     * Directs the script thread to resume the execution of the script. 
     * Depending on the script location and breakpoints, 
     * calling resume can result in the thread stopping at another breakpoint as well
     *
     * @returns
     * @memberof Debugger
     */
    async  resume() {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return;
        }
        try {
            const currentThreadObj = await this.getCurrentThreadObject();
            if (!this.halted) {
                return;
            }
            const url = this.BASE_DEBUGGER_URL + '/threads/' + currentThreadObj.id + '/resume';
            const response = await this.instance.post(url);
            if (this.debug & response.data) {
                console.log(response.data)
            }
           if (response !== null && response.status === 200) {
                console.log(chalk.green('Debugger resumed'));
                return true;
           }
        } catch (error) {
            console.error('Error in resume ' + error);
        }
        return;
    }
}

module.exports = Debugger;
