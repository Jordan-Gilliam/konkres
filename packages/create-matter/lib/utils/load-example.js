'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const exec = require('execa');
const Promise = require('promise');
const output = require('./output');

module.exports = function loadExample(opts) {
  const projectName = opts.projectName;
  const example = opts.example;
  const cmds = [
    `mkdir -p ${projectName}`,
    `curl https://codeload.github.com/module-federation/module-federation-examples/tar.gz/master | tar -xz -C ${projectName} --strip=3 matter-master/examples/${example}`,
  ];

  const stopExampleSpinner = output.wait(
    `Downloading files for ${output.cmd(example)} example`
  );
  const cmdPromises = cmds.map(function (cmd) {
    return exec(cmd, { shell: true });
  });

  return Promise.all(cmdPromises).then(function () {
    stopExampleSpinner();
    output.success(
      `Downloaded ${output.cmd(example)} files for ${output.cmd(projectName)}`
    );
  });
};
