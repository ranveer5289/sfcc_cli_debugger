const inquirer = require('inquirer');
const fs = require('fs');
const chalk = require('chalk');
const config = require('../dw');

const foldersToExclude = config.generalConfig.foldersToExcludeFromSearch;
const pathofFilePathJSON = process.cwd() + '/filepath.json';

inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));

let defaultPath = '';
if (fs.existsSync(pathofFilePathJSON)) {
    defaultPath = require(pathofFilePathJSON).path;
}

inquirer.prompt([
    {
        type: 'fuzzypath',
        name: 'path',
        excludePath: function(nodePath){
            let exclude = false;
            for (var i = 0; i < foldersToExclude.length; i++) {
                if (nodePath.includes(foldersToExclude[i])) {
                    exclude = true;
                    break;
                }
            }
            return exclude;
        },
        excludeFilter: nodePath => nodePath == '.',
        itemType: 'file',
        rootPath: config.generalConfig.workspacePath,
        message: 'Select a target directory for your file:',
        default: defaultPath,
        suggestOnly: false,
        depthLimit: 10,
    }
    ]).then(function(answers) {
        fs.writeFileSync(pathofFilePathJSON, JSON.stringify(answers));
        console.log(chalk.greenBright('You selected file: ' + answers.path));
    })
    .catch(error => {
        if(error.isTtyError) {
          // Prompt couldn't be rendered in the current environment
        } else {
          // Something else when wrong
        }
      });
