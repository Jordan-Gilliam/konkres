'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

function matterFormatWebpackMessages(messages) {
  return formatWebpackMessages(
    ['errors', 'warnings'].reduce(
      function (result, item) {
        result[item] = result[item].concat(
          messages[item].map(function (stat) {
            return stat.message;
          })
        );
        return result;
      },
      { errors: [], warnings: [] }
    )
  );
}
module.exports = matterFormatWebpackMessages;
