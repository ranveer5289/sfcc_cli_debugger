const inquirer = require('inquirer');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');


const pathofLineNumberJSON = path.join(process.cwd(), 'linenumber.json');
return inquirer
  .prompt([
    {
        type: 'input',
        name: 'linenumber',
        message: "Where to add breakpoint?"
      }
  ])
  .then(answers => {
    fs.writeFileSync(pathofLineNumberJSON, JSON.stringify(answers));
    console.log(chalk.greenBright('You selected linenumber: ' + answers.linenumber));
  })
  .catch(error => {
    if(error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
    } else {
      // Something else when wrong
    }
  });
