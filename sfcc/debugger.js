/* eslint-disable import/no-dynamic-require */
const axios = require('axios');
const chalk = require('chalk');
const path = require('path');

const util = require(path.join(__dirname, '..', 'util'));

const SFCC_DEBUGGER_CLIENT_ID = 'sfcc-cli-debugger';

/**
 * SFCC Debugger class based on official SDAPI
 *
 * @class Debugger
 */
class Debugger {
    /**
     * Creates an instance of Debugger.
     * @param {boolean} debug run debugger in debug mode. Controlled via config.js
     * @param {Object} config sandbox configuration needed to attach a debugger
     * @memberof Debugger
     */
    constructor(debug, config) {
        const AUTH_HEADER = util.getAuthorizationHeader(config.username, config.password);
        this.version = '2_0';
        this.BASE_DEBUGGER_URL = `https://${config.hostname}/s/-/dw/debugger/v${this.version}`;
        this.instance = axios.create({
            baseURL: this.BASE_DEBUGGER_URL,
            headers: {
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
     * Generic re-usable method to make SDAPI calls
     *
     * @param {Object} options options required for axios
     * @param {String} action ID of the method which is making this call
     * @returns {null|Object} output object
     * @memberof Debugger
     */
    async makeRequest(options, action) {
        if (!this.connected) {
            console.log(chalk.red('Debugger not connected'));
            return null;
        }

        if (!options || Object.keys(options).length === 0) {
            console.log(chalk.red('Options not supplied'));
            return null;
        }
        if (this.debug) {
            console.log(`Request Url for ${action}: ${this.instance.defaults.baseURL}${options.url}`);
            if (options) {
                console.log(`Request options for ${action}: ${JSON.stringify(options)}`);
            }
        }

        const output = {};
        try {
            const response = await this.instance.request(options);
            if (response && [204, 200].includes(response.status)) {
                if (response.data && this.debug) {
                    console.log(`Response body for ${action}: ${JSON.stringify(response.data)}`);
                }
                output.response = response;
                output.success = true;
            } else {
                output.error = 'Something Happened....';
            }
        } catch (error) {
            output.error = error;
        }
        if (this.debug) {
            console.log(new Array(100).fill('-').join(''));
        }
        return output;
    }

    /**
     * Creates the Client and enables the debugger
     *
     * @memberof Debugger
     */
    async create() {
        try {
            const url = `${this.BASE_DEBUGGER_URL}/client`;
            if (this.debug) {
                console.log(chalk.green(`Going to create debugger client ${url}`));
            }
            const response = await this.instance.post(url);
            if (response && response.status === 204) {
                this.connected = true;
                console.log(chalk.green('Debugger listening on server'));
            }
        } catch (error) {
            console.error(`Error creating debugger client ${error}`);
        }
    }

    /**
     * Removes all breakpoints, resumes all halted script threads and
     * disables the debugger by deleting the Client.
     *
     * @memberof Debugger
     */
    async delete() {
        const options = {
            url: '/client',
            method: 'delete'
        };
        const output = await this.makeRequest(options, 'delete_debugger');
        if (output && output.response) {
            this.connected = false;
            console.log(chalk.red('Debugger disconnected from server'));
        } else {
            console.log(`Error deleting debugger client ${output.error}`);
        }
    }

    /**
     * Sets breakpoint at the specified location
     *
     * @param {Array} breakpoints array of breakpoints with script_path and line_number.
     * @returns
     * @memberof Debugger
     */
    async setBreakpoint(breakpoints) {
        const options = {
            url: '/breakpoints',
            method: 'post',
            data: {
                _v: this.version,
                breakpoints: breakpoints
            }
        };
        const output = await this.makeRequest(options, 'set_breakpoint');
        if (output.success && output.response && output.response.data) {
            const responseData = output.response.data;
            responseData.breakpoints.forEach(function (brk) {
                console.log(chalk.green(`Breakpoint successfully set at location ${brk.script_path} and line number ${brk.line_number}`));
            });
            return responseData.breakpoints;
        }

        console.log(chalk.red(`Error setting breakpoint ${output.error}`));
        return null;
    }

    /**
     * Returns all breakpoints currently set in the debugger.
     *
     * @returns
     * @memberof Debugger
     */
    async getBreakpoints() {
        let breakpoints = [];
        const options = {
            url: '/breakpoints',
            method: 'get'
        };

        const output = await this.makeRequest(options, 'get_breakpoint');
        if (output.success && output.response && output.response.data) {
            const responseData = output.response.data;
            if (!responseData.breakpoints) {
                console.log(chalk.green('No breakpoints currently set'));
                return [];
            }
            breakpoints = responseData.breakpoints.map(function (bp) {
                return {
                    breakpoint_id: bp.id,
                    script: bp.script_path,
                    line: bp.line_number
                };
            });
            console.table(breakpoints);
        } else {
            console.log(chalk.red(`Error setting breakpoint ${output.error}`));
        }

        return breakpoints;
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
        let url = '/breakpoints';
        if (brkpID) {
            url = `${url}/${brkpID}`;
        }
        const options = {
            url: url,
            method: 'delete'
        };
        const output = await this.makeRequest(options, 'delete_breakpoint');
        if (output && output.response) {
            if (!silent) {
                // eslint-disable-next-line no-unused-expressions
                brkpID ? console.log(chalk.green('breakpoint removed')) : console.log(chalk.green('All breakpoints removed'));
            }
        } else {
            console.error(chalk.red(`Error deleting breakpoint ${output.error}`));
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
        const threadObj = {};
        const options = {
            url: '/threads',
            method: 'get'
        };
        const output = await this.makeRequest(options, 'get_current_thread');
        if (output && output.response && output.response.data) {
            const responseData = output.response.data;
            if (!responseData.script_threads) {
                console.log(chalk.red('Debugger not halted'));
                return threadObj;
            }
            const scriptThreads = responseData.script_threads.filter(function (thread) {
                return thread.status === 'halted';
            });

            if (scriptThreads && scriptThreads.length > 0) {
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
            console.error(chalk.thread(`Error getting current thread id ${output.error}`));
        }
        return threadObj;
    }

    /**
     * Returns the variables in the context of the specified thread and
     * frame scope and all inclosing scopes.
     *
     * @returns {object} all variables
     * @memberof Debugger
     */
    async getVariables() {
        let variables = [];
        const currentThreadObj = await this.getCurrentThreadObject();
        if (!this.halted) {
            return null;
        }
        const url = `/threads/${currentThreadObj.id}/frames/0/variables`;
        const options = {
            url: url,
            method: 'get'
        };
        const output = await this.makeRequest(options, 'get_variables');
        if (output && output.response && output.response.data) {
            const responseData = output.response.data;
            if (!responseData.object_members) {
                console.log(chalk.red('Error getting variables from server'));
                return variables;
            }
            variables = responseData.object_members.filter(function (member) {
                return member.type !== 'Function';
            }).map(function (member) {
                return {
                    name: member.name,
                    type: member.type,
                    value: member.value.length > 50 ? `${member.value.substr(0, 50)}....` : member.value
                };
            });
        } else {
            console.error(chalk.red(`Error getting variables from server ${output.error}`));
        }
        return variables;
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
        let members = [];
        const currentThreadObj = await this.getCurrentThreadObject();
        if (!this.halted) {
            return null;
        }
        const url = `/threads/${currentThreadObj.id}/frames/0/members?object_path=${variableName}`;
        const options = {
            url: url,
            method: 'get'
        };
        const output = await this.makeRequest(options, 'get_members');
        if (output && output.response && output.response.data) {
            const responseData = output.response.data;
            if (!responseData.object_members) {
                console.log(chalk.red('Error getting members from server'));
                return members;
            }
            members = responseData.object_members.filter(function (member) {
                return member.type !== 'Function';
            }).map(function (member) {
                return {
                    name: member.name,
                    type: member.type,
                    value: member.value.length > 50 ? `${member.value.substr(0, 50)}....` : member.value
                };
            });
            members = members.slice(0, maxCount);
        } else {
            console.error(chalk.red(`Error getting members from server ${output.error}`));
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
        let value = null;
        const currentThreadObj = await this.getCurrentThreadObject();
        if (!this.halted) {
            return null;
        }
        const url = `/threads/${currentThreadObj.id}/frames/0/eval?expr=${encodeURIComponent(expression)}`;
        const options = {
            url: url,
            method: 'get'
        };
        const output = await this.makeRequest(options, 'get_value_eval');
        if (output && output.response && output.response.data) {
            value = output.response.data.value;
        } else {
            console.error(`Error evaluating value from server ${output.error}`);
        }
        return value;
    }

    /**
     * Generic re-usable function to handle step operations
     *
     * @param {string} operation step-operation like over, into etc
     * @returns
     * @memberof Debugger
     */
    async handleStepOperations(operation) {
        const currentThreadObj = await this.getCurrentThreadObject();
        if (!this.halted) {
            return null;
        }
        const url = `/threads/${currentThreadObj.id}/${operation}`;
        const options = {
            url: url,
            method: 'post'
        };
        const output = await this.makeRequest(options, `step_${operation}`);
        if (output && output.response && output.response.data) {
            const responseData = output.response.data;
            if (responseData.call_stack && responseData.call_stack.length > 0) {
                const currentCallStack = responseData.call_stack[0];
                return {
                    lineNumber: currentCallStack.location.line_number,
                    scriptPath: currentCallStack.location.script_path
                };
            }
        } else {
            console.error(`Error in step-${operation} ${output.error}`);
        }
        return null;
    }

    /**
     * Directs the script thread to step over
     * the current thread location to the next line in the script.
     *
     * @returns
     * @memberof Debugger
     */
    async stepOver() {
        return this.handleStepOperations('over');
    }

    /**
     * Directs the script thread to step into the function at the current thread location
     *
     * @returns
     * @memberof Debugger
     */
    async stepInto() {
        return this.handleStepOperations('into');
    }

    /**
     * Directs the script thread to step out
     * of the current thread location and to return to the parent in the call stack.
     *
     * @returns
     * @memberof Debugger
     */
    async stepOut() {
        return this.handleStepOperations('out');
    }

    /**
     * Directs the script thread to resume the execution of the script.
     * Depending on the script location and breakpoints,
     * calling resume can result in the thread stopping at another breakpoint as well
     *
     * @returns
     * @memberof Debugger
     */
    async resume() {
        return this.handleStepOperations('resume');
    }
}

module.exports = Debugger;
