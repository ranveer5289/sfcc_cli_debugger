const glob = require('glob');
const fs = require('fs');
const childprocess = require('child_process');
const path = require('path');

const util = require('../../helpers/util');
const DebuggerClass = require('../../sfcc/debugger');

jest.mock('glob');
jest.mock('fs');
jest.mock('child_process');

describe('Utility script', function () {
    it('get authorization header', function () {
        const username = 'username';
        const password = 'password';
        const expectedAuthorizationHeader = 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=';

        const authorizationHeader = util.getAuthorizationHeader(username, password);
        expect(expectedAuthorizationHeader).toBe(authorizationHeader);
    });

    it('get all files from workspace without child workspace', function () {
        const config = {
            foldersToExcludeFromSearch: ['/node_modules', '.github'],
            childWorkSpaces: [],
            rootWorkSpacePath: '/dummy/folder/sitegenesis-master'
        };
        jest.spyOn(glob, 'sync').mockReturnValue([
            '/app_storefront_controllers/cartridge/controllers/Home.js',
            '/app_storefront_controllers/cartridge/controllers/Product.js',
            '/node_modules/module/index.js'
        ]);

        const expectedOutput = [
            '/dummy/folder/sitegenesis-master/app_storefront_controllers/cartridge/controllers/Home.js',
            '/dummy/folder/sitegenesis-master/app_storefront_controllers/cartridge/controllers/Product.js'
        ];

        const output = util.getAllFilesFromWorkspaces(config);
        expect(output).toMatchObject(expectedOutput);
        jest.resetAllMocks();
    });

    it('get all files from workspace with child workspace', function () {
        const config = {
            foldersToExcludeFromSearch: ['/node_modules', '.github'],
            childWorkSpaces: ['/dummy/folder/sitegenesis-master', '/dummy/folder/integrations', '/dummy/folder/plugins'],
            rootWorkSpacePath: '/dummy/folder'
        };
        jest.spyOn(glob, 'sync').mockReturnValue([
            '/app_storefront_controllers/cartridge/controllers/Home.js',
            '/int_integrations/cartridge/controllers/Integration.js',
            '/plugin_wishlist/cartridge/controllers/Wishlist.js',
            '/node_modules/module/index.js'
        ]);

        jest.spyOn(glob, 'sync').mockReturnValueOnce(['/app_storefront_controllers/cartridge/controllers/Home.js']);
        jest.spyOn(glob, 'sync').mockReturnValueOnce(['/int_integrations/cartridge/controllers/Integration.js']);
        jest.spyOn(glob, 'sync').mockReturnValueOnce(['/plugin_wishlist/cartridge/controllers/Wishlist.js']);
        jest.spyOn(glob, 'sync').mockReturnValueOnce(['/node_modules/module/index.js']);

        const expectedOutput = [
            '/dummy/folder/sitegenesis-master/app_storefront_controllers/cartridge/controllers/Home.js',
            '/dummy/folder/integrations/int_integrations/cartridge/controllers/Integration.js',
            '/dummy/folder/plugins/plugin_wishlist/cartridge/controllers/Wishlist.js'
        ];

        const output = util.getAllFilesFromWorkspaces(config);
        expect(output).toMatchObject(expectedOutput);
        jest.resetAllMocks();
    });

    it('get json file', function () {
        const mockResponse = {
            firstname: 'John',
            lastname: 'Doe'
        };
        jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from(JSON.stringify(mockResponse)));

        const output = util.getJSONFile('/some/path');
        expect(output).toMatchObject(mockResponse);
        jest.resetAllMocks();
    });

    it('setBreakPoint', async function () {
        const mockData = '10,/some/path/test.js';

        const debuggerClient = new DebuggerClass(false, {});
        const spy = jest.spyOn(debuggerClient, 'setBreakpoint').mockResolvedValue({});
        const expectedParams = [{ line_number: 10, script_path: '/some/path/test.js' }];

        await util.setBreakPoint(mockData, debuggerClient);
        expect(spy).toHaveBeenCalledWith(expectedParams);
        jest.resetAllMocks();
    });

    it('setBreakPointInteractive', async function () {
        jest.mock('path');
        const debuggerClient = new DebuggerClass(false, {});
        debuggerClient.connected = true;

        const mocks = {
            config: {
                rootWorkSpacePath: '/Users/username/Downloads/plugin_wishlists'
            },
            configPath: '/config/path',
            findFilePath: '/path/to/findfile.js',
            lineNumberPath: '/path/to/linenumber.js',
            filePathData: {
                path: '/Users/username/Downloads/plugin_wishlists/cartridges/plugin_wishlists/cartridge/controllers/Wishlist.js'
            },
            lineNumberPathData: {
                linenumber: '12'
            },
            brkPtData: '12,/plugin_wishlists/cartridge/controllers/Wishlist.js'
        };

        const spy = jest.spyOn(childprocess, 'execSync').mockReturnValue({});
        jest.spyOn(path, 'join').mockReturnValueOnce(mocks.findFilePath);
        jest.spyOn(path, 'join').mockReturnValueOnce(mocks.lineNumberPath);
        jest.spyOn(util, 'getJSONFile').mockReturnValueOnce(mocks.filePathData);
        jest.spyOn(util, 'getJSONFile').mockReturnValueOnce(mocks.lineNumberPathData);
        const setBreakPointSpy = jest.spyOn(util, 'setBreakPoint').mockReturnValueOnce({});

        await util.setBreakPointInteractive(debuggerClient, mocks.config, mocks.configPath);

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenNthCalledWith(1, `node ${mocks.findFilePath} --config ${mocks.configPath}`, { stdio: 'inherit', shell: true });
        expect(spy).toHaveBeenNthCalledWith(2, `node ${mocks.lineNumberPath}`, { stdio: 'inherit', shell: true });

        expect(setBreakPointSpy).toHaveBeenCalledWith(mocks.brkPtData, debuggerClient);

        jest.restoreAllMocks();
    });
});
