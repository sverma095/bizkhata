// CJS entry for Vercel — no type:module, no ESM issues
const server = require('../dist/server.cjs');
module.exports = server.default || server;
