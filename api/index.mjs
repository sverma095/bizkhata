// ESM entry point for Vercel serverless function
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const server = require(join(__dirname, '../dist/server.cjs'));
export default server.default || server;
