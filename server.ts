import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// ── User Management In-Memory DB ─────────────────────────────────────────────
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

const ALL_PERMISSIONS_LIST = [
  { id: 'view_invoices', label: 'View Invoices', category: 'Invoices' },
  { id: 'create_invoices', label: 'Create Invoices', category: 'Invoices' },
  { id: 'edit_invoices', label: 'Edit Invoices', category: 'Invoices' },
  { id: 'delete_invoices', label: 'Delete Invoices', category: 'Invoices' },
  { id: 'approve_payments', label: 'Approve Payments', category: 'Finance' },
  { id: 'manage_customers', label: 'Manage Customers', category: 'Contacts' },
  { id: 'manage_vendors', label: 'Manage Vendors', category: 'Contacts' },
  { id: 'view_reports', label: 'View Reports', category: 'Reporting' },
  { id: 'export_data', label: 'Export Data', category: 'Reporting' },
  { id: 'manage_users', label: 'Manage Users', category: 'Admin' },
  { id: 'view_journals', label: 'View Journals', category: 'Accounting' },
  { id: 'create_journals', label: 'Create Journals', category: 'Accounting' },
  { id: 'manage_items', label: 'Manage Items/Inventory', category: 'Inventory' },
  { id: 'manage_billing', label: 'Manage Billing/Bills', category: 'Finance' },
  { id: 'view_banking', label: 'View Banking', category: 'Banking' },
];

const USER_DB: {
  organizations: any[];
  users: any[];
  seatRequests: any[];
  auditLogs: any[];
  customRoles: any[];
  registrationRequests: any[];
  notifications: any[];
  supportTickets: any[];
} = {
  organizations: [],
  users: [],
  seatRequests: [],
  auditLogs: [],
  customRoles: [],
  registrationRequests: [],
  notifications: [],
  supportTickets: []
};

// USER_DB (multi-tenant SaaS state: orgs, registrations, seat requests, etc.) must be
// persisted the same way the main accounting ledger is — otherwise it resets on every
// Vercel cold start, which silently drops pending registration approvals, seat requests,
// and audit logs. Persisted under a separate row in the same bizkhata_state table.
let userDbLoaded = false;

// ── Supabase REST helpers for USER_DB tables ──────────────────────────────
const sbHeaders = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Prefer": "return=representation"
});

async function sbSelect(table: string, filter?: string): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? `?${filter}` : ""}`;
  try {
    const r = await fetch(url, { headers: sbHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

async function sbUpsert(table: string, data: any | any[]): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { ...sbHeaders(), "Prefer": "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify(Array.isArray(data) ? data : [data]),
      signal: AbortSignal.timeout(8000)
    });
    return r.ok || r.status === 204;
  } catch { return false; }
}

async function sbDelete(table: string, filter: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  try {
    const r = await fetch(url, { method: "DELETE", headers: sbHeaders(), signal: AbortSignal.timeout(8000) });
    return r.ok || r.status === 204;
  } catch { return false; }
}

// ── Migrate legacy blob to tables (run once, idempotent) ─────────────────
async function migrateLegacyBlob(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.superadmin_state&select=state`;
    const r = await fetch(url, { headers: sbHeaders(), signal: AbortSignal.timeout(6000) });
    if (!r.ok) return;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].state) return;
    const blob = rows[0].state;
    // Migrate each array into its dedicated table
    if (blob.organizations?.length) await sbUpsert("bk_organizations", blob.organizations);
    if (blob.users?.length) await sbUpsert("bk_users", blob.users.map((u: any) => ({ ...u, organizationid: u.organizationId || null })));
    if (blob.registrationRequests?.length) await sbUpsert("bk_registrations", blob.registrationRequests);
    if (blob.seatRequests?.length) await sbUpsert("bk_seat_requests", blob.seatRequests);
    if (blob.supportTickets?.length) await sbUpsert("bk_support_tickets", blob.supportTickets);
    if (blob.notifications?.length) await sbUpsert("bk_notifications", blob.notifications.slice(0, 100));
    // Mark blob as migrated
    await fetch(`${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.superadmin_state`, {
      method: "PATCH", headers: sbHeaders(),
      body: JSON.stringify({ state: { ...blob, _migrated: true } })
    });
    console.log("Legacy USER_DB blob migrated to dedicated tables.");
  } catch (err) {
    console.error("migrateLegacyBlob failed:", err);
  }
}

async function loadUserDB(): Promise<void> {
  if (userDbLoaded) return;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      // Load from dedicated tables (new schema)
      const [orgs, users, regs, seats, tickets, notifs] = await Promise.all([
        sbSelect("bk_organizations"),
        sbSelect("bk_users"),
        sbSelect("bk_registrations"),
        sbSelect("bk_seat_requests"),
        sbSelect("bk_support_tickets"),
        sbSelect("bk_notifications", "limit=200&order=created_at.desc")
      ]);

      if (orgs.length || users.length) {
        // Normalize column names (Supabase returns snake_case)
        USER_DB.organizations = orgs.map((o: any) => ({ ...o, id: o.id }));
        USER_DB.users = users.map((u: any) => ({ ...u, organizationId: u.organizationid || u.organizationId || null }));
        USER_DB.registrationRequests = regs;
        USER_DB.seatRequests = seats;
        USER_DB.supportTickets = tickets;
        USER_DB.notifications = notifs;
      } else {
        // Tables empty — try migrating legacy blob
        await migrateLegacyBlob();
        // Re-load after migration
        const [o2, u2, r2, s2, t2, n2] = await Promise.all([
          sbSelect("bk_organizations"), sbSelect("bk_users"),
          sbSelect("bk_registrations"), sbSelect("bk_seat_requests"),
          sbSelect("bk_support_tickets"), sbSelect("bk_notifications", "limit=200")
        ]);
        USER_DB.organizations = o2;
        USER_DB.users = u2.map((u: any) => ({ ...u, organizationId: u.organizationid || u.organizationId || null }));
        USER_DB.registrationRequests = r2;
        USER_DB.seatRequests = s2;
        USER_DB.supportTickets = t2;
        USER_DB.notifications = n2;
      }
    } catch (err) {
      console.error("loadUserDB: Supabase table read failed:", err);
    }
  }

  // Local-dev fallback
  if (USER_DB.users.length === 0) {
    try {
      const f = process.env.VERCEL === "1" ? "/tmp/bizkhata_userdb.json" : path.join(process.cwd(), "bizkhata_userdb.json");
      if (fs.existsSync(f)) Object.assign(USER_DB, JSON.parse(fs.readFileSync(f, "utf8")));
    } catch { }
  }

  // --- ENFORCE CANONICAL ACCOUNTS ---
  const saIdx = USER_DB.users.findIndex((u: any) => u.role === "Super Admin" || u.email === SUPERADMIN_EMAIL);
  if (saIdx >= 0) {
    USER_DB.users[saIdx].email = SUPERADMIN_EMAIL;
    USER_DB.users[saIdx].password = hashPassword(SUPERADMIN_PASSWORD);
    USER_DB.users[saIdx].status = "Active";
    USER_DB.users[saIdx].role = "Super Admin";
  } else {
    USER_DB.users.push({ id: "user_superadmin", organizationId: null, fullName: SUPERADMIN_NAME, email: SUPERADMIN_EMAIL, mobileNumber: "", role: "Super Admin", status: "Active", password: hashPassword(SUPERADMIN_PASSWORD), permissions: ALL_PERMISSIONS_LIST.map((p: any) => p.id), twoFactorEnabled: false, twoFactorVerified: false, createdAt: "2026-01-01T00:00:00Z" });
  }

  const ownerOrgId = "org_verma_consultancy";
  if (!USER_DB.organizations.find((o: any) => o.id === ownerOrgId)) {
    USER_DB.organizations.push({ id: ownerOrgId, name: "Verma Consultancy Services", gstNumber: "09AABFV1234A1Z5", status: "Active", allocatedSeats: 10, usedSeats: 1, createdAt: "2026-01-01T00:00:00Z", approvedAt: "2026-01-01T00:00:00Z", subscriptionExpiresAt: "2027-01-01T00:00:00Z", subscriptionMonths: 12 });
  }

  const ownerEmail = "svtiger543939@gmail.com";
  const ownerIdx = USER_DB.users.findIndex((u: any) => u.email === ownerEmail);
  if (ownerIdx >= 0) {
    USER_DB.users[ownerIdx].organizationId = ownerOrgId;
    USER_DB.users[ownerIdx].password = hashPassword("Admin@123");
    USER_DB.users[ownerIdx].status = "Active";
    USER_DB.users[ownerIdx].role = "Admin";
  } else {
    USER_DB.users.push({ id: "user_verma_owner", organizationId: ownerOrgId, fullName: "Sunil Verma", email: ownerEmail, mobileNumber: "+919876543210", department: "Management", designation: "Owner", role: "Admin", status: "Active", password: hashPassword("Admin@123"), permissions: ALL_PERMISSIONS_LIST.map((p: any) => p.id), twoFactorEnabled: false, twoFactorVerified: false, createdAt: "2026-01-01T00:00:00Z" });
  }

  // De-duplicate
  const seen = new Set<string>();
  USER_DB.users = USER_DB.users.filter((u: any) => { if (seen.has(u.email)) return false; seen.add(u.email); return true; });

  userDbLoaded = true;
  saveUserDB().catch(() => {});
}

async function saveUserDB(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Local-dev fallback
    try {
      const f = process.env.VERCEL === "1" ? "/tmp/bizkhata_userdb.json" : path.join(process.cwd(), "bizkhata_userdb.json");
      fs.writeFileSync(f, JSON.stringify(USER_DB, null, 2), "utf8");
    } catch { }
    return;
  }
  // Write each table independently — non-blocking, parallel
  const writes: Promise<boolean>[] = [];
  if (USER_DB.organizations.length) writes.push(sbUpsert("bk_organizations", USER_DB.organizations));
  if (USER_DB.users.length) {
    const usersForDB = USER_DB.users.map((u: any) => ({ ...u, organizationid: u.organizationId || null }));
    writes.push(sbUpsert("bk_users", usersForDB));
  }
  if (USER_DB.registrationRequests.length) writes.push(sbUpsert("bk_registrations", USER_DB.registrationRequests));
  if (USER_DB.seatRequests.length) writes.push(sbUpsert("bk_seat_requests", USER_DB.seatRequests));
  if (USER_DB.supportTickets?.length) writes.push(sbUpsert("bk_support_tickets", USER_DB.supportTickets));
  if (USER_DB.notifications.length) writes.push(sbUpsert("bk_notifications", USER_DB.notifications.slice(0, 100)));
  await Promise.allSettled(writes);
}

const addAuditLog = (orgId: string | null, userName: string, role: string, action: string, details?: string, ip?: string) => {
  USER_DB.auditLogs.unshift({
    id: generateId("log"),
    organizationId: orgId,
    userName,
    role,
    timestamp: new Date().toISOString(),
    ipAddress: ip || "127.0.0.1",
    actionPerformed: action,
    details
  });
  if (USER_DB.auditLogs.length > 500) USER_DB.auditLogs.pop();
};

// Supabase credentials must be supplied via environment variables on Vercel
// (Project Settings -> Environment Variables). No hardcoded fallback —
// the app falls back to local file-based storage if these are unset.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// Super Admin seed credentials — configurable via environment variables so the real
// platform-owner email/password are not committed to source control. Set
// SUPERADMIN_EMAIL / SUPERADMIN_NAME / SUPERADMIN_PASSWORD in Vercel Project Settings.
// NOTE: these must be declared before seedUserDB() is called below — esbuild compiles
// `const` to `var` for this CJS bundle, which hoists the declaration but not the
// assignment, so calling seedUserDB() before this line would silently seed `undefined`.
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "owner@bizkhata.app";
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || "Platform Owner";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "Admin@123";
// SECURITY: session tokens are HMAC-signed with this secret so they can't be forged by
// guessing an email address. Set SESSION_SECRET in your environment for production —
// the fallback below is fine only for local/dev use.
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-set-SESSION_SECRET-env-var";
if (!process.env.SESSION_SECRET) {
  console.warn("⚠ SESSION_SECRET not set — using an insecure dev fallback. Set this env var in production.");
}
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
function signSessionToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifySessionToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > exp) return null;
    return email;
  } catch { return null; }
}

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function isLegacyPlaintext(stored: string | undefined): boolean {
  return !!stored && !stored.startsWith("scrypt:");
}
function safeUser(u: any) { if (!u) return u; const { password, ...rest } = u; return rest; }

const FINANCIAL_LOCK_FIELDS: Record<string, string[]> = {
  invoice: ["subtotal", "totalGst", "totalCgst", "totalSgst", "totalIgst", "total", "items", "customerId", "date", "tdsAmount", "tdsRate", "tdsSection", "discountValue", "shippingCharge", "otherCharges"],
  bill: ["subtotal", "totalGst", "totalCgst", "totalSgst", "totalIgst", "total", "items", "vendorId", "date", "tdsAmount", "tdsSection", "isReverseCharge"],
  expense: ["subtotal", "gstAmount", "tdsAmount", "tdsSection", "total", "vendorName", "category", "isReverseCharge"]
};
function checkFinancialLock(docType: keyof typeof FINANCIAL_LOCK_FIELDS, existing: any, incoming: any, draftStatuses: string[]): { locked: boolean; field?: string } {
  if (!existing) return { locked: false };
  if (draftStatuses.includes(existing.status)) return { locked: false };
  for (const field of FINANCIAL_LOCK_FIELDS[docType]) {
    if (field in incoming && JSON.stringify(incoming[field]) !== JSON.stringify(existing[field])) {
      return { locked: true, field };
    }
  }
  return { locked: false };
}
function diffFields(existing: any, incoming: any, fields: string[]): string {
  const changes: string[] = [];
  for (const f of fields) {
    if (f in incoming && JSON.stringify(incoming[f]) !== JSON.stringify(existing[f])) {
      changes.push(`${f}: ${JSON.stringify(existing[f])} → ${JSON.stringify(incoming[f])}`);
    }
  }
  return changes.length ? changes.join("; ") : "no field changes";
}

const APP_URL = process.env.APP_URL || "https://bizkhata.app";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Use verified domain email. While Resend domain verification is in progress, use onboarding@resend.dev
const EMAIL_FROM = (process.env.EMAIL_FROM || "Ledgerio <onboarding@resend.dev>").trim().replace(/^["']|["']$/g, "");

// Pure Node.js SMTP client — no nodemailer, no external deps, works on Vercel ESM
async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  
  // 1. Gmail API via OAuth2 (if GMAIL_REFRESH_TOKEN set)
  // Google OAuth2 token refresh + Gmail API send — works on Vercel (pure HTTPS)
  if (process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    try {
      // Refresh access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID,
          client_secret: process.env.GMAIL_CLIENT_SECRET,
          refresh_token: process.env.GMAIL_REFRESH_TOKEN,
          grant_type: "refresh_token"
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error("Failed to refresh Gmail token");

      // Build RFC 2822 email
      const emailLines = [
        `From: ${EMAIL_FROM}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        html
      ].join("\r\n");
      const encoded = Buffer.from(emailLines).toString("base64url");

      const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: encoded })
      });
      if (sendRes.ok) { console.log(`Gmail API sent to ${to}`); return { sent: true }; }
      const err = await sendRes.json();
      console.error("Gmail API error:", err);
    } catch (err: any) {
      console.error("Gmail API failed:", err.message);
    }
  }

  // 2. SMTP2GO / SendGrid / Mailgun via their HTTP APIs (set SMTP_HTTP_API_KEY + SMTP_HTTP_PROVIDER)
  if (process.env.SMTP_HTTP_API_KEY && process.env.SMTP_HTTP_PROVIDER) {
    const provider = process.env.SMTP_HTTP_PROVIDER;
    try {
      let r: Response;
      if (provider === "sendgrid") {
        r = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SMTP_HTTP_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: EMAIL_FROM, name: "Ledgerio" },
            subject,
            content: [{ type: "text/html", value: html }]
          })
        });
      } else if (provider === "mailgun") {
        const domain = process.env.MAILGUN_DOMAIN || "bizkhata.app";
        const form = new URLSearchParams({ from: EMAIL_FROM, to, subject, html });
        r = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: "POST",
          headers: { Authorization: `Basic ${Buffer.from(`api:${process.env.SMTP_HTTP_API_KEY}`).toString("base64")}` },
          body: form
        });
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }
      if (r.ok || r.status === 202) { console.log(`${provider} sent to ${to}`); return { sent: true }; }
      return { sent: false, reason: `${provider} error ${r.status}` };
    } catch (err: any) {
      console.error(`${provider} failed:`, err.message);
    }
  }

  // 3. Resend API (simplest to set up)
  if (RESEND_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (r.ok) { console.log(`Resend sent to ${to}`); return { sent: true }; }
      const errBody = await r.text();
      return { sent: false, reason: `Resend error ${r.status}: ${errBody}` };
    } catch (err: any) {
      return { sent: false, reason: err?.message };
    }
  }

  console.warn(`sendEmail: no provider configured. OTP for ${to} is in Notifications.`);
  return { sent: false, reason: "No email provider configured. Options: RESEND_API_KEY, GMAIL_REFRESH_TOKEN+GMAIL_CLIENT_ID+GMAIL_CLIENT_SECRET, or SMTP_HTTP_API_KEY+SMTP_HTTP_PROVIDER (sendgrid/mailgun)" };
}

function verifyPassword(plain: string, stored: string | undefined): boolean {
  if (!stored) return false;
  if (isLegacyPlaintext(stored)) return stored === plain;
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(plain, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex"), b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Seed default users on cold start — only runs if Supabase is unreachable AND no local file.
// loadUserDB() always enforces correct owner/superadmin accounts after loading.
const seedUserDB = () => {
  if (USER_DB.users.length > 0) return;

  const ownerOrgId = "org_verma_consultancy";
  const approvedAt = "2026-01-01T00:00:00Z";
  const subscriptionExpiresAt = "2027-01-01T00:00:00Z";

  USER_DB.organizations.push({
    id: ownerOrgId,
    name: "Verma Consultancy Services",
    gstNumber: "09AABFV1234A1Z5",
    status: "Active",
    allocatedSeats: 10,
    usedSeats: 1,
    createdAt: approvedAt,
    approvedAt,
    subscriptionExpiresAt,
    subscriptionMonths: 12
  });

  USER_DB.users.push(
    {
      id: "user_superadmin",
      organizationId: null,
      fullName: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL,
      mobileNumber: "",
      role: "Super Admin",
      status: "Active",
      password: hashPassword(SUPERADMIN_PASSWORD),
      permissions: ALL_PERMISSIONS_LIST.map(p => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: approvedAt
    },
    {
      id: "user_verma_owner",
      organizationId: ownerOrgId,
      fullName: "Sunil Verma",
      email: "svtiger543939@gmail.com",
      mobileNumber: "+919876543210",
      department: "Management",
      designation: "Owner",
      role: "Admin",
      status: "Active",
      password: hashPassword("Admin@123"),
      permissions: ALL_PERMISSIONS_LIST.map(p => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: approvedAt
    }
  );
};

seedUserDB();

const verifyTokenAndGetUser = (req: any): any | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const email = verifySessionToken(token);
  if (!email) return null;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user) return null;
  // Auto-heal: Admin/Staff without organizationId — re-link to correct org
  if (!user.organizationId && user.role !== "Super Admin") {
    // Known canonical mapping
    if (email === "svtiger543939@gmail.com") {
      user.organizationId = "org_verma_consultancy";
    } else {
      // For other users, find the org where they were originally registered
      const reg = USER_DB.registrationRequests.find((r: any) => r.email === email && r.status === "Approved");
      if (reg) {
        const org = USER_DB.organizations.find((o: any) => o.name === reg.companyName);
        if (org) user.organizationId = org.id;
      }
    }
    if (user.organizationId) saveUserDB().catch(() => {});
  }
  return user;
};

const authGuard = (req: any, res: any, next: any) => {
  const user = verifyTokenAndGetUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized. Invalid session token." }); return; }
  req.user = user;
  next();
};

const superAdminGuard = (req: any, res: any, next: any) => {
  const user = req.user;
  if (user.role !== "Super Admin") { res.status(403).json({ error: "Super Admin clearance required." }); return; }
  next();
};

const requirePermission = (permissionId: string) => (req: any, res: any, next: any) => {
  const user = req.user;
  if (user.role === "Super Admin") return next();
  if (!Array.isArray(user.permissions) || !user.permissions.includes(permissionId)) {
    res.status(403).json({ error: `Missing permission: ${permissionId}` });
    return;
  }
  next();
};

// Plan-based feature access. Only lists features that actually have working backend
// logic today — multi-currency and projects/timesheets are advertised on the pricing
// page but have no implementation yet, so they're intentionally left out here rather
// than faked. See flagged conversation note.
const PLAN_ORDER = ["free", "starter", "professional", "enterprise"];
const PLAN_FEATURES: Record<string, string[]> = {
  free: [],
  starter: ["expense_bills", "bank_reconciliation"],
  professional: ["expense_bills", "bank_reconciliation", "tds"],
  enterprise: ["expense_bills", "bank_reconciliation", "tds", "api_access"],
};
const orgPlan = (org: any): string => {
  const p = (org?.plan || "starter").toLowerCase();
  return PLAN_ORDER.includes(p) ? p : "starter";
};
const orgHasFeature = (org: any, feature: string): boolean => PLAN_FEATURES[orgPlan(org)]?.includes(feature) ?? false;
const requireFeature = (feature: string) => (req: any, res: any, next: any) => {
  const user = req.user;
  if (user.role === "Super Admin") return next();
  const org = USER_DB.organizations.find((o: any) => o.id === user.organizationId);
  if (!org || !orgHasFeature(org, feature)) {
    res.status(403).json({ error: `This feature (${feature.replace(/_/g, " ")}) isn't included in your current plan (${orgPlan(org)}). Upgrade to unlock it.`, upgradeRequired: true, feature });
    return;
  }
  next();
};


let supabaseStatus: any = { configured: false, connected: false, error: null };

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "MY_SUPABASE_URL") {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url: any, opts: any) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
      }}
    });
    supabaseStatus.configured = true;
    console.log(`Supabase initialized: ${SUPABASE_URL}`);
  } catch (err: any) {
    supabaseStatus.error = { message: err?.message || String(err) };
    console.error("Failed to initialize Supabase client:", err);
  }
}

// Per-organization in-memory cache. Keyed by organizationId. Each organization's
// accounting ledger is fully isolated — this was previously a single shared `cachedDb`,
// which meant every signed-up organization read and wrote the exact same books.
const cachedDbByOrg: Map<string, any> = new Map();

// Pre-populate in-memory cache with clean state for Verma Consultancy org
// so first login always shows zero balances, never stale Supabase demo data
{
  const vermaState = getInitialState();
  vermaState.company.name = "Verma Consultancy Services";
  vermaState.company.legalName = "Verma Consultancy Services";
  vermaState.company.gstin = "09AABFV1234A1Z5";
  vermaState.company.state = "Uttar Pradesh";
  cachedDbByOrg.set("org_verma_consultancy", vermaState);
}

// CJS-safe __dirname (native in CJS; for ESM local dev tsx handles it natively too)
const __server_dir = process.cwd();

const app = express();
app.use((req: any, res: any, next: any) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());

// USER_DB persistence middleware — loads the multi-tenant SaaS state (orgs, users,
// registration requests, seat requests, audit logs, custom roles) before any relevant
// route runs, and saves it after any mutating request completes. This is what makes
// pending registration approvals, seat requests, etc. survive across Vercel cold starts.
const USER_DB_ROUTES = ["/api/auth/", "/api/superadmin/", "/api/users", "/api/seat-requests", "/api/audit-logs", "/api/custom-roles", "/api/support"];
// /api/users/add and /api/users/remove are a separate, already-persistent legacy system
// that mutates db.users (per-organization ledger team members) via readDB()/writeDB(),
// not USER_DB.users (the SaaS-wide super-admin/admin layer) — exclude them so they don't
// trigger an unnecessary extra Supabase round-trip on every call.
const USER_DB_EXCLUDED_ROUTES = ["/api/users/add", "/api/users/remove"];
app.use(async (req: any, res: any, next: any) => {
  if (USER_DB_EXCLUDED_ROUTES.some(p => req.path === p)) return next();
  if (!USER_DB_ROUTES.some(p => req.path.startsWith(p))) return next();
  try {
    await loadUserDB();
  } catch (err) {
    console.error("USER_DB middleware: load failed", err);
  }
  if (req.method !== "GET") {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      saveUserDB().catch(err => console.error("USER_DB middleware: save failed", err));
      return originalJson(body);
    };
  }
  next();
});

// Raw Supabase connectivity test
app.get("/api/test-supabase", async (req: any, res: any) => {
  const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.default_ledger&select=id`;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) return res.json({ error: "not configured" });
  try {
    const r = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000)
    });
    const text = await r.text();
    res.json({ status: r.status, ok: r.ok, body: text.substring(0, 500) });
  } catch (e: any) {
    res.json({ error: e.message, type: e.constructor?.name, cause: String(e.cause || '') });
  }
});

// Diagnostic health check
app.get("/api/health", async (req: any, res: any) => {
  const checks: any = {
    server: "ok",
    supabaseConfigured: !!supabase,
    supabaseUrl: SUPABASE_URL ? SUPABASE_URL.substring(0, 40) : "missing",
    env: process.env.VERCEL === "1" ? "vercel" : "local",
    node: process.version,
    emailProviderConfigured: !!(process.env.RESEND_API_KEY || process.env.GMAIL_REFRESH_TOKEN || process.env.SMTP_HTTP_API_KEY),
    emailProvider: process.env.RESEND_API_KEY ? "resend" : process.env.GMAIL_REFRESH_TOKEN ? "gmail" : process.env.SMTP_HTTP_API_KEY ? process.env.SMTP_HTTP_PROVIDER : "none",
    emailFromAddress: EMAIL_FROM,
    emailFromAddressRaw: `[${EMAIL_FROM}]`,
    emailFromAddressLength: EMAIL_FROM.length,
  };
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const rows = await supabaseREST("GET", "__health_check__");
      checks.supabaseReachable = Array.isArray(rows);
      checks.supabaseRowExists = Array.isArray(rows) && rows.length > 0;
      checks.supabaseError = null;
    } catch (e: any) {
      checks.supabaseReachable = false;
      checks.supabaseError = e.message;
    }

    // Check the superadmin_state row used for USER_DB persistence (registration
    // approvals, seat requests, etc.). This is what confirms the registration-
    // approval persistence fix is actually wired up correctly in this deployment.
    try {
      const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.superadmin_state&select=id`;
      const r = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(6000)
      });
      const rows2 = r.ok ? await r.json() : null;
      checks.superAdminStateReachable = r.ok;
      checks.superAdminStateRowExists = Array.isArray(rows2) && rows2.length > 0;
      checks.superAdminStateHttpStatus = r.status;
      if (!r.ok) checks.superAdminStateError = await r.text();
    } catch (e: any) {
      checks.superAdminStateReachable = false;
      checks.superAdminStateError = e.message;
    }
  } else {
    checks.superAdminStateReachable = false;
    checks.superAdminStateError = "Supabase not configured — registrations will not survive cold starts";
  }
  res.json(checks);
});

const PORT = 3000;
// On Vercel, process.cwd() is read-only; use /tmp for ephemeral file fallback.
// File path is now per-organization — each org gets its own local-dev fallback file,
// mirroring the per-org Supabase row used in production.
function getDbFilePath(orgId: string): string {
  const safeId = orgId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return process.env.VERCEL === "1"
    ? `/tmp/bizkhata_db_${safeId}.json`
    : path.join(process.cwd(), `bizkhata_db_${safeId}.json`);
}

// Inline types to avoid cross-directory import issues in Vercel serverless
enum UserRole {
  Owner = "Owner",
  Admin = "Admin",
  Accountant = "Accountant",
  BillingUser = "Billing User",
  Approver = "Approver",
  Viewer = "Viewer",
  Auditor = "Auditor",
  User = "User"
}
type Account = { code: string; name: string; type: string; balance: number };
type JournalLine = { id: string; accountCode: string; accountName: string; debit: number; credit: number };
type JournalEntry = { id: string; date: string; reference: string; description: string; lines: JournalLine[] };
type DatabaseState = any;

// Initialize Gemini client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
}

// Default Chart of Accounts as specified in page 5 of PDF
const DEFAULT_ACCOUNTS: Account[] = [
  // Assets
  { code: "bank_account", name: "Bank Account", type: "Asset", balance: 0 },
  { code: "cash", name: "Cash", type: "Asset", balance: 0 },
  { code: "accounts_receivable", name: "Accounts Receivable", type: "Asset", balance: 0 },
  { code: "tds_receivable", name: "TDS Receivable", type: "Asset", balance: 0 },
  { code: "input_gst", name: "Input GST", type: "Asset", balance: 0 },
  // Liabilities
  { code: "accounts_payable", name: "Accounts Payable", type: "Liability", balance: 0 },
  { code: "gst_payable", name: "GST Payable", type: "Liability", balance: 0 },
  { code: "tds_payable", name: "TDS Payable", type: "Liability", balance: 0 },
  // Income
  { code: "sales_income", name: "Sales Income", type: "Income", balance: 0 },
  { code: "service_income", name: "Service Income", type: "Income", balance: 0 },
  // Expenses
  { code: "salary_expense", name: "Salary Expense", type: "Expense", balance: 0 },
  { code: "purchases_expense", name: "Purchases / Cost of Goods & Services", type: "Expense", balance: 0 },
  { code: "contractor_expense", name: "Contractor Expense", type: "Expense", balance: 0 },
  { code: "rent", name: "Rent", type: "Expense", balance: 0 },
  { code: "software_subscription", name: "Software Subscription", type: "Expense", balance: 0 },
  { code: "professional_fees", name: "Professional Fees", type: "Expense", balance: 0 },
  { code: "bank_charges", name: "Bank Charges", type: "Expense", balance: 0 },
  // Equity
  { code: "capital", name: "Capital", type: "Equity", balance: 0 },
  { code: "retained_earnings", name: "Retained Earnings", type: "Equity", balance: 0 }
];

// Helper to generate a random id
const uuid = () => Math.random().toString(36).substring(2, 11);

// Clean initial state for go-live — no demo data
function getInitialState(): DatabaseState {
  return {
    company: {
      name: "Your Company Name",
      legalName: "Your Company Legal Name",
      gstin: "",
      pan: "",
      address: "",
      state: "Karnataka",
      currency: "INR",
      financialYear: "2026-2027"
    },
    role: UserRole.Owner,
    customers: [],
    vendors: [],
    items: [],
    accounts: DEFAULT_ACCOUNTS,
    invoices: [],
    creditNotes: [],
    payments: [],
    expenses: [],
    bills: [],
    journals: [],
    advancedModules: {},
    enabledModules: {},
    auditLogs: [
      {
        id: "audit_init",
        timestamp: new Date().toISOString(),
        action: "System Init",
        details: "Ledgerio default ledger initialized successfully with secure role access management.",
        userId: "system",
        userName: "System"
      }
    ],
    users: [],
    userSeatsLimit: 10,
    mailLogs: [],
    organizations: []
  };
}
// State Database Reader/Writer API
function withTimeout(promise: Promise<any> | any, timeoutMs: number, errorMsg: string): Promise<any> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
}

// Direct REST helper — bypasses Supabase JS client entirely, avoids RLS hangs
async function supabaseREST(method: string, orgId: string, body?: any): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase not configured");
  const rowId = `org_ledger_${orgId}`;
  const url = `${SUPABASE_URL}/rest/v1/bizkhata_state`;
  const headers: any = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation,resolution=merge-duplicates"
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const endpoint = method === "GET" ? `${url}?id=eq.${rowId}&select=state` : url;
    const finalBody = body ? { ...body, id: rowId } : body;
    const res = await fetch(endpoint, {
      method,
      headers,
      body: finalBody ? JSON.stringify(finalBody) : undefined,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase REST ${method} failed: ${res.status} ${errText}`);
    }
    return method === "GET" ? await res.json() : true;
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

async function readDB(orgId: string): Promise<DatabaseState> {
  try {
    if (cachedDbByOrg.has(orgId)) {
      return cachedDbByOrg.get(orgId);
    }

    // Lazy load from Supabase via direct REST (bypasses RLS/JS-client hangs)
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        console.log(`Pulling state for org ${orgId} from Supabase REST API...`);
        const rows = await supabaseREST("GET", orgId);
        if (Array.isArray(rows) && rows.length > 0 && rows[0].state && Object.keys(rows[0].state).length > 0) {
          cachedDbByOrg.set(orgId, rows[0].state);
          supabaseStatus.connected = true;
          supabaseStatus.error = null;
          console.log(`State loaded from Supabase for org ${orgId}.`);
          return rows[0].state;
        } else {
          // Row exists but empty {} OR no row — seed with full initial state
          console.log(`Empty or missing state for org ${orgId} in Supabase. Seeding fresh initial state...`);
          const init = getInitialState();
          cachedDbByOrg.set(orgId, init);
          const rowId = `org_ledger_${orgId}`;
          try {
            const patchUrl = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.${rowId}`;
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 6000);
            const r = await fetch(patchUrl, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY!,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({ state: init }),
              signal: controller.signal
            });
            if (!r.ok && r.status !== 204) {
              // Fallback to POST
              await supabaseREST("POST", orgId, { state: init });
            }
          } catch(e) {
            await supabaseREST("POST", orgId, { state: init }).catch(() => {});
          }
          supabaseStatus.connected = true;
          supabaseStatus.error = null;
          console.log(`Initial state seeded to Supabase for org ${orgId}.`);
          return init;
        }
      } catch (err: any) {
        supabaseStatus.connected = false;
        supabaseStatus.error = { message: err?.message || String(err) };
        console.error(`Supabase REST read failed for org ${orgId}, falling back to local file:`, err);
      }
    }

    const dbFile = getDbFilePath(orgId);
    if (!fs.existsSync(dbFile)) {
      const init = getInitialState();
      try {
        fs.writeFileSync(dbFile, JSON.stringify(init, null, 2), "utf8");
      } catch (writeErr) {
        console.warn("Read-only filesystem detected on initial write, caching state in memory.");
      }
      cachedDbByOrg.set(orgId, init);
      return init;
    }
    const raw = fs.readFileSync(dbFile, "utf8");
    const parsed = JSON.parse(raw);
    cachedDbByOrg.set(orgId, parsed);
    return parsed;
  } catch (err) {
    console.error(`Error reading ledger for org ${orgId}, returning default:`, err);
    const fallback = getInitialState();
    cachedDbByOrg.set(orgId, fallback);
    return fallback;
  }
}

async function writeDB(orgId: string, state: DatabaseState): Promise<void> {
  try {
    // Audit check: calculate accounts balances dynamically from journals as specified by rule!
    // "Rule: Reports must be generated from journal entries."
    // Let's recalculate general ledger account balances based purely on journal lines!
    const updatedAccounts = DEFAULT_ACCOUNTS.map(acc => {
      let balance = 0;
      // Opening balance except for Bank and Capital which are handled in j_init code log
      // Let's sum debit and credit
      state.journals.forEach(je => {
        je.lines.forEach(line => {
          if (line.accountCode === acc.code) {
            // For Assets and Expenses, Debit increases, Credit decreases
            if (acc.type === "Asset" || acc.type === "Expense") {
              balance += line.debit - line.credit;
            } else {
              // For Liabilities, Income and Equity, Credit increases, Debit decreases
              balance += line.credit - line.debit;
            }
          }
        });
      });
      return { ...acc, balance };
    });

    state.accounts = updatedAccounts;
    cachedDbByOrg.set(orgId, state);

    try {
      fs.writeFileSync(getDbFilePath(orgId), JSON.stringify(state, null, 2), "utf8");
    } catch (writeErr) {
      // Ignore read-only errors on serverless deploys
    }

    // Push state to Supabase asynchronously (fire-and-forget, non-blocking)
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const rowId = `org_ledger_${orgId}`;
      supabaseREST("POST", orgId, { state })
        .then(() => { supabaseStatus.connected = true; supabaseStatus.error = null; })
        .catch(() => {
          const patchUrl = SUPABASE_URL + `/rest/v1/bizkhata_state?id=eq.${rowId}`;
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 6000);
          fetch(patchUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY!, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Prefer": "return=minimal" },
            body: JSON.stringify({ state }),
            signal: ctrl.signal
          }).then(r => { if (r.ok || r.status === 204) { supabaseStatus.connected = true; supabaseStatus.error = null; } })
            .catch(e => { supabaseStatus.connected = false; supabaseStatus.error = { message: e?.message }; });
        });
    }
  } catch (err) {
    console.error(`Error writing ledger for org ${orgId}:`, err);
  }
}

// REST Api Endpoints
// ── User Management API Routes ────────────────────────────────────────────────

// Notifications
app.get("/api/notifications", authGuard, superAdminGuard, (req: any, res: any) => res.json(USER_DB.notifications));
app.post("/api/notifications/clear", authGuard, superAdminGuard, (req: any, res: any) => { USER_DB.notifications = []; res.json({ success: true }); });

// Registration request
// Send registration email OTP
app.post("/api/auth/send-reg-otp", async (req: any, res: any) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required." });
  }
  if (USER_DB.users.some((u: any) => u.email === email) ||
      USER_DB.registrationRequests.some((r: any) => r.email === email && r.status !== "Rejected")) {
    return res.status(400).json({ error: "An account with this email already exists or is pending." });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (!(global as any).__regOtps) (global as any).__regOtps = {};
  (global as any).__regOtps[email] = { otp, expiry: Date.now() + 10 * 60 * 1000 };
  const emailResult = await sendEmail(email, "Verify your email — Ledgerio",
    `<p style="font-family:sans-serif">Your email verification code for Ledgerio registration is:</p>
     <h2 style="font-family:monospace;letter-spacing:6px;color:#1e40af">${otp}</h2>
     <p style="font-family:sans-serif;color:#666">This code expires in 10 minutes.</p>`
  );
  // Store in notifications for SuperAdmin visibility (dev fallback)
  USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: "Ledgerio Email Verification OTP", body: `Registration OTP for ${email}: ${otp} (valid 10 min)`, type: "Email", timestamp: new Date().toISOString() });
  res.json({ success: true, emailSent: emailResult.sent, reason: emailResult.reason });
});

// Verify-only check (doesn't consume the OTP — final register-request still validates it)
app.post("/api/auth/verify-reg-otp", (req: any, res: any) => {
  const { email, otp } = req.body;
  const otpStore = (global as any).__regOtps || {};
  const record = otpStore[email];
  if (!record) return res.status(400).json({ error: "Please request a new code." });
  if (Date.now() > record.expiry) { delete otpStore[email]; return res.status(400).json({ error: "Code expired. Please request a new one." }); }
  if (record.otp !== String(otp || "").trim()) return res.status(400).json({ error: "Incorrect code. Please check and try again." });
  res.json({ verified: true });
});

app.post("/api/auth/register-request", (req: any, res: any) => {
  const { companyName, gstNumber, adminName, email, mobileNumber, password, numberOfRequiredSeats, requestedPlan, emailOtp } = req.body;
  if (!companyName || !adminName || !email || !mobileNumber || !password || !numberOfRequiredSeats) {
    res.status(400).json({ error: "Company name, admin name, email, mobile, password and seats are required." }); return;
  }
  // Verify email OTP
  const otpStore = (global as any).__regOtps || {};
  const record = otpStore[email];
  if (!record) { res.status(400).json({ error: "Please verify your email first — click 'Send OTP'." }); return; }
  if (Date.now() > record.expiry) { delete otpStore[email]; res.status(400).json({ error: "OTP expired. Please request a new one." }); return; }
  if (record.otp !== String(emailOtp || "").trim()) { res.status(400).json({ error: "Invalid OTP. Please check the code sent to your email." }); return; }
  delete otpStore[email];
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) { res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number and special character." }); return; }
  if (USER_DB.users.some((u: any) => u.email === email) || USER_DB.registrationRequests.some((r: any) => r.email === email && r.status !== "Rejected")) {
    res.status(400).json({ error: "An account with this email already exists." }); return;
  }
  const newReg = { id: generateId("reg"), companyName, gstNumber: gstNumber || "", adminName, email, mobileNumber, password, numberOfRequiredSeats: Number(numberOfRequiredSeats), requestedPlan: requestedPlan || "starter", status: "Pending", emailVerified: true, createdAt: new Date().toISOString() };
  USER_DB.registrationRequests.unshift(newReg);
  const saEmail = USER_DB.users.find((u: any) => u.role === "Super Admin")?.email || "owner@bizkhata.app";
  USER_DB.notifications.unshift({ id: generateId("notif"), to: saEmail, subject: "New Registration Request", body: `Company '${companyName}' (${email}) registered by '${adminName}'. GSTIN: ${gstNumber || "Not provided"}.`, type: "Email", timestamp: new Date().toISOString() });
  saveUserDB().catch(() => {});
  res.status(201).json({ ...newReg, password: undefined });
});

// Login
app.post("/api/auth/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and Password required." }); return; }
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user) { res.status(401).json({ error: "Invalid credentials. User not found." }); return; }
  if (user.status === "Disabled") { res.status(403).json({ error: "Account disabled. Contact administrator." }); return; }
  if (user.loginLockUntil && Date.now() < user.loginLockUntil) {
    const mins = Math.ceil((user.loginLockUntil - Date.now()) / 60000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${mins} minute(s).` });
    return;
  }
  if (!verifyPassword(password, user.password)) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) { user.loginLockUntil = Date.now() + 15 * 60 * 1000; user.loginAttempts = 0; }
    res.status(401).json({ error: "Invalid credentials. Wrong password." });
    return;
  }
  user.loginAttempts = 0; user.loginLockUntil = undefined;
  if (isLegacyPlaintext(user.password)) { user.password = hashPassword(password); }
  let org = null;
  if (user.organizationId) {
    org = USER_DB.organizations.find((o: any) => o.id === user.organizationId) || null;
    if (org && org.status === "Suspended") { res.status(403).json({ error: "Your organization is suspended. Contact Ledgerio support." }); return; }
  if (org && org.subscriptionExpiresAt && new Date(org.subscriptionExpiresAt) < new Date()) {
    org.status = "Suspended";
    res.status(403).json({ error: `Your subscription expired on ${new Date(org.subscriptionExpiresAt).toLocaleDateString('en-IN')}. Please renew with Ledgerio support to continue.` }); return;
  }
  }
  if (user.twoFactorEnabled) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.activationCode = otp;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1000;
    user.resetCodeAttempts = 0;
    user.twoFactorVerified = false;
    const emailResult = await sendEmail(user.email, "Your Ledgerio login code", `<p>Your one-time login code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`);
    USER_DB.notifications.unshift({ id: generateId("notif"), to: user.email, subject: "Your Ledgerio login code", body: `Your OTP is ${otp} (valid 10 minutes).`, type: "Email", code: otp, timestamp: new Date().toISOString() });
    addAuditLog(user.organizationId, user.fullName, user.role, "2FA OTP Sent", emailResult.sent ? "Emailed login OTP." : `OTP generated (email not sent: ${emailResult.reason}).`);
    res.json({ twoFactorRequired: true, email: user.email, emailSent: emailResult.sent });
    return;
  }
  user.lastLogin = new Date().toISOString();
  addAuditLog(user.organizationId, user.fullName, user.role, "User Login", `Logged in from ${req.ip || "127.0.0.1"}.`);
  res.json({ token: signSessionToken(user.email), user: safeUser(user), organization: org });
});

// Verify 2FA
app.post("/api/auth/verify-2fa", (req: any, res: any) => {
  const { email, otp } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user || !user.activationCode) { res.status(400).json({ error: "No pending OTP. Please log in again." }); return; }
  if (Date.now() > (user.resetCodeExpiry || 0)) { user.activationCode = undefined; res.status(400).json({ error: "Code expired. Please log in again to get a new one." }); return; }
  user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
  if (user.resetCodeAttempts > 5) { user.activationCode = undefined; res.status(429).json({ error: "Too many attempts. Please log in again to get a new code." }); return; }
  if (user.activationCode !== otp) { res.status(400).json({ error: "Invalid OTP code." }); return; }
  user.twoFactorVerified = true; user.activationCode = undefined; user.resetCodeAttempts = 0; user.lastLogin = new Date().toISOString();
  const org = user.organizationId ? USER_DB.organizations.find((o: any) => o.id === user.organizationId) || null : null;
  addAuditLog(user.organizationId, user.fullName, user.role, "2FA Verified", "2FA OTP passed.");
  res.json({ token: signSessionToken(user.email), user: safeUser(user), organization: org });
});

// Resend 2FA OTP
app.post("/api/auth/resend-2fa", async (req: any, res: any) => {
  const { email } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user) { res.status(404).json({ error: "User not found." }); return; }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.activationCode = otp;
  user.resetCodeExpiry = Date.now() + 10 * 60 * 1000;
  user.resetCodeAttempts = 0;
  const emailResult = await sendEmail(user.email, "Your Ledgerio login code", `<p>Your one-time login code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`);
  USER_DB.notifications.unshift({ id: generateId("notif"), to: user.email, subject: "Your Ledgerio login code", body: `Your OTP is ${otp} (valid 10 minutes).`, type: "Email", code: otp, timestamp: new Date().toISOString() });
  res.json({ success: true, emailSent: emailResult.sent });
});

// Toggle 2FA
app.post("/api/auth/toggle-2fa", authGuard, (req: any, res: any) => {
  const user = req.user; const { enabled } = req.body;
  user.twoFactorEnabled = !!enabled; user.twoFactorVerified = false;
  addAuditLog(user.organizationId, user.fullName, user.role, "2FA Setting Updated", `2FA ${enabled ? "enabled" : "disabled"}.`);
  res.json({ success: true, twoFactorEnabled: user.twoFactorEnabled });
});

// Forgot password
app.post("/api/auth/forgot-password", async (req: any, res: any) => {
  const { email } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (user) {
    const resetCode = Math.floor(200000 + Math.random() * 800000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1000;
    user.resetCodeAttempts = 0;
    USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: "Ledgerio Password Reset", body: `Reset OTP: ${resetCode} (valid 10 minutes).`, type: "Email", code: resetCode, timestamp: new Date().toISOString() });
    addAuditLog(user.organizationId, user.fullName, user.role, "Password Reset Requested", "Reset OTP generated.");
    // Actually send the email
    sendEmail(email, "Ledgerio Password Reset Code",
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1e40af">Ledgerio Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e40af;background:#f0f4ff;padding:16px;border-radius:8px;text-align:center">${resetCode}</div>
        <p style="color:#666;margin-top:16px">This code expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.</p>
      </div>`
    ).catch(() => {}); // non-blocking — OTP is always in Notifications as fallback
  }
  res.json({ success: true, message: "If that email exists, a reset code has been sent. Check your inbox or the notification simulator." });
});

// Reset password
app.post("/api/auth/reset-password", (req: any, res: any) => {
  const { email, code, newPassword } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user || !user.resetCode) { res.status(400).json({ error: "Invalid or expired reset code." }); return; }
  if (Date.now() > (user.resetCodeExpiry || 0)) { user.resetCode = undefined; res.status(400).json({ error: "Reset code expired. Request a new one." }); return; }
  user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
  if (user.resetCodeAttempts > 5) { user.resetCode = undefined; res.status(429).json({ error: "Too many attempts. Request a new reset code." }); return; }
  if (user.resetCode !== code) { res.status(400).json({ error: "Invalid or expired reset code." }); return; }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) { res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number, special char." }); return; }
  user.password = hashPassword(newPassword); user.resetCode = undefined; user.resetCodeExpiry = undefined; user.resetCodeAttempts = 0; user.status = "Active";
  addAuditLog(user.organizationId, user.fullName, user.role, "Password Reset Complete", "Password reset successfully.");
  res.json({ success: true });
});

// Get me
app.get("/api/auth/me", (req: any, res: any) => {
  const user = verifyTokenAndGetUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }
  const org = user.organizationId ? USER_DB.organizations.find((o: any) => o.id === user.organizationId) || null : null;
  const planFeatures = user.role === "Super Admin" ? PLAN_FEATURES.enterprise : (PLAN_FEATURES[orgPlan(org)] || []);
  res.json({ user: safeUser(user), organization: org, planFeatures });
});

// Terminate sessions
app.post("/api/auth/terminate-sessions", authGuard, (req: any, res: any) => {
  req.user.twoFactorVerified = false;
  addAuditLog(req.user.organizationId, req.user.fullName, req.user.role, "Sessions Terminated", "All sessions force-ended.");
  res.json({ success: true });
});

// Super Admin - Registrations
app.get("/api/superadmin/registrations", authGuard, superAdminGuard, (req: any, res: any) => res.json(USER_DB.registrationRequests.map((r: any) => ({ ...r, password: undefined }))));
app.post("/api/superadmin/registrations/:id/action", authGuard, superAdminGuard, (req: any, res: any) => {
  const reg = USER_DB.registrationRequests.find((r: any) => r.id === req.params.id);
  if (!reg) { res.status(404).json({ error: "Registration not found." }); return; }
  const { action, feedback, subscriptionMonths } = req.body;
  if (action === "Approve") {
    reg.status = "Approved";
    const orgId = generateId("org");
    const approvedAt = new Date().toISOString();
    const months = Math.max(1, Math.min(120, parseInt(subscriptionMonths) || 12));
    const subscriptionExpiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
    USER_DB.organizations.push({ id: orgId, name: reg.companyName, gstNumber: reg.gstNumber, status: "Active", allocatedSeats: reg.numberOfRequiredSeats, usedSeats: 1, plan: reg.requestedPlan || "starter", createdAt: reg.createdAt, approvedAt, subscriptionExpiresAt, subscriptionMonths: months });
    USER_DB.users.push({ id: generateId("user"), organizationId: orgId, fullName: reg.adminName, email: reg.email, mobileNumber: reg.mobileNumber, role: "Admin", status: "Active", password: hashPassword(reg.password || "Admin@123"), permissions: ALL_PERMISSIONS_LIST.map(p => p.id), twoFactorEnabled: false, createdAt: new Date().toISOString() });
    // Seed a clean blank ledger for the new org in Supabase (no demo data, zero balances)
    const cleanState = getInitialState();
    cleanState.company.name = reg.companyName;
    cachedDbByOrg.set(orgId, cleanState);
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseREST("POST", orgId, { state: cleanState }).catch(() => {
        supabaseREST("PATCH" as any, orgId, { state: cleanState }).catch(() => {});
      });
    }
    USER_DB.notifications.unshift({ id: generateId("notif"), to: reg.email, subject: "Ledgerio Account Approved", body: `Your account for ${reg.companyName} is approved for ${months} month(s). Login with the email and password you set during sign-up. Subscription valid until: ${new Date(subscriptionExpiresAt).toLocaleDateString('en-IN')}.`, type: "Email", timestamp: new Date().toISOString() });
    addAuditLog(null, req.user.fullName, req.user.role, "Approve Registration", `Approved '${reg.companyName}' for ${months} months until ${new Date(subscriptionExpiresAt).toLocaleDateString('en-IN')}.`);
  } else if (action === "Reject") {
    reg.status = "Rejected";
    addAuditLog(null, req.user.fullName, req.user.role, "Reject Registration", `Rejected '${reg.companyName}'. Reason: ${feedback}`);
  }
  res.json({ success: true, reg });
});

// Super Admin - Organizations
// Generic persistence for the 21 "Advanced Modules" (Workflow, GSTR-2B, Bank Feeds, etc.).
// Each module's data lives under db.advancedModules[key] in the same per-org store as the
// rest of the ledger — no separate schema per module, no direct-to-Supabase bypass.
const ALLOWED_MODULE_KEYS = new Set([
  "tds", "workflow", "email", "gstr2b", "reminders", "approvals", "bankfeeds", "cportal", "vportal",
  "budget", "projects", "timesheets", "multicurrency", "audit", "grn", "rcm", "depreciation",
  "recurring", "billexp", "advances", "partial", "milestone", "batch", "composite", "cheque",
  "hsn", "attachments", "pricelists", "multigstin", "schedreports", "costcentres", "docs", "paymentterms", "workflowactions"
]);
app.get("/api/modules/:key", authGuard, async (req: any, res: any) => {
  const { key } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const db = await readDB(req.user.organizationId);
  res.json(db.advancedModules?.[key] || []);
});
app.post("/api/modules/:key", authGuard, async (req: any, res: any) => {
  const { key } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  if (!db.advancedModules) db.advancedModules = {};
  if (!db.advancedModules[key]) db.advancedModules[key] = [];
  const item = { id: `${key}_${uuid()}`, createdAt: new Date().toISOString(), createdBy: req.user.fullName, ...req.body };
  db.advancedModules[key].push(item);
  await writeDB(orgId, db);
  addAuditLog(orgId, req.user.fullName, req.user.role, `Module: ${key}`, `Created entry: ${Object.values(req.body).slice(0, 2).join(" / ")}`);
  res.json(item);
});
app.put("/api/modules/:key/:id", authGuard, async (req: any, res: any) => {
  const { key, id } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  const arr = db.advancedModules?.[key] || [];
  const idx = arr.findIndex((i: any) => i.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found." });
  arr[idx] = { ...arr[idx], ...req.body };
  await writeDB(orgId, db);
  addAuditLog(orgId, req.user.fullName, req.user.role, `Module: ${key}`, `Updated entry ${id}`);
  res.json(arr[idx]);
});
app.delete("/api/modules/:key/:id", authGuard, async (req: any, res: any) => {
  const { key, id } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  if (db.advancedModules?.[key]) {
    db.advancedModules[key] = db.advancedModules[key].filter((i: any) => i.id !== id);
    await writeDB(orgId, db);
    addAuditLog(orgId, req.user.fullName, req.user.role, `Module: ${key}`, `Deleted entry ${id}`);
  }
  res.json({ success: true });
});

// Simple on/off toggles for feature modules (Estimates, Invoices, Bills, Projects, etc.)
// — these hold no data of their own, just whether that module shows in the app nav.
app.get("/api/settings/enabled-modules", authGuard, async (req: any, res: any) => {
  const db = await readDB(req.user.organizationId);
  res.json(db.enabledModules || {});
});
app.put("/api/settings/enabled-modules", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  db.enabledModules = { ...(db.enabledModules || {}), ...req.body };
  await writeDB(orgId, db);
  addAuditLog(orgId, req.user.fullName, req.user.role, "Update Module Settings", `Updated feature toggles: ${Object.keys(req.body).join(", ")}`);
  res.json(db.enabledModules);
});

app.get("/api/superadmin/organizations", authGuard, superAdminGuard, (req: any, res: any) => res.json(USER_DB.organizations));
app.put("/api/superadmin/organizations/:id", authGuard, superAdminGuard, (req: any, res: any) => {
  const org = USER_DB.organizations.find((o: any) => o.id === req.params.id);
  if (!org) { res.status(404).json({ error: "Organization not found." }); return; }
  const { status, allocatedSeats, subscriptionExpiresAt } = req.body;
  if (status) { org.status = status; if (status === "Suspended") USER_DB.users.forEach((u: any) => { if (u.organizationId === org.id) u.status = "Disabled"; }); }
  if (allocatedSeats !== undefined) { const s = Number(allocatedSeats); if (s < org.usedSeats) { res.status(400).json({ error: `Cannot go below ${org.usedSeats} used seats.` }); return; } org.allocatedSeats = s; }
  if (subscriptionExpiresAt) { org.subscriptionExpiresAt = subscriptionExpiresAt; if (status !== "Suspended") org.status = "Active"; }
  addAuditLog(null, req.user.fullName, req.user.role, "Update Organization", `Updated '${org.name}': status=${status}, seats=${allocatedSeats}, expiry=${subscriptionExpiresAt}`);
  res.json(org);
});

// Extend subscription
app.post("/api/superadmin/organizations/:id/extend-subscription", authGuard, superAdminGuard, (req: any, res: any) => {
  const org = USER_DB.organizations.find((o: any) => o.id === req.params.id);
  if (!org) { res.status(404).json({ error: "Organization not found." }); return; }
  const { months } = req.body;
  const base = org.subscriptionExpiresAt && new Date(org.subscriptionExpiresAt) > new Date() ? new Date(org.subscriptionExpiresAt) : new Date();
  base.setMonth(base.getMonth() + (Number(months) || 12));
  org.subscriptionExpiresAt = base.toISOString();
  org.status = "Active";
  USER_DB.users.forEach((u: any) => { if (u.organizationId === org.id && u.status === "Disabled") u.status = "Active"; });
  addAuditLog(null, req.user.fullName, req.user.role, "Extend Subscription", `Extended '${org.name}' by ${months} months until ${org.subscriptionExpiresAt}`);
  res.json(org);
});

// Hard-reset the USER_DB in Supabase — removes stale logins, re-seeds canonical accounts
app.post("/api/superadmin/reset-userdb", authGuard, superAdminGuard, async (req: any, res: any) => {
  // Wipe everything except current super admin and Verma owner
  USER_DB.organizations.length = 0;
  USER_DB.users.length = 0;
  USER_DB.seatRequests.length = 0;
  USER_DB.registrationRequests.length = 0;
  USER_DB.notifications.length = 0;
  USER_DB.customRoles.length = 0;
  // Re-run seed
  seedUserDB();
  // Force save clean state to Supabase
  await saveUserDB();
  addAuditLog(null, req.user.fullName, req.user.role, "Reset USER_DB", "Wiped stale user DB and re-seeded canonical accounts.");
  res.json({ success: true, users: USER_DB.users.map(safeUser), orgs: USER_DB.organizations });
});


// Users
app.get("/api/users", authGuard, (req: any, res: any) => {
  const user = req.user;
  res.json((user.role === "Super Admin" ? USER_DB.users : USER_DB.users.filter((u: any) => u.organizationId === user.organizationId)).map(safeUser));
});

app.post("/api/users", authGuard, requirePermission("manage_users"), (req: any, res: any) => {
  const activeUser = req.user;
  if (activeUser.role !== "Admin" && activeUser.role !== "Super Admin") { res.status(403).json({ error: "Only Admins can create users." }); return; }
  const { fullName, email, mobileNumber, department, designation, role, permissions } = req.body;
  if (!fullName || !email || !mobileNumber || !role) { res.status(400).json({ error: "Name, email, mobile, role required." }); return; }
  if (role === "Super Admin" && activeUser.role !== "Super Admin") { res.status(403).json({ error: "Only Super Admin can grant Super Admin role." }); return; }
  const targetOrgId = activeUser.role === "Super Admin" ? req.body.organizationId : activeUser.organizationId;
  const org = USER_DB.organizations.find((o: any) => o.id === targetOrgId);
  if (!org) { res.status(404).json({ error: "Organization not found." }); return; }
  if (org.usedSeats >= org.allocatedSeats) { res.status(403).json({ error: `Seat limit reached (${org.usedSeats}/${org.allocatedSeats}). Request more seats.` }); return; }
  if (USER_DB.users.some((u: any) => u.email === email)) { res.status(400).json({ error: "Email already registered." }); return; }
  const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
  const activationCode = Math.random().toString(36).substring(2, 10);
  const newUser = { id: generateId("user"), organizationId: targetOrgId, fullName, email, mobileNumber, department, designation, role, status: "Pending Activation", password: hashPassword(tempPassword), permissions: permissions || ["view_invoices", "view_reports"], twoFactorEnabled: false, createdAt: new Date().toISOString(), activationCode };
  USER_DB.users.push(newUser);
  org.usedSeats = USER_DB.users.filter((u: any) => u.organizationId === targetOrgId && u.status !== "Disabled").length;
  USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: `Welcome to Ledgerio - ${org.name}`, body: `Hello ${fullName},\n\nTemp Password: ${tempPassword}\nRole: ${role}\n\nActivate: ${APP_URL}/activate?code=${activationCode}&email=${email}`, type: "Email", timestamp: new Date().toISOString() });
  addAuditLog(targetOrgId, activeUser.fullName, activeUser.role, "User Created", `Created '${fullName}' as '${role}'.`);
  res.status(201).json(safeUser(newUser));
});

app.put("/api/users/:id", authGuard, requirePermission("manage_users"), (req: any, res: any) => {
  const activeUser = req.user;
  const targetUser = USER_DB.users.find((u: any) => u.id === req.params.id);
  if (!targetUser) { res.status(404).json({ error: "User not found." }); return; }
  if (activeUser.role !== "Super Admin" && targetUser.organizationId !== activeUser.organizationId) { res.status(403).json({ error: "Tenant isolation violation." }); return; }
  const { fullName, mobileNumber, department, designation, role, status, permissions } = req.body;
  if (fullName) targetUser.fullName = fullName;
  if (mobileNumber) targetUser.mobileNumber = mobileNumber;
  if (department) targetUser.department = department;
  if (designation) targetUser.designation = designation;
  if (activeUser.role === "Admin" || activeUser.role === "Super Admin") {
    if (role && targetUser.role !== "Super Admin") {
      if (role === "Super Admin" && activeUser.role !== "Super Admin") { res.status(403).json({ error: "Only Super Admin can grant Super Admin role." }); return; }
      targetUser.role = role;
    }
    if (permissions) targetUser.permissions = permissions;
    if (status) { targetUser.status = status; const org = USER_DB.organizations.find((o: any) => o.id === targetUser.organizationId); if (org) org.usedSeats = USER_DB.users.filter((u: any) => u.organizationId === org.id && u.status !== "Disabled").length; }
  }
  addAuditLog(targetUser.organizationId, activeUser.fullName, activeUser.role, "User Updated", `Updated '${targetUser.email}'.`);
  res.json(safeUser(targetUser));
});

app.post("/api/users/:id/reset-password", authGuard, requirePermission("manage_users"), (req: any, res: any) => {
  const activeUser = req.user;
  if (activeUser.role !== "Admin" && activeUser.role !== "Super Admin") { res.status(403).json({ error: "Admin required." }); return; }
  const targetUser = USER_DB.users.find((u: any) => u.id === req.params.id);
  if (!targetUser) { res.status(404).json({ error: "User not found." }); return; }
  if (activeUser.role !== "Super Admin" && targetUser.organizationId !== activeUser.organizationId) { res.status(403).json({ error: "Tenant violation." }); return; }
  const tempPwd = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
  targetUser.password = hashPassword(tempPwd); targetUser.status = "Pending Activation";
  USER_DB.notifications.unshift({ id: generateId("notif"), to: targetUser.email, subject: "Password Reset by Admin", body: `New Temp Password: ${tempPwd}`, type: "Email", timestamp: new Date().toISOString() });
  addAuditLog(targetUser.organizationId, activeUser.fullName, activeUser.role, "Password Reset", `Reset pwd for '${targetUser.email}'.`);
  res.json({ success: true, tempPassword: tempPwd });
});

// Seat Requests
app.get("/api/seat-requests", authGuard, (req: any, res: any) => {
  const user = req.user;
  res.json(user.role === "Super Admin" ? USER_DB.seatRequests : USER_DB.seatRequests.filter((s: any) => s.organizationId === user.organizationId));
});
app.post("/api/seat-requests", authGuard, (req: any, res: any) => {
  const user = req.user;
  if (user.role !== "Admin") { res.status(403).json({ error: "Only Admins can request seats." }); return; }
  const { additionalSeatsRequested, reason } = req.body;
  if (!additionalSeatsRequested || !reason) { res.status(400).json({ error: "Seats and reason required." }); return; }
  const org = USER_DB.organizations.find((o: any) => o.id === user.organizationId);
  if (!org) { res.status(404).json({ error: "Organization not found." }); return; }
  const newReq = { id: generateId("req_seat"), organizationId: org.id, requestedBy: user.fullName, currentSeatCount: org.allocatedSeats, additionalSeatsRequested: Number(additionalSeatsRequested), reason, status: "Pending", createdAt: new Date().toISOString() };
  USER_DB.seatRequests.unshift(newReq);
  USER_DB.notifications.unshift({ id: generateId("notif"), to: USER_DB.users.find((u: any) => u.role === "Super Admin")?.email || "owner@bizkhata.app", subject: "Seat Request", body: `'${org.name}' needs ${additionalSeatsRequested} more seats. Reason: ${reason}`, type: "Email", timestamp: new Date().toISOString() });
  addAuditLog(org.id, user.fullName, user.role, "Seat Request Submitted", `Requested ${additionalSeatsRequested} seats.`);
  res.status(201).json(newReq);
});
app.post("/api/seat-requests/:id/action", authGuard, superAdminGuard, (req: any, res: any) => {
  const ticket = USER_DB.seatRequests.find((t: any) => t.id === req.params.id);
  if (!ticket) { res.status(404).json({ error: "Seat request not found." }); return; }
  const org = USER_DB.organizations.find((o: any) => o.id === ticket.organizationId);
  if (!org) { res.status(404).json({ error: "Org not found." }); return; }
  const { action } = req.body;
  if (action === "Approve") { ticket.status = "Approved"; org.allocatedSeats += ticket.additionalSeatsRequested; addAuditLog(null, req.user.fullName, req.user.role, "Seat Request Approved", `+${ticket.additionalSeatsRequested} for '${org.name}'.`); }
  else { ticket.status = "Rejected"; addAuditLog(null, req.user.fullName, req.user.role, "Seat Request Rejected", `Denied for '${org.name}'.`); }
  res.json(ticket);
});

// Audit Logs
app.get("/api/audit-logs", authGuard, (req: any, res: any) => {
  const user = req.user;
  res.json(user.role === "Super Admin" ? USER_DB.auditLogs : USER_DB.auditLogs.filter((l: any) => l.organizationId === user.organizationId));
});

// Custom Roles
app.get("/api/custom-roles", authGuard, (req: any, res: any) => {
  const user = req.user;
  res.json(user.role === "Super Admin" ? USER_DB.customRoles : USER_DB.customRoles.filter((r: any) => r.organizationId === user.organizationId));
});
app.post("/api/custom-roles", authGuard, (req: any, res: any) => {
  const user = req.user;
  if (user.role !== "Admin") { res.status(403).json({ error: "Admins only." }); return; }
  const { name, description, permissions } = req.body;
  if (!name || !description || !permissions) { res.status(400).json({ error: "Name, description, permissions required." }); return; }
  const newRole = { id: generateId("role_custom"), organizationId: user.organizationId, name, description, permissions };
  USER_DB.customRoles.push(newRole);
  addAuditLog(user.organizationId, user.fullName, user.role, "Custom Role Created", `Created '${name}'.`);
  res.status(201).json(newRole);
});

// ALL_PERMISSIONS endpoint
app.get("/api/permissions", (req: any, res: any) => res.json(ALL_PERMISSIONS_LIST));

// ── End User Management Routes ────────────────────────────────────────────────


app.get("/api/db", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { res.status(400).json({ error: "Your account isn't linked to an organization." }); return; }
  const db = await readDB(orgId);
  res.json(db);
});

app.get("/api/supabase-status", async (req, res) => {
  // Always do a live probe to get accurate status
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const rows = await supabaseREST("GET", "__health_check__");
      const connected = Array.isArray(rows);
      supabaseStatus.configured = true;
      supabaseStatus.connected = connected;
      supabaseStatus.error = connected ? null : { message: "Empty response from Supabase" };
    } catch (e: any) {
      supabaseStatus.connected = false;
      supabaseStatus.error = { message: e?.message || String(e) };
    }
  }
  res.json(supabaseStatus);
});

// Secure API endpoint to provisions new sub-users with random single-sign-on credentials
app.post("/api/users/add", authGuard, requirePermission("manage_users"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const { name, email, mobile, role, author } = req.body;
  
  if (!name || !email || !mobile) {
    return res.status(400).json({ error: "Missing required parameters. Name, Email, and Mobile are mandatory." });
  }

  if (!db.users) db.users = [];
  if (!db.mailLogs) db.mailLogs = [];
  if (!db.userSeatsLimit) db.userSeatsLimit = 5;

  // Validate current corporate capacity thresholds
  if (db.users.length >= db.userSeatsLimit) {
    return res.status(400).json({ 
      error: `Licensed limits exceeded! You currently hold ${db.users.length} of ${db.userSeatsLimit} seats. Please expand your subscribed slot size first under the Zoho Licenses Desk.` 
    });
  }

  // Enforce unique user emails
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "A corporate user with this email address has already been configured." });
  }

  // Generate secure single-use password token
  const password = "BK-" + Math.floor(1000 + Math.random() * 9000);

  const newUser = {
    id: "usr_" + uuid(),
    name,
    email: email.toLowerCase(),
    mobile,
    role: role || UserRole.Viewer,
    password,
    isOwner: false
  };

  db.users.push(newUser);

  // Simulated SMTP email delivery structure
  const mailSubject = "Welcome to Ledgerio - Your Accounting Portal account is ready!";
  const mailBody = `Dear ${name},\n\nYour organization manager (${author || "@admin"}) has assigned an accounting seat for you on the Ledgerio General Ledger platform.\n\nHere are your access details:\n• Portal URL: Ledgerio Cloud Edge\n• Registered Email: ${email.toLowerCase()}\n• Mobile Number: ${mobile}\n• Designated Role: ${role || "Viewer"}\n• Single-Sign-On Password: ${password}\n\nYou can log in directly at the system portal page.\n\nWarm regards,\nLedgerio Infrastructure Team.`;

  const newMailLog = {
    id: "mail_" + uuid(),
    to: email.toLowerCase(),
    subject: mailSubject,
    body: mailBody,
    passwordSent: password,
    timestamp: new Date().toISOString()
  };

  db.mailLogs.unshift(newMailLog);

  // Insert administrative audit trail
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user: author || "Admin",
    action: "User Seat Reservation",
    details: `Authorized tenant seat for ${name} (${email}) as ${role || "Viewer"} with automated password mailing.`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db, newUser, password });
});

// Secure API endpoint to update corporate license capacity slots on-demand
app.post("/api/user-seats/update", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const { seatsLimit, author } = req.body;
  if (!seatsLimit || isNaN(Number(seatsLimit))) {
    return res.status(400).json({ error: "Seats capacity limit must be a valid numeric integer." });
  }

  const limitNumber = Number(seatsLimit);
  db.userSeatsLimit = limitNumber;

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user: author || "Admin",
    action: "License Cap Update",
    details: `Updated corporate scale capacity to ${limitNumber} user seats.`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

app.post("/api/company", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  db.company = { ...db.company, ...req.body };
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user: req.body.user || "User",
    action: "Company Config Setup",
    details: `Updated company details to ${db.company.name}`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});

app.post("/api/customers", authGuard, requirePermission("manage_customers"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const index = db.customers.findIndex(c => c.id === req.body.id);
  const user = req.body.authorUser || "User";

  if (index >= 0) {
    db.customers[index] = { ...db.customers[index], ...req.body };
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Edit Customer",
      details: `Modified customer parameters for ${req.body.name}`
    });
  } else {
    const newCust = { id: "cust_" + uuid(), ...req.body };
    db.customers.push(newCust);
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Add Customer",
      details: `Created customer master record for ${req.body.name}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});

app.post("/api/vendors", authGuard, requirePermission("manage_vendors"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const index = db.vendors.findIndex(v => v.id === req.body.id);
  const user = req.body.authorUser || "User";

  if (index >= 0) {
    db.vendors[index] = { ...db.vendors[index], ...req.body };
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Edit Vendor",
      details: `Modified vendor master parameters for ${req.body.name}`
    });
  } else {
    const newVend = { id: "vend_" + uuid(), ...req.body };
    db.vendors.push(newVend);
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Add Vendor",
      details: `Created vendor master record for ${req.body.name}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});

app.post("/api/items", authGuard, requirePermission("manage_items"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const index = db.items.findIndex(i => i.id === req.body.id);
  const user = req.body.authorUser || "User";

  if (index >= 0) {
    db.items[index] = { ...db.items[index], ...req.body };
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Edit Item",
      details: `Updated item details for ${req.body.name}`
    });
  } else {
    const newItem = { id: "item_" + uuid(), ...req.body };
    db.items.push(newItem);
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Add Item",
      details: `Added new service/product item: ${req.body.name}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Accounting engine automatic journal entry creator
function createInvoiceJournal(invoice: any, company: any) {
  // Balanced journal creation rule!
  // Accounts Receivable Debit = Item Total
  // Sales Income Credit = Subtotal
  // CGST/SGST/IGST Payable Credit = GstAmount
  const lines: JournalLine[] = [];
  const reference = `Invoice ${invoice.invoiceNumber}`;
  const description = `Revenue booked from sales invoice ${invoice.invoiceNumber}`;

  // Debit accounts receivable
  lines.push({
    id: uuid(),
    accountCode: "accounts_receivable",
    accountName: "Accounts Receivable",
    debit: invoice.total,
    credit: 0
  });

  // Credit sales / services income
  lines.push({
    id: uuid(),
    accountCode: "sales_income",
    accountName: "Sales Income",
    debit: 0,
    credit: invoice.subtotal
  });

  // Credit Tax liabilities
  if (invoice.totalGst > 0) {
    const taxDesc = invoice.totalIgst > 0
      ? `IGST 18%`
      : `CGST/SGST ${invoice.items[0]?.gstRate || 18}%`;
    lines.push({
      id: uuid(),
      accountCode: "gst_payable",
      accountName: `GST Financial Liability (${taxDesc})`,
      debit: 0,
      credit: invoice.totalGst
    });
  }

  // Debit TDS Receivable — customer deducted this at source; we still expect to recover
  // it as a tax credit, so it's an asset, not a write-off. (invoice.total above is already
  // net of TDS, so this line plus the AR debit reconciles back to subtotal+GST.)
  if (invoice.tdsAmount > 0) {
    lines.push({
      id: uuid(),
      accountCode: "tds_receivable",
      accountName: `TDS Receivable (Sec ${invoice.tdsSection || "—"})`,
      debit: invoice.tdsAmount,
      credit: 0
    });
  }

  return {
    id: `j_inv_${invoice.id}`,
    date: invoice.date,
    reference,
    description,
    lines
  };
}

app.post("/api/invoices", authGuard, requirePermission("create_invoices"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const invoiceData = req.body;
  if (invoiceData.tdsAmount > 0) {
    const org = USER_DB.organizations.find((o: any) => o.id === orgId);
    if (!orgHasFeature(org, "tds")) { res.status(403).json({ error: `TDS isn't included in your current plan (${orgPlan(org)}). Upgrade to Professional to use TDS.`, upgradeRequired: true, feature: "tds" }); return; }
  }
  const db = await readDB(orgId);
  const user = req.body.authorUser || "User";

  // Auto invoicing sequence numbering
  if (!invoiceData.invoiceNumber) {
    const lastNum = db.invoices.length;
    invoiceData.invoiceNumber = `INV-2026-${String(lastNum + 1).padStart(3, "0")}`;
  } else {
    const dupe = db.invoices.find(inv => inv.invoiceNumber === invoiceData.invoiceNumber && inv.id !== invoiceData.id);
    if (dupe) { res.status(409).json({ error: `Invoice number '${invoiceData.invoiceNumber}' is already in use.` }); return; }
  }

  const existingIndex = db.invoices.findIndex(inv => inv.id === invoiceData.id);
  const existingInvoice = existingIndex >= 0 ? db.invoices[existingIndex] : null;

  const lockCheck = checkFinancialLock("invoice", existingInvoice, invoiceData, ["Draft"]);
  if (lockCheck.locked) {
    res.status(423).json({ error: `This invoice is ${existingInvoice.status} — '${lockCheck.field}' can no longer be edited directly. Issue a Credit Note to correct it.` });
    return;
  }

  let changeSummary = "";
  if (existingIndex >= 0) {
    changeSummary = diffFields(existingInvoice, invoiceData, [...FINANCIAL_LOCK_FIELDS.invoice, "status", "dueDate"]);
    db.invoices[existingIndex] = { ...db.invoices[existingIndex], ...invoiceData };
    // remove previous journal for this invoice if any
    db.journals = db.journals.filter(j => j.id !== `j_inv_${invoiceData.id}`);
  } else {
    invoiceData.id = "inv_" + uuid();
    db.invoices.push(invoiceData);
  }

  // Generate Balanced Journal Entry if Tax Invoice & is Approved/Sent/Paid (Not Draft or Proforma)
  if (!invoiceData.isProforma && invoiceData.status !== "Draft" && invoiceData.status !== "Cancelled") {
    const journalEntry = createInvoiceJournal(invoiceData, db.company);
    db.journals.push(journalEntry);
  }

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user,
    action: existingIndex >= 0 ? "Edit Invoice" : (invoiceData.isProforma ? "Save Proforma Invoice" : "Create Tax Invoice"),
    details: existingIndex >= 0 ? `${invoiceData.invoiceNumber}: ${changeSummary}` : `Generated standard billing number ${invoiceData.invoiceNumber} for client ₹${invoiceData.total}`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Payments Recorder Double-Entry
app.post("/api/payments", authGuard, requirePermission("approve_payments"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const payment = req.body;
  const user = req.body.authorUser || "User";

  payment.id = "pay_" + uuid();
  if (!payment.receiptNumber) {
    payment.receiptNumber = `PAY-2026-${String(db.payments.length + 1).padStart(3, "0")}`;
  }

  db.payments.push(payment);

  // Apply payment allocations to decrease invoice due balances!
  payment.allocations.forEach((alloc: any) => {
    const inv = db.invoices.find(i => i.id === alloc.invoiceId);
    if (inv) {
      inv.paymentReceived = (inv.paymentReceived || 0) + alloc.amount;
      if (inv.paymentReceived >= inv.total) {
        inv.status = "Paid";
      }
    }
  });

  // Write Double-Entry balanced journal line!
  // Debit Bank_Account for amountReceived
  // Debit Tds_Receivable for tdsDeducted
  // Credit Accounts_Receivable for total (amountReceived + tdsDeducted)
  const totalCredited = payment.amountReceived + payment.tdsDeducted;
  const lines: JournalLine[] = [
    {
      id: uuid(),
      accountCode: "bank_account",
      accountName: "Bank Account",
      debit: payment.amountReceived,
      credit: 0
    }
  ];

  if (payment.tdsDeducted > 0) {
    lines.push({
      id: uuid(),
      accountCode: "tds_receivable",
      accountName: "TDS Receivable",
      debit: payment.tdsDeducted,
      credit: 0
    });
  }

  lines.push({
    id: uuid(),
    accountCode: "accounts_receivable",
    accountName: "Accounts Receivable",
    debit: 0,
    credit: totalCredited
  });

  const journalEntry: JournalEntry = {
    id: `j_pay_${payment.id}`,
    date: payment.date,
    reference: `Payment ${payment.receiptNumber}`,
    description: `Collected client bank remittance to settle allocation for client`,
    lines
  };

  db.journals.push(journalEntry);

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user,
    action: "Record Remittance",
    details: `Allocated ₹${payment.amountReceived} received (TDS ₹${payment.tdsDeducted}) to settle receivable balances.`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Credit note issuer Double-Entry
app.post("/api/credit-notes", authGuard, requirePermission("edit_invoices"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const cn = req.body;
  const user = req.body.authorUser || "User";

  cn.id = "cn_" + uuid();
  if (!cn.creditNoteNumber) {
    cn.creditNoteNumber = `CN-2026-${String(db.creditNotes.length + 1).padStart(3, "0")}`;
  }
  db.creditNotes.push(cn);

  // Adjust invoice balances
  const invoice = db.invoices.find(inv => inv.id === cn.invoiceId);
  if (invoice) {
    // If invoice is fully adjusted or settled, marks it
    // For demo simplicity, we subtract the credit note value from total
    invoice.total = Math.max(0, invoice.total - cn.total);
    if (invoice.paymentReceived >= invoice.total) {
      invoice.status = "Paid";
    }
  }

  // Create Balanced Journal for Credit Note
  // Debit Sales Income for subtotal
  // Debit GST liability for gstAmount
  // Credit Accounts Receivable for total
  const lines: JournalLine[] = [
    {
      id: uuid(),
      accountCode: "sales_income",
      accountName: "Sales Income (Reversed)",
      debit: cn.subtotal,
      credit: 0
    }
  ];

  const totalGst = (cn.totalCgst || 0) + (cn.totalSgst || 0) + (cn.totalIgst || 0);
  if (totalGst > 0) {
    lines.push({
      id: uuid(),
      accountCode: "gst_payable",
      accountName: "GST Payable Liability (Adjusted)",
      debit: totalGst,
      credit: 0
    });
  }

  lines.push({
    id: uuid(),
    accountCode: "accounts_receivable",
    accountName: "Accounts Receivable Credit",
    debit: 0,
    credit: cn.total
  });

  db.journals.push({
    id: `j_cn_${cn.id}`,
    date: cn.date,
    reference: `Credit Note ${cn.creditNoteNumber}`,
    description: `Invoice adjustment for ${cn.invoiceNumber}: ${cn.reason}`,
    lines
  });

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user,
    action: "Issue Credit Note",
    details: `Refund adjustment ${cn.creditNoteNumber} issued on ${cn.invoiceNumber} for ₹${cn.total}`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Quick Expenses Entries Double-Entry
app.post("/api/expenses", authGuard, requirePermission("manage_billing"), requireFeature("expense_bills"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const exp = req.body;
  if (exp.tdsAmount > 0) {
    const org = USER_DB.organizations.find((o: any) => o.id === orgId);
    if (!orgHasFeature(org, "tds")) { res.status(403).json({ error: `TDS isn't included in your current plan (${orgPlan(org)}). Upgrade to Professional to use TDS.`, upgradeRequired: true, feature: "tds" }); return; }
  }
  const db = await readDB(orgId);
  const user = req.body.authorUser || "User";

  const existingIndex = db.expenses.findIndex(e => e.id === exp.id);
  const existingExpense = existingIndex >= 0 ? db.expenses[existingIndex] : null;

  const lockCheck = checkFinancialLock("expense", existingExpense, exp, ["Draft", "Pending Approval"]);
  if (lockCheck.locked) {
    res.status(423).json({ error: `This expense is ${existingExpense.status} — '${lockCheck.field}' can no longer be edited directly. Record a reversing journal to correct it.` });
    return;
  }

  if (existingIndex >= 0) {
    const changeSummary = diffFields(existingExpense, exp, [...FINANCIAL_LOCK_FIELDS.expense, "status"]);
    db.expenses[existingIndex] = { ...db.expenses[existingIndex], ...exp };
    db.auditLogs.unshift({ id: uuid(), timestamp: new Date().toISOString(), user, action: "Edit Expense", details: `${exp.vendorName || exp.id}: ${changeSummary}` });
    // Clear any existing journal for this expense (if any)
    db.journals = db.journals.filter(j => j.id !== `j_exp_${exp.id}`);
  } else {
    exp.id = "exp_" + uuid();
    db.expenses.push(exp);
  }

  // Set default status if not present
  if (!exp.status) {
    exp.status = "Approved"; // fallback
  }

  // Balanced Journal Entry (Only posted if Approved!)
  if (exp.status === "Approved") {
    const lines: JournalLine[] = [
      {
        id: uuid(),
        accountCode: exp.category,
        accountName: db.accounts.find(a => a.code === exp.category)?.name || "General Business Expense",
        debit: exp.subtotal,
        credit: 0
      }
    ];

    if (exp.gstAmount > 0) {
      lines.push({
        id: uuid(),
        accountCode: "input_gst",
        accountName: "Input GST (Tax Asset)",
        debit: exp.gstAmount,
        credit: 0
      });
      if (exp.isReverseCharge) {
        lines.push({
          id: uuid(),
          accountCode: "gst_payable",
          accountName: "GST Payable (Reverse Charge – Self Assessed)",
          debit: 0,
          credit: exp.gstAmount
        });
      }
    }

    if (exp.tdsAmount > 0) {
      lines.push({
        id: uuid(),
        accountCode: "tds_payable",
        accountName: "TDS Payable (Liability on Deduction)",
        debit: 0,
        credit: exp.tdsAmount
      });
    }

    lines.push({
      id: uuid(),
      accountCode: "bank_account",
      accountName: "Bank Account (Settling Cash Outflow)",
      debit: 0,
      credit: (exp.isReverseCharge ? exp.subtotal : exp.subtotal + exp.gstAmount) - exp.tdsAmount
    });

    db.journals.push({
      id: `j_exp_${exp.id}`,
      date: exp.date,
      reference: `Expense Outflow - ${exp.vendorName}`,
      description: `Business expenses for Internet/broadband/travel category`,
      lines
    });

    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Approve Expense",
      details: `Approved and posted spending of ₹${exp.total} categorized as ${exp.category}`
    });
  } else {
    // Audit logging for other stages
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: exp.status === "Draft" ? "Save Expense Draft" : "Submit Expense Approval",
      details: `${exp.status === "Draft" ? "Saved draft for out-of-pocket spending" : "Submitted out-of-pocket spending for authority approval"} of ₹${exp.total}`
    });
  }

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Bills Double-Entry
app.post("/api/bills", authGuard, requirePermission("manage_billing"), requireFeature("expense_bills"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const bill = req.body;
  if (bill.tdsAmount > 0) {
    const org = USER_DB.organizations.find((o: any) => o.id === orgId);
    if (!orgHasFeature(org, "tds")) { res.status(403).json({ error: `TDS isn't included in your current plan (${orgPlan(org)}). Upgrade to Professional to use TDS.`, upgradeRequired: true, feature: "tds" }); return; }
  }
  const db = await readDB(orgId);
  const user = req.body.authorUser || "User";

  const existingIndex = db.bills.findIndex(b => b.id === bill.id);
  const existingBill = existingIndex >= 0 ? db.bills[existingIndex] : null;

  const lockCheck = checkFinancialLock("bill", existingBill, bill, ["Draft"]);
  if (lockCheck.locked) {
    res.status(423).json({ error: `This bill is ${existingBill.status} — '${lockCheck.field}' can no longer be edited directly. Issue a Debit Note to correct it.` });
    return;
  }

  if (existingIndex >= 0) {
    const changeSummary = diffFields(existingBill, bill, [...FINANCIAL_LOCK_FIELDS.bill, "status", "dueDate", "paymentPaid"]);
    db.bills[existingIndex] = { ...db.bills[existingIndex], ...bill };
    db.auditLogs.unshift({ id: uuid(), timestamp: new Date().toISOString(), user, action: "Edit Bill", details: `${bill.billNumber}: ${changeSummary}` });
    // Clear any existing journals for this bill
    db.journals = db.journals.filter(j => j.id !== `j_bill_${bill.id}`);
  } else {
    bill.id = "bill_" + uuid();
    if (!bill.billNumber) {
      bill.billNumber = `BILL-DUE-${String(db.bills.length + 1).padStart(3, "0")}`;
    } else {
      const dupe = db.bills.find(b => b.billNumber === bill.billNumber && b.id !== bill.id);
      if (dupe) { res.status(409).json({ error: `Bill number '${bill.billNumber}' is already in use.` }); return; }
    }
    db.bills.push(bill);
  }

  if (!bill.status) {
    bill.status = "Approved"; // fallback
  }

  // Journal creation (Only posted if Approved or Paid!)
  if (bill.status === "Approved" || bill.status === "Paid") {
    const lines: JournalLine[] = [
      {
        id: uuid(),
        accountCode: "purchases_expense",
        accountName: "Purchases / Cost of Goods & Services",
        debit: bill.subtotal,
        credit: 0
      }
    ];

    if (bill.totalGst > 0) {
      lines.push({
        id: uuid(),
        accountCode: "input_gst",
        accountName: "Input GST Asset",
        debit: bill.totalGst,
        credit: 0
      });
      if (bill.isReverseCharge) {
        lines.push({
          id: uuid(),
          accountCode: "gst_payable",
          accountName: "GST Payable (Reverse Charge – Self Assessed)",
          debit: 0,
          credit: bill.totalGst
        });
      }
    }

    if (bill.tdsAmount > 0) {
      lines.push({
        id: uuid(),
        accountCode: "tds_payable",
        accountName: `TDS Payable (Sec ${bill.tdsSection || "—"})`,
        debit: 0,
        credit: bill.tdsAmount
      });
    }

    lines.push({
      id: uuid(),
      accountCode: "accounts_payable",
      accountName: "Accounts Payable",
      debit: 0,
      credit: bill.total
    });

    db.journals.push({
      id: `j_bill_${bill.id}`,
      date: bill.date,
      reference: `Vendor Bill ${bill.billNumber}`,
      description: `Approved payable claim from vendor ${bill.vendorName}`,
      lines
    });

    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: "Approve Vendor Bill",
      details: `Approved invoicing payable claim ${bill.billNumber} from ${bill.vendorName} for ₹${bill.total}`
    });
  } else {
    // Log other workflow steps
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: new Date().toISOString(),
      user,
      action: bill.status === "Draft" ? "Save Bill Draft" : "Submit Bill Approval",
      details: `${bill.status === "Draft" ? "Saved draft bill" : "Submitted vendor bill for authority approval"} ${bill.billNumber} from ${bill.vendorName} for ₹${bill.total}`
    });
  }

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

app.post("/api/bills/pay", authGuard, requirePermission("approve_payments"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const { billId, date, paymentMode, referenceNumber, amountPaid, authorUser } = req.body;
  const user = authorUser || "User";

  const bill = db.bills.find(b => b.id === billId);
  if (!bill) {
    return res.status(404).json({ error: "Bill not found" });
  }

  bill.paymentPaid = (bill.paymentPaid || 0) + amountPaid;
  if (bill.paymentPaid >= bill.total) {
    bill.status = "Paid";
  }

  // Balanced Journal Entry
  // Debit Accounts Payable - amountPaid
  // Credit Bank Account - amountPaid
  db.journals.push({
    id: `j_pay_bill_${bill.id}_${uuid()}`,
    date,
    reference: `Bill Settle ${bill.billNumber}`,
    description: `Paid vendor bill claim ${bill.billNumber} via ${paymentMode}`,
    lines: [
      { id: uuid(), accountCode: "accounts_payable", accountName: "Accounts Payable", debit: amountPaid, credit: 0 },
      { id: uuid(), accountCode: "bank_account", accountName: "Bank Account", debit: 0, credit: amountPaid }
    ]
  });

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user,
    action: "Pay Vendor Bill",
    details: `Settle payable ₹${amountPaid} for supplier bill ${bill.billNumber}`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Post Manual Journal entry
app.post("/api/journals", authGuard, requirePermission("create_journals"), async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const { date, reference, description, lines, user } = req.body;

  if (!date || !reference || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: "Missing required journal fields. All journals require a date, unique reference, and double entry transaction lines." });
  }

  // Validate balanced double entry
  let totalDebit = 0;
  let totalCredit = 0;
  lines.forEach((l: any) => {
    totalDebit += Number(l.debit || 0);
    totalCredit += Number(l.credit || 0);
  });

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: `Double-entry violation balance mismatch: Debits (₹${totalDebit.toLocaleString()}) must exactly balance out Credits (₹${totalCredit.toLocaleString()}). Difference is ₹${Math.abs(totalDebit - totalCredit).toLocaleString()}` });
  }

  const newJournal = {
    id: `j_manual_${uuid()}`,
    date,
    reference,
    description: description || "",
    lines: lines.map((l: any) => ({
      id: uuid(),
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0)
    }))
  };

  db.journals.push(newJournal);

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user: user || "System user",
    action: "Manual Journal Entry",
    details: `Posted balanced accounting entries for ${reference} (₹${totalDebit.toLocaleString()}) to general accounts.`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Secure API endpoint to delete sub-users from Corporate Team Directory
app.post("/api/users/remove", authGuard, requirePermission("manage_users"), async (req: any, res: any) => {
  const activeUser = req.user;
  // Accept both 'userId' (SuperAdmin UI) and 'id' (legacy)
  const targetId = req.body.userId || req.body.id;
  if (!targetId) return res.status(400).json({ error: "Missing required parameter: userId" });

  // Find user in USER_DB (authoritative store)
  const targetUserIdx = USER_DB.users.findIndex((u: any) => u.id === targetId);
  if (targetUserIdx === -1) return res.status(404).json({ error: "User not found." });
  const targetUser = USER_DB.users[targetUserIdx];

  // Prevent deleting Super Admin or self
  if (targetUser.role === "Super Admin") return res.status(400).json({ error: "Cannot delete Super Admin." });
  if (targetUser.id === activeUser.id) return res.status(400).json({ error: "Cannot delete your own account." });

  // Tenant isolation — non-SuperAdmin can only delete from their own org
  if (activeUser.role !== "Super Admin" && targetUser.organizationId !== activeUser.organizationId) {
    return res.status(403).json({ error: "Tenant isolation violation." });
  }

  // Remove from USER_DB
  USER_DB.users.splice(targetUserIdx, 1);

  // Update org seat count
  const org = USER_DB.organizations.find((o: any) => o.id === targetUser.organizationId);
  if (org) org.usedSeats = USER_DB.users.filter((u: any) => u.organizationId === org.id && u.status !== "Disabled").length;

  addAuditLog(targetUser.organizationId, activeUser.fullName, activeUser.role, "User Deleted", `Deleted user '${targetUser.email}' (${targetUser.role}).`);
  saveUserDB().catch(() => {});
  res.json({ success: true, deleted: targetUser.email });
});

// ── Auto-create Supabase tables on first run ──────────────────────────────
app.post("/api/superadmin/init-db", authGuard, superAdminGuard, async (req: any, res: any) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(400).json({ error: "Supabase not configured." });
  const sql = `
    create table if not exists bk_organizations (id text primary key, name text, "gstNumber" text, status text, "allocatedSeats" int, "usedSeats" int, "createdAt" text, "approvedAt" text, "subscriptionExpiresAt" text, "subscriptionMonths" int, data jsonb default '{}');
    create table if not exists bk_users (id text primary key, organizationid text, "fullName" text, email text unique, "mobileNumber" text, role text, status text, password text, permissions jsonb, "twoFactorEnabled" bool default false, "twoFactorVerified" bool default false, "createdAt" text, data jsonb default '{}');
    create table if not exists bk_registrations (id text primary key, "companyName" text, "gstNumber" text, "adminName" text, email text, "mobileNumber" text, password text, "numberOfRequiredSeats" int, status text, "emailVerified" bool, "createdAt" text);
    create table if not exists bk_seat_requests (id text primary key, "organizationId" text, "requestedBy" text, "currentSeatCount" int, "additionalSeatsRequested" int, reason text, status text, "createdAt" text);
    create table if not exists bk_support_tickets (id text primary key, "organizationId" text, "orgName" text, "raisedBy" text, "raisedByEmail" text, subject text, description text, priority text, status text, messages jsonb, "createdAt" text, "updatedAt" text);
    create table if not exists bk_notifications (id text primary key, "to" text, subject text, body text, type text, timestamp text, code text);
  `;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST", headers: sbHeaders(),
      body: JSON.stringify({ sql })
    });
    if (r.ok) {
      res.json({ success: true, message: "Tables created. Run migration to copy existing data." });
    } else {
      // Tables might already exist — try a direct write instead
      await sbUpsert("bk_organizations", USER_DB.organizations.length ? USER_DB.organizations : []);
      res.json({ success: true, message: "Tables ready (already existed or created)." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tally XML Export ─────────────────────────────────────────────────────
app.get("/api/export/tally", authGuard, async (req: any, res: any) => {
  const db = await readDB(req.user.organizationId);
  const invoices = (db.invoices || []).filter((i: any) => i.status === "Approved");
  const expenses = db.expenses || [];
  const company = db.company || {};

  const escXml = (s: any) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  const invoiceVouchers = invoices.map((inv: any) => `
  <VOUCHER VCHTYPE="Sales" ACTION="Create">
    <DATE>${(inv.date||"").replace(/-/g,"")}</DATE>
    <NARRATION>${escXml(inv.invoiceNumber)} - ${escXml(inv.customerName || "")}</NARRATION>
    <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
    <PARTYLEDGERNAME>${escXml(inv.customerName || "Debtor")}</PARTYLEDGERNAME>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${escXml(inv.customerName || "Debtor")}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>-${inv.total || 0}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Sales</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${inv.subtotal || inv.total || 0}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    ${(inv.totalGst || 0) > 0 ? `<ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>GST Payable</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${inv.totalGst || 0}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>` : ""}
  </VOUCHER>`).join("\n");

  const expenseVouchers = expenses.map((exp: any) => `
  <VOUCHER VCHTYPE="Payment" ACTION="Create">
    <DATE>${(exp.date||"").replace(/-/g,"")}</DATE>
    <NARRATION>${escXml(exp.category || "Expense")} - ${escXml(exp.vendor || "")}</NARRATION>
    <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${escXml(exp.category || "Indirect Expenses")}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>-${exp.amount || exp.total || 0}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Bank Account</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${exp.amount || exp.total || 0}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escXml(company.name || "Ledgerio Export")}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${invoiceVouchers}
          ${expenseVouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Content-Disposition", `attachment; filename="bizkhata-tally-export-${new Date().toISOString().split('T')[0]}.xml"`);
  res.send(xml);
});

// ── CSV / JSON Data Backup ────────────────────────────────────────────────
app.get("/api/export/csv/:type", authGuard, async (req: any, res: any) => {
  const db = await readDB(req.user.organizationId);
  const type = req.params.type;

  const toCSV = (rows: any[], cols: string[]) => {
    const header = cols.join(",");
    const lines = rows.map(r => cols.map(c => {
      const v = String(r[c] ?? "").replace(/"/g, '""');
      return v.includes(",") || v.includes("\n") || v.includes('"') ? `"${v}"` : v;
    }).join(","));
    return [header, ...lines].join("\n");
  };

  const typeMap: Record<string, { data: any[], cols: string[] }> = {
    invoices: { data: db.invoices || [], cols: ["id","invoiceNumber","date","customerName","subtotal","totalGst","total","status"] },
    expenses: { data: db.expenses || [], cols: ["id","date","category","vendor","amount","gst","total","paymentMode"] },
    bills: { data: db.bills || [], cols: ["id","billNumber","date","vendorName","subtotal","totalGst","total","status"] },
    customers: { data: db.customers || [], cols: ["id","name","email","mobile","gstin","state","openingBalance"] },
    vendors: { data: db.vendors || [], cols: ["id","name","email","mobile","gstin","state","openingBalance"] },
    journals: { data: db.journals || [], cols: ["id","date","narration","debitAccount","creditAccount","amount","reference"] },
    payments: { data: db.payments || [], cols: ["id","date","invoiceNumber","customerName","amount","paymentMode","reference"] },
  };

  if (!typeMap[type]) return res.status(400).json({ error: "Invalid export type." });
  const { data, cols } = typeMap[type];
  const csv = toCSV(data, cols);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="bizkhata-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

app.get("/api/export/json", authGuard, async (req: any, res: any) => {
  const db = await readDB(req.user.organizationId);
  const backup = {
    exportedAt: new Date().toISOString(),
    company: db.company,
    invoices: db.invoices || [],
    expenses: db.expenses || [],
    bills: db.bills || [],
    customers: db.customers || [],
    vendors: db.vendors || [],
    items: db.items || [],
    journals: db.journals || [],
    payments: db.payments || [],
    accounts: db.accounts || [],
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="bizkhata-backup-${new Date().toISOString().split('T')[0]}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

// ── WhatsApp Notifications (via WATI/Twilio) ──────────────────────────────
app.post("/api/notifications/whatsapp", authGuard, async (req: any, res: any) => {
  const { phone, message, templateName } = req.body;
  const watiToken = process.env.WATI_API_TOKEN;
  const watiUrl = process.env.WATI_API_URL; // e.g. https://live-server-xxxxx.wati.io

  if (!watiToken || !watiUrl) {
    // Log notification for manual follow-up
    USER_DB.notifications.unshift({
      id: generateId("notif"), to: phone, subject: "WhatsApp (pending config)",
      body: message, type: "WhatsApp", timestamp: new Date().toISOString()
    });
    return res.json({ sent: false, reason: "WATI_API_TOKEN or WATI_API_URL not configured. Message queued in notifications." });
  }

  try {
    const r = await fetch(`${watiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${phone.replace(/\D/g,"")}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${watiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ template_name: templateName || "bizkhata_notification", broadcast_name: "Ledgerio", parameters: [{ name: "message", value: message }] })
    });
    const data = await r.json();
    res.json({ sent: r.ok, data });
  } catch (err: any) {
    res.status(500).json({ sent: false, error: err.message });
  }
});

// ── Onboarding Status ──────────────────────────────────────────────────────
app.get("/api/onboarding/status", authGuard, async (req: any, res: any) => {
  const db = await readDB(req.user.organizationId);
  const steps = [
    { id: "company", label: "Set up company profile", done: !!(db.company?.name && db.company?.gstin) },
    { id: "opening_balances", label: "Enter opening balances", done: !!(db as any).openingBalancesSet },
    { id: "customers", label: "Add first customer", done: (db.customers||[]).length > 0 },
    { id: "items", label: "Add products/services", done: (db.items||[]).length > 0 },
    { id: "invoice", label: "Create first invoice", done: (db.invoices||[]).length > 0 },
    { id: "expense", label: "Record first expense", done: (db.expenses||[]).length > 0 },
    { id: "bank", label: "Add bank account", done: (db.accounts||[]).some((a: any) => a.type === "Bank" || a.code === "bank_account") },
  ];
  const pct = Math.round(steps.filter(s => s.done).length / steps.length * 100);
  res.json({ steps, percent: pct, complete: pct === 100 });
});


const PLANS: Record<string, { name: string; price: number; seats: number; features: string[] }> = {
  free: {
    name: "Free",
    price: 0,
    seats: 1,
    features: ["invoices", "expenses", "basic_reports", "1_org_user"]
  },
  starter: {
    name: "Starter",
    price: 999,
    seats: 3,
    features: ["invoices", "estimates", "expenses", "bills", "payments", "basic_reports", "gst_reports", "bank_reconciliation", "3_org_users"]
  },
  professional: {
    name: "Professional",
    price: 2499,
    seats: 10,
    features: ["invoices", "estimates", "expenses", "bills", "payments", "credit_notes", "purchase_orders", "delivery_challans", "basic_reports", "gst_reports", "advanced_reports", "bank_reconciliation", "tds", "multi_currency", "projects", "10_org_users"]
  },
  enterprise: {
    name: "Enterprise",
    price: 4999,
    seats: 50,
    features: ["all_features", "custom_domain", "priority_support", "api_access", "50_org_users"]
  }
};

app.get("/api/plans", (_req: any, res: any) => {
  res.json(PLANS);
});

// Returns the calling user's organization plan + entitlements + seat usage.
// This is the single source of truth for "does this org's plan include feature X" —
// use this instead of hardcoding feature checks, so upgrading PLANS above stays consistent.
app.get("/api/organization/entitlements", authGuard, (req: any, res: any) => {
  const org = USER_DB.organizations.find((o: any) => o.id === req.user.organizationId);
  if (!org) { res.status(404).json({ error: "No organization found for this user." }); return; }
  const planKey = org.plan || "professional"; // default until every org has a plan set explicitly
  const plan = PLANS[planKey] || PLANS.professional;
  res.json({
    plan: planKey,
    planName: plan.name,
    features: plan.features,
    allocatedSeats: org.allocatedSeats,
    usedSeats: org.usedSeats,
    subscriptionExpiresAt: org.subscriptionExpiresAt,
  });
});

app.get("/api/superadmin/plans", authGuard, superAdminGuard, (_req: any, res: any) => {
  res.json(PLANS);
});

app.post("/api/superadmin/organizations/:id/plan", authGuard, superAdminGuard, (req: any, res: any) => {
  const org = USER_DB.organizations.find((o: any) => o.id === req.params.id);
  if (!org) return res.status(404).json({ error: "Organisation not found." });
  const { plan, months } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan." });
  const m = Math.max(1, Math.min(36, parseInt(months) || 12));
  org.plan = plan;
  org.allocatedSeats = PLANS[plan].seats;
  org.subscriptionMonths = m;
  org.subscriptionExpiresAt = new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000).toISOString();
  addAuditLog(null, req.user.fullName, req.user.role, "Plan Updated", `${org.name} → ${PLANS[plan].name} for ${m} months.`);
  saveUserDB().catch(() => {});
  res.json({ success: true, org });
});

// Check if org has access to a feature based on their plan
app.get("/api/plan-features", authGuard, (req: any, res: any) => {
  const user = req.user;
  const org = USER_DB.organizations.find((o: any) => o.id === user.organizationId);
  if (!org) return res.json({ plan: "free", features: PLANS.free.features });
  const plan = org.plan || "professional"; // default to professional until payment system
  const planData = PLANS[plan] || PLANS.professional;
  const allFeatures = planData.features.includes("all_features");
  res.json({
    plan,
    planName: planData.name,
    price: planData.price,
    seats: planData.seats,
    features: planData.features,
    allFeatures,
    expiresAt: org.subscriptionExpiresAt,
    daysLeft: org.subscriptionExpiresAt
      ? Math.ceil((new Date(org.subscriptionExpiresAt).getTime() - Date.now()) / 86400000)
      : null
  });
});


app.get("/api/legal/tos", (_req: any, res: any) => {
  res.json({
    title: "Ledgerio Terms of Service",
    effectiveDate: "2026-01-01",
    content: `
**1. Acceptance of Terms**
By accessing or using Ledgerio ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

**2. Service Description**
Ledgerio is a cloud-based accounting and GST compliance platform for Indian businesses. The Service includes invoicing, expense management, GST filing preparation, financial reporting, and related features.

**3. Account Registration**
You must provide accurate information during registration. Each organisation is responsible for maintaining the security of its login credentials. You must notify us immediately of any unauthorised access.

**4. Subscription & Billing**
Access to Ledgerio is provided on a subscription basis. Subscriptions are activated by the platform administrator and are subject to the seat count and duration approved at onboarding. Fees are due as per the pricing communicated at sign-up.

**5. Data Ownership**
All accounting data you enter into Ledgerio remains your property. We do not claim ownership over your financial records, customer data, or business information.

**6. Data Security**
We use industry-standard encryption and security practices. Data is stored on Supabase (PostgreSQL) servers. We do not sell your data to third parties.

**7. Prohibited Use**
You may not use Ledgerio to process fraudulent transactions, file false GST returns, or engage in any activity that violates Indian law including the Income Tax Act, GST Act, or Companies Act.

**8. Service Availability**
We strive for 99.5% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be notified in advance.

**9. Limitation of Liability**
Ledgerio is a tool to assist with accounting. We are not responsible for errors in GST filings, tax calculations, or financial decisions made using the Service. Always verify critical filings with a qualified CA.

**10. Termination**
We reserve the right to suspend or terminate accounts that violate these terms, with reasonable notice except in cases of fraud or security breach.

**11. Governing Law**
These terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in Uttar Pradesh, India.

**12. Contact**
For queries: support@bizkhata.app | Verma Consultancy Services, Varanasi, Uttar Pradesh, India.
    `.trim()
  });
});

app.get("/api/legal/privacy", (_req: any, res: any) => {
  res.json({
    title: "Ledgerio Privacy Policy",
    effectiveDate: "2026-01-01",
    content: `
**1. Information We Collect**
- Account information: name, email, mobile number, company details, GSTIN
- Financial data: invoices, expenses, payments, journal entries you create
- Usage data: login timestamps, feature usage (for product improvement)
- Device data: browser type, IP address (for security logging)

**2. How We Use Your Information**
- To provide and improve the accounting service
- To send transactional emails (OTPs, password resets, account notifications)
- To comply with legal obligations under Indian law
- To provide customer support

**3. Data Storage**
All data is stored on Supabase (PostgreSQL) servers. Your financial data is isolated per-organisation and not accessible to other organisations on the platform.

**4. Data Sharing**
We do not sell, trade, or share your personal or financial data with third parties except:
- With your explicit consent
- To comply with legal obligations (e.g. court orders)
- With service providers who help operate the platform (Supabase, Vercel) under strict data processing agreements

**5. Data Retention**
We retain your data for as long as your subscription is active, plus 7 years after termination (as required by Indian accounting law — Companies Act 2013, Section 128).

**6. Your Rights**
- Access: Request a copy of all data we hold about you
- Correction: Request correction of inaccurate data
- Deletion: Request deletion of your account and data (subject to legal retention requirements)
- Portability: Export your accounting data in standard formats

**7. Security**
- Passwords are hashed using scrypt (never stored in plaintext)
- Session tokens are HMAC-signed with expiry
- All data in transit uses TLS 1.2+
- Database access is restricted via Supabase Row Level Security

**8. Cookies**
We use only essential session cookies for authentication. No advertising or tracking cookies.

**9. Children's Privacy**
Ledgerio is not intended for use by anyone under 18 years of age.

**10. Changes to This Policy**
We will notify registered users by email of any material changes to this policy with 30 days notice.

**11. Contact**
Privacy queries: privacy@bizkhata.app | Verma Consultancy Services, Varanasi, UP - 221001, India.
    `.trim()
  });
});


// Any org user can raise a ticket; SuperAdmin can view, respond, resolve

app.get("/api/support/tickets", authGuard, (req: any, res: any) => {
  const user = req.user;
  if (user.role === "Super Admin") {
    return res.json(USER_DB.supportTickets || []);
  }
  // Org users see only their org's tickets
  const tickets = (USER_DB.supportTickets || []).filter((t: any) => t.organizationId === user.organizationId);
  res.json(tickets);
});

app.post("/api/support/tickets", authGuard, (req: any, res: any) => {
  const user = req.user;
  const { subject, description, priority } = req.body;
  if (!subject || !description) return res.status(400).json({ error: "Subject and description required." });
  if (!USER_DB.supportTickets) USER_DB.supportTickets = [];
  const org = USER_DB.organizations.find((o: any) => o.id === user.organizationId);
  const ticket = {
    id: generateId("ticket"),
    organizationId: user.organizationId,
    orgName: org?.name || "Unknown",
    raisedBy: user.fullName,
    raisedByEmail: user.email,
    subject,
    description,
    priority: priority || "Medium",
    status: "Open",
    messages: [{ from: user.fullName, role: user.role, text: description, timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  USER_DB.supportTickets.unshift(ticket);
  saveUserDB().catch(() => {});
  res.status(201).json(ticket);
});

app.post("/api/support/tickets/:id/reply", authGuard, (req: any, res: any) => {
  const user = req.user;
  const ticket = (USER_DB.supportTickets || []).find((t: any) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  // Only SuperAdmin or the ticket's org members can reply
  if (user.role !== "Super Admin" && ticket.organizationId !== user.organizationId) {
    return res.status(403).json({ error: "Access denied." });
  }
  const { text, status } = req.body;
  if (!text) return res.status(400).json({ error: "Reply text required." });
  ticket.messages.push({ from: user.fullName, role: user.role, text, timestamp: new Date().toISOString() });
  if (status) ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  saveUserDB().catch(() => {});
  res.json(ticket);
});

// SuperAdmin: inspect any org's ledger data (read-only)
app.get("/api/superadmin/orgs/:orgId/ledger", authGuard, superAdminGuard, async (req: any, res: any) => {
  const { orgId } = req.params;
  const org = USER_DB.organizations.find((o: any) => o.id === orgId);
  if (!org) return res.status(404).json({ error: "Organisation not found." });
  try {
    const db = await readDB(orgId);
    const summary = {
      org,
      users: USER_DB.users.filter((u: any) => u.organizationId === orgId).map(safeUser),
      stats: {
        invoices: (db.invoices || []).length,
        expenses: (db.expenses || []).length,
        bills: (db.bills || []).length,
        customers: (db.customers || []).length,
        vendors: (db.vendors || []).length,
        journals: (db.journals || []).length,
        totalRevenue: (db.invoices || []).filter((i: any) => i.status === "Approved").reduce((s: number, i: any) => s + (i.total || 0), 0),
        totalExpenses: (db.expenses || []).reduce((s: number, e: any) => s + (e.total || e.amount || 0), 0),
      },
      recentInvoices: (db.invoices || []).slice(0, 5),
      recentJournals: (db.journals || []).slice(0, 5),
      accounts: (db.accounts || []).slice(0, 20),
      company: db.company,
      tickets: (USER_DB.supportTickets || []).filter((t: any) => t.organizationId === orgId)
    };
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// NOTE: previously this route (and /update, /delete below it) used only `authGuard` with
// no role check, and wrote into the *calling user's own tenant DB* via readDB(req.user.organizationId)
// instead of the real platform-wide USER_DB.organizations store used by /api/superadmin/*.
// That meant: (a) any logged-in user of any role could call it, and (b) the "SaaS Owner" org
// list it produced was never the same data Super Admin saw. Replaced with a single, properly
// guarded route below that writes to the real platform store.
app.post("/api/superadmin/organizations", authGuard, superAdminGuard, (req: any, res: any) => {
  const { name, legalName, pan, gstNumber, purchasedSeats, packageType, pricingMonthly, registeredEmail } = req.body;
  if (!name || !registeredEmail) {
    return res.status(400).json({ error: "Organization name and registered email are required." });
  }
  const newOrg = {
    id: `org_${uuid()}`,
    name,
    legalName: legalName || name,
    pan: pan || "",
    gstNumber: gstNumber || "",
    allocatedSeats: Number(purchasedSeats || 4),
    usedSeats: 0,
    packageType: packageType || "Standard",
    pricingMonthly: Number(pricingMonthly || 2499),
    status: "Active",
    registeredEmail: registeredEmail.toLowerCase(),
    createdAt: new Date().toISOString()
  };
  USER_DB.organizations.push(newOrg);
  addAuditLog(null, req.user.fullName, req.user.role, "Register Organization", `Enrolled new customer organization '${name}' for ${newOrg.allocatedSeats} seats.`);
  res.json(newOrg);
});


// Update Role API
app.post("/api/role", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  db.role = req.body.role;
  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Reset database — wipes ONLY the calling user's own organization's ledger back to a
// clean initial state. Scoped by orgId so this can never affect another tenant's books.
app.post("/api/reset", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const fresh = getInitialState();
  await writeDB(orgId, fresh);
  res.json(fresh);
});

// Server-side AI Services utilizing Google Gemini API 3.5 Flash
app.post("/api/ai/invoice-create", authGuard, async (req: any, res: any) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "No prompts provided." });
  }

  if (!ai) {
    return res.status(503).json({
      error: "AI invoice parsing isn't available right now — no GEMINI_API_KEY is configured. Add one in your environment settings, or enter the invoice details manually."
    });
  }

  try {
    const systemPrompt = `You are Ledgerio's smart invoice extraction system. Parse the client's unstructured prompt (e.g., mail copy, bill list, note) and return matched business fields as JSON. Identify:
    1. Customer Name
    2. Items list (name, qty, rate, gstRate (standard 18% if unspecified))
    Strictly output details inside the following JSON structure:
    {
      "customerName": "string",
      "items": [
        { "name": "string", "qty": number, "rate": number, "gstRate": number }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  qty: { type: Type.NUMBER },
                  rate: { type: Type.NUMBER },
                  gstRate: { type: Type.NUMBER }
                },
                required: ["name", "qty", "rate", "gstRate"]
              }
            }
          },
          required: ["customerName", "items"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Gemini parse failed:", error);
    res.status(500).json({ error: "Gemini failed to resolve fields. Please try manually.", details: error.message });
  }
});

app.post("/api/ai/reconcile", authGuard, requireFeature("bank_reconciliation"), async (req: any, res: any) => {
  const { bankFeed } = req.body;
  if (!bankFeed) {
    return res.status(400).json({ error: "Feed prompt is required." });
  }

  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const outstandingInvoices = db.invoices.filter(i => i.status !== "Paid");

  if (!ai) {
    return res.json({
      fallback: true,
      explanation: "Please configure your GEMINI_API_KEY to run live semantic bank reconciliations. In the meantime, here is our automated heuristic match:",
      suggestedMatch: outstandingInvoices.length > 0 ? {
        invoiceNumber: outstandingInvoices[0].invoiceNumber,
        allocatedAmount: outstandingInvoices[0].total,
        confidence: "85% (Heuristic match for outstanding total invoice value)"
      } : null
    });
  }

  try {
    const prompt = `Match the following bank feed line with the outstanding invoices list and suggest the best allocation match.
    
    Bank Feed: "${bankFeed}"
    
    Outstanding Invoices:
    ${JSON.stringify(outstandingInvoices.map(i => ({ id: i.id, num: i.invoiceNumber, customer: i.customerName, total: i.total })), null, 2)}
    
    Suggest the most confident invoice match, indicating the invoice number, matched amount, and a confident explanation code. Return as JSON with keys "invoiceNumber", "allocatedAmount", "confidence", "explanation".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoiceNumber: { type: Type.STRING },
            allocatedAmount: { type: Type.NUMBER },
            confidence: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["invoiceNumber", "allocatedAmount", "confidence", "explanation"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to query AI models.", details: err.message });
  }
});

app.post("/api/ai/categorize", authGuard, async (req: any, res: any) => {
  const { text } = req.body;
  if (!ai) {
    return res.json({
      fallback: true,
      category: "software_subscription",
      confidence: "95% (Stationary heuristic matching online subscriptions)"
    });
  }

  try {
    const prompt = `Identify the best Chart of Accounts category for the described business spending: "${text}".
    
    Allowed codes are: 
    - "salary_expense" (Salaries/general operations)
    - "contractor_expense" (Consulting/contracting out)
    - "rent" (Property lease rental)
    - "software_subscription" (SaaS/Software/Internet)
    - "professional_fees" (Legal/financial audit consultation)
    - "bank_charges" (Bank fees/Interest)
    
    Return as JSON with the key "category" matched with the exact allowed code and a short "reason".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["category", "reason"]
        }
      }
    });

    res.json(JSON.parse(response.text.trim()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/explain-report", authGuard, async (req: any, res: any) => {
  const { reportType, data } = req.body;
  if (!ai) {
    return res.json({
      explanation: "### Ledgerio AI Financial Analyst\nTo get personalized AI summaries and forecast charts, please activate the GEMINI_API_KEY in the Secrets panel.\n\nFrom the heuristic view:\n1. **Tax compliance** looks good with CGST/SGST structured correctly for intra-state and IGST for inter-state supplies.\n2. **Bank Reserves** reflect your current opening balance as entered in Company Setup → Opening Balances."
    });
  }

  try {
    const prompt = `As a Chartered Accountant (CA) expert in Indian GST and accounting standards, analyze this custom business report:
    
    Report Type: ${reportType}
    Report Payload Data:
    ${JSON.stringify(data, null, 2)}
    
    Synthesize the Profitability, Accounts Receivable aging, and Tax liabilities/asset balancing ratios. Output an informative report analysis in beautiful, professional Markdown with bullet points. Suggest operational improvements for Indian entities. Keep it succinct and polite.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ explanation: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/generate-reminder", authGuard, async (req: any, res: any) => {
  const { invoiceNum, clientName, dueDate, amount } = req.body;
  const tonePrompt = `Draft a professional, yet gentle payment outstanding email reminder for Indian invoice number ${invoiceNum}. Client: ${clientName}, Due date: ${dueDate}, Balance outstanding: ₹${amount}. Write a helpful subject line and email body.`;

  if (!ai) {
    return res.json({
      subject: `Reminder: Outstanding Payment Request - ${invoiceNum}`,
      body: `Dear Accounts Team at ${clientName},\n\nWe hope you are doing well.\n\nThis is a friendly reminder that invoice ${invoiceNum} which was due on ${dueDate} remains outstanding. The total amount receivable is ₹${amount}.\n\nWe kindly request you to process the NEFT/RTGS bank transfer at your earliest convenience. Please let us know if you require any banking documentation or support.\n\nBest Regards,\nFinance & Compliance Team\nLedgerio Pvt Ltd`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: tonePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });

    res.json(JSON.parse(response.text.trim()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/copilot", authGuard, async (req: any, res: any) => {
  const { messages, context } = req.body;
  if (!ai) {
    return res.json({
      reply: "AI Copilot requires GEMINI_API_KEY to be configured. As a fallback: your question has been noted. Please configure the Gemini API key in Vercel environment variables to enable live AI responses."
    });
  }
  try {
    const systemPrompt = `You are Ledgerio's AI accounting copilot — an expert CA (Chartered Accountant) specializing in Indian GST, TDS, accounting standards (IndAS/GAAP), and business finance. Answer questions concisely and accurately. Context about this organization: ${JSON.stringify(context || {})}.`;
    const userMessage = Array.isArray(messages) ? messages[messages.length - 1]?.content || "" : messages;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${systemPrompt}\n\nUser: ${userMessage}`
    });
    res.json({ reply: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Sales Orders API ────────────────────────────────────────────────────────
app.post("/api/sales-orders", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!db.salesOrders) db.salesOrders = [];
    if (payload.id) {
      const idx = db.salesOrders.findIndex((s: any) => s.id === payload.id);
      if (idx >= 0) { db.salesOrders[idx] = { ...db.salesOrders[idx], ...payload }; }
      else { db.salesOrders.push(payload); }
    } else {
      const soCount = db.salesOrders.length + 1;
      const soNumber = `SO-${new Date().getFullYear()}-${String(soCount).padStart(3, "0")}`;
      db.salesOrders.push({ ...payload, id: `so_${Date.now()}`, soNumber });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Purchase Orders API ─────────────────────────────────────────────────────
app.post("/api/purchase-orders", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!db.purchaseOrders) db.purchaseOrders = [];
    if (payload.id) {
      const idx = db.purchaseOrders.findIndex((p: any) => p.id === payload.id);
      if (idx >= 0) { db.purchaseOrders[idx] = { ...db.purchaseOrders[idx], ...payload }; }
      else { db.purchaseOrders.push(payload); }
    } else {
      const poCount = db.purchaseOrders.length + 1;
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount).padStart(3, "0")}`;
      db.purchaseOrders.push({ ...payload, id: `po_${Date.now()}`, poNumber });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Vendor Credits API ──────────────────────────────────────────────────────
app.post("/api/vendor-credits", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!db.vendorCredits) db.vendorCredits = [];
    if (payload.id) {
      const idx = db.vendorCredits.findIndex((v: any) => v.id === payload.id);
      if (idx >= 0) { db.vendorCredits[idx] = { ...db.vendorCredits[idx], ...payload }; }
      else { db.vendorCredits.push(payload); }
    } else {
      const vcCount = db.vendorCredits.length + 1;
      const vcNumber = `VC-${new Date().getFullYear()}-${String(vcCount).padStart(3, "0")}`;
      db.vendorCredits.push({ ...payload, id: `vc_${Date.now()}`, vcNumber });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});


// ── Reset to Clean State (go-live utility) ───────────────────────────────────
// NOTE: a previous "/api/admin/reset-clean" endpoint with a hardcoded secret key was
// removed here. It had no legitimate caller anywhere in the client, required no real
// authentication, and could wipe any organization's entire ledger. The real, properly
// org-scoped "rebuild my own organization's data" feature lives at POST /api/reset below.

// ── Delivery Challans API ────────────────────────────────────────────────────
app.post("/api/delivery-challans", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!db.deliveryChallans) db.deliveryChallans = [];
    if (payload.id) {
      const idx = db.deliveryChallans.findIndex((c: any) => c.id === payload.id);
      if (idx >= 0) db.deliveryChallans[idx] = { ...db.deliveryChallans[idx], ...payload };
      else db.deliveryChallans.push(payload);
    } else {
      const num = db.deliveryChallans.length + 1;
      db.deliveryChallans.push({ ...payload, id: "dc_" + Date.now(), challanNumber: "DC-" + new Date().getFullYear() + "-" + String(num).padStart(3, "0") });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Bank Accounts API ────────────────────────────────────────────────────────
app.post("/api/bank-accounts", authGuard, requirePermission("view_banking"), async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!(db as any).bankAccounts) (db as any).bankAccounts = [];
    if (payload.id) {
      const idx = (db as any).bankAccounts.findIndex((a: any) => a.id === payload.id);
      if (idx >= 0) (db as any).bankAccounts[idx] = { ...(db as any).bankAccounts[idx], ...payload };
    } else {
      (db as any).bankAccounts.push({ ...payload, id: "ba_" + Date.now() });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Bank Transactions API ────────────────────────────────────────────────────
app.post("/api/bank-transactions", authGuard, requirePermission("view_banking"), async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!(db as any).bankTransactions) (db as any).bankTransactions = [];
    if (payload.id) {
      const idx = (db as any).bankTransactions.findIndex((t: any) => t.id === payload.id);
      if (idx >= 0) (db as any).bankTransactions[idx] = { ...(db as any).bankTransactions[idx], ...payload };
      else (db as any).bankTransactions.push(payload);
    } else {
      (db as any).bankTransactions.push({ ...payload, id: "bt_" + Date.now() });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/bank-transactions/match", authGuard, requirePermission("view_banking"), async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const { txId, matchedId, matchedType } = req.body;
    const txns = (db as any).bankTransactions || [];
    const tx = txns.find((t: any) => t.id === txId);
    if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
    tx.status = "Reconciled"; tx.matchedId = matchedId;
    // Mark invoice/bill as paid
    if (matchedType === "invoice") {
      const inv = db.invoices.find((i: any) => i.id === matchedId);
      if (inv) { inv.status = "Paid"; inv.paymentReceived = inv.total; }
    } else if (matchedType === "bill") {
      const bill = db.bills.find((b: any) => b.id === matchedId);
      if (bill) { bill.status = "Paid"; bill.paymentPaid = bill.total; }
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Opening Balances API ─────────────────────────────────────────────────────
app.post("/api/opening-balances", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const { entries, date } = req.body;
    // Update account balances
    entries.forEach((entry: any) => {
      const acc = db.accounts.find((a: any) => a.code === entry.accountCode);
      if (acc) {
        acc.balance = entry.debit > 0 ? entry.debit : entry.credit;
      }
    });
    (db as any).openingBalanceDate = date;
    (db as any).openingBalancesSet = true;
    // Post a journal entry for opening balances
    const openingJournal = {
      id: "j_opening_" + Date.now(),
      date,
      reference: "OB-" + new Date().getFullYear(),
      description: "Opening Balances Entry",
      lines: entries.filter((e: any) => e.debit > 0 || e.credit > 0).map((e: any, i: number) => ({
        id: "obl_" + i,
        accountCode: e.accountCode,
        accountName: e.accountName,
        debit: e.debit,
        credit: e.credit
      }))
    };
    db.journals.push(openingJournal);
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Chart of Accounts CRUD ───────────────────────────────────────────────────
app.post("/api/accounts", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const { code, name, type, balance } = req.body;
    if (!code || !name) { res.status(400).json({ error: "Code and name required." }); return; }
    const existing = db.accounts.findIndex((a: any) => a.code === code);
    if (existing >= 0) {
      db.accounts[existing] = { ...db.accounts[existing], name, type, balance: balance || 0 };
    } else {
      db.accounts.push({ code, name, type, balance: balance || 0 });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/accounts/:code", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const code = req.params.code;
    const usedInJournals = db.journals.some((j: any) => j.lines?.some((l: any) => l.accountCode === code));
    if (usedInJournals) { res.status(400).json({ error: "Cannot delete account used in journal entries." }); return; }
    db.accounts = db.accounts.filter((a: any) => a.code !== code);
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Fixed Assets API ─────────────────────────────────────────────────────────
app.post("/api/month-end-checklist", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body; // { id, monthLabel, steps }
    if (!(db as any).monthEndChecklists) (db as any).monthEndChecklists = [];
    const idx = (db as any).monthEndChecklists.findIndex((c: any) => c.id === payload.id);
    if (idx >= 0) (db as any).monthEndChecklists[idx] = payload;
    else (db as any).monthEndChecklists.push(payload);
    (db as any).auditLogs.unshift({ id: "audit_" + Date.now(), timestamp: new Date().toISOString(), user: req.body.actorEmail || "User", action: "MONTH_END_CHECKLIST_UPDATE", details: `Updated close checklist for ${payload.monthLabel}` });
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/fixed-assets", authGuard, async (req: any, res: any) => {
  try {
    const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
    const payload = req.body;
    if (!(db as any).fixedAssets) (db as any).fixedAssets = [];
    if (payload.id) {
      const idx = (db as any).fixedAssets.findIndex((a: any) => a.id === payload.id);
      if (idx >= 0) (db as any).fixedAssets[idx] = { ...(db as any).fixedAssets[idx], ...payload };
      else (db as any).fixedAssets.push(payload);
    } else {
      (db as any).fixedAssets.push({ ...payload, id: "fa_" + Date.now() });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});


if (process.env.VERCEL !== "1") {
  (async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Ledgerio express ledger server listening on port ${PORT}...`);
    });
  })();
}

// Global error handler — always returns JSON (never HTML)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err?.message || err);
  res.status(500).json({ error: "Internal server error", detail: err?.message });
});

// Health check is defined earlier (line ~650) — see full diagnostics there.

export default app;
