// This file is used to configure the proxy for the rpc (to make calls from https to http)
import { Application } from 'express';
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app: Application) {
  app.use(
    '/rpc',
    createProxyMiddleware({
      target: process.env.REACT_APP_RPC_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/rpc': '', // remove /rpc from the URL path before forwarding
      },
    })
  );
};
