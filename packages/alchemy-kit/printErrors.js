'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const chalk = require('chalk');

/**
 * Print an array of errors to console.
 *
 * @param {string} summary Summary of error
 * @param {Array<Error>} errors Array of Errors
 */
function printErrors(summary, errors) {
  console.log(chalk.red(summary));
  console.log();
  errors.forEach((err) => {
    console.log(err.message || err);
    console.log();
  });
}

module.exports = printErrors;
