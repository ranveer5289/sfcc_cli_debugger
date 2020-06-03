/* eslint-disable import/no-dynamic-require */
const inquirer = require('inquirer');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const argv = require('yargs').argv;

const util = require(path.join(__dirname, '..', 'helpers', 'util'));
const config = require(path.join(__dirname, '..', argv.config));

const foldersToExclude = config.foldersToExcludeFromSearch;
const pathofFilePathJSON = path.join(process.cwd(), 'tmp', 'filepath.json');

inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));

let defaultPath = '';
if (fs.existsSync(pathofFilePathJSON)) {
    defaultPath = util.getJSONFile(pathofFilePathJSON).path;
}

/**
 * Initiate an inquirer prompt to fuzzy search for the file
*/
inquirer.prompt([
    {
        type: 'fuzzypath',
        name: 'path',
        excludePath: function (nodePath) {
            let exclude = false;
            for (let i = 0; i < foldersToExclude.length; i += 1) {
                if (nodePath.includes(foldersToExclude[i])) {
                    exclude = true;
                    break;
                }
            }
            return exclude;
        },
        excludeFilter: (nodePath) => nodePath === '.',
        itemType: 'file',
        rootPath: config.rootWorkSpacePath,
        message: 'Select your file:',
        default: defaultPath,
        suggestOnly: false,
        depthLimit: 10
    }
]).then(function (answers) {
    fs.writeFileSync(pathofFilePathJSON, JSON.stringify(answers));
    console.log(chalk.greenBright(`You selected file: ${answers.path}`));
})
    .catch(function (error) {
        if (error.isTtyError) {
            console.log('Prompt could not be rendered in the current environment');
        } else {
            console.log(`Something went wrong ${error}`);
        }
    });
