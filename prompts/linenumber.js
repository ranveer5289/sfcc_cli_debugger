const inquirer = require('inquirer');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');


const pathofLineNumberJSON = path.join(process.cwd(), 'tmp', 'linenumber.json');
inquirer
    .prompt([
        {
            type: 'input',
            name: 'linenumber',
            message: 'Where to add breakpoint?'
        }
    ])
    .then((answers) => {
        fs.writeFileSync(pathofLineNumberJSON, JSON.stringify(answers));
        console.log(chalk.greenBright(`You selected linenumber: ${answers.linenumber}`));
    })
    .catch((error) => {
        if (error.isTtyError) {
            console.log('Prompt could not be rendered in the current environment');
        } else {
            console.log(`Something went wrong ${error}`);
        }
    });
