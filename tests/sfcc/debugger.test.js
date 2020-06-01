const axios = require('axios');
const chalk = require('chalk');

jest.mock('axios');
jest.mock('chalk');

const DebuggerClass = require('../../sfcc/debugger');

describe('SFCC Debugger Class', function () {
    it('constructor', function () {
        const headersMock = {
            authorization: 'authorization',
            'x-dw-client-id': 'client_id',
            'content-type': 'application/json'
        };

        axios.create.mockReturnValue({
            baseURL: 'base_url',
            headers: headersMock
        });
        const debuggerClient = new DebuggerClass(false, {});

        expect(debuggerClient.instance.baseURL).toBe('base_url');
        expect(debuggerClient.instance.headers).toMatchObject(headersMock);
        expect(debuggerClient.connected).toBe(false);
        expect(debuggerClient.halted).toBe(false);
    });

    it('makeRequest Successful', async function () {
        axios.create = jest.fn(() => axios);
        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.connected = true;

        const expectedResponse = {
            status: 200,
            data: 'mydata'
        };
        axios.request.mockResolvedValue(expectedResponse);

        const output = await debuggerClient.makeRequest({ config: 'config' }, 'action');
        expect(output.success).toBe(true);
        expect(output.response).toMatchObject(expectedResponse);
    });

    it('makeRequest Not Successful', async function () {
        axios.create = jest.fn(() => axios);
        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.connected = true;

        const expectedResponse = {
            status: 400
        };
        axios.request.mockResolvedValue(expectedResponse);

        const output = await debuggerClient.makeRequest({ config: 'config' }, 'action');
        expect(output.error).toBe('Something Happened....');
    });

    it('create debugger', async function () {
        axios.create = jest.fn(function () { return axios; });
        chalk.green = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const expectedResponse = { status: 204 };
        axios.post.mockResolvedValue(expectedResponse);

        const debuggerClient = new DebuggerClass(false, {});
        await debuggerClient.create();

        expect(debuggerClient.connected).toBe(true);
        expect(console.log).toHaveBeenLastCalledWith('Debugger listening on server');
        spy.mockRestore();
    });

    it('delete debugger', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            response: { status: 204 }
        });

        await debuggerClient.delete();
        expect(debuggerClient.connected).toBe(false);
        expect(console.log).toHaveBeenLastCalledWith('Debugger disconnected from server');
        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('delete debugger not successful', async function () {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            error: 'some error'
        });

        await debuggerClient.delete();
        expect(console.log).toHaveBeenLastCalledWith('Error deleting debugger client some error');
        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('setBreakpoint', async function () {
        chalk.green = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();
        const mockBreakpointResponse = {
            breakpoints: [
                {
                    script_path: '/some/path.js',
                    line_number: 12
                }
            ]
        };

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: mockBreakpointResponse
            }
        });

        const output = await debuggerClient.setBreakpoint([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenLastCalledWith('Breakpoint successfully set at location /some/path.js and line number 12');
        expect(output).toMatchObject(mockBreakpointResponse.breakpoints);

        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('setBreakpoint not successful', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            error: 'some error'
        });

        const output = await debuggerClient.setBreakpoint([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenLastCalledWith('Error setting breakpoint some error');
        expect(output).toBe(null);

        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('getBreakPoints', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'table').mockImplementation();

        const mockBreakpointResponse = {
            breakpoints: [
                {
                    script_path: '/some/path.js',
                    line_number: 12,
                    id: 1
                }
            ]
        };

        const expectedResponse = [
            {
                breakpoint_id: 1,
                script: '/some/path.js',
                line: 12
            }
        ];

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: mockBreakpointResponse
            }
        });

        const output = await debuggerClient.getBreakpoints();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.table).toHaveBeenLastCalledWith(expectedResponse);
        expect(output).toMatchObject(expectedResponse);

        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('getBreakPoints not successful', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            error: 'some error'
        });

        const output = await debuggerClient.getBreakpoints();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenLastCalledWith('Error setting breakpoint some error');
        expect(output).toMatchObject([]);

        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('delete all breakpoints', async function () {
        chalk.green = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();
        const mockOptions = {
            url: '/breakpoints',
            method: 'delete'
        };

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: 'some data'
            }
        });

        await debuggerClient.deleteBreakpoints();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'delete_breakpoint');
        expect(console.log).toHaveBeenLastCalledWith('All breakpoints removed');

        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('delete single breakpoints', async function () {
        chalk.green = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();
        const mockOptions = {
            url: '/breakpoints/1',
            method: 'delete'
        };

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: 'some data'
            }
        });

        await debuggerClient.deleteBreakpoints(1);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'delete_breakpoint');
        expect(console.log).toHaveBeenLastCalledWith('breakpoint removed');

        spy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('get current thread', async function () {
        const mockOptions = {
            url: '/threads',
            method: 'get'
        };

        const mockOutput = {
            id: 2,
            lineNumber: 1,
            scriptPath: '/some/path.js'
        };

        const debuggerClient = new DebuggerClass(false, {});
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: {
                    _v: '2.0',
                    script_threads: [
                        {
                            call_stack: [
                                {
                                    index: 0,
                                    location: {
                                        function_name: 'show()',
                                        line_number: 1,
                                        script_path: '/some/path.js'
                                    }
                                }
                            ],
                            id: 2,
                            status: 'halted'
                        }
                    ]
                }
            }
        });

        const output = await debuggerClient.getCurrentThreadObject();

        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'get_current_thread');
        expect(output).toMatchObject(mockOutput);
        expect(debuggerClient.halted).toBe(true);

        makeRequestSpy.mockRestore();
    });

    it('get variables', async function () {
        const threadId = 1;
        const mockOptions = {
            url: `/threads/${threadId}/frames/0/variables`,
            method: 'get'
        };

        const mockOutput = [{
            name: 'apiProductSearch',
            type: 'dw.catalog.ProductSearchModel',
            value: '[ProductSearchModel id=26557335]'
        }];

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.halted = true;

        const getCurrentThreadObjectSpy = jest.spyOn(debuggerClient, 'getCurrentThreadObject').mockResolvedValue({
            id: threadId
        });

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: {
                    _v: '2.0',
                    count: 1,
                    object_members: [
                        {
                            name: 'apiProductSearch',
                            parent: '',
                            scope: 'closure',
                            type: 'dw.catalog.ProductSearchModel',
                            value: '[ProductSearchModel id=26557335]'
                        }
                    ]
                }
            }
        });

        const output = await debuggerClient.getVariables();

        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'get_variables');
        expect(output).toMatchObject(mockOutput);

        getCurrentThreadObjectSpy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('get members of variables', async function () {
        const variableName = 'apiProduct';
        const threadId = 1;
        const mockOptions = {
            url: `/threads/${threadId}/frames/0/members?object_path=${variableName}`,
            method: 'get'
        };

        const mockOutput = [{
            name: 'apiProductSearch',
            type: 'dw.catalog.ProductSearchModel',
            value: '[ProductSearchModel id=26557335]'
        }];

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.halted = true;

        const getCurrentThreadObjectSpy = jest.spyOn(debuggerClient, 'getCurrentThreadObject').mockResolvedValue({
            id: threadId
        });

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: {
                    _v: '2.0',
                    count: 1,
                    object_members: [
                        {
                            name: 'apiProductSearch',
                            parent: '',
                            scope: 'closure',
                            type: 'dw.catalog.ProductSearchModel',
                            value: '[ProductSearchModel id=26557335]'
                        }
                    ]
                }
            }
        });

        const output = await debuggerClient.getMembersOfVariable(variableName);

        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'get_members');
        expect(output).toMatchObject(mockOutput);

        getCurrentThreadObjectSpy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('eval on server', async function () {
        const expression = 'apiProduct';
        const threadId = 1;
        const mockOptions = {
            url: `/threads/${threadId}/frames/0/eval?expr=${encodeURIComponent(expression)}`,
            method: 'get'
        };

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.halted = true;
        const getCurrentThreadObjectSpy = jest.spyOn(debuggerClient, 'getCurrentThreadObject').mockResolvedValue({
            id: threadId
        });

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: {
                    value: 'some value'
                }
            }
        });

        const output = await debuggerClient.getValueByEval(expression);

        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'get_value_eval');
        expect(output).toBe('some value');

        getCurrentThreadObjectSpy.mockRestore();
        makeRequestSpy.mockRestore();
    });

    it('handle step operations', async function () {
        const operation = 'over';
        const threadId = 1;
        const mockOptions = {
            url: `/threads/${threadId}/${operation}`,
            method: 'post'
        };

        const mockOutput = {
            lineNumber: 1,
            scriptPath: '/some/path.js'
        };

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.halted = true;

        const getCurrentThreadObjectSpy = jest.spyOn(debuggerClient, 'getCurrentThreadObject').mockResolvedValue({
            id: threadId
        });

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest').mockResolvedValue({
            success: true,
            response: {
                data: {
                    _v: '2.0',
                    call_stack: [
                        {
                            index: 0,
                            location: {
                                function_name: 'show()',
                                line_number: mockOutput.lineNumber,
                                script_path: mockOutput.scriptPath
                            }
                        }
                    ]
                }
            }
        });

        const output = await debuggerClient.handleStepOperations(operation);

        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, `step_${operation}`);
        expect(output).toMatchObject(mockOutput);

        getCurrentThreadObjectSpy.mockRestore();
        makeRequestSpy.mockRestore();
    });
});
