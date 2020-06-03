const glob = require('glob');
const fs = require('fs');

const util = require('../../helpers/util');
const DebuggerClass = require('../../sfcc/debugger');

jest.mock('glob');
jest.mock('fs');

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
        glob.sync.mockReturnValue([
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
    });

    it('get all files from workspace with child workspace', function () {
        const config = {
            foldersToExcludeFromSearch: ['/node_modules', '.github'],
            childWorkSpaces: ['/dummy/folder/sitegenesis-master', '/dummy/folder/integrations', '/dummy/folder/plugins'],
            rootWorkSpacePath: '/dummy/folder'
        };
        glob.sync.mockReturnValue([
            '/app_storefront_controllers/cartridge/controllers/Home.js',
            '/int_integrations/cartridge/controllers/Integration.js',
            '/plugin_wishlist/cartridge/controllers/Wishlist.js',
            '/node_modules/module/index.js'
        ]);

        const expectedOutput = [
            '/dummy/folder/sitegenesis-master/app_storefront_controllers/cartridge/controllers/Home.js',
            '/dummy/folder/sitegenesis-master/int_integrations/cartridge/controllers/Integration.js',
            '/dummy/folder/sitegenesis-master/plugin_wishlist/cartridge/controllers/Wishlist.js',

            '/dummy/folder/integrations/app_storefront_controllers/cartridge/controllers/Home.js',
            '/dummy/folder/integrations/int_integrations/cartridge/controllers/Integration.js',
            '/dummy/folder/integrations/plugin_wishlist/cartridge/controllers/Wishlist.js',

            '/dummy/folder/plugins/app_storefront_controllers/cartridge/controllers/Home.js',
            '/dummy/folder/plugins/int_integrations/cartridge/controllers/Integration.js',
            '/dummy/folder/plugins/plugin_wishlist/cartridge/controllers/Wishlist.js'
        ];

        const output = util.getAllFilesFromWorkspaces(config);
        expect(output).toMatchObject(expectedOutput);
    });

    it('get json file', function () {
        const mockResponse = {
            firstname: 'John',
            lastname: 'Doe'
        };
        fs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(mockResponse)));

        const output = util.getJSONFile('/some/path');
        expect(output).toMatchObject(mockResponse);
    });

    it('setBreakPoint', async function () {
        const mockData = '10,/some/path/test.js';

        const debuggerClient = new DebuggerClass(false, {});
        const spy = jest.spyOn(debuggerClient, 'setBreakpoint').mockResolvedValue({});
        const expectedParams = [{ line_number: 10, script_path: '/some/path/test.js' }];

        await util.setBreakPoint(mockData, debuggerClient);
        expect(spy).toHaveBeenCalledWith(expectedParams);
        spy.mockRestore();
    });
});
