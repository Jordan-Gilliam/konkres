'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const babelJest = require('babel-jest');
const paths = require('../paths');
const fs = require('fs-extra');

const hasBabelRc = fs.existsSync(paths.appBabelRc);

const config = {
  presets: !hasBabelRc && [require.resolve('babel-preset-matter')],
  babelrc: !!hasBabelRc,
};

module.exports = babelJest.createTransformer(config);
