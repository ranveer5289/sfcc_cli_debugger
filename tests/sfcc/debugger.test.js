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

    it('create', async function () {
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

    it('delete', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                response: { status: 204 }
            });
        });

        await debuggerClient.delete();
        expect(debuggerClient.connected).toBe(false);
        expect(console.log).toHaveBeenLastCalledWith('Debugger disconnected from server');
        spy.mockRestore();
    });

    it('delete not successful', async function () {
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                error: 'some error'
            });
        });

        await debuggerClient.delete();
        expect(console.log).toHaveBeenLastCalledWith('Error deleting debugger client some error');
        spy.mockRestore();
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
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                success: true,
                response: {
                    data: mockBreakpointResponse
                }
            });
        });

        const output = await debuggerClient.setBreakpoint([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenLastCalledWith('Breakpoint successfully set at location /some/path.js and line number 12');
        expect(output).toMatchObject(mockBreakpointResponse.breakpoints);

        spy.mockRestore();
    });

    it('setBreakpoint not successful', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                error: 'some error'
            });
        });

        const output = await debuggerClient.setBreakpoint([]);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenLastCalledWith('Error setting breakpoint some error');
        expect(output).toBe(null);

        spy.mockRestore();
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
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                success: true,
                response: {
                    data: mockBreakpointResponse
                }
            });
        });
        const output = await debuggerClient.getBreakpoints();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.table).toHaveBeenLastCalledWith(expectedResponse);
        expect(output).toMatchObject(expectedResponse);

        spy.mockRestore();
    });

    it('getBreakPoints not successful', async function () {
        chalk.red = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                error: 'some error'
            });
        });
        const output = await debuggerClient.getBreakpoints();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenLastCalledWith('Error setting breakpoint some error');
        expect(output).toMatchObject([]);

        spy.mockRestore();
    });

    it('delete all breakpoints', async function () {
        chalk.green = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();
        const mockOptions = {
            url: '/breakpoints',
            method: 'delete'
        };

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                success: true,
                response: {
                    data: 'some data'
                }
            });
        });
        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest');

        await debuggerClient.deleteBreakpoints();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'delete_breakpoint');
        expect(console.log).toHaveBeenLastCalledWith('All breakpoints removed');

        spy.mockRestore();
    });

    it('delete single breakpoints', async function () {
        chalk.green = jest.fn(function (msg) { return msg; });
        const spy = jest.spyOn(console, 'log').mockImplementation();
        const mockOptions = {
            url: '/breakpoints/1',
            method: 'delete'
        };

        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.makeRequest = jest.fn(function () {
            return Promise.resolve({
                success: true,
                response: {
                    data: 'some data'
                }
            });
        });

        const makeRequestSpy = jest.spyOn(debuggerClient, 'makeRequest');

        await debuggerClient.deleteBreakpoints(1);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(makeRequestSpy).toHaveBeenCalledWith(mockOptions, 'delete_breakpoint');
        expect(console.log).toHaveBeenLastCalledWith('breakpoint removed');

        spy.mockRestore();
    });
});
