'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const psTree = require('ps-tree');

// Loops through processes and kills them
module.exports = (pid, log = true, signal = 'SIGKILL', callback) => {
  psTree(pid, (err, children) => {
    let arr = [pid].concat(children.map((p) => p.PID));
    arr = arr.filter((item, poss) => arr.indexOf(item) === poss);
    arr.forEach((tpid) => {
      try {
        process.kill(tpid, signal);
      } catch (ex) {
        const logger = console;
        if (log) logger.log('Could not kill process', tpid, ex);
      }
    });
    if (callback) {
      callback();
    }
  });
};
