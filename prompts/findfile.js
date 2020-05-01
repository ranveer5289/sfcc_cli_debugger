const inquirer = require('inquirer');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const config = require(path.join(__dirname, '..', 'dw.js'));

const foldersToExclude = config.generalConfig.foldersToExcludeFromSearch;
const pathofFilePathJSON = path.join(process.cwd(), 'filepath.json');

inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));

let defaultPath = '';
if (fs.existsSync(pathofFilePathJSON)) {
    defaultPath = require(pathofFilePathJSON).path;
}

/** 
 * Initiate an inquirer prompt to fuzzy search for the file
*/
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
        rootPath: config.generalConfig.rootWorkSpacePath,
        message: 'Select your file:',
        default: defaultPath,
        suggestOnly: false,
        depthLimit: 10,
    }
    ]).then(function(answers) {
        fs.writeFileSync(pathofFilePathJSON, JSON.stringify(answers));
        console.log(chalk.greenBright('You selected file: ' + answers.path));
    })
    .catch(function(error) {
        if(error.isTtyError) {
          console.log('Prompt could not be rendered in the current environment');
        } else {
          console.log('Something went wrong ' + error);
        }
      });
