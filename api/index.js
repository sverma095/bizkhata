// CommonJS wrapper for Vercel serverless — avoids ESM/CJS conflicts
const server = require('../dist/server.cjs');
module.exports = server.default || server;
