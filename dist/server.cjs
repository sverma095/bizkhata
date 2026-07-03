var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_crypto = __toESM(require("crypto"));
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"));
var import_supabase_js = require("@supabase/supabase-js");
import_dotenv.default.config();
var generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
var ALL_PERMISSIONS_LIST = [
  { id: "view_invoices", label: "View Invoices", category: "Invoices" },
  { id: "create_invoices", label: "Create Invoices", category: "Invoices" },
  { id: "edit_invoices", label: "Edit Invoices", category: "Invoices" },
  { id: "delete_invoices", label: "Delete Invoices", category: "Invoices" },
  { id: "approve_payments", label: "Approve Payments", category: "Finance" },
  { id: "manage_customers", label: "Manage Customers", category: "Contacts" },
  { id: "manage_vendors", label: "Manage Vendors", category: "Contacts" },
  { id: "view_reports", label: "View Reports", category: "Reporting" },
  { id: "export_data", label: "Export Data", category: "Reporting" },
  { id: "manage_users", label: "Manage Users", category: "Admin" },
  { id: "view_journals", label: "View Journals", category: "Accounting" },
  { id: "create_journals", label: "Create Journals", category: "Accounting" },
  { id: "manage_items", label: "Manage Items/Inventory", category: "Inventory" },
  { id: "manage_billing", label: "Manage Billing/Bills", category: "Finance" },
  { id: "view_banking", label: "View Banking", category: "Banking" }
];
var USER_DB = {
  organizations: [],
  users: [],
  seatRequests: [],
  auditLogs: [],
  customRoles: [],
  registrationRequests: [],
  notifications: []
};
var userDbLoaded = false;
async function loadUserDB() {
  if (userDbLoaded) return;
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.superadmin_state&select=state`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6e3);
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
        }
      }
    }
  } catch (err) {
    console.error("loadUserDB: Supabase read failed, falling back to local file:", err);
  }
  try {
    const userDbFile = process.env.VERCEL === "1" ? "/tmp/bizkhata_superadmin.json" : import_path.default.join(process.cwd(), "bizkhata_superadmin.json");
    if (USER_DB.users.length === 0 && import_fs.default.existsSync(userDbFile)) {
      const raw = import_fs.default.readFileSync(userDbFile, "utf8");
      Object.assign(USER_DB, JSON.parse(raw));
    }
  } catch (err) {
    console.error("loadUserDB: local file read failed:", err);
  }
  const saIdx = USER_DB.users.findIndex((u) => u.role === "Super Admin" || u.email === SUPERADMIN_EMAIL);
  if (saIdx >= 0) {
    USER_DB.users[saIdx].email = SUPERADMIN_EMAIL;
    USER_DB.users[saIdx].password = hashPassword(SUPERADMIN_PASSWORD);
    USER_DB.users[saIdx].status = "Active";
    USER_DB.users[saIdx].role = "Super Admin";
  } else {
    USER_DB.users.push({
      id: "user_superadmin",
      organizationId: null,
      fullName: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL,
      mobileNumber: "",
      role: "Super Admin",
      status: "Active",
      password: hashPassword(SUPERADMIN_PASSWORD),
      permissions: ALL_PERMISSIONS_LIST.map((p) => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: "2026-01-01T00:00:00Z"
    });
  }
  const ownerOrgId = "org_verma_consultancy";
  if (!USER_DB.organizations.find((o) => o.id === ownerOrgId)) {
    USER_DB.organizations.push({
      id: ownerOrgId,
      name: "Verma Consultancy Services",
      gstNumber: "09AABFV1234A1Z5",
      status: "Active",
      allocatedSeats: 10,
      usedSeats: 1,
      createdAt: "2026-01-01T00:00:00Z",
      approvedAt: "2026-01-01T00:00:00Z",
      subscriptionExpiresAt: "2027-01-01T00:00:00Z",
      subscriptionMonths: 12
    });
  }
  const ownerEmail = "svtiger543939@gmail.com";
  const ownerIdx = USER_DB.users.findIndex((u) => u.email === ownerEmail);
  if (ownerIdx >= 0) {
    USER_DB.users[ownerIdx].organizationId = ownerOrgId;
    USER_DB.users[ownerIdx].password = hashPassword("Admin@123");
    USER_DB.users[ownerIdx].status = "Active";
    USER_DB.users[ownerIdx].role = "Admin";
  } else {
    USER_DB.users.push({
      id: "user_verma_owner",
      organizationId: ownerOrgId,
      fullName: "Sunil Verma",
      email: ownerEmail,
      mobileNumber: "+919876543210",
      department: "Management",
      designation: "Owner",
      role: "Admin",
      status: "Active",
      password: hashPassword("Admin@123"),
      permissions: ALL_PERMISSIONS_LIST.map((p) => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: "2026-01-01T00:00:00Z"
    });
  }
  const seen = /* @__PURE__ */ new Set();
  USER_DB.users = USER_DB.users.filter((u) => {
    if (seen.has(u.email)) return false;
    seen.add(u.email);
    return true;
  });
  userDbLoaded = true;
  saveUserDB().catch(() => {
  });
}
async function saveUserDB() {
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const url = `${SUPABASE_URL}/rest/v1/bizkhata_state`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6e3);
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
  try {
    const userDbFile = process.env.VERCEL === "1" ? "/tmp/bizkhata_superadmin.json" : import_path.default.join(process.cwd(), "bizkhata_superadmin.json");
    import_fs.default.writeFileSync(userDbFile, JSON.stringify(USER_DB, null, 2), "utf8");
  } catch (err) {
    console.error("saveUserDB: local file write failed:", err);
  }
}
var addAuditLog = (orgId, userName, role, action, details, ip) => {
  USER_DB.auditLogs.unshift({
    id: generateId("log"),
    organizationId: orgId,
    userName,
    role,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ipAddress: ip || "127.0.0.1",
    actionPerformed: action,
    details
  });
  if (USER_DB.auditLogs.length > 500) USER_DB.auditLogs.pop();
};
var SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
var SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "owner@bizkhata.app";
var SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || "Platform Owner";
var SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "Admin@123";
var SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-set-SESSION_SECRET-env-var";
if (!process.env.SESSION_SECRET) {
  console.warn("\u26A0 SESSION_SECRET not set \u2014 using an insecure dev fallback. Set this env var in production.");
}
var SESSION_TTL_MS = 1e3 * 60 * 60 * 24 * 7;
function signSessionToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  const sig = import_crypto.default.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifySessionToken(token) {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expectedSig = import_crypto.default.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expectedSig);
  if (a.length !== b.length || !import_crypto.default.timingSafeEqual(a, b)) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > exp) return null;
    return email;
  } catch {
    return null;
  }
}
function hashPassword(plain) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const hash = import_crypto.default.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function isLegacyPlaintext(stored) {
  return !!stored && !stored.startsWith("scrypt:");
}
function safeUser(u) {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}
var FINANCIAL_LOCK_FIELDS = {
  invoice: ["subtotal", "totalGst", "totalCgst", "totalSgst", "totalIgst", "total", "items", "customerId", "date", "tdsAmount", "tdsRate", "tdsSection", "discountValue", "shippingCharge", "otherCharges"],
  bill: ["subtotal", "totalGst", "totalCgst", "totalSgst", "totalIgst", "total", "items", "vendorId", "date", "tdsAmount", "tdsSection", "isReverseCharge"],
  expense: ["subtotal", "gstAmount", "tdsAmount", "tdsSection", "total", "vendorName", "category", "isReverseCharge"]
};
function checkFinancialLock(docType, existing, incoming, draftStatuses) {
  if (!existing) return { locked: false };
  if (draftStatuses.includes(existing.status)) return { locked: false };
  for (const field of FINANCIAL_LOCK_FIELDS[docType]) {
    if (field in incoming && JSON.stringify(incoming[field]) !== JSON.stringify(existing[field])) {
      return { locked: true, field };
    }
  }
  return { locked: false };
}
function diffFields(existing, incoming, fields) {
  const changes = [];
  for (const f of fields) {
    if (f in incoming && JSON.stringify(incoming[f]) !== JSON.stringify(existing[f])) {
      changes.push(`${f}: ${JSON.stringify(existing[f])} \u2192 ${JSON.stringify(incoming[f])}`);
    }
  }
  return changes.length ? changes.join("; ") : "no field changes";
}
var RESEND_API_KEY = process.env.RESEND_API_KEY;
var EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@bizkhata.app";
async function smtpSend(to, subject, html) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = EMAIL_FROM;
  const { createConnection } = await import("net");
  const { connect: tlsConnect } = await import("tls");
  const { Buffer: Buffer2 } = await import("buffer");
  return new Promise((resolve, reject) => {
    const b64 = (s) => Buffer2.from(s).toString("base64");
    const boundary = `bk_${Date.now()}`;
    const rawMsg = [
      `From: BizKhata <${from}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
      `--${boundary}--`
    ].join("\r\n");
    let socket;
    let step = 0;
    const cmds = [
      `EHLO bizkhata.app\r
`,
      `AUTH LOGIN\r
`,
      `${b64(user)}\r
`,
      `${b64(pass)}\r
`,
      `MAIL FROM:<${from}>\r
`,
      `RCPT TO:<${to}>\r
`,
      `DATA\r
`,
      `${rawMsg}\r
.\r
`,
      `QUIT\r
`
    ];
    const send = (s) => socket.write(s);
    const handleData = (data) => {
      const resp = data.toString();
      const code = parseInt(resp.slice(0, 3));
      if (code >= 400) {
        reject(new Error(`SMTP error at step ${step}: ${resp.trim()}`));
        socket.destroy();
        return;
      }
      if (step === 0 && (code === 220 || resp.includes("220"))) {
        send(cmds[step++]);
        return;
      }
      if (step < cmds.length) {
        send(cmds[step++]);
      } else {
        resolve();
        socket.destroy();
      }
    };
    if (port === 465) {
      socket = tlsConnect({ host, port, rejectUnauthorized: false }, () => socket.on("data", handleData));
    } else {
      socket = createConnection({ host, port }, () => socket.on("data", handleData));
    }
    socket.on("error", reject);
    socket.setTimeout(15e3, () => {
      reject(new Error("SMTP timeout"));
      socket.destroy();
    });
  });
}
async function sendEmail(to, subject, html) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await smtpSend(to, subject, html);
      console.log(`SMTP email sent to ${to}`);
      return { sent: true };
    } catch (err) {
      console.error("SMTP failed:", err.message);
    }
  }
  if (RESEND_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8e3);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!r.ok) return { sent: false, reason: `Resend error ${r.status}` };
      return { sent: true };
    } catch (err) {
      return { sent: false, reason: err?.message };
    }
  }
  return { sent: false, reason: "No email provider configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS in Vercel env vars." };
}
function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (isLegacyPlaintext(stored)) return stored === plain;
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = import_crypto.default.scryptSync(plain, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex"), b = Buffer.from(check, "hex");
  return a.length === b.length && import_crypto.default.timingSafeEqual(a, b);
}
var seedUserDB = () => {
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
      permissions: ALL_PERMISSIONS_LIST.map((p) => p.id),
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
      permissions: ALL_PERMISSIONS_LIST.map((p) => p.id),
      twoFactorEnabled: false,
      twoFactorVerified: false,
      createdAt: approvedAt
    }
  );
};
seedUserDB();
var verifyTokenAndGetUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const email = verifySessionToken(token);
  if (!email) return null;
  return USER_DB.users.find((u) => u.email === email) || null;
};
var authGuard = (req, res, next) => {
  const user = verifyTokenAndGetUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Invalid session token." });
    return;
  }
  req.user = user;
  next();
};
var superAdminGuard = (req, res, next) => {
  const user = req.user;
  if (user.role !== "Super Admin") {
    res.status(403).json({ error: "Super Admin clearance required." });
    return;
  }
  next();
};
var requirePermission = (permissionId) => (req, res, next) => {
  const user = req.user;
  if (user.role === "Super Admin") return next();
  if (!Array.isArray(user.permissions) || !user.permissions.includes(permissionId)) {
    res.status(403).json({ error: `Missing permission: ${permissionId}` });
    return;
  }
  next();
};
var supabaseStatus = { configured: false, connected: false, error: null };
var supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "MY_SUPABASE_URL") {
  try {
    supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, opts) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6e3);
        return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
      } }
    });
    supabaseStatus.configured = true;
    console.log(`Supabase initialized: ${SUPABASE_URL}`);
  } catch (err) {
    supabaseStatus.error = { message: err?.message || String(err) };
    console.error("Failed to initialize Supabase client:", err);
  }
}
var cachedDbByOrg = /* @__PURE__ */ new Map();
{
  const vermaState = getInitialState();
  vermaState.company.name = "Verma Consultancy Services";
  vermaState.company.legalName = "Verma Consultancy Services";
  vermaState.company.gstin = "09AABFV1234A1Z5";
  vermaState.company.state = "Uttar Pradesh";
  cachedDbByOrg.set("org_verma_consultancy", vermaState);
}
var __server_dir = process.cwd();
var app = (0, import_express.default)();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(import_express.default.json());
var USER_DB_ROUTES = ["/api/auth/", "/api/superadmin/", "/api/users", "/api/seat-requests", "/api/audit-logs", "/api/custom-roles"];
var USER_DB_EXCLUDED_ROUTES = ["/api/users/add", "/api/users/remove"];
app.use(async (req, res, next) => {
  if (USER_DB_EXCLUDED_ROUTES.some((p) => req.path === p)) return next();
  if (!USER_DB_ROUTES.some((p) => req.path.startsWith(p))) return next();
  try {
    await loadUserDB();
  } catch (err) {
    console.error("USER_DB middleware: load failed", err);
  }
  if (req.method !== "GET") {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      saveUserDB().catch((err) => console.error("USER_DB middleware: save failed", err));
      return originalJson(body);
    };
  }
  next();
});
app.get("/api/test-supabase", async (req, res) => {
  const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.default_ledger&select=id`;
  const key = SUPABASE_ANON_KEY;
  if (!url || !key) return res.json({ error: "not configured" });
  try {
    const r = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6e3)
    });
    const text = await r.text();
    res.json({ status: r.status, ok: r.ok, body: text.substring(0, 500) });
  } catch (e) {
    res.json({ error: e.message, type: e.constructor?.name, cause: String(e.cause || "") });
  }
});
app.get("/api/health", async (req, res) => {
  const checks = {
    server: "ok",
    supabaseConfigured: !!supabase,
    supabaseUrl: SUPABASE_URL ? SUPABASE_URL.substring(0, 40) : "missing",
    env: process.env.VERCEL === "1" ? "vercel" : "local",
    node: process.version
  };
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const rows = await supabaseREST("GET", "__health_check__");
      checks.supabaseReachable = Array.isArray(rows);
      checks.supabaseRowExists = Array.isArray(rows) && rows.length > 0;
      checks.supabaseError = null;
    } catch (e) {
      checks.supabaseReachable = false;
      checks.supabaseError = e.message;
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.superadmin_state&select=id`;
      const r = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(6e3)
      });
      const rows2 = r.ok ? await r.json() : null;
      checks.superAdminStateReachable = r.ok;
      checks.superAdminStateRowExists = Array.isArray(rows2) && rows2.length > 0;
      checks.superAdminStateHttpStatus = r.status;
      if (!r.ok) checks.superAdminStateError = await r.text();
    } catch (e) {
      checks.superAdminStateReachable = false;
      checks.superAdminStateError = e.message;
    }
  } else {
    checks.superAdminStateReachable = false;
    checks.superAdminStateError = "Supabase not configured \u2014 registrations will not survive cold starts";
  }
  res.json(checks);
});
var PORT = 3e3;
function getDbFilePath(orgId) {
  const safeId = orgId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return process.env.VERCEL === "1" ? `/tmp/bizkhata_db_${safeId}.json` : import_path.default.join(process.cwd(), `bizkhata_db_${safeId}.json`);
}
var ai = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
}
var DEFAULT_ACCOUNTS = [
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
var uuid = () => Math.random().toString(36).substring(2, 11);
function getInitialState() {
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
    role: "Owner" /* Owner */,
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
async function supabaseREST(method, orgId, body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase not configured");
  const rowId = `org_ledger_${orgId}`;
  const url = `${SUPABASE_URL}/rest/v1/bizkhata_state`;
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation,resolution=merge-duplicates"
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6e3);
  try {
    const endpoint = method === "GET" ? `${url}?id=eq.${rowId}&select=state` : url;
    const finalBody = body ? { ...body, id: rowId } : body;
    const res = await fetch(endpoint, {
      method,
      headers,
      body: finalBody ? JSON.stringify(finalBody) : void 0,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase REST ${method} failed: ${res.status} ${errText}`);
    }
    return method === "GET" ? await res.json() : true;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
async function readDB(orgId) {
  try {
    if (cachedDbByOrg.has(orgId)) {
      return cachedDbByOrg.get(orgId);
    }
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
          console.log(`Empty or missing state for org ${orgId} in Supabase. Seeding fresh initial state...`);
          const init = getInitialState();
          cachedDbByOrg.set(orgId, init);
          const rowId = `org_ledger_${orgId}`;
          try {
            const patchUrl = `${SUPABASE_URL}/rest/v1/bizkhata_state?id=eq.${rowId}`;
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 6e3);
            const r = await fetch(patchUrl, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({ state: init }),
              signal: controller.signal
            });
            if (!r.ok && r.status !== 204) {
              await supabaseREST("POST", orgId, { state: init });
            }
          } catch (e) {
            await supabaseREST("POST", orgId, { state: init }).catch(() => {
            });
          }
          supabaseStatus.connected = true;
          supabaseStatus.error = null;
          console.log(`Initial state seeded to Supabase for org ${orgId}.`);
          return init;
        }
      } catch (err) {
        supabaseStatus.connected = false;
        supabaseStatus.error = { message: err?.message || String(err) };
        console.error(`Supabase REST read failed for org ${orgId}, falling back to local file:`, err);
      }
    }
    const dbFile = getDbFilePath(orgId);
    if (!import_fs.default.existsSync(dbFile)) {
      const init = getInitialState();
      try {
        import_fs.default.writeFileSync(dbFile, JSON.stringify(init, null, 2), "utf8");
      } catch (writeErr) {
        console.warn("Read-only filesystem detected on initial write, caching state in memory.");
      }
      cachedDbByOrg.set(orgId, init);
      return init;
    }
    const raw = import_fs.default.readFileSync(dbFile, "utf8");
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
async function writeDB(orgId, state) {
  try {
    const updatedAccounts = DEFAULT_ACCOUNTS.map((acc) => {
      let balance = 0;
      state.journals.forEach((je) => {
        je.lines.forEach((line) => {
          if (line.accountCode === acc.code) {
            if (acc.type === "Asset" || acc.type === "Expense") {
              balance += line.debit - line.credit;
            } else {
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
      import_fs.default.writeFileSync(getDbFilePath(orgId), JSON.stringify(state, null, 2), "utf8");
    } catch (writeErr) {
    }
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const rowId = `org_ledger_${orgId}`;
      supabaseREST("POST", orgId, { state }).then(() => {
        supabaseStatus.connected = true;
        supabaseStatus.error = null;
      }).catch(() => {
        const patchUrl = SUPABASE_URL + `/rest/v1/bizkhata_state?id=eq.${rowId}`;
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 6e3);
        fetch(patchUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Prefer": "return=minimal" },
          body: JSON.stringify({ state }),
          signal: ctrl.signal
        }).then((r) => {
          if (r.ok || r.status === 204) {
            supabaseStatus.connected = true;
            supabaseStatus.error = null;
          }
        }).catch((e) => {
          supabaseStatus.connected = false;
          supabaseStatus.error = { message: e?.message };
        });
      });
    }
  } catch (err) {
    console.error(`Error writing ledger for org ${orgId}:`, err);
  }
}
app.get("/api/notifications", authGuard, superAdminGuard, (req, res) => res.json(USER_DB.notifications));
app.post("/api/notifications/clear", authGuard, superAdminGuard, (req, res) => {
  USER_DB.notifications = [];
  res.json({ success: true });
});
app.post("/api/auth/send-reg-otp", async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required." });
  }
  if (USER_DB.users.some((u) => u.email === email) || USER_DB.registrationRequests.some((r) => r.email === email && r.status !== "Rejected")) {
    return res.status(400).json({ error: "An account with this email already exists or is pending." });
  }
  const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
  if (!global.__regOtps) global.__regOtps = {};
  global.__regOtps[email] = { otp, expiry: Date.now() + 10 * 60 * 1e3 };
  const emailResult = await sendEmail(
    email,
    "Verify your email \u2014 BizKhata",
    `<p style="font-family:sans-serif">Your email verification code for BizKhata registration is:</p>
     <h2 style="font-family:monospace;letter-spacing:6px;color:#1e40af">${otp}</h2>
     <p style="font-family:sans-serif;color:#666">This code expires in 10 minutes.</p>`
  );
  USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: "BizKhata Email Verification OTP", body: `Registration OTP for ${email}: ${otp} (valid 10 min)`, type: "Email", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  res.json({ success: true, emailSent: emailResult.sent, reason: emailResult.reason });
});
app.post("/api/auth/register-request", (req, res) => {
  const { companyName, gstNumber, adminName, email, mobileNumber, password, numberOfRequiredSeats, emailOtp } = req.body;
  if (!companyName || !adminName || !email || !mobileNumber || !password || !numberOfRequiredSeats) {
    res.status(400).json({ error: "Company name, admin name, email, mobile, password and seats are required." });
    return;
  }
  const otpStore = global.__regOtps || {};
  const record = otpStore[email];
  if (!record) {
    res.status(400).json({ error: "Please verify your email first \u2014 click 'Send OTP'." });
    return;
  }
  if (Date.now() > record.expiry) {
    delete otpStore[email];
    res.status(400).json({ error: "OTP expired. Please request a new one." });
    return;
  }
  if (record.otp !== String(emailOtp || "").trim()) {
    res.status(400).json({ error: "Invalid OTP. Please check the code sent to your email." });
    return;
  }
  delete otpStore[email];
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number and special character." });
    return;
  }
  if (USER_DB.users.some((u) => u.email === email) || USER_DB.registrationRequests.some((r) => r.email === email && r.status !== "Rejected")) {
    res.status(400).json({ error: "An account with this email already exists." });
    return;
  }
  const newReg = { id: generateId("reg"), companyName, gstNumber: gstNumber || "", adminName, email, mobileNumber, password, numberOfRequiredSeats: Number(numberOfRequiredSeats), status: "Pending", emailVerified: true, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  USER_DB.registrationRequests.unshift(newReg);
  const saEmail = USER_DB.users.find((u) => u.role === "Super Admin")?.email || "owner@bizkhata.app";
  USER_DB.notifications.unshift({ id: generateId("notif"), to: saEmail, subject: "New Registration Request", body: `Company '${companyName}' (${email}) registered by '${adminName}'. GSTIN: ${gstNumber || "Not provided"}.`, type: "Email", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  saveUserDB().catch(() => {
  });
  res.status(201).json({ ...newReg, password: void 0 });
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and Password required." });
    return;
  }
  const user = USER_DB.users.find((u) => u.email === email);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials. User not found." });
    return;
  }
  if (user.status === "Disabled") {
    res.status(403).json({ error: "Account disabled. Contact administrator." });
    return;
  }
  if (user.loginLockUntil && Date.now() < user.loginLockUntil) {
    const mins = Math.ceil((user.loginLockUntil - Date.now()) / 6e4);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${mins} minute(s).` });
    return;
  }
  if (!verifyPassword(password, user.password)) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.loginLockUntil = Date.now() + 15 * 60 * 1e3;
      user.loginAttempts = 0;
    }
    res.status(401).json({ error: "Invalid credentials. Wrong password." });
    return;
  }
  user.loginAttempts = 0;
  user.loginLockUntil = void 0;
  if (isLegacyPlaintext(user.password)) {
    user.password = hashPassword(password);
  }
  let org = null;
  if (user.organizationId) {
    org = USER_DB.organizations.find((o) => o.id === user.organizationId) || null;
    if (org && org.status === "Suspended") {
      res.status(403).json({ error: "Your organization is suspended. Contact BizKhata support." });
      return;
    }
    if (org && org.subscriptionExpiresAt && new Date(org.subscriptionExpiresAt) < /* @__PURE__ */ new Date()) {
      org.status = "Suspended";
      res.status(403).json({ error: `Your subscription expired on ${new Date(org.subscriptionExpiresAt).toLocaleDateString("en-IN")}. Please renew with BizKhata support to continue.` });
      return;
    }
  }
  if (user.twoFactorEnabled) {
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    user.activationCode = otp;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1e3;
    user.resetCodeAttempts = 0;
    user.twoFactorVerified = false;
    const emailResult = await sendEmail(user.email, "Your BizKhata login code", `<p>Your one-time login code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`);
    USER_DB.notifications.unshift({ id: generateId("notif"), to: user.email, subject: "Your BizKhata login code", body: `Your OTP is ${otp} (valid 10 minutes).`, type: "Email", code: otp, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    addAuditLog(user.organizationId, user.fullName, user.role, "2FA OTP Sent", emailResult.sent ? "Emailed login OTP." : `OTP generated (email not sent: ${emailResult.reason}).`);
    res.json({ twoFactorRequired: true, email: user.email, emailSent: emailResult.sent });
    return;
  }
  user.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
  addAuditLog(user.organizationId, user.fullName, user.role, "User Login", `Logged in from ${req.ip || "127.0.0.1"}.`);
  res.json({ token: signSessionToken(user.email), user: safeUser(user), organization: org });
});
app.post("/api/auth/verify-2fa", (req, res) => {
  const { email, otp } = req.body;
  const user = USER_DB.users.find((u) => u.email === email);
  if (!user || !user.activationCode) {
    res.status(400).json({ error: "No pending OTP. Please log in again." });
    return;
  }
  if (Date.now() > (user.resetCodeExpiry || 0)) {
    user.activationCode = void 0;
    res.status(400).json({ error: "Code expired. Please log in again to get a new one." });
    return;
  }
  user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
  if (user.resetCodeAttempts > 5) {
    user.activationCode = void 0;
    res.status(429).json({ error: "Too many attempts. Please log in again to get a new code." });
    return;
  }
  if (user.activationCode !== otp) {
    res.status(400).json({ error: "Invalid OTP code." });
    return;
  }
  user.twoFactorVerified = true;
  user.activationCode = void 0;
  user.resetCodeAttempts = 0;
  user.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
  const org = user.organizationId ? USER_DB.organizations.find((o) => o.id === user.organizationId) || null : null;
  addAuditLog(user.organizationId, user.fullName, user.role, "2FA Verified", "2FA OTP passed.");
  res.json({ token: signSessionToken(user.email), user: safeUser(user), organization: org });
});
app.post("/api/auth/resend-2fa", async (req, res) => {
  const { email } = req.body;
  const user = USER_DB.users.find((u) => u.email === email);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
  user.activationCode = otp;
  user.resetCodeExpiry = Date.now() + 10 * 60 * 1e3;
  user.resetCodeAttempts = 0;
  const emailResult = await sendEmail(user.email, "Your BizKhata login code", `<p>Your one-time login code is:</p><h2>${otp}</h2><p>This code expires in 10 minutes.</p>`);
  USER_DB.notifications.unshift({ id: generateId("notif"), to: user.email, subject: "Your BizKhata login code", body: `Your OTP is ${otp} (valid 10 minutes).`, type: "Email", code: otp, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  res.json({ success: true, emailSent: emailResult.sent });
});
app.post("/api/auth/toggle-2fa", authGuard, (req, res) => {
  const user = req.user;
  const { enabled } = req.body;
  user.twoFactorEnabled = !!enabled;
  user.twoFactorVerified = false;
  addAuditLog(user.organizationId, user.fullName, user.role, "2FA Setting Updated", `2FA ${enabled ? "enabled" : "disabled"}.`);
  res.json({ success: true, twoFactorEnabled: user.twoFactorEnabled });
});
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = USER_DB.users.find((u) => u.email === email);
  if (user) {
    const resetCode = Math.floor(2e5 + Math.random() * 8e5).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1e3;
    user.resetCodeAttempts = 0;
    USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: "BizKhata Password Reset", body: `Reset OTP: ${resetCode} (valid 10 minutes).`, type: "Email", code: resetCode, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    addAuditLog(user.organizationId, user.fullName, user.role, "Password Reset Requested", "Reset OTP generated.");
    sendEmail(
      email,
      "BizKhata Password Reset Code",
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1e40af">BizKhata Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e40af;background:#f0f4ff;padding:16px;border-radius:8px;text-align:center">${resetCode}</div>
        <p style="color:#666;margin-top:16px">This code expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.</p>
      </div>`
    ).catch(() => {
    });
  }
  res.json({ success: true, message: "If that email exists, a reset code has been sent. Check your inbox or the notification simulator." });
});
app.post("/api/auth/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = USER_DB.users.find((u) => u.email === email);
  if (!user || !user.resetCode) {
    res.status(400).json({ error: "Invalid or expired reset code." });
    return;
  }
  if (Date.now() > (user.resetCodeExpiry || 0)) {
    user.resetCode = void 0;
    res.status(400).json({ error: "Reset code expired. Request a new one." });
    return;
  }
  user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
  if (user.resetCodeAttempts > 5) {
    user.resetCode = void 0;
    res.status(429).json({ error: "Too many attempts. Request a new reset code." });
    return;
  }
  if (user.resetCode !== code) {
    res.status(400).json({ error: "Invalid or expired reset code." });
    return;
  }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number, special char." });
    return;
  }
  user.password = hashPassword(newPassword);
  user.resetCode = void 0;
  user.resetCodeExpiry = void 0;
  user.resetCodeAttempts = 0;
  user.status = "Active";
  addAuditLog(user.organizationId, user.fullName, user.role, "Password Reset Complete", "Password reset successfully.");
  res.json({ success: true });
});
app.get("/api/auth/me", (req, res) => {
  const user = verifyTokenAndGetUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  const org = user.organizationId ? USER_DB.organizations.find((o) => o.id === user.organizationId) || null : null;
  res.json({ user: safeUser(user), organization: org });
});
app.post("/api/auth/terminate-sessions", authGuard, (req, res) => {
  req.user.twoFactorVerified = false;
  addAuditLog(req.user.organizationId, req.user.fullName, req.user.role, "Sessions Terminated", "All sessions force-ended.");
  res.json({ success: true });
});
app.get("/api/superadmin/registrations", authGuard, superAdminGuard, (req, res) => res.json(USER_DB.registrationRequests.map((r) => ({ ...r, password: void 0 }))));
app.post("/api/superadmin/registrations/:id/action", authGuard, superAdminGuard, (req, res) => {
  const reg = USER_DB.registrationRequests.find((r) => r.id === req.params.id);
  if (!reg) {
    res.status(404).json({ error: "Registration not found." });
    return;
  }
  const { action, feedback, subscriptionMonths } = req.body;
  if (action === "Approve") {
    reg.status = "Approved";
    const orgId = generateId("org");
    const approvedAt = (/* @__PURE__ */ new Date()).toISOString();
    const months = Math.max(1, Math.min(120, parseInt(subscriptionMonths) || 12));
    const subscriptionExpiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1e3).toISOString();
    USER_DB.organizations.push({ id: orgId, name: reg.companyName, gstNumber: reg.gstNumber, status: "Active", allocatedSeats: reg.numberOfRequiredSeats, usedSeats: 1, createdAt: reg.createdAt, approvedAt, subscriptionExpiresAt, subscriptionMonths: months });
    USER_DB.users.push({ id: generateId("user"), organizationId: orgId, fullName: reg.adminName, email: reg.email, mobileNumber: reg.mobileNumber, role: "Admin", status: "Active", password: hashPassword(reg.password || "Admin@123"), permissions: ALL_PERMISSIONS_LIST.map((p) => p.id), twoFactorEnabled: false, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    const cleanState = getInitialState();
    cleanState.company.name = reg.companyName;
    cachedDbByOrg.set(orgId, cleanState);
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseREST("POST", orgId, { state: cleanState }).catch(() => {
        supabaseREST("PATCH", orgId, { state: cleanState }).catch(() => {
        });
      });
    }
    USER_DB.notifications.unshift({ id: generateId("notif"), to: reg.email, subject: "BizKhata Account Approved", body: `Your account for ${reg.companyName} is approved for ${months} month(s). Login with the email and password you set during sign-up. Subscription valid until: ${new Date(subscriptionExpiresAt).toLocaleDateString("en-IN")}.`, type: "Email", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    addAuditLog(null, req.user.fullName, req.user.role, "Approve Registration", `Approved '${reg.companyName}' for ${months} months until ${new Date(subscriptionExpiresAt).toLocaleDateString("en-IN")}.`);
  } else if (action === "Reject") {
    reg.status = "Rejected";
    addAuditLog(null, req.user.fullName, req.user.role, "Reject Registration", `Rejected '${reg.companyName}'. Reason: ${feedback}`);
  }
  res.json({ success: true, reg });
});
var ALLOWED_MODULE_KEYS = /* @__PURE__ */ new Set([
  "workflow",
  "email",
  "gstr2b",
  "approvals",
  "bankfeeds",
  "cportal",
  "vportal",
  "budget",
  "docs",
  "projects",
  "timesheets",
  "multicurrency",
  "grn",
  "depreciation",
  "recurring",
  "billexp",
  "advances",
  "partial",
  "milestone",
  "batch",
  "composite",
  "cheque",
  "pricelists",
  "multigstin",
  "schedreports",
  "costcentres"
]);
app.get("/api/modules/:key", authGuard, async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const db = await readDB(req.user.organizationId);
  res.json(db.advancedModules?.[key] || []);
});
app.post("/api/modules/:key", authGuard, async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  if (!db.advancedModules) db.advancedModules = {};
  if (!db.advancedModules[key]) db.advancedModules[key] = [];
  const item = { id: `${key}_${uuid()}`, createdAt: (/* @__PURE__ */ new Date()).toISOString(), createdBy: req.user.fullName, ...req.body };
  db.advancedModules[key].push(item);
  await writeDB(orgId, db);
  res.json(item);
});
app.put("/api/modules/:key/:id", authGuard, async (req, res) => {
  const { key, id } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  const arr = db.advancedModules?.[key] || [];
  const idx = arr.findIndex((i) => i.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found." });
  arr[idx] = { ...arr[idx], ...req.body };
  await writeDB(orgId, db);
  res.json(arr[idx]);
});
app.delete("/api/modules/:key/:id", authGuard, async (req, res) => {
  const { key, id } = req.params;
  if (!ALLOWED_MODULE_KEYS.has(key)) return res.status(404).json({ error: "Unknown module." });
  const orgId = req.user.organizationId;
  const db = await readDB(orgId);
  if (db.advancedModules?.[key]) {
    db.advancedModules[key] = db.advancedModules[key].filter((i) => i.id !== id);
    await writeDB(orgId, db);
  }
  res.json({ success: true });
});
app.get("/api/superadmin/organizations", authGuard, superAdminGuard, (req, res) => res.json(USER_DB.organizations));
app.put("/api/superadmin/organizations/:id", authGuard, superAdminGuard, (req, res) => {
  const org = USER_DB.organizations.find((o) => o.id === req.params.id);
  if (!org) {
    res.status(404).json({ error: "Organization not found." });
    return;
  }
  const { status, allocatedSeats, subscriptionExpiresAt } = req.body;
  if (status) {
    org.status = status;
    if (status === "Suspended") USER_DB.users.forEach((u) => {
      if (u.organizationId === org.id) u.status = "Disabled";
    });
  }
  if (allocatedSeats !== void 0) {
    const s = Number(allocatedSeats);
    if (s < org.usedSeats) {
      res.status(400).json({ error: `Cannot go below ${org.usedSeats} used seats.` });
      return;
    }
    org.allocatedSeats = s;
  }
  if (subscriptionExpiresAt) {
    org.subscriptionExpiresAt = subscriptionExpiresAt;
    if (status !== "Suspended") org.status = "Active";
  }
  addAuditLog(null, req.user.fullName, req.user.role, "Update Organization", `Updated '${org.name}': status=${status}, seats=${allocatedSeats}, expiry=${subscriptionExpiresAt}`);
  res.json(org);
});
app.post("/api/superadmin/organizations/:id/extend-subscription", authGuard, superAdminGuard, (req, res) => {
  const org = USER_DB.organizations.find((o) => o.id === req.params.id);
  if (!org) {
    res.status(404).json({ error: "Organization not found." });
    return;
  }
  const { months } = req.body;
  const base = org.subscriptionExpiresAt && new Date(org.subscriptionExpiresAt) > /* @__PURE__ */ new Date() ? new Date(org.subscriptionExpiresAt) : /* @__PURE__ */ new Date();
  base.setMonth(base.getMonth() + (Number(months) || 12));
  org.subscriptionExpiresAt = base.toISOString();
  org.status = "Active";
  USER_DB.users.forEach((u) => {
    if (u.organizationId === org.id && u.status === "Disabled") u.status = "Active";
  });
  addAuditLog(null, req.user.fullName, req.user.role, "Extend Subscription", `Extended '${org.name}' by ${months} months until ${org.subscriptionExpiresAt}`);
  res.json(org);
});
app.post("/api/superadmin/reset-userdb", authGuard, superAdminGuard, async (req, res) => {
  USER_DB.organizations.length = 0;
  USER_DB.users.length = 0;
  USER_DB.seatRequests.length = 0;
  USER_DB.registrationRequests.length = 0;
  USER_DB.notifications.length = 0;
  USER_DB.customRoles.length = 0;
  seedUserDB();
  await saveUserDB();
  addAuditLog(null, req.user.fullName, req.user.role, "Reset USER_DB", "Wiped stale user DB and re-seeded canonical accounts.");
  res.json({ success: true, users: USER_DB.users.map(safeUser), orgs: USER_DB.organizations });
});
app.get("/api/users", authGuard, (req, res) => {
  const user = req.user;
  res.json((user.role === "Super Admin" ? USER_DB.users : USER_DB.users.filter((u) => u.organizationId === user.organizationId)).map(safeUser));
});
app.post("/api/users", authGuard, requirePermission("manage_users"), (req, res) => {
  const activeUser = req.user;
  if (activeUser.role !== "Admin" && activeUser.role !== "Super Admin") {
    res.status(403).json({ error: "Only Admins can create users." });
    return;
  }
  const { fullName, email, mobileNumber, department, designation, role, permissions } = req.body;
  if (!fullName || !email || !mobileNumber || !role) {
    res.status(400).json({ error: "Name, email, mobile, role required." });
    return;
  }
  if (role === "Super Admin" && activeUser.role !== "Super Admin") {
    res.status(403).json({ error: "Only Super Admin can grant Super Admin role." });
    return;
  }
  const targetOrgId = activeUser.role === "Super Admin" ? req.body.organizationId : activeUser.organizationId;
  const org = USER_DB.organizations.find((o) => o.id === targetOrgId);
  if (!org) {
    res.status(404).json({ error: "Organization not found." });
    return;
  }
  if (org.usedSeats >= org.allocatedSeats) {
    res.status(403).json({ error: `Seat limit reached (${org.usedSeats}/${org.allocatedSeats}). Request more seats.` });
    return;
  }
  if (USER_DB.users.some((u) => u.email === email)) {
    res.status(400).json({ error: "Email already registered." });
    return;
  }
  const tempPassword = `Temp@${Math.floor(1e3 + Math.random() * 9e3)}`;
  const activationCode = Math.random().toString(36).substring(2, 10);
  const newUser = { id: generateId("user"), organizationId: targetOrgId, fullName, email, mobileNumber, department, designation, role, status: "Pending Activation", password: hashPassword(tempPassword), permissions: permissions || ["view_invoices", "view_reports"], twoFactorEnabled: false, createdAt: (/* @__PURE__ */ new Date()).toISOString(), activationCode };
  USER_DB.users.push(newUser);
  org.usedSeats = USER_DB.users.filter((u) => u.organizationId === targetOrgId && u.status !== "Disabled").length;
  USER_DB.notifications.unshift({ id: generateId("notif"), to: email, subject: `Welcome to BizKhata - ${org.name}`, body: `Hello ${fullName},

Temp Password: ${tempPassword}
Role: ${role}

Activate: https://bizkhata-six.vercel.app/activate?code=${activationCode}&email=${email}`, type: "Email", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  addAuditLog(targetOrgId, activeUser.fullName, activeUser.role, "User Created", `Created '${fullName}' as '${role}'.`);
  res.status(201).json(safeUser(newUser));
});
app.put("/api/users/:id", authGuard, requirePermission("manage_users"), (req, res) => {
  const activeUser = req.user;
  const targetUser = USER_DB.users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (activeUser.role !== "Super Admin" && targetUser.organizationId !== activeUser.organizationId) {
    res.status(403).json({ error: "Tenant isolation violation." });
    return;
  }
  const { fullName, mobileNumber, department, designation, role, status, permissions } = req.body;
  if (fullName) targetUser.fullName = fullName;
  if (mobileNumber) targetUser.mobileNumber = mobileNumber;
  if (department) targetUser.department = department;
  if (designation) targetUser.designation = designation;
  if (activeUser.role === "Admin" || activeUser.role === "Super Admin") {
    if (role && targetUser.role !== "Super Admin") {
      if (role === "Super Admin" && activeUser.role !== "Super Admin") {
        res.status(403).json({ error: "Only Super Admin can grant Super Admin role." });
        return;
      }
      targetUser.role = role;
    }
    if (permissions) targetUser.permissions = permissions;
    if (status) {
      targetUser.status = status;
      const org = USER_DB.organizations.find((o) => o.id === targetUser.organizationId);
      if (org) org.usedSeats = USER_DB.users.filter((u) => u.organizationId === org.id && u.status !== "Disabled").length;
    }
  }
  addAuditLog(targetUser.organizationId, activeUser.fullName, activeUser.role, "User Updated", `Updated '${targetUser.email}'.`);
  res.json(safeUser(targetUser));
});
app.post("/api/users/:id/reset-password", authGuard, requirePermission("manage_users"), (req, res) => {
  const activeUser = req.user;
  if (activeUser.role !== "Admin" && activeUser.role !== "Super Admin") {
    res.status(403).json({ error: "Admin required." });
    return;
  }
  const targetUser = USER_DB.users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (activeUser.role !== "Super Admin" && targetUser.organizationId !== activeUser.organizationId) {
    res.status(403).json({ error: "Tenant violation." });
    return;
  }
  const tempPwd = `Temp@${Math.floor(1e3 + Math.random() * 9e3)}`;
  targetUser.password = hashPassword(tempPwd);
  targetUser.status = "Pending Activation";
  USER_DB.notifications.unshift({ id: generateId("notif"), to: targetUser.email, subject: "Password Reset by Admin", body: `New Temp Password: ${tempPwd}`, type: "Email", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  addAuditLog(targetUser.organizationId, activeUser.fullName, activeUser.role, "Password Reset", `Reset pwd for '${targetUser.email}'.`);
  res.json({ success: true, tempPassword: tempPwd });
});
app.get("/api/seat-requests", authGuard, (req, res) => {
  const user = req.user;
  res.json(user.role === "Super Admin" ? USER_DB.seatRequests : USER_DB.seatRequests.filter((s) => s.organizationId === user.organizationId));
});
app.post("/api/seat-requests", authGuard, (req, res) => {
  const user = req.user;
  if (user.role !== "Admin") {
    res.status(403).json({ error: "Only Admins can request seats." });
    return;
  }
  const { additionalSeatsRequested, reason } = req.body;
  if (!additionalSeatsRequested || !reason) {
    res.status(400).json({ error: "Seats and reason required." });
    return;
  }
  const org = USER_DB.organizations.find((o) => o.id === user.organizationId);
  if (!org) {
    res.status(404).json({ error: "Organization not found." });
    return;
  }
  const newReq = { id: generateId("req_seat"), organizationId: org.id, requestedBy: user.fullName, currentSeatCount: org.allocatedSeats, additionalSeatsRequested: Number(additionalSeatsRequested), reason, status: "Pending", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  USER_DB.seatRequests.unshift(newReq);
  USER_DB.notifications.unshift({ id: generateId("notif"), to: USER_DB.users.find((u) => u.role === "Super Admin")?.email || "owner@bizkhata.app", subject: "Seat Request", body: `'${org.name}' needs ${additionalSeatsRequested} more seats. Reason: ${reason}`, type: "Email", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  addAuditLog(org.id, user.fullName, user.role, "Seat Request Submitted", `Requested ${additionalSeatsRequested} seats.`);
  res.status(201).json(newReq);
});
app.post("/api/seat-requests/:id/action", authGuard, superAdminGuard, (req, res) => {
  const ticket = USER_DB.seatRequests.find((t) => t.id === req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Seat request not found." });
    return;
  }
  const org = USER_DB.organizations.find((o) => o.id === ticket.organizationId);
  if (!org) {
    res.status(404).json({ error: "Org not found." });
    return;
  }
  const { action } = req.body;
  if (action === "Approve") {
    ticket.status = "Approved";
    org.allocatedSeats += ticket.additionalSeatsRequested;
    addAuditLog(null, req.user.fullName, req.user.role, "Seat Request Approved", `+${ticket.additionalSeatsRequested} for '${org.name}'.`);
  } else {
    ticket.status = "Rejected";
    addAuditLog(null, req.user.fullName, req.user.role, "Seat Request Rejected", `Denied for '${org.name}'.`);
  }
  res.json(ticket);
});
app.get("/api/audit-logs", authGuard, (req, res) => {
  const user = req.user;
  res.json(user.role === "Super Admin" ? USER_DB.auditLogs : USER_DB.auditLogs.filter((l) => l.organizationId === user.organizationId));
});
app.get("/api/custom-roles", authGuard, (req, res) => {
  const user = req.user;
  res.json(user.role === "Super Admin" ? USER_DB.customRoles : USER_DB.customRoles.filter((r) => r.organizationId === user.organizationId));
});
app.post("/api/custom-roles", authGuard, (req, res) => {
  const user = req.user;
  if (user.role !== "Admin") {
    res.status(403).json({ error: "Admins only." });
    return;
  }
  const { name, description, permissions } = req.body;
  if (!name || !description || !permissions) {
    res.status(400).json({ error: "Name, description, permissions required." });
    return;
  }
  const newRole = { id: generateId("role_custom"), organizationId: user.organizationId, name, description, permissions };
  USER_DB.customRoles.push(newRole);
  addAuditLog(user.organizationId, user.fullName, user.role, "Custom Role Created", `Created '${name}'.`);
  res.status(201).json(newRole);
});
app.get("/api/permissions", (req, res) => res.json(ALL_PERMISSIONS_LIST));
app.get("/api/db", authGuard, async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    res.status(400).json({ error: "Your account isn't linked to an organization." });
    return;
  }
  const db = await readDB(orgId);
  res.json(db);
});
app.get("/api/supabase-status", async (req, res) => {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const rows = await supabaseREST("GET", "__health_check__");
      const connected = Array.isArray(rows);
      supabaseStatus.configured = true;
      supabaseStatus.connected = connected;
      supabaseStatus.error = connected ? null : { message: "Empty response from Supabase" };
    } catch (e) {
      supabaseStatus.connected = false;
      supabaseStatus.error = { message: e?.message || String(e) };
    }
  }
  res.json(supabaseStatus);
});
app.post("/api/users/add", authGuard, requirePermission("manage_users"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const { name, email, mobile, role, author } = req.body;
  if (!name || !email || !mobile) {
    return res.status(400).json({ error: "Missing required parameters. Name, Email, and Mobile are mandatory." });
  }
  if (!db.users) db.users = [];
  if (!db.mailLogs) db.mailLogs = [];
  if (!db.userSeatsLimit) db.userSeatsLimit = 5;
  if (db.users.length >= db.userSeatsLimit) {
    return res.status(400).json({
      error: `Licensed limits exceeded! You currently hold ${db.users.length} of ${db.userSeatsLimit} seats. Please expand your subscribed slot size first under the Zoho Licenses Desk.`
    });
  }
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "A corporate user with this email address has already been configured." });
  }
  const password = "BK-" + Math.floor(1e3 + Math.random() * 9e3);
  const newUser = {
    id: "usr_" + uuid(),
    name,
    email: email.toLowerCase(),
    mobile,
    role: role || "Viewer" /* Viewer */,
    password,
    isOwner: false
  };
  db.users.push(newUser);
  const mailSubject = "Welcome to Bizkhata - Your Accounting Portal account is ready!";
  const mailBody = `Dear ${name},

Your organization manager (${author || "@admin"}) has assigned an accounting seat for you on the Bizkhata General Ledger platform.

Here are your access details:
\u2022 Portal URL: Bizkhata Cloud Edge
\u2022 Registered Email: ${email.toLowerCase()}
\u2022 Mobile Number: ${mobile}
\u2022 Designated Role: ${role || "Viewer"}
\u2022 Single-Sign-On Password: ${password}

You can log in directly at the system portal page.

Warm regards,
Bizkhata Zoho Books Infrastructure Team.`;
  const newMailLog = {
    id: "mail_" + uuid(),
    to: email.toLowerCase(),
    subject: mailSubject,
    body: mailBody,
    passwordSent: password,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.mailLogs.unshift(newMailLog);
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: author || "Admin",
    action: "User Seat Reservation",
    details: `Authorized tenant seat for ${name} (${email}) as ${role || "Viewer"} with automated password mailing.`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db, newUser, password });
});
app.post("/api/user-seats/update", authGuard, async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const { seatsLimit, author } = req.body;
  if (!seatsLimit || isNaN(Number(seatsLimit))) {
    return res.status(400).json({ error: "Seats capacity limit must be a valid numeric integer." });
  }
  const limitNumber = Number(seatsLimit);
  db.userSeatsLimit = limitNumber;
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: author || "Admin",
    action: "License Cap Update",
    details: `Updated corporate scale capacity to ${limitNumber} user seats.`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/company", authGuard, async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  db.company = { ...db.company, ...req.body };
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: req.body.user || "User",
    action: "Company Config Setup",
    details: `Updated company details to ${db.company.name}`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/customers", authGuard, requirePermission("manage_customers"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const index = db.customers.findIndex((c) => c.id === req.body.id);
  const user = req.body.authorUser || "User";
  if (index >= 0) {
    db.customers[index] = { ...db.customers[index], ...req.body };
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Edit Customer",
      details: `Modified customer parameters for ${req.body.name}`
    });
  } else {
    const newCust = { id: "cust_" + uuid(), ...req.body };
    db.customers.push(newCust);
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Add Customer",
      details: `Created customer master record for ${req.body.name}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/vendors", authGuard, requirePermission("manage_vendors"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const index = db.vendors.findIndex((v) => v.id === req.body.id);
  const user = req.body.authorUser || "User";
  if (index >= 0) {
    db.vendors[index] = { ...db.vendors[index], ...req.body };
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Edit Vendor",
      details: `Modified vendor master parameters for ${req.body.name}`
    });
  } else {
    const newVend = { id: "vend_" + uuid(), ...req.body };
    db.vendors.push(newVend);
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Add Vendor",
      details: `Created vendor master record for ${req.body.name}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/items", authGuard, requirePermission("manage_items"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const index = db.items.findIndex((i) => i.id === req.body.id);
  const user = req.body.authorUser || "User";
  if (index >= 0) {
    db.items[index] = { ...db.items[index], ...req.body };
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Edit Item",
      details: `Updated item details for ${req.body.name}`
    });
  } else {
    const newItem = { id: "item_" + uuid(), ...req.body };
    db.items.push(newItem);
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Add Item",
      details: `Added new service/product item: ${req.body.name}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
function createInvoiceJournal(invoice, company) {
  const lines = [];
  const reference = `Invoice ${invoice.invoiceNumber}`;
  const description = `Revenue booked from sales invoice ${invoice.invoiceNumber}`;
  lines.push({
    id: uuid(),
    accountCode: "accounts_receivable",
    accountName: "Accounts Receivable",
    debit: invoice.total,
    credit: 0
  });
  lines.push({
    id: uuid(),
    accountCode: "sales_income",
    accountName: "Sales Income",
    debit: 0,
    credit: invoice.subtotal
  });
  if (invoice.totalGst > 0) {
    const taxDesc = invoice.totalIgst > 0 ? `IGST 18%` : `CGST/SGST ${invoice.items[0]?.gstRate || 18}%`;
    lines.push({
      id: uuid(),
      accountCode: "gst_payable",
      accountName: `GST Financial Liability (${taxDesc})`,
      debit: 0,
      credit: invoice.totalGst
    });
  }
  if (invoice.tdsAmount > 0) {
    lines.push({
      id: uuid(),
      accountCode: "tds_receivable",
      accountName: `TDS Receivable (Sec ${invoice.tdsSection || "\u2014"})`,
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
app.post("/api/invoices", authGuard, requirePermission("create_invoices"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const invoiceData = req.body;
  const user = req.body.authorUser || "User";
  if (!invoiceData.invoiceNumber) {
    const lastNum = db.invoices.length;
    invoiceData.invoiceNumber = `INV-2026-${String(lastNum + 1).padStart(3, "0")}`;
  } else {
    const dupe = db.invoices.find((inv) => inv.invoiceNumber === invoiceData.invoiceNumber && inv.id !== invoiceData.id);
    if (dupe) {
      res.status(409).json({ error: `Invoice number '${invoiceData.invoiceNumber}' is already in use.` });
      return;
    }
  }
  const existingIndex = db.invoices.findIndex((inv) => inv.id === invoiceData.id);
  const existingInvoice = existingIndex >= 0 ? db.invoices[existingIndex] : null;
  const lockCheck = checkFinancialLock("invoice", existingInvoice, invoiceData, ["Draft"]);
  if (lockCheck.locked) {
    res.status(423).json({ error: `This invoice is ${existingInvoice.status} \u2014 '${lockCheck.field}' can no longer be edited directly. Issue a Credit Note to correct it.` });
    return;
  }
  let changeSummary = "";
  if (existingIndex >= 0) {
    changeSummary = diffFields(existingInvoice, invoiceData, [...FINANCIAL_LOCK_FIELDS.invoice, "status", "dueDate"]);
    db.invoices[existingIndex] = { ...db.invoices[existingIndex], ...invoiceData };
    db.journals = db.journals.filter((j) => j.id !== `j_inv_${invoiceData.id}`);
  } else {
    invoiceData.id = "inv_" + uuid();
    db.invoices.push(invoiceData);
  }
  if (!invoiceData.isProforma && invoiceData.status !== "Draft" && invoiceData.status !== "Cancelled") {
    const journalEntry = createInvoiceJournal(invoiceData, db.company);
    db.journals.push(journalEntry);
  }
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user,
    action: existingIndex >= 0 ? "Edit Invoice" : invoiceData.isProforma ? "Save Proforma Invoice" : "Create Tax Invoice",
    details: existingIndex >= 0 ? `${invoiceData.invoiceNumber}: ${changeSummary}` : `Generated standard billing number ${invoiceData.invoiceNumber} for client \u20B9${invoiceData.total}`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/payments", authGuard, requirePermission("approve_payments"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const payment = req.body;
  const user = req.body.authorUser || "User";
  payment.id = "pay_" + uuid();
  if (!payment.receiptNumber) {
    payment.receiptNumber = `PAY-2026-${String(db.payments.length + 1).padStart(3, "0")}`;
  }
  db.payments.push(payment);
  payment.allocations.forEach((alloc) => {
    const inv = db.invoices.find((i) => i.id === alloc.invoiceId);
    if (inv) {
      inv.paymentReceived = (inv.paymentReceived || 0) + alloc.amount;
      if (inv.paymentReceived >= inv.total) {
        inv.status = "Paid";
      }
    }
  });
  const totalCredited = payment.amountReceived + payment.tdsDeducted;
  const lines = [
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
  const journalEntry = {
    id: `j_pay_${payment.id}`,
    date: payment.date,
    reference: `Payment ${payment.receiptNumber}`,
    description: `Collected client bank remittance to settle allocation for client`,
    lines
  };
  db.journals.push(journalEntry);
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user,
    action: "Record Remittance",
    details: `Allocated \u20B9${payment.amountReceived} received (TDS \u20B9${payment.tdsDeducted}) to settle receivable balances.`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/credit-notes", authGuard, requirePermission("edit_invoices"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const cn = req.body;
  const user = req.body.authorUser || "User";
  cn.id = "cn_" + uuid();
  if (!cn.creditNoteNumber) {
    cn.creditNoteNumber = `CN-2026-${String(db.creditNotes.length + 1).padStart(3, "0")}`;
  }
  db.creditNotes.push(cn);
  const invoice = db.invoices.find((inv) => inv.id === cn.invoiceId);
  if (invoice) {
    invoice.total = Math.max(0, invoice.total - cn.total);
    if (invoice.paymentReceived >= invoice.total) {
      invoice.status = "Paid";
    }
  }
  const lines = [
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user,
    action: "Issue Credit Note",
    details: `Refund adjustment ${cn.creditNoteNumber} issued on ${cn.invoiceNumber} for \u20B9${cn.total}`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/expenses", authGuard, requirePermission("manage_billing"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const exp = req.body;
  const user = req.body.authorUser || "User";
  const existingIndex = db.expenses.findIndex((e) => e.id === exp.id);
  const existingExpense = existingIndex >= 0 ? db.expenses[existingIndex] : null;
  const lockCheck = checkFinancialLock("expense", existingExpense, exp, ["Draft", "Pending Approval"]);
  if (lockCheck.locked) {
    res.status(423).json({ error: `This expense is ${existingExpense.status} \u2014 '${lockCheck.field}' can no longer be edited directly. Record a reversing journal to correct it.` });
    return;
  }
  if (existingIndex >= 0) {
    const changeSummary = diffFields(existingExpense, exp, [...FINANCIAL_LOCK_FIELDS.expense, "status"]);
    db.expenses[existingIndex] = { ...db.expenses[existingIndex], ...exp };
    db.auditLogs.unshift({ id: uuid(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), user, action: "Edit Expense", details: `${exp.vendorName || exp.id}: ${changeSummary}` });
    db.journals = db.journals.filter((j) => j.id !== `j_exp_${exp.id}`);
  } else {
    exp.id = "exp_" + uuid();
    db.expenses.push(exp);
  }
  if (!exp.status) {
    exp.status = "Approved";
  }
  if (exp.status === "Approved") {
    const lines = [
      {
        id: uuid(),
        accountCode: exp.category,
        accountName: db.accounts.find((a) => a.code === exp.category)?.name || "General Business Expense",
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
          accountName: "GST Payable (Reverse Charge \u2013 Self Assessed)",
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Approve Expense",
      details: `Approved and posted spending of \u20B9${exp.total} categorized as ${exp.category}`
    });
  } else {
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: exp.status === "Draft" ? "Save Expense Draft" : "Submit Expense Approval",
      details: `${exp.status === "Draft" ? "Saved draft for out-of-pocket spending" : "Submitted out-of-pocket spending for authority approval"} of \u20B9${exp.total}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/bills", authGuard, requirePermission("manage_billing"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const bill = req.body;
  const user = req.body.authorUser || "User";
  const existingIndex = db.bills.findIndex((b) => b.id === bill.id);
  const existingBill = existingIndex >= 0 ? db.bills[existingIndex] : null;
  const lockCheck = checkFinancialLock("bill", existingBill, bill, ["Draft"]);
  if (lockCheck.locked) {
    res.status(423).json({ error: `This bill is ${existingBill.status} \u2014 '${lockCheck.field}' can no longer be edited directly. Issue a Debit Note to correct it.` });
    return;
  }
  if (existingIndex >= 0) {
    const changeSummary = diffFields(existingBill, bill, [...FINANCIAL_LOCK_FIELDS.bill, "status", "dueDate", "paymentPaid"]);
    db.bills[existingIndex] = { ...db.bills[existingIndex], ...bill };
    db.auditLogs.unshift({ id: uuid(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), user, action: "Edit Bill", details: `${bill.billNumber}: ${changeSummary}` });
    db.journals = db.journals.filter((j) => j.id !== `j_bill_${bill.id}`);
  } else {
    bill.id = "bill_" + uuid();
    if (!bill.billNumber) {
      bill.billNumber = `BILL-DUE-${String(db.bills.length + 1).padStart(3, "0")}`;
    } else {
      const dupe = db.bills.find((b) => b.billNumber === bill.billNumber && b.id !== bill.id);
      if (dupe) {
        res.status(409).json({ error: `Bill number '${bill.billNumber}' is already in use.` });
        return;
      }
    }
    db.bills.push(bill);
  }
  if (!bill.status) {
    bill.status = "Approved";
  }
  if (bill.status === "Approved" || bill.status === "Paid") {
    const lines = [
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
          accountName: "GST Payable (Reverse Charge \u2013 Self Assessed)",
          debit: 0,
          credit: bill.totalGst
        });
      }
    }
    if (bill.tdsAmount > 0) {
      lines.push({
        id: uuid(),
        accountCode: "tds_payable",
        accountName: `TDS Payable (Sec ${bill.tdsSection || "\u2014"})`,
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: "Approve Vendor Bill",
      details: `Approved invoicing payable claim ${bill.billNumber} from ${bill.vendorName} for \u20B9${bill.total}`
    });
  } else {
    db.auditLogs.unshift({
      id: uuid(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user,
      action: bill.status === "Draft" ? "Save Bill Draft" : "Submit Bill Approval",
      details: `${bill.status === "Draft" ? "Saved draft bill" : "Submitted vendor bill for authority approval"} ${bill.billNumber} from ${bill.vendorName} for \u20B9${bill.total}`
    });
  }
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/bills/pay", authGuard, requirePermission("approve_payments"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const { billId, date, paymentMode, referenceNumber, amountPaid, authorUser } = req.body;
  const user = authorUser || "User";
  const bill = db.bills.find((b) => b.id === billId);
  if (!bill) {
    return res.status(404).json({ error: "Bill not found" });
  }
  bill.paymentPaid = (bill.paymentPaid || 0) + amountPaid;
  if (bill.paymentPaid >= bill.total) {
    bill.status = "Paid";
  }
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user,
    action: "Pay Vendor Bill",
    details: `Settle payable \u20B9${amountPaid} for supplier bill ${bill.billNumber}`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/journals", authGuard, requirePermission("create_journals"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const { date, reference, description, lines, user } = req.body;
  if (!date || !reference || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: "Missing required journal fields. All journals require a date, unique reference, and double entry transaction lines." });
  }
  let totalDebit = 0;
  let totalCredit = 0;
  lines.forEach((l) => {
    totalDebit += Number(l.debit || 0);
    totalCredit += Number(l.credit || 0);
  });
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: `Double-entry violation balance mismatch: Debits (\u20B9${totalDebit.toLocaleString()}) must exactly balance out Credits (\u20B9${totalCredit.toLocaleString()}). Difference is \u20B9${Math.abs(totalDebit - totalCredit).toLocaleString()}` });
  }
  const newJournal = {
    id: `j_manual_${uuid()}`,
    date,
    reference,
    description: description || "",
    lines: lines.map((l) => ({
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: user || "System user",
    action: "Manual Journal Entry",
    details: `Posted balanced accounting entries for ${reference} (\u20B9${totalDebit.toLocaleString()}) to general accounts.`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/users/remove", authGuard, requirePermission("manage_users"), async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const { id, author } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing required parameter: id" });
  }
  if (!db.users) db.users = [];
  const targetIdx = db.users.findIndex((u) => u.id === id);
  if (targetIdx === -1) {
    return res.status(404).json({ error: "Specified user record was not found." });
  }
  const targetUser = db.users[targetIdx];
  if (targetUser.role === "Super Admin" || targetUser.isOwner) {
    return res.status(400).json({ error: "Access Denied: The system owner administrator account cannot be deleted." });
  }
  db.users.splice(targetIdx, 1);
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: author || "Admin",
    action: "User Seat Deletion",
    details: `Revoked corporate authorization and deleted user credentials for ${targetUser.name} (${targetUser.email}).`
  });
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/superadmin/organizations", authGuard, superAdminGuard, (req, res) => {
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  USER_DB.organizations.push(newOrg);
  addAuditLog(null, req.user.fullName, req.user.role, "Register Organization", `Enrolled new customer organization '${name}' for ${newOrg.allocatedSeats} seats.`);
  res.json(newOrg);
});
app.post("/api/role", authGuard, async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  db.role = req.body.role;
  await writeDB(orgId, db);
  res.json({ success: true, db });
});
app.post("/api/reset", authGuard, async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const fresh = getInitialState();
  await writeDB(orgId, fresh);
  res.json(fresh);
});
app.post("/api/ai/invoice-create", authGuard, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "No prompts provided." });
  }
  if (!ai) {
    return res.status(503).json({
      error: "AI invoice parsing isn't available right now \u2014 no GEMINI_API_KEY is configured. Add one in your environment settings, or enter the invoice details manually."
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
          type: import_genai.Type.OBJECT,
          properties: {
            customerName: { type: import_genai.Type.STRING },
            items: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  name: { type: import_genai.Type.STRING },
                  qty: { type: import_genai.Type.NUMBER },
                  rate: { type: import_genai.Type.NUMBER },
                  gstRate: { type: import_genai.Type.NUMBER }
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
  } catch (error) {
    console.error("Gemini parse failed:", error);
    res.status(500).json({ error: "Gemini failed to resolve fields. Please try manually.", details: error.message });
  }
});
app.post("/api/ai/reconcile", authGuard, async (req, res) => {
  const { bankFeed } = req.body;
  if (!bankFeed) {
    return res.status(400).json({ error: "Feed prompt is required." });
  }
  const orgId = req.user.organizationId;
  if (!orgId) {
    return res.status(400).json({ error: "Your account isn't linked to an organization." });
  }
  const db = await readDB(orgId);
  const outstandingInvoices = db.invoices.filter((i) => i.status !== "Paid");
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
    ${JSON.stringify(outstandingInvoices.map((i) => ({ id: i.id, num: i.invoiceNumber, customer: i.customerName, total: i.total })), null, 2)}
    
    Suggest the most confident invoice match, indicating the invoice number, matched amount, and a confident explanation code. Return as JSON with keys "invoiceNumber", "allocatedAmount", "confidence", "explanation".`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            invoiceNumber: { type: import_genai.Type.STRING },
            allocatedAmount: { type: import_genai.Type.NUMBER },
            confidence: { type: import_genai.Type.STRING },
            explanation: { type: import_genai.Type.STRING }
          },
          required: ["invoiceNumber", "allocatedAmount", "confidence", "explanation"]
        }
      }
    });
    const parsed = JSON.parse(response.text.trim());
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ error: "Failed to query AI models.", details: err.message });
  }
});
app.post("/api/ai/categorize", authGuard, async (req, res) => {
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
          type: import_genai.Type.OBJECT,
          properties: {
            category: { type: import_genai.Type.STRING },
            reason: { type: import_genai.Type.STRING }
          },
          required: ["category", "reason"]
        }
      }
    });
    res.json(JSON.parse(response.text.trim()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/explain-report", authGuard, async (req, res) => {
  const { reportType, data } = req.body;
  if (!ai) {
    return res.json({
      explanation: "### BizKhata AI Financial Analyst\nTo get personalized AI summaries and forecast charts, please activate the GEMINI_API_KEY in the Secrets panel.\n\nFrom the heuristic view:\n1. **Tax compliance** looks good with CGST/SGST structured correctly for intra-state and IGST for inter-state supplies.\n2. **Bank Reserves** reflect your current opening balance as entered in Company Setup \u2192 Opening Balances."
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/generate-reminder", authGuard, async (req, res) => {
  const { invoiceNum, clientName, dueDate, amount } = req.body;
  const tonePrompt = `Draft a professional, yet gentle payment outstanding email reminder for Indian invoice number ${invoiceNum}. Client: ${clientName}, Due date: ${dueDate}, Balance outstanding: \u20B9${amount}. Write a helpful subject line and email body.`;
  if (!ai) {
    return res.json({
      subject: `Reminder: Outstanding Payment Request - ${invoiceNum}`,
      body: `Dear Accounts Team at ${clientName},

We hope you are doing well.

This is a friendly reminder that invoice ${invoiceNum} which was due on ${dueDate} remains outstanding. The total amount receivable is \u20B9${amount}.

We kindly request you to process the NEFT/RTGS bank transfer at your earliest convenience. Please let us know if you require any banking documentation or support.

Best Regards,
Finance & Compliance Team
Bizkhata Pvt Ltd`
    });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: tonePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            subject: { type: import_genai.Type.STRING },
            body: { type: import_genai.Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });
    res.json(JSON.parse(response.text.trim()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/sales-orders", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.salesOrders) db.salesOrders = [];
    if (payload.id) {
      const idx = db.salesOrders.findIndex((s) => s.id === payload.id);
      if (idx >= 0) {
        db.salesOrders[idx] = { ...db.salesOrders[idx], ...payload };
      } else {
        db.salesOrders.push(payload);
      }
    } else {
      const soCount = db.salesOrders.length + 1;
      const soNumber = `SO-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(soCount).padStart(3, "0")}`;
      db.salesOrders.push({ ...payload, id: `so_${Date.now()}`, soNumber });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/purchase-orders", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.purchaseOrders) db.purchaseOrders = [];
    if (payload.id) {
      const idx = db.purchaseOrders.findIndex((p) => p.id === payload.id);
      if (idx >= 0) {
        db.purchaseOrders[idx] = { ...db.purchaseOrders[idx], ...payload };
      } else {
        db.purchaseOrders.push(payload);
      }
    } else {
      const poCount = db.purchaseOrders.length + 1;
      const poNumber = `PO-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(poCount).padStart(3, "0")}`;
      db.purchaseOrders.push({ ...payload, id: `po_${Date.now()}`, poNumber });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/vendor-credits", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.vendorCredits) db.vendorCredits = [];
    if (payload.id) {
      const idx = db.vendorCredits.findIndex((v) => v.id === payload.id);
      if (idx >= 0) {
        db.vendorCredits[idx] = { ...db.vendorCredits[idx], ...payload };
      } else {
        db.vendorCredits.push(payload);
      }
    } else {
      const vcCount = db.vendorCredits.length + 1;
      const vcNumber = `VC-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(vcCount).padStart(3, "0")}`;
      db.vendorCredits.push({ ...payload, id: `vc_${Date.now()}`, vcNumber });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/delivery-challans", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.deliveryChallans) db.deliveryChallans = [];
    if (payload.id) {
      const idx = db.deliveryChallans.findIndex((c) => c.id === payload.id);
      if (idx >= 0) db.deliveryChallans[idx] = { ...db.deliveryChallans[idx], ...payload };
      else db.deliveryChallans.push(payload);
    } else {
      const num = db.deliveryChallans.length + 1;
      db.deliveryChallans.push({ ...payload, id: "dc_" + Date.now(), challanNumber: "DC-" + (/* @__PURE__ */ new Date()).getFullYear() + "-" + String(num).padStart(3, "0") });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/bank-accounts", authGuard, requirePermission("view_banking"), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.bankAccounts) db.bankAccounts = [];
    if (payload.id) {
      const idx = db.bankAccounts.findIndex((a) => a.id === payload.id);
      if (idx >= 0) db.bankAccounts[idx] = { ...db.bankAccounts[idx], ...payload };
    } else {
      db.bankAccounts.push({ ...payload, id: "ba_" + Date.now() });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/bank-transactions", authGuard, requirePermission("view_banking"), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.bankTransactions) db.bankTransactions = [];
    if (payload.id) {
      const idx = db.bankTransactions.findIndex((t) => t.id === payload.id);
      if (idx >= 0) db.bankTransactions[idx] = { ...db.bankTransactions[idx], ...payload };
      else db.bankTransactions.push(payload);
    } else {
      db.bankTransactions.push({ ...payload, id: "bt_" + Date.now() });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/bank-transactions/match", authGuard, requirePermission("view_banking"), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const { txId, matchedId, matchedType } = req.body;
    const txns = db.bankTransactions || [];
    const tx = txns.find((t) => t.id === txId);
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    tx.status = "Reconciled";
    tx.matchedId = matchedId;
    if (matchedType === "invoice") {
      const inv = db.invoices.find((i) => i.id === matchedId);
      if (inv) {
        inv.status = "Paid";
        inv.paymentReceived = inv.total;
      }
    } else if (matchedType === "bill") {
      const bill = db.bills.find((b) => b.id === matchedId);
      if (bill) {
        bill.status = "Paid";
        bill.paymentPaid = bill.total;
      }
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/opening-balances", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const { entries, date } = req.body;
    entries.forEach((entry) => {
      const acc = db.accounts.find((a) => a.code === entry.accountCode);
      if (acc) {
        acc.balance = entry.debit > 0 ? entry.debit : entry.credit;
      }
    });
    db.openingBalanceDate = date;
    db.openingBalancesSet = true;
    const openingJournal = {
      id: "j_opening_" + Date.now(),
      date,
      reference: "OB-" + (/* @__PURE__ */ new Date()).getFullYear(),
      description: "Opening Balances Entry",
      lines: entries.filter((e) => e.debit > 0 || e.credit > 0).map((e, i) => ({
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/accounts", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const { code, name, type, balance } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: "Code and name required." });
      return;
    }
    const existing = db.accounts.findIndex((a) => a.code === code);
    if (existing >= 0) {
      db.accounts[existing] = { ...db.accounts[existing], name, type, balance: balance || 0 };
    } else {
      db.accounts.push({ code, name, type, balance: balance || 0 });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/accounts/:code", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const code = req.params.code;
    const usedInJournals = db.journals.some((j) => j.lines?.some((l) => l.accountCode === code));
    if (usedInJournals) {
      res.status(400).json({ error: "Cannot delete account used in journal entries." });
      return;
    }
    db.accounts = db.accounts.filter((a) => a.code !== code);
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/month-end-checklist", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.monthEndChecklists) db.monthEndChecklists = [];
    const idx = db.monthEndChecklists.findIndex((c) => c.id === payload.id);
    if (idx >= 0) db.monthEndChecklists[idx] = payload;
    else db.monthEndChecklists.push(payload);
    db.auditLogs.unshift({ id: "audit_" + Date.now(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), user: req.body.actorEmail || "User", action: "MONTH_END_CHECKLIST_UPDATE", details: `Updated close checklist for ${payload.monthLabel}` });
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/fixed-assets", authGuard, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: "Your account isn't linked to an organization." });
    }
    const db = await readDB(orgId);
    const payload = req.body;
    if (!db.fixedAssets) db.fixedAssets = [];
    if (payload.id) {
      const idx = db.fixedAssets.findIndex((a) => a.id === payload.id);
      if (idx >= 0) db.fixedAssets[idx] = { ...db.fixedAssets[idx], ...payload };
      else db.fixedAssets.push(payload);
    } else {
      db.fixedAssets.push({ ...payload, id: "fa_" + Date.now() });
    }
    await writeDB(orgId, db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
if (process.env.VERCEL !== "1") {
  (async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Bizkhata express ledger server listening on port ${PORT}...`);
    });
  })();
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
