'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

// This is a custom Jest transformer turning style imports into empty objects.
// http://facebook.github.io/jest/docs/tutorial-webpack.html

module.exports = {
  process() {
    return 'module.exports = {};';
  },
  getCacheKey() {
    // The output is always the same.
    return 'cssTransform';
  },
};
