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

// This is the Webpack configuration factory. It's the juice!
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

// const TerserPlugin = require('terser-webpack-plugin');
// const AssetsPlugin = require('assets-webpack-plugin');
// const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const safePostCssParser = require('postcss-safe-parser');
// const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
// const ManifestPlugin = require('webpack-manifest-plugin');
// "postcss" loader applies autoprefixer to our CSS.
// "css" loader resolves paths in CSS and adds assets as dependencies.
// "style" loader turns CSS into JS modules that inject <style> tags.
// In production, we use a plugin to extract that CSS to a file, but
// in development "style" loader enables hot editing of CSS.
//
// Note: this yields the exact same CSS config as create-react-app.
// {
//   test: /\.css$/,
//   exclude: [paths.appBuild, /\.module\.css$/],
//   use: IS_NODE
//     ? // Style-loader does not work in Node.js without some crazy
//       // magic. Luckily we just need css-loader.
//       [
//         {
//           loader: require.resolve('css-loader'),
//           options: {
//             importLoaders: 1,
//           },
//         },
//       ]
//     : IS_DEV
//     ? [
//         require.resolve('style-loader'),
//         {
//           loader: require.resolve('css-loader'),
//           options: {
//             importLoaders: 1,
//           },
//         },
//         {
//           loader: require.resolve('postcss-loader'),
//           options: postCssOptions,
//         },
//       ]
//     : [
//         MiniCssExtractPlugin.loader,
//         {
//           loader: require.resolve('css-loader'),
//           options: {
//             importLoaders: 1,
//             modules: false,
//           },
//         },
//         {
//           loader: require.resolve('postcss-loader'),
//           options: postCssOptions,
//         },
//       ],
// },
// // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
// // using the extension .module.css
// {
//   test: /\.module\.css$/,
//   exclude: [paths.appBuild],
//   use: IS_NODE
//     ? [
//         {
//           // on the server we do not need to embed the css and just want the identifier mappings
//           // https://github.com/webpack-contrib/css-loader#scope
//           loader: require.resolve('css-loader'),
//           options: {
//             onlyLocals: true,
//             importLoaders: 1,
//             modules: {
//               localIdentName: '[path]__[name]___[local]',
//             },
//           },
//         },
//       ]
//     : IS_DEV
//     ? [
//         require.resolve('style-loader'),
//         {
//           loader: require.resolve('css-loader'),
//           options: {
//             importLoaders: 1,
//             modules: {
//               localIdentName: '[path]__[name]___[local]',
//             },
//           },
//         },
//         {
//           loader: require.resolve('postcss-loader'),
//           options: postCssOptions,
//         },
//       ]
//     : [
//         MiniCssExtractPlugin.loader,
//         {
//           loader: require.resolve('css-loader'),
//           options: {
//             importLoaders: 1,
//             minimize: true,
//             modules: {
//               localIdentName: '[path]__[name]___[local]',
//             },
//           },
//         },
//         {
//           loader: require.resolve('postcss-loader'),
//           options: postCssOptions,
//         },
//       ],
// },
// CHUNK MANIFEST
// new ManifestPlugin({
//   fileName: path.join(paths.appBuild, 'chunks.json'),
//   writeToFileEmit: true,
//   filter: item => item.isChunk,
// generate: (seed, files) => {
//   const entrypoints = new Set();
//   files.forEach(file =>
//     ((file.chunk || {})._groups || []).forEach(group =>
//       entrypoints.add(group)
//     )
//   );
//   const entries = [...entrypoints];
//   const entryArrayManifest = entries.reduce((acc, entry) => {
//     const name =
//       (entry.options || {}).name || (entry.runtimeChunk || {}).name;
//     const files = []
//       .concat(
//         ...(entry.chunks || []).map(chunk =>
//           chunk.files.map(path => config.output.publicPath + path)
//         )
//       )
//       .filter(Boolean);

//     const cssFiles = files
//       .map(item => (item.indexOf('.css') !== -1 ? item : null))
//       .filter(Boolean);

//     const jsFiles = files
//       .map(item => (item.indexOf('.js') !== -1 ? item : null))
//       .filter(Boolean);

//     return name
//       ? {
//           ...acc,
//           [name]: {
//             css: cssFiles,
//             js: jsFiles,
//           },
//         }
//       : acc;
//   }, seed);
//   return entryArrayManifest;
// },
// }),
// config.optimization = {
//   moduleIds: 'deterministic',
//   minimize: true,
//   minimizer: [
//     new TerserPlugin({
//       terserOptions: {
//         parse: {
//           // we want uglify-js to parse ecma 8 code. However, we don't want it
//           // to apply any minfication steps that turns valid ecma 5 code
//           // into invalid ecma 5 code. This is why the 'compress' and 'output'
//           // sections only apply transformations that are ecma 5 safe
//           // https://github.com/facebook/create-react-app/pull/4234
//           ecma: 8,
//         },
//         compress: {
//           ecma: 5,
//           warnings: false,
//           // Disabled because of an issue with Uglify breaking seemingly valid code:
//           // https://github.com/facebook/create-react-app/issues/2376
//           // Pending further investigation:
//           // https://github.com/mishoo/UglifyJS2/issues/2011
//           comparisons: false,
//           // Disabled because of an issue with Terser breaking valid code:
//           // https://github.com/facebook/create-react-app/issues/5250
//           // Pending futher investigation:
//           // https://github.com/terser-js/terser/issues/120
//           inline: 2,
//         },
//         mangle: {
//           safari10: true,
//         },
//         output: {
//           ecma: 5,
//           comments: false,
//           // Turned on because emoji and regex is not minified properly using default
//           // https://github.com/facebook/create-react-app/issues/2488
//           ascii_only: true,
//         },
//       },
//       // @todo add flag for sourcemaps
//       sourceMap: true,
//     }),
//     new OptimizeCSSAssetsPlugin({
//       cssProcessorOptions: {
//         parser: safePostCssParser,
//         // @todo add flag for sourcemaps
//         map: {
//           // `inline: false` forces the sourcemap to be output into a
//           // separate file
//           inline: false,
//           // `annotation: true` appends the sourceMappingURL to the end of
//           // the css file, helping the browser find the sourcemap
//           annotation: true,
//         },
//       },
//     }),
//   ],
// };
