'use strict';
/* 
    ORIGINALLY CREATED BY JARED PALMER
      - forked copy from @after.js + razzle
      - re-purposed with wp5 module-federation as a first class citizen
*/

function runPlugin(plugin, config, { target, dev }, webpack) {
  if (typeof plugin === 'string') {
    // Apply the plugin with default options if passing only a string
    return runPlugin({ name: plugin }, config, { target, dev }, webpack);
  }

  if (typeof plugin === 'function') {
    return plugin(config, { target, dev }, webpack);
  }

  if (typeof plugin.func === 'function') {
    // Used for writing plugin tests
    return plugin.func(config, { target, dev }, webpack, plugin.options);
  }

  const completePluginName = `matter-plugin-${plugin.name}`;

  // Try to find the plugin in node_modules
  const matterPlugin = require(completePluginName);
  if (!matterPlugin) {
    throw new Error(`Unable to find '${completePluginName}`);
  }

  return matterPlugin(config, { target, dev }, webpack, plugin.options);
}

module.exports = runPlugin;
