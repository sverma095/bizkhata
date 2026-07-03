// CJS entry for Vercel — delegates to compiled bundle
const server = require('../dist/server.cjs');
module.exports = server.default || server;
