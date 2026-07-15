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

test("Owner login loads a full db with accounts populated", async () => {
  // Regression test: the demo-org (org_verma_consultancy) cache pre-population used
  // to call getInitialState() before DEFAULT_ACCOUNTS was declared (a module-load-order
  // bug), which silently produced accounts: undefined - dropped entirely by
  // JSON.stringify - and crashed Dashboard.tsx on db.accounts.find(...) for every
  // Owner login. Caught by hand via browser reproduction; this locks it in going forward.
  const loginRes = await post("/api/auth/login", {
    email: "svtiger543939@gmail.com",
    password: "Admin@123",
  });
  assert.equal(loginRes.status, 200, "expected Owner login to succeed");
  const { token } = await loginRes.json();
  const dbRes = await fetch(`${BASE_URL}/api/db`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(dbRes.status, 200, "expected /api/db to return 200 for a logged-in Owner");
  const db = await dbRes.json();
  assert.ok(Array.isArray(db.accounts) && db.accounts.length > 0, "expected db.accounts to be a non-empty array");
});

test("registration survives to the approval queue and can be approved", async () => {
  // Regression test: register-request and the approve/reject action handler both used
  // to mutate USER_DB without reliably persisting it (register-request was
  // fire-and-forget; approve/reject didn't call saveUserDB at all). On Vercel this could
  // mean a registration looked fine in the list (served by the instance that created it)
  // but 404'd as "Registration not found" the moment a different instance tried to
  // approve it, because the write never actually reached Supabase. This test exercises
  // the same in-process path (send OTP -> register -> approve) end-to-end.
  const superAdminLogin = await post("/api/auth/login", { email: "owner@bizkhata.app", password: "Admin@123" });
  assert.equal(superAdminLogin.status, 200);
  const { token } = await superAdminLogin.json();

  const email = `regtest-${Date.now()}@example.com`;
  await post("/api/auth/send-reg-otp", { email });
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
  const notifs = await notifRes.json();
  const match = notifs.find((n) => n.body.includes(email));
  assert.ok(match, "expected an OTP notification for the test email");
  const otp = match.body.match(/: (\d{6})/)[1];

  const regRes = await post("/api/auth/register-request", {
    companyName: "Smoke Test Co",
    adminName: "Smoke Tester",
    email,
    mobileNumber: "9000000000",
    password: "Test@1234",
    numberOfRequiredSeats: 3,
    emailOtp: otp,
  });
  assert.equal(regRes.status, 201, "expected registration to succeed");
  const reg = await regRes.json();

  const approveRes = await fetch(`${BASE_URL}/api/superadmin/registrations/${reg.id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "Approve", subscriptionMonths: 12 }),
  });
  assert.equal(approveRes.status, 200, "expected the just-created registration to be found and approvable, not 404");
  const approveBody = await approveRes.json();
  assert.equal(approveBody.reg.status, "Approved");
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
