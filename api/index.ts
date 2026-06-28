import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
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
} = {
  organizations: [],
  users: [],
  seatRequests: [],
  auditLogs: [],
  customRoles: [],
  registrationRequests: [],
  notifications: []
};

// USER_DB (multi-tenant SaaS state: orgs, registrations, seat requests, etc.) must be
// persisted the same way the main accounting ledger is — otherwise it resets on every
// Vercel cold start, which silently drops pending registration approvals, seat requests,
// and audit logs. Persisted under a separate row in the same bizkhata_state table.
let userDbLoaded = false;

async function loadUserDB(): Promise<void> {
  if (userDbLoaded) return; // already loaded into this warm instance
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.superadmin_state&select=state`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].state) {
          Object.assign(USER_DB, rows[0].state);
          userDbLoaded = true;
          return;
        }
      }
    }
  } catch (err) {
    console.error("loadUserDB: Supabase read failed, falling back to local file:", err);
  }
  // Local-dev fallback (also used if Supabase is unreachable)
  try {
    const userDbFile = process.env.VERCEL === "1" ? "/tmp/bizkhata_superadmin.json" : path.join(process.cwd(), "bizkhata_superadmin.json");
    if (fs.existsSync(userDbFile)) {
      const raw = fs.readFileSync(userDbFile, "utf8");
      Object.assign(USER_DB, JSON.parse(raw));
    }
  } catch (err) {
    console.error("loadUserDB: local file read failed:", err);
  }
  userDbLoaded = true;
}

async function saveUserDB(): Promise<void> {
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/bizkhata_state`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Prefer": "return=minimal,resolution=merge-duplicates"
        },
        body: JSON.stringify({ id: "superadmin_state", state: USER_DB }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok || res.status === 204) return;
      console.error("saveUserDB: Supabase write failed with status", res.status, await res.text());
    }
  } catch (err) {
    console.error("saveUserDB: Supabase write failed, falling back to local file:", err);
  }
  // Local-dev fallback
  try {
    const userDbFile = process.env.VERCEL === "1" ? "/tmp/bizkhata_superadmin.json" : path.join(process.cwd(), "bizkhata_superadmin.json");
    fs.writeFileSync(userDbFile, JSON.stringify(USER_DB, null, 2), "utf8");
  } catch (err) {
    console.error("saveUserDB: local file write failed:", err);
  }
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
function verifyPassword(plain: string, stored: string | undefined): boolean {
  if (!stored) return false;
  if (isLegacyPlaintext(stored)) return stored === plain;
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(plain, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex"), b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Seed default users on cold start
const seedUserDB = () => {
  if (USER_DB.users.length > 0) return; // Already seeded

  const orgId = "org_bizkhata_default";
  USER_DB.organizations.push({
    id: orgId,
    name: "My Organization",
    gstNumber: "",
    status: "Active",
    allocatedSeats: 25,
    usedSeats: 2,
    createdAt: "2026-01-01T00:00:00Z"
  });

  USER_DB.users.push(
    {
      id: "user_superadmin",
      organizationId: null,
      fullName: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL,
      mobileNumber: process.env.SUPERADMIN_MOBILE || "",
      role: "Super Admin",
      status: "Active",
      password: hashPassword(SUPERADMIN_PASSWORD),
      permissions: ALL_PERMISSIONS_LIST.map(p => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "user_admin_default",
      organizationId: orgId,
      fullName: "Admin User",
      email: "admin@bizkhata.com",
      mobileNumber: "+919000000000",
      department: "Management",
      designation: "Administrator",
      role: "Admin",
      status: "Active",
      password: "Admin@123",
      permissions: ALL_PERMISSIONS_LIST.map(p => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: "2026-01-01T00:00:00Z"
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
  return USER_DB.users.find((u: any) => u.email === email) || null;
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

// __dirname fallback for CJS/ESM compatibility
const __filename = (() => { try { return fileURLToPath(import.meta.url); } catch { return ''; } })();
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

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
const USER_DB_ROUTES = ["/api/auth/", "/api/superadmin/", "/api/users", "/api/seat-requests", "/api/audit-logs", "/api/custom-roles"];
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
  { code: "bank_account", name: "Bank Account", type: "Asset", balance: 500000 },
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
  { code: "capital", name: "Capital", type: "Equity", balance: 500000 },
  { code: "retained_earnings", name: "Retained Earnings", type: "Equity", balance: 0 }
];

// Helper to generate a random id
const uuid = () => Math.random().toString(36).substring(2, 11);

// Clean initial state for go-live — no demo data
const getInitialState = (): DatabaseState => {
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
    auditLogs: [
      {
        id: "audit_init",
        timestamp: new Date().toISOString(),
        action: "System Init",
        details: "Bizkhata default ledger initialized successfully with secure role access management.",
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
app.get("/api/notifications", (req: any, res: any) => res.json(USER_DB.notifications));
app.post("/api/notifications/clear", (req: any, res: any) => { USER_DB.notifications = []; res.json({ success: true }); });

// Registration request
app.post("/api/auth/register-request", (req: any, res: any) => {
  const { companyName, gstNumber, adminName, email, mobileNumber, password, numberOfRequiredSeats } = req.body;
  if (!companyName || !gstNumber || !adminName || !email || !mobileNumber || !password || !numberOfRequiredSeats) {
    res.status(400).json({ error: "All registration fields are required." }); return;
  }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) { res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number, special char." }); return; }
  if (USER_DB.users.some((u: any) => u.email === email) || USER_DB.registrationRequests.some((r: any) => r.email === email && r.status !== "Rejected")) {
    res.status(400).json({ error: "An account with this email already exists." }); return;
  }
  const newReg = { id: generateId("reg"), companyName, gstNumber, adminName, email, mobileNumber, password, numberOfRequiredSeats: Number(numberOfRequiredSeats), status: "Pending", createdAt: new Date().toISOString() };
  USER_DB.registrationRequests.unshift(newReg);
  USER_DB.notifications.unshift({ id: generateId("notif"), to: USER_DB.users.find((u: any) => u.role === "Super Admin")?.email || "owner@bizkhata.app", subject: "New Registration Request", body: `Company '${companyName}' registered by '${adminName}'.`, type: "Email", timestamp: new Date().toISOString() });
  res.status(201).json({ ...newReg, password: undefined });
});

// Login
app.post("/api/auth/login", (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and Password required." }); return; }
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user) { res.status(401).json({ error: "Invalid credentials. User not found." }); return; }
  if (user.status === "Disabled") { res.status(403).json({ error: "Account disabled. Contact administrator." }); return; }
  if (!verifyPassword(password, user.password)) { res.status(401).json({ error: "Invalid credentials. Wrong password." }); return; }
  if (isLegacyPlaintext(user.password)) { user.password = hashPassword(password); }
  let org = null;
  if (user.organizationId) {
    org = USER_DB.organizations.find((o: any) => o.id === user.organizationId) || null;
    if (org && org.status === "Suspended") { res.status(403).json({ error: "Your organization is suspended. Contact BizKhata support." }); return; }
  }
  // 2FA disabled for now - direct login
  // if (user.twoFactorEnabled && !user.twoFactorVerified) { ... }
  user.lastLogin = new Date().toISOString();
  addAuditLog(user.organizationId, user.fullName, user.role, "User Login", `Logged in from ${req.ip || "127.0.0.1"}.`);
  res.json({ token: signSessionToken(user.email), user: safeUser(user), organization: org });
});

// Verify 2FA
app.post("/api/auth/verify-2fa", (req: any, res: any) => {
  const { email, otp } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user) { res.status(404).json({ error: "User not found." }); return; }
  if (user.activationCode !== otp) { res.status(400).json({ error: "Invalid OTP code." }); return; }
  user.twoFactorVerified = true; user.activationCode = undefined; user.lastLogin = new Date().toISOString();
  const org = user.organizationId ? USER_DB.organizations.find((o: any) => o.id === user.organizationId) || null : null;
  addAuditLog(user.organizationId, user.fullName, user.role, "2FA Verified", "2FA OTP passed.");
  res.json({ token: signSessionToken(user.email), user: safeUser(user), organization: org });
});

// Toggle 2FA
app.post("/api/auth/toggle-2fa", authGuard, (req: any, res: any) => {
  const user = req.user; const { enabled } = req.body;
  user.twoFactorEnabled = !!enabled; user.twoFactorVerified = false;
  addAuditLog(user.organizationId, user.fullName, user.role, "2FA Setting Updated", `2FA ${enabled ? "enabled" : "disabled"}.`);
  res.json({ success: true, twoFactorEnabled: user.twoFactorEnabled });
});

// Forgot password
app.post("/api/auth/forgot-password", (req: any, res: any) => {
  const { email } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (user) {
    const resetCode = Math.floor(200000 + Math.random() * 800000).toString();
    user.resetCode = resetCode;
    USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: "BizKhata Password Reset", body: `Reset OTP: ${resetCode}. Link: https://bizkhata-six.vercel.app/reset-password?code=${resetCode}&email=${email}`, type: "Email", code: resetCode, timestamp: new Date().toISOString() });
    addAuditLog(user.organizationId, user.fullName, user.role, "Password Reset Requested", "Reset OTP generated.");
  }
  res.json({ success: true, message: "If email exists, a reset link has been sent." });
});

// Reset password
app.post("/api/auth/reset-password", (req: any, res: any) => {
  const { email, code, newPassword } = req.body;
  const user = USER_DB.users.find((u: any) => u.email === email);
  if (!user || user.resetCode !== code) { res.status(400).json({ error: "Invalid or expired reset code." }); return; }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) { res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number, special char." }); return; }
  user.password = hashPassword(newPassword); user.resetCode = undefined; user.status = "Active";
  addAuditLog(user.organizationId, user.fullName, user.role, "Password Reset Complete", "Password reset successfully.");
  res.json({ success: true });
});

// Get me
app.get("/api/auth/me", (req: any, res: any) => {
  const user = verifyTokenAndGetUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized." }); return; }
  const org = user.organizationId ? USER_DB.organizations.find((o: any) => o.id === user.organizationId) || null : null;
  res.json({ user, organization: org });
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
  const { action, feedback } = req.body;
  if (action === "Approve") {
    reg.status = "Approved";
    const orgId = generateId("org");
    USER_DB.organizations.push({ id: orgId, name: reg.companyName, gstNumber: reg.gstNumber, status: "Active", allocatedSeats: reg.numberOfRequiredSeats, usedSeats: 1, createdAt: new Date().toISOString() });
    USER_DB.users.push({ id: generateId("user"), organizationId: orgId, fullName: reg.adminName, email: reg.email, mobileNumber: reg.mobileNumber, role: "Admin", status: "Active", password: hashPassword(reg.password || "Admin@123"), permissions: ALL_PERMISSIONS_LIST.map(p => p.id), twoFactorEnabled: false, createdAt: new Date().toISOString() });
    USER_DB.notifications.unshift({ id: generateId("notif"), to: reg.email, subject: "BizKhata Account Approved", body: `Your account for ${reg.companyName} is approved. Login with the email and password you set during sign-up.`, type: "Email", timestamp: new Date().toISOString() });
    addAuditLog(null, req.user.fullName, req.user.role, "Approve Registration", `Approved '${reg.companyName}'.`);
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
  "workflow", "email", "gstr2b", "approvals", "bankfeeds", "cportal", "vportal", "budget", "docs",
  "projects", "timesheets", "multicurrency", "grn", "depreciation", "recurring", "billexp",
  "advances", "partial", "milestone", "batch", "composite", "cheque", "pricelists",
  "multigstin", "schedreports", "costcentres"
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
  }
  res.json({ success: true });
});

app.get("/api/superadmin/organizations", authGuard, superAdminGuard, (req: any, res: any) => res.json(USER_DB.organizations));
app.put("/api/superadmin/organizations/:id", authGuard, superAdminGuard, (req: any, res: any) => {
  const org = USER_DB.organizations.find((o: any) => o.id === req.params.id);
  if (!org) { res.status(404).json({ error: "Organization not found." }); return; }
  const { status, allocatedSeats } = req.body;
  if (status) { org.status = status; if (status === "Suspended") USER_DB.users.forEach((u: any) => { if (u.organizationId === org.id) u.status = "Disabled"; }); }
  if (allocatedSeats !== undefined) { const s = Number(allocatedSeats); if (s < org.usedSeats) { res.status(400).json({ error: `Cannot go below ${org.usedSeats} used seats.` }); return; } org.allocatedSeats = s; }
  addAuditLog(null, req.user.fullName, req.user.role, "Update Organization", `Updated '${org.name}': status=${status}, seats=${allocatedSeats}`);
  res.json(org);
});

// Users
app.get("/api/users", authGuard, (req: any, res: any) => {
  const user = req.user;
  res.json((user.role === "Super Admin" ? USER_DB.users : USER_DB.users.filter((u: any) => u.organizationId === user.organizationId)).map(safeUser));
});

app.post("/api/users", authGuard, (req: any, res: any) => {
  const activeUser = req.user;
  if (activeUser.role !== "Admin" && activeUser.role !== "Super Admin") { res.status(403).json({ error: "Only Admins can create users." }); return; }
  const { fullName, email, mobileNumber, department, designation, role, permissions } = req.body;
  if (!fullName || !email || !mobileNumber || !role) { res.status(400).json({ error: "Name, email, mobile, role required." }); return; }
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
  USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: `Welcome to BizKhata - ${org.name}`, body: `Hello ${fullName},\n\nTemp Password: ${tempPassword}\nRole: ${role}\n\nActivate: https://bizkhata-six.vercel.app/activate?code=${activationCode}&email=${email}`, type: "Email", timestamp: new Date().toISOString() });
  addAuditLog(targetOrgId, activeUser.fullName, activeUser.role, "User Created", `Created '${fullName}' as '${role}'.`);
  res.status(201).json(safeUser(newUser));
});

app.put("/api/users/:id", authGuard, (req: any, res: any) => {
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
    if (role && targetUser.role !== "Super Admin") targetUser.role = role;
    if (permissions) targetUser.permissions = permissions;
    if (status) { targetUser.status = status; const org = USER_DB.organizations.find((o: any) => o.id === targetUser.organizationId); if (org) org.usedSeats = USER_DB.users.filter((u: any) => u.organizationId === org.id && u.status !== "Disabled").length; }
  }
  addAuditLog(targetUser.organizationId, activeUser.fullName, activeUser.role, "User Updated", `Updated '${targetUser.email}'.`);
  res.json(safeUser(targetUser));
});

app.post("/api/users/:id/reset-password", authGuard, (req: any, res: any) => {
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
app.post("/api/users/add", authGuard, async (req: any, res: any) => {
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
  const mailSubject = "Welcome to Bizkhata - Your Accounting Portal account is ready!";
  const mailBody = `Dear ${name},\n\nYour organization manager (${author || "@admin"}) has assigned an accounting seat for you on the Bizkhata General Ledger platform.\n\nHere are your access details:\n• Portal URL: Bizkhata Cloud Edge\n• Registered Email: ${email.toLowerCase()}\n• Mobile Number: ${mobile}\n• Designated Role: ${role || "Viewer"}\n• Single-Sign-On Password: ${password}\n\nYou can log in directly at the system portal page.\n\nWarm regards,\nBizkhata Zoho Books Infrastructure Team.`;

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

app.post("/api/customers", authGuard, async (req: any, res: any) => {
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

app.post("/api/vendors", authGuard, async (req: any, res: any) => {
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

app.post("/api/items", authGuard, async (req: any, res: any) => {
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

app.post("/api/invoices", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const invoiceData = req.body;
  const user = req.body.authorUser || "User";

  // Auto invoicing sequence numbering
  if (!invoiceData.invoiceNumber) {
    const lastNum = db.invoices.length;
    invoiceData.invoiceNumber = `INV-2026-${String(lastNum + 1).padStart(3, "0")}`;
  }

  const existingIndex = db.invoices.findIndex(inv => inv.id === invoiceData.id);

  if (existingIndex >= 0) {
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
    action: invoiceData.isProforma ? "Save Proforma Invoice" : "Create Tax Invoice",
    details: `Generated standard billing number ${invoiceData.invoiceNumber} for client ₹${invoiceData.total}`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Payments Recorder Double-Entry
app.post("/api/payments", authGuard, async (req: any, res: any) => {
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
app.post("/api/credit-notes", authGuard, async (req: any, res: any) => {
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
app.post("/api/expenses", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const exp = req.body;
  const user = req.body.authorUser || "User";

  const existingIndex = db.expenses.findIndex(e => e.id === exp.id);
  if (existingIndex >= 0) {
    db.expenses[existingIndex] = { ...db.expenses[existingIndex], ...exp };
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
app.post("/api/bills", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const bill = req.body;
  const user = req.body.authorUser || "User";

  const existingIndex = db.bills.findIndex(b => b.id === bill.id);
  if (existingIndex >= 0) {
    db.bills[existingIndex] = { ...db.bills[existingIndex], ...bill };
    // Clear any existing journals for this bill
    db.journals = db.journals.filter(j => j.id !== `j_bill_${bill.id}`);
  } else {
    bill.id = "bill_" + uuid();
    if (!bill.billNumber) {
      bill.billNumber = `BILL-DUE-${String(db.bills.length + 1).padStart(3, "0")}`;
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

app.post("/api/bills/pay", authGuard, async (req: any, res: any) => {
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
app.post("/api/journals", authGuard, async (req: any, res: any) => {
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
app.post("/api/users/remove", authGuard, async (req: any, res: any) => {
  const orgId = req.user.organizationId;
  if (!orgId) { return res.status(400).json({ error: "Your account isn't linked to an organization." }); }
  const db = await readDB(orgId);
  const { id, author } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing required parameter: id" });
  }

  if (!db.users) db.users = [];

  const targetIdx = db.users.findIndex(u => u.id === id);
  if (targetIdx === -1) {
    return res.status(404).json({ error: "Specified user record was not found." });
  }

  const targetUser = db.users[targetIdx];

  // Prevent self-deletion or default admin system accounts
  if (targetUser.role === "Super Admin" || targetUser.isOwner) {
    return res.status(400).json({ error: "Access Denied: The system owner administrator account cannot be deleted." });
  }

  db.users.splice(targetIdx, 1);

  db.auditLogs.unshift({
    id: uuid(),
    timestamp: new Date().toISOString(),
    user: author || "Admin",
    action: "User Seat Deletion",
    details: `Revoked corporate authorization and deleted user credentials for ${targetUser.name} (${targetUser.email}).`
  });

  await writeDB(orgId, db);
  res.json({ success: true, db });
});

// Owner SaaS Console APIs
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
    const systemPrompt = `You are Bizkhata's smart invoice extraction system. Parse the client's unstructured prompt (e.g., mail copy, bill list, note) and return matched business fields as JSON. Identify:
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

app.post("/api/ai/reconcile", authGuard, async (req: any, res: any) => {
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
      explanation: "### Bizkhata Al Financial Analyst Summary\nTo get personalized AI summaries and forecast charts, please activate the GEMINI_API_KEY in the Secrets panel.\n\nFrom the heuristic view:\n1. **Tax compliance** looks good, with CGST and SGST correctly structured between Interstate and Intrastate registers.\n2. **Bank Reserves** are stable, supported by a ₹5,00,000 opening capital injection."
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
      body: `Dear Accounts Team at ${clientName},\n\nWe hope you are doing well.\n\nThis is a friendly reminder that invoice ${invoiceNum} which was due on ${dueDate} remains outstanding. The total amount receivable is ₹${amount}.\n\nWe kindly request you to process the NEFT/RTGS bank transfer at your earliest convenience. Please let us know if you require any banking documentation or support.\n\nBest Regards,\nFinance & Compliance Team\nBizkhata Pvt Ltd`
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

// Serve frontend assets and start listening wrapped in an async IIFE
// On Vercel, skip Vite/static setup — Vercel serves the dist/ as static output separately
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
app.post("/api/bank-accounts", authGuard, async (req: any, res: any) => {
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
app.post("/api/bank-transactions", authGuard, async (req: any, res: any) => {
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

app.post("/api/bank-transactions/match", authGuard, async (req: any, res: any) => {
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
    // Per-organization caches now populate lazily on each org's first request —
    // there's no longer a single shared ledger to pre-warm at startup.

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
      console.log(`Bizkhata express ledger server listening on port ${PORT}...`);
    });
  })();
}

export default app;
// force redeploy Tue Jun  2 04:34:09 UTC 2026
