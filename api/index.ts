// Minimal Vercel entry — delegates to pre-compiled CJS bundle
// This file is intentionally tiny to avoid @vercel/node compilation issues

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../dist/server.cjs").default;
export default app;
