'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const chalk = require('chalk');
const getInstallCmd = require('./utils/get-install-cmd');
const output = require('./utils/output');

const program = {
  name: 'create-matter',
};

exports.help = function () {
  return `
    Only ${chalk.green('<project-directory>')} is required.
    If you have any problems, do not hesitate to file an issue:
      ${chalk.cyan('https://github.com/Jordan-Gilliam/konkres/issues/new')}
  `;
};

exports.exampleHelp = function () {
  return `Example from https://github.com/module-federation/module-federation-examples/tree/master/ ${output.param(
    'example-path'
  )}`;
};

exports.missingProjectName = function () {
  return `
Please specify the project directory:
  ${chalk.cyan(program.name)} ${chalk.green('<project-directory>')}
For example:
  ${chalk.cyan(program.name)} ${chalk.green('my-matter')}
  ${chalk.cyan(program.name)} ${chalk.cyan(
    '--example with-preact'
  )} ${chalk.green('my-preact')}
Run ${chalk.cyan(`${program.name} --help`)} to see all options.
`;
};

exports.alreadyExists = function (projectName) {
  return `
Uh oh! Looks like there's already a directory called ${chalk.red(
    projectName
  )}. Please try a different name or delete that folder.`;
};

exports.installing = function (packages) {
  const pkgText = packages
    .map(function (pkg) {
      return `    ${chalk.cyan(chalk.bold(pkg))}`;
    })
    .join('\n');

  return `
  Installing npm modules:
${pkgText}
`;
};

exports.installError = function (packages) {
  const pkgText = packages
    .map(function (pkg) {
      return `${chalk.cyan(chalk.bold(pkg))}`;
    })
    .join(', ');

  output.error(`Failed to install ${pkgText}, try again.`);
};

exports.copying = function (projectName) {
  return `
Creating ${chalk.bold(chalk.green(projectName))}...
`;
};

exports.start = function (projectName) {
  const cmd = getInstallCmd();

  const commands = {
    install: cmd === 'npm' ? 'npm install' : 'yarn',
    build: cmd === 'npm' ? 'npm run build' : 'yarn build',
    start: cmd === 'npm' ? 'npm run start:prod' : 'yarn start:prod',
    dev: cmd === 'npm' ? 'npm start' : 'yarn start',
  };

  return `
  ${chalk.green('Awesome!')} You're now ready to start coding.
  
  I already ran ${output.cmd(commands.install)} for you, so your next steps are:
    ${output.cmd(`cd ${projectName}`)}
  
  To start a local server for development:
    ${output.cmd(commands.dev)}
  
  To build a version for production:
    ${output.cmd(commands.build)}

  To run the server in production:
    ${output.cmd(commands.start)}
`;
};
