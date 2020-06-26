'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const createMatter = require('./lib');
const messages = require('./lib/messages');

module.exports = {
  messages: messages,
  createMatter: createMatter,
};
