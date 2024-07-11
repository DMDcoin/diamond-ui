// This file is used to configure the proxy for the rpc (to make calls from https to http)
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/rpc',
    createProxyMiddleware({
      target: 'http://62.171.133.46:38000',
      changeOrigin: true,
      pathRewrite: {
        '^/rpc': '', // remove /rpc from the URL path before forwarding
      },
    })
  );
};
