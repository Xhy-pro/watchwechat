/* eslint valid-jsdoc: "off" */

'use strict';
const path = require('path');
/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = () => {
  const logger = {
    dir: path.resolve('/home/logs'),
  };
  return {
    logger,
  };
};
