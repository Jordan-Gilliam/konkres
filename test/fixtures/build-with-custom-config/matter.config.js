'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

module.exports = {
  modify(config, { target, dev }, webpack) {
    if (target === 'node' && !dev) {
      config.output.filename = 'custom.js';
    }

    return config;
  },
};
