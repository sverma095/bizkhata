// Zero-dependency smoke test using Node's built-in test runner (Node 24+).
// Run: npm run smoke-test  (defaults to SMOKE_BASE_URL or http://localhost:3000)
// Run against production: SMOKE_BASE_URL=https://bizkhata.app npm run smoke-test
//
// Covers the critical paths called out in the developer handover doc:
//   - health check responds
//   - login endpoint exists and rejects bad credentials cleanly (not a 500)
//   - auth rate limiting actually kicks in after repeated attempts
//   - unauthenticated access to a protected route is refused
//
// This is intentionally not a full test suite (none existed before this).
// It's a fast, dependency-free guardrail to run before/after deploys.

import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function post(path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

test("health check responds", async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  assert.equal(res.status, 200, "expected /api/health to return 200");
  const data = await res.json();
  assert.ok(data, "expected /api/health to return a JSON body");
});

test("login rejects bad credentials without a 500", async () => {
  const res = await post("/api/auth/login", {
    email: "smoke-test-nonexistent@example.com",
    password: "wrong-password",
  });
  assert.ok(
    res.status === 401 || res.status === 400 || res.status === 404,
    `expected a clean 4xx for bad login, got ${res.status}`
  );
});

test("protected route refuses unauthenticated access", async () => {
  const res = await fetch(`${BASE_URL}/api/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
});

test("auth rate limiting kicks in after repeated attempts", async () => {
  const attempts = 8; // above the 5/10min limit set in server.ts
  let sawRateLimit = false;
  for (let i = 0; i < attempts; i++) {
    const res = await post("/api/auth/login", {
      email: "smoke-test-rate-limit@example.com",
      password: "wrong-password",
    });
    if (res.status === 429) {
      sawRateLimit = true;
      break;
    }
  }
  assert.ok(sawRateLimit, `expected a 429 within ${attempts} attempts, rate limiting may not be active`);
});
