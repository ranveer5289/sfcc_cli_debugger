const util = require('../util');

describe('Utility script', function () {
    it('get authorization header', function () {
        const username = 'username';
        const password = 'password';
        const expectedAuthorizationHeader = 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=';

        const authorizationHeader = util.getAuthorizationHeader(username, password);
        expect(expectedAuthorizationHeader).toBe(authorizationHeader);
    });
});
