'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const execa = require('execa');

let cmd;

module.exports = function getInstallCmd() {
  if (cmd) {
    return cmd;
  }

  try {
    execa.sync('yarnpkg', ['--version']);
    cmd = 'yarn';
  } catch (e) {
    cmd = 'npm';
  }

  return cmd;
};
