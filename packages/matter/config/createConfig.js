'use strict';

const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const nodeExternals = require('webpack-node-externals');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const StartServerPlugin = require('@fivethreeo/start-server-webpack-plugin');
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');

// const ModuleFederationPlugin = require('webpack').container
//   .ModuleFederationPlugin;
const paths = require('./paths');
const runPlugin = require('./runPlugin');
const getClientEnv = require('./env').getClientEnv;
const modules = require('./modules');

// Server + Client Webpack config
module.exports = (
  target = 'web',
  env = 'dev',
  {
    clearConsole = true,
    host = 'localhost',
    port = 3000,
    modify,
    plugins,
    modifyBabelOptions,
  },
  webpackObject,
  clientOnly = false
) => {
  /*------------.ENV ALIAS------------*/
  // Define some useful shorthands.
  const IS_NODE = target === 'node';
  const IS_WEB = target === 'web';
  const IS_PROD = env === 'prod';
  const IS_DEV = env === 'dev';
  process.env.NODE_ENV = IS_PROD ? 'production' : 'development';

  /*------------USER CONFIG------------*/
  const hasBabelRc = fs.existsSync(paths.appBabelRc);
  const mainBabelOptions = {
    babelrc: true,
    cacheDirectory: true,
    presets: [],
  };

  if (!hasBabelRc) {
    mainBabelOptions.presets.push(require.resolve('../babel'));
  }

  // Allow app to override babel options
  const babelOptions = modifyBabelOptions
    ? modifyBabelOptions(mainBabelOptions, { target, dev: IS_DEV })
    : mainBabelOptions;

  if (hasBabelRc && babelOptions.babelrc) {
    console.log('Using .babelrc defined in your app root');
  }

  const dotenv = getClientEnv(target, { clearConsole, host, port });

  const portOffset = clientOnly ? 0 : 1;

  const devServerPort =
    (process.env.PORT && parseInt(process.env.PORT) + portOffset) ||
    3000 + portOffset;

  // VMs, Docker containers might not be available at localhost:3001. CLIENT_PUBLIC_PATH can override.
  const clientPublicPath =
    dotenv.raw.CLIENT_PUBLIC_PATH ||
    (IS_DEV ? `http://${dotenv.raw.HOST}:${devServerPort}/` : '/');

  /*------------BASE CONFIG------------*/

  let config = {
    // Set webpack mode:
    mode: IS_DEV ? 'development' : 'production',
    // Set webpack context to the current command's directory
    context: process.cwd(),
    // Specify target (either 'node' or 'web')
    target: target,
    // Controversially, decide on sourcemaps.
    devtool: IS_DEV ? 'cheap-module-source-map' : 'source-map',

    // We need to tell webpack how to resolve both of Matter's node_modules and
    // the users', so we use resolve and resolveLoader.
    resolve: {
      modules: ['node_modules', paths.appNodeModules].concat(
        modules.additionalModulePaths || []
      ),
      extensions: ['.mjs', '.js', '.jsx', '.json'],
      alias: {
        // This is required so symlinks work during development.
        'webpack/hot/poll': require.resolve('webpack/hot/poll'),
      },
    },
    resolveLoader: {
      modules: [paths.appNodeModules, paths.ownNodeModules],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Avoid "require is not defined" errors
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        // Transform ES6 with Babel
        {
          test: /\.(js|jsx|mjs)$/,
          include: [paths.appSrc],
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: babelOptions,
            },
          ],
        },
        {
          exclude: [
            /\.html$/,
            /\.(js|jsx|mjs)$/,
            /\.(ts|tsx)$/,
            /\.(vue)$/,
            /\.(less)$/,
            /\.(re)$/,
            /\.(s?css|sass)$/,
            /\.json$/,
            /\.bmp$/,
            /\.gif$/,
            /\.jpe?g$/,
            /\.png$/,
          ],
          loader: require.resolve('file-loader'),
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
            emitFile: IS_WEB,
          },
        },
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          loader: require.resolve('url-loader'),
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
            emitFile: IS_WEB,
          },
        },
      ],
    },
  };

  /*------------SERVER CONFIG------------*/

  if (IS_NODE) {
    // We want to uphold node's __filename, and __dirname.
    config.node = {
      __dirname: false,
      __filename: false,
    };

    // We need to tell webpack what to bundle into our Node bundle.
    config.externals = [
      nodeExternals({
        whitelist: [
          IS_DEV ? 'webpack/hot/poll?300' : null,
          /\.(eot|woff|woff2|ttf|otf)$/,
          /\.(svg|png|jpg|jpeg|gif|ico)$/,
          /\.(mp4|mp3|ogg|swf|webp)$/,
          /\.(css|scss|sass|sss|less)$/,
        ].filter((x) => x),
      }),
    ];

    // SERVER OUT
    config.output = {
      path: paths.appBuild,
      publicPath: clientPublicPath,
      filename: 'server.js',
      libraryTarget: 'commonjs2',
    };

    // SERVER LIB
    config.output.library = {
      type: 'commonjs2',
      name: 'server',
    };

    // SERVER PLUGINS
    config.plugins = [
      // We define environment variables that can be accessed globally in our
      new webpack.DefinePlugin(dotenv.stringified),
    ];

    // SERVER PROD
    if (IS_PROD) {
      config.plugins.push(
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1,
        })
      );
    }

    config.entry = [paths.appServerIndexJs];

    // SERVER DEV
    if (IS_DEV) {
      config.watch = true;
      config.entry.unshift('webpack/hot/poll?300');

      // Pretty format server errors
      config.entry.unshift('alchemy-kit/prettyNodeErrors');

      const nodeArgs = ['-r', 'source-map-support/register'];

      // Passthrough --inspect and --inspect-brk flags (with optional [host:port] value) to node
      if (process.env.INSPECT_BRK) {
        nodeArgs.push(process.env.INSPECT_BRK);
      } else if (process.env.INSPECT) {
        nodeArgs.push(process.env.INSPECT);
      }

      config.plugins = [
        ...config.plugins,
        // Add hot module replacement
        new webpack.HotModuleReplacementPlugin(),
        // Suppress errors to console (we use our own logger)
        new StartServerPlugin({
          name: 'server.js',
          nodeArgs,
        }),
        // Ignore assets.json and chunks.json to avoid infinite recompile bug
        new webpack.WatchIgnorePlugin({
          paths: [paths.appAssetsManifest, paths.appChunksManifest],
        }),
      ];
    }
  }

  /*------------CLIENT CONFIG------------*/

  if (IS_WEB) {
    // ASSETS
    // new AssetsPlugin({
    //   path: paths.appBuild,
    //   filename: 'assets.json',
    // }),
    config.plugins = [];

    if (IS_DEV) {
      config.entry = {
        client: [
          require.resolve('alchemy-kit/webpackHotDevClient'),
          paths.appClientIndexJs,
        ],
      };
      config.output = {
        path: paths.appBuildPublic,
        publicPath: clientPublicPath,
        pathinfo: true,
        libraryTarget: 'var',
        filename: 'static/js/bundle.js',
        // chunkFilename: 'static/js/[name].chunk.js',
        devtoolModuleFilenameTemplate: (info) =>
          path.resolve(info.resourcePath).replace(/\\/g, '/'),
      };
      config.output.library = {
        type: 'var',
        name: 'client',
      };
      // Configure webpack-dev-server to serve our client-side bundle from
      // http://${dotenv.raw.HOST}:3001
      config.devServer = {
        disableHostCheck: true,
        clientLogLevel: 'none', // Enable gzip compression of generated files.
        compress: true, // watchContentBase: true,
        headers: { 'Access-Control-Allow-Origin': '*' },
        historyApiFallback: {
          // Paths with dots should still use the history fallback.
          // See https://github.com/facebookincubator/create-react-app/issues/387.
          disableDotRule: true,
        },
        host: dotenv.raw.HOST,
        hot: true,
        noInfo: true,
        overlay: false,
        port: devServerPort,
        quiet: true, // By default files from `contentBase` will not trigger a page reload.
        // Reportedly, this avoids CPU overload on some systems.
        // https://github.com/facebookincubator/create-react-app/issues/293
        watchOptions: { ignored: /node_modules/ },
        before(app) {
          // This lets us open files from the runtime error overlay.
          app.use(errorOverlayMiddleware());
        },
      };
      config.plugins = [
        ...config.plugins,
        new webpack.HotModuleReplacementPlugin({
          // set this true will break HtmlWebpackPlugin
          multiStep: !clientOnly,
        }),
        new webpack.DefinePlugin(dotenv.stringified),
      ];

      config.optimization = {};

      // CLIENT PROD ENV
    } else {
      config.entry = {
        client: paths.appClientIndexJs,
      };

      // Specify the client output directory and paths. Notice that we have
      // changed the publicPath to just '/' from http://localhost:3001. This is because
      // we will only be using one port in production.
      config.output = {
        path: paths.appBuildPublic,
        publicPath: dotenv.raw.PUBLIC_PATH || '/',
        filename: 'static/js/bundle.js',
      };

      // config.output.library = {
      //   type: 'var',
      //   name: 'client',
      // };
      // // Extract our CSS into files.
      // new MiniCssExtractPlugin({
      //   filename: 'static/css/bundle.[contenthash:8].css',
      //   chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      // }),
      // new webpack.optimize.AggressiveMergingPlugin(),

      // CLIENT PROD ENV
      config.plugins = [
        ...config.plugins,
        // Define production environment vars
        new webpack.DefinePlugin(dotenv.stringified),
      ].filter((x) => x);
    }

    if (clientOnly) {
      if (IS_DEV) {
        config.devServer.contentBase = paths.appPublic;
        config.devServer.watchContentBase = true;
        config.devServer.publicPath = '/';
      }

      config.plugins = [
        ...config.plugins,
        // Generates an `index.html` file with the <script> injected.
        new HtmlWebpackPlugin(
          Object.assign(
            {},
            {
              inject: true,
              template: paths.appHtml,
            },
            IS_PROD
              ? {
                  minify: {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true,
                    minifyURLs: true,
                  },
                }
              : {}
          )
        ),
      ];
    }
  }

  if (IS_DEV) {
    config.plugins = [
      ...config.plugins,
      new WebpackBar({
        color: target === 'web' ? '#f56be2' : '#c065f4',
        name: target === 'web' ? 'client' : 'server',
      }),
    ];
  }

  // USER CONFIG EXTENSION
  if (Array.isArray(plugins)) {
    plugins.forEach((plugin) => {
      config = runPlugin(
        plugin,
        config,
        { target, dev: IS_DEV },
        webpackObject
      );
    });
  }

  // Check if matter.config has a modify function. If it does, call it on the configs we created.
  // USER CONFIG OVERRIDES
  if (modify) {
    config = modify(config, { target, dev: IS_DEV }, webpackObject);
  }

  config.plugins.push(function () {
    this.hooks.done.tap('debug', function (stats) {
      if (stats.compilation.errors && stats.compilation.errors.length) {
        console.log(stats.compilation.errors);
        process.exit(1);
      }
      // ...
    });
  });
  return config;
};
