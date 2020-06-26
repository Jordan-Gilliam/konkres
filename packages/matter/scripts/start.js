#! /usr/bin/env node
'use strict';

process.env.NODE_ENV = 'development';
const fs = require('fs-extra');
const mri = require('mri');
const webpack = require('webpack');
const paths = require('../config/paths');
const createConfig = require('../config/createConfig');
const devServer = require('webpack-dev-server');
const printErrors = require('alchemy-kit/printErrors');
const clearConsole = require('react-dev-utils/clearConsole');
const logger = require('alchemy-kit/logger');
const setPorts = require('alchemy-kit/setPorts');
const chalk = require('chalk');

process.noDeprecation = true; // turns off that loadQuery clutter.

const argv = process.argv.slice(2);
const cliArgs = mri(argv);

// Set the default build mode to isomorphic
cliArgs.type = cliArgs.type || 'iso';

// Capture any --inspect or --inspect-brk flags (with optional values) so that we
// can pass them when we invoke nodejs
process.env.INSPECT_BRK = cliArgs['inspect-brk'] || '';
process.env.INSPECT = cliArgs.inspect || '';
// Capture the type (isomorphic or single-page) as an environment variable
process.env.BUILD_TYPE = cliArgs.type;

const clientOnly = cliArgs.type === 'spa';

function main() {
  // Optimistically, we make the console look exactly like the output of our
  // FriendlyErrorsPlugin during compilation, so the user has immediate feedback.
  // clearConsole();
  logger.start('Compiling...');
  let matter = {};

  // Check for matter.config.js file
  if (fs.existsSync(paths.appMatterConfig)) {
    try {
      matter = require(paths.appMatterConfig);
    } catch (e) {
      clearConsole();
      logger.error('Invalid matter.config.js file.', e);
      process.exit(1);
    }
  }

  if (clientOnly) {
    // Check for public/index.html file
    if (!fs.existsSync(paths.appHtml)) {
      clearConsole();
      logger.error(`index.html dose not exists public folder.`);
      process.exit(1);
    }
  }

  // Delete assets.json and chunks.json to always have a manifest up to date
  fs.removeSync(paths.appAssetsManifest);
  fs.removeSync(paths.appChunksManifest);

  // Create dev configs using our config factory, passing in matter file as
  // options.
  let clientConfig = createConfig('web', 'dev', matter, webpack, clientOnly);
  const clientCompiler = compile(clientConfig);

  let serverConfig;
  let serverCompiler;

  if (!clientOnly) {
    serverConfig = createConfig('node', 'dev', matter, webpack);
    serverCompiler = compile(serverConfig);
  }

  const port = matter.port || clientConfig.devServer.port;

  // Compile our assets with webpack
  // Instatiate a variable to track server watching
  let watching;

  // in SPA mode we want to give the user
  // feedback about the port that app is running on
  // this variable helps us to don't show
  // the message multiple times ...
  let logged = false;

  // Start our server webpack instance in watch mode after assets compile
  clientCompiler.hooks.done.tap('matter', () => {
    // If we've already started the server watcher, bail early.
    if (watching) {
      return;
    }

    if (!clientOnly && serverCompiler) {
      // Otherwise, create a new watcher for our server code.
      watching = serverCompiler.watch(
        {
          quiet: true,
          stats: 'none',
        },
        /* eslint-disable no-unused-vars */
        (stats) => {}
      );
    }

    // in SPA mode we want to give the user
    // feedback about the port that app is running on
    if (clientOnly && !logged) {
      logged = true;
      console.log(chalk.green(`> SPA Started on port ${port}`));
    }
  });

  // Create a new instance of Webpack-dev-server for our client assets.
  // This will actually run on a different port than the users app.
  const clientDevServer = new devServer(clientCompiler, clientConfig.devServer);
  // Start Webpack-dev-server
  clientDevServer.listen(port, (err) => {
    if (err) {
      logger.error(err);
    }
  });
}

// Webpack compile in a try-catch
function compile(config) {
  let compiler;
  try {
    compiler = webpack(config);
  } catch (e) {
    printErrors('Failed to compile.', [e]);
    process.exit(1);
  }
  return compiler;
}

setPorts().then(main).catch(console.error);
