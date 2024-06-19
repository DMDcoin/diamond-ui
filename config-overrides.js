/* config-overrides.js */
const webpack = require('webpack');
module.exports = function override(config, env) {
    //do stuff with the webpack config...

    config.resolve.fallback = {
        url: require.resolve("url/"),
        http: require.resolve("stream-http"),
        zlib: require.resolve("browserify-zlib"),
        https: require.resolve("https-browserify"),
        stream: require.resolve('stream-browserify'),
    };

    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
    );

    return config;
}