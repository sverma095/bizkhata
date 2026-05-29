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
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_meta = {};
import_dotenv.default.config();
var SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
var supabaseStatus = {
  configured: false,
  connected: false,
  error: null
};
var supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "MY_SUPABASE_URL") {
  try {
    supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseStatus.configured = true;
    console.log(`Supabase State Engine Successfully Initialized for URL: ${SUPABASE_URL}`);
  } catch (err) {
    supabaseStatus.error = { message: err?.message || String(err) };
    console.error("Failed to initialize Supabase client:", err);
  }
}
var cachedDb = null;
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "10mb" }));
var asyncRoute = (fn) => (req, res) => {
  fn(req, res).catch((err) => {
    console.error("[BizKhata API Error]", err?.message, err?.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });
};
var PORT = 3e3;
var DB_FILE = process.env.VERCEL === "1" ? "/tmp/bizkhata_db.json" : import_path.default.join(process.cwd(), "bizkhata_db.json");
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
  { code: "bank_account", name: "Bank Account", type: "Asset", balance: 5e5 },
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
  { code: "contractor_expense", name: "Contractor Expense", type: "Expense", balance: 0 },
  { code: "rent", name: "Rent", type: "Expense", balance: 0 },
  { code: "software_subscription", name: "Software Subscription", type: "Expense", balance: 0 },
  { code: "professional_fees", name: "Professional Fees", type: "Expense", balance: 0 },
  { code: "bank_charges", name: "Bank Charges", type: "Expense", balance: 0 },
  // Equity
  { code: "capital", name: "Capital", type: "Equity", balance: 5e5 },
  { code: "retained_earnings", name: "Retained Earnings", type: "Equity", balance: 0 }
];
var uuid = () => Math.random().toString(36).substring(2, 11);
var getInitialState = () => {
  const companyId = "co_main";
  const initialJournals = [
    {
      id: "j_init",
      date: "2026-04-01",
      reference: "Opening Balance",
      description: "Initial capital contribution in bank account",
      lines: [
        { id: uuid(), accountCode: "bank_account", accountName: "Bank Account", debit: 5e5, credit: 0 },
        { id: uuid(), accountCode: "capital", accountName: "Capital", debit: 0, credit: 5e5 }
      ]
    }
  ];
  return {
    company: {
      name: "Bizkhata Pvt Ltd",
      legalName: "Bizkhata Solutions Private Limited",
      gstin: "29AAAAA0000A1Z1",
      // Karnataka GSTIN
      pan: "AAAAA1111A",
      address: "102 tech Hub, Double Road, Indiranagar, Bengaluru",
      state: "Karnataka",
      currency: "INR",
      financialYear: "2026-2027"
    },
    role: "Owner" /* Owner */,
    customers: [
      {
        id: "cust_1",
        name: "Rajesh Khanna & Sons",
        legalName: "Rajesh Khanna Enterprises Ltd",
        gstin: "27BBBBB1111B1Z2",
        // Maharashtra GSTIN - Interstate
        pan: "BBBBB1111B",
        email: "finance@rajeshkhanna.com",
        phone: "+91-9876543210",
        billingAddress: "402 Marine Drive, Mumbai",
        state: "Maharashtra",
        paymentTerms: "Net 30",
        openingBalance: 0
      },
      {
        id: "cust_2",
        name: "Zenith Software Hub",
        legalName: "Zenith Tech Labs Karnataka Pvt Ltd",
        gstin: "29CCCCC2222C1Z4",
        // Karnataka GSTIN - Intrastate
        pan: "CCCCC2222C",
        email: "accounts@zenithhub.co.in",
        phone: "+91-9123456789",
        billingAddress: "80 Feet Road, Koramangala, Bengaluru",
        state: "Karnataka",
        paymentTerms: "Due on Receipt",
        openingBalance: 0
      }
    ],
    vendors: [
      {
        id: "vend_1",
        name: "Acme Office Supplies",
        gstin: "29DDDDD3333D1Z5",
        // Karnataka Local Vendor
        pan: "DDDDD3333D",
        msmeStatus: "Micro",
        email: "sales@acmeofficesupplies.in",
        phone: "+91-8888777766",
        address: "55 Infantry Road, Bengaluru, Karnataka",
        openingBalance: 0
      },
      {
        id: "vend_2",
        name: "CloudScale Systems LLC",
        gstin: "",
        // Unregistered/Overseas
        pan: "EEEEE4444E",
        msmeStatus: "Non-MSME",
        email: "billing@cloudscale.net",
        phone: "+1-415-555-0199",
        address: "101 California St, San Francisco, CA, USA",
        openingBalance: 0
      }
    ],
    items: [
      {
        id: "item_1",
        name: "Premium Software Architecture Consulting",
        hsnSac: "998314",
        // IT Consulting SAC
        gstRate: 18,
        unit: "Hours",
        salesRate: 5e3,
        purchaseRate: 0,
        incomeAccount: "service_income",
        expenseAccount: "contractor_expense"
      },
      {
        id: "item_2",
        name: "Paper Reams & Office Stationery Bundles",
        hsnSac: "4802",
        // Paper Products HSN
        gstRate: 12,
        unit: "Boxes",
        salesRate: 800,
        purchaseRate: 550,
        incomeAccount: "sales_income",
        expenseAccount: "office_stationery"
        // will map to salary/purchases or general expense
      }
    ],
    accounts: DEFAULT_ACCOUNTS,
    invoices: [
      {
        id: "inv_1",
        invoiceNumber: "INV-2026-001",
        customerId: "cust_1",
        customerName: "Rajesh Khanna & Sons",
        date: "2026-05-10",
        dueDate: "2026-06-10",
        items: [
          {
            id: uuid(),
            itemId: "item_1",
            name: "Premium Software Architecture Consulting",
            hsnSac: "998314",
            qty: 20,
            rate: 5e3,
            gstRate: 18,
            amount: 1e5,
            cgst: 0,
            sgst: 0,
            igst: 18e3
            // Interstate Karnataka -> Maharashtra
          }
        ],
        subtotal: 1e5,
        totalGst: 18e3,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 18e3,
        total: 118e3,
        status: "Approved",
        isProforma: false,
        paymentReceived: 0
      },
      {
        id: "inv_2",
        invoiceNumber: "INV-2026-002",
        customerId: "cust_2",
        customerName: "Zenith Software Hub",
        date: "2026-05-15",
        dueDate: "2026-05-15",
        items: [
          {
            id: uuid(),
            itemId: "item_1",
            name: "Premium Software Architecture Consulting",
            hsnSac: "998314",
            qty: 10,
            rate: 5e3,
            gstRate: 18,
            amount: 5e4,
            cgst: 4500,
            // Intrastate Karnataka -> Karnataka
            sgst: 4500,
            igst: 0
          }
        ],
        subtotal: 5e4,
        totalGst: 9e3,
        totalCgst: 4500,
        totalSgst: 4500,
        totalIgst: 0,
        total: 59e3,
        status: "Paid",
        isProforma: false,
        paymentReceived: 59e3
      }
    ],
    creditNotes: [],
    payments: [
      {
        id: "pay_1",
        receiptNumber: "PAY-2026-001",
        customerId: "cust_2",
        customerName: "Zenith Software Hub",
        date: "2026-05-16",
        amountReceived: 59e3,
        tdsDeducted: 0,
        paymentMode: "NEFT",
        referenceNumber: "N12345678X",
        bankAccount: "bank_account",
        allocations: [{ invoiceId: "inv_2", amount: 59e3 }]
      }
    ],
    expenses: [
      {
        id: "exp_1",
        date: "2026-05-12",
        vendorName: "Broadband Provider Ltd",
        category: "software_subscription",
        subtotal: 3e3,
        gstAmount: 540,
        // 18% GST
        tdsAmount: 0,
        paymentMode: "Corporate Card",
        total: 3540
      }
    ],
    bills: [
      {
        id: "bill_1",
        billNumber: "BILL-ACME-8902",
        vendorId: "vend_1",
        vendorName: "Acme Office Supplies",
        date: "2026-05-20",
        dueDate: "2026-06-20",
        items: [
          {
            itemId: "item_2",
            name: "Paper Reams & Office Stationery Bundles",
            qty: 10,
            rate: 550,
            gstRate: 12,
            amount: 5500,
            cgst: 330,
            sgst: 330,
            igst: 0
          }
        ],
        subtotal: 5500,
        totalGst: 660,
        totalCgst: 330,
        totalSgst: 330,
        totalIgst: 0,
        total: 6160,
        status: "Approved",
        paymentPaid: 0
      }
    ],
    journals: [
      // Opening
      {
        id: "j_init",
        date: "2026-04-01",
        reference: "Opening Balance",
        description: "Initial capital contribution in bank account",
        lines: [
          { id: uuid(), accountCode: "bank_account", accountName: "Bank Account", debit: 5e5, credit: 0 },
          { id: uuid(), accountCode: "capital", accountName: "Capital", debit: 0, credit: 5e5 }
        ]
      },
      // Journal for approved Invoice 1
      {
        id: "j_inv_1",
        date: "2026-05-10",
        reference: "Invoice INV-2026-001",
        description: "Services rendered to Rajesh Khanna & Sons",
        lines: [
          { id: uuid(), accountCode: "accounts_receivable", accountName: "Accounts Receivable", debit: 118e3, credit: 0 },
          { id: uuid(), accountCode: "service_income", accountName: "Service Income", debit: 0, credit: 1e5 },
          { id: uuid(), accountCode: "gst_payable", accountName: "GST Payable (IGST 18%)", debit: 0, credit: 18e3 }
        ]
      },
      // Journal for paid Invoice 2
      {
        id: "j_inv_2",
        date: "2026-05-15",
        reference: "Invoice INV-2026-002",
        description: "Services rendered to Zenith Software Hub",
        lines: [
          { id: uuid(), accountCode: "accounts_receivable", accountName: "Accounts Receivable", debit: 59e3, credit: 0 },
          { id: uuid(), accountCode: "service_income", accountName: "Service Income", debit: 0, credit: 5e4 },
          { id: uuid(), accountCode: "gst_payable", accountName: "GST Payable (CGST/SGST 9%)", debit: 0, credit: 9e3 }
        ]
      },
      // Journal for payment 1
      {
        id: "j_pay_1",
        date: "2026-05-16",
        reference: "Payment PAY-2026-001",
        description: "Payment received for ZEN-KOR-2026-002",
        lines: [
          { id: uuid(), accountCode: "bank_account", accountName: "Bank Account", debit: 59e3, credit: 0 },
          { id: uuid(), accountCode: "accounts_receivable", accountName: "Accounts Receivable", debit: 0, credit: 59e3 }
        ]
      },
      // Journal for Expense 1
      {
        id: "j_exp_1",
        date: "2026-05-12",
        reference: "Expense - Broadband Provider Ltd",
        description: "Broadband Subscription & Internet charges",
        lines: [
          { id: uuid(), accountCode: "software_subscription", accountName: "Software Subscription", debit: 3e3, credit: 0 },
          { id: uuid(), accountCode: "input_gst", accountName: "Input GST (18%)", debit: 540, credit: 0 },
          { id: uuid(), accountCode: "bank_account", accountName: "Bank Account", debit: 0, credit: 3540 }
        ]
      },
      // Journal for Bill 1 (Acme Stationery approved)
      {
        id: "j_bill_1",
        date: "2026-05-20",
        reference: "Vendor Bill BILL-ACME-8902",
        description: "Purchased office paper & stationery boxes",
        lines: [
          { id: uuid(), accountCode: "salary_expense", accountName: "General Stationeries (through Salary/Admin)", debit: 5500, credit: 0 },
          { id: uuid(), accountCode: "input_gst", accountName: "Input GST (12%)", debit: 660, credit: 0 },
          { id: uuid(), accountCode: "accounts_payable", accountName: "Accounts Payable", debit: 0, credit: 6160 }
        ]
      }
    ],
    auditLogs: [
      { id: uuid(), timestamp: (/* @__PURE__ */ new Date("2026-05-26T04:00:00Z")).toISOString(), user: "svtiger543939@gmail.com", action: "System Init", details: "Bizkhata default ledger initialized successfully with secure role access management." }
    ],
    users: [
      {
        id: "usr_default_admin",
        name: "System Administrator (MCA)",
        email: "svtiger543939@gmail.com",
        mobile: "8707401846",
        role: "Owner" /* Owner */,
        password: "Admin@123",
        isOwner: true
      },
      {
        id: "usr_aman_accountant",
        name: "Aman Sharma Accountant",
        email: "aman@bizkhata.com",
        mobile: "9112233445",
        role: "Accountant" /* Accountant */,
        password: "aman",
        isOwner: false
      }
    ],
    userSeatsLimit: 4,
    mailLogs: [],
    organizations: [
      {
        id: "org_1",
        name: "Bizkhata Pvt Ltd",
        legalName: "Bizkhata Solutions Private Limited",
        pan: "AAAAA1111A",
        gstin: "29AAAAA0000A1Z1",
        purchasedSeats: 4,
        packageType: "Standard",
        pricingMonthly: 2499,
        purchaseStatus: "Active",
        registeredEmail: "svtiger543939@gmail.com"
      },
      {
        id: "org_2",
        name: "Tata Motors SME Hub",
        legalName: "Tata Motors Enterprises Limited",
        pan: "TATA12345A",
        gstin: "27TATAM1234A1Z5",
        purchasedSeats: 12,
        packageType: "Professional",
        pricingMonthly: 5999,
        purchaseStatus: "Active",
        registeredEmail: "finance@tatamotors.com"
      },
      {
        id: "org_3",
        name: "Relio Global Accounts",
        legalName: "Relio Global Technologies Inc",
        pan: "RELI11112B",
        gstin: "29RELIO2222B1Z6",
        purchasedSeats: 25,
        packageType: "Enterprise",
        pricingMonthly: 12499,
        purchaseStatus: "Trial",
        registeredEmail: "billing@relioaccounts.glob"
      },
      {
        id: "org_4",
        name: "Unregistered Small Shop",
        legalName: "Sai Kiran Retails India",
        pan: "KIRA98765C",
        gstin: "",
        purchasedSeats: 2,
        packageType: "Standard",
        pricingMonthly: 1499,
        purchaseStatus: "Suspended",
        registeredEmail: "sai@kiranretail.in"
      }
    ]
  };
};
function withTimeout(promise, timeoutMs, errorMsg) {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
}
async function readDB() {
  try {
    if (cachedDb) {
      return cachedDb;
    }
    if (supabase) {
      try {
        console.log("Lazy pulling database state from Supabase Cloud PostgreSQL...");
        const { data, error } = await withTimeout(
          supabase.from("bizkhata_state").select("state").eq("id", "default_ledger").maybeSingle(),
          4e3,
          "Supabase select state request timed out"
        );
        if (error) {
          supabaseStatus.connected = false;
          supabaseStatus.error = { code: error.code, message: error.message, details: error.details, hint: error.hint };
          console.error("Supabase load failed inside readDB:", error);
        } else if (data && data.state && Object.keys(data.state).length > 0) {
          supabaseStatus.connected = true;
          supabaseStatus.error = null;
          cachedDb = data.state;
          console.log("Successfully restored database state from Supabase Cloud inside readDB!");
          return cachedDb;
        } else {
          supabaseStatus.connected = true;
          supabaseStatus.error = null;
          console.log("No existing state found in Supabase. Initializing default ledger state...");
          const init = getInitialState();
          cachedDb = init;
          await withTimeout(
            supabase.from("bizkhata_state").upsert({ id: "default_ledger", state: init }),
            4e3,
            "Supabase init upsert request timed out"
          );
          return cachedDb;
        }
      } catch (err) {
        supabaseStatus.connected = false;
        supabaseStatus.error = { message: err?.message || String(err) };
        console.error("Lazy Supabase pull failed, falling back to local file system:", err);
      }
    }
    if (!import_fs.default.existsSync(DB_FILE)) {
      const init = getInitialState();
      try {
        import_fs.default.writeFileSync(DB_FILE, JSON.stringify(init, null, 2), "utf8");
      } catch (writeErr) {
        console.warn("Read-only filesystem detected on initial write, caching state in memory.");
      }
      cachedDb = init;
      return init;
    }
    const raw = import_fs.default.readFileSync(DB_FILE, "utf8");
    cachedDb = JSON.parse(raw);
    return cachedDb;
  } catch (err) {
    console.error("Error reading db.json, returning default:", err);
    const fallback = getInitialState();
    cachedDb = fallback;
    return fallback;
  }
}
async function writeDB(state) {
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
    cachedDb = state;
    try {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
    } catch (writeErr) {
    }
    if (supabase) {
      console.log("Synchronously pushing updated ledger state to Supabase Cloud...");
      try {
        const { error } = await withTimeout(
          supabase.from("bizkhata_state").upsert({ id: "default_ledger", state }),
          4e3,
          "Supabase push state request timed out"
        );
        if (error) {
          supabaseStatus.connected = false;
          supabaseStatus.error = { code: error.code, message: error.message };
          console.error("Sync write to Supabase failed during writeDB:", error);
        } else {
          supabaseStatus.connected = true;
          supabaseStatus.error = null;
          console.log("Database state successfully synchronized with Supabase postgres database.");
        }
      } catch (err) {
        supabaseStatus.connected = false;
        supabaseStatus.error = { message: err?.message || String(err) };
        console.error("Sync write to Supabase timed out or failed:", err);
      }
    }
  } catch (err) {
    console.error("Error writing db.json inside writeDB:", err);
  }
}
app.get("/api/db", asyncRoute(async (req, res) => {
  const db = await readDB();
  res.json(db);
}));
app.get("/api/supabase-status", (req, res) => {
  res.json(supabaseStatus);
});
app.post("/api/users/add", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db, newUser, password });
}));
app.post("/api/user-seats/update", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/company", asyncRoute(async (req, res) => {
  const db = await readDB();
  db.company = { ...db.company, ...req.body };
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: req.body.user || "User",
    action: "Company Config Setup",
    details: `Updated company details to ${db.company.name}`
  });
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/customers", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/vendors", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/items", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
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
  return {
    id: `j_inv_${invoice.id}`,
    date: invoice.date,
    reference,
    description,
    lines
  };
}
app.post("/api/invoices", asyncRoute(async (req, res) => {
  console.log("[/api/invoices] Body keys:", Object.keys(req.body || {}));
  console.log("[/api/invoices] isProforma:", req.body?.isProforma, "customerId:", req.body?.customerId);
  const db = await readDB();
  console.log("[/api/invoices] DB loaded, invoices count:", db?.invoices?.length);
  const invoiceData = req.body;
  const user = req.body.authorUser || "User";
  if (!invoiceData.invoiceNumber) {
    const lastNum = db.invoices.length;
    invoiceData.invoiceNumber = `INV-2026-${String(lastNum + 1).padStart(3, "0")}`;
  }
  const existingIndex = db.invoices.findIndex((inv) => inv.id === invoiceData.id);
  if (existingIndex >= 0) {
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
    action: invoiceData.isProforma ? "Save Proforma Invoice" : "Create Tax Invoice",
    details: `Generated standard billing number ${invoiceData.invoiceNumber} for client \u20B9${invoiceData.total}`
  });
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/payments", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/credit-notes", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/expenses", asyncRoute(async (req, res) => {
  const db = await readDB();
  const exp = req.body;
  const user = req.body.authorUser || "User";
  const existingIndex = db.expenses.findIndex((e) => e.id === exp.id);
  if (existingIndex >= 0) {
    db.expenses[existingIndex] = { ...db.expenses[existingIndex], ...exp };
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
      credit: exp.subtotal + exp.gstAmount - exp.tdsAmount
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/bills", asyncRoute(async (req, res) => {
  const db = await readDB();
  const bill = req.body;
  const user = req.body.authorUser || "User";
  const existingIndex = db.bills.findIndex((b) => b.id === bill.id);
  if (existingIndex >= 0) {
    db.bills[existingIndex] = { ...db.bills[existingIndex], ...bill };
    db.journals = db.journals.filter((j) => j.id !== `j_bill_${bill.id}`);
  } else {
    bill.id = "bill_" + uuid();
    if (!bill.billNumber) {
      bill.billNumber = `BILL-DUE-${String(db.bills.length + 1).padStart(3, "0")}`;
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
        accountCode: "salary_expense",
        // Defaulting vendor stationery or expense representation
        accountName: "General Admin/Purchased Expense",
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/bills/pay", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/journals", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/users/remove", asyncRoute(async (req, res) => {
  const db = await readDB();
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
  if (targetUser.email === "svtiger543939@gmail.com" || targetUser.isOwner) {
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
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/owner/organization/add", asyncRoute(async (req, res) => {
  const db = await readDB();
  const { name, legalName, pan, gstin, purchasedSeats, packageType, pricingMonthly, purchaseStatus, registeredEmail } = req.body;
  if (!name || !legalName || !registeredEmail) {
    return res.status(400).json({ error: "Missing required organization parameters (Name, Legal Name, and Registered Email are mandatory)." });
  }
  if (!db.organizations) db.organizations = [];
  const newOrg = {
    id: `org_${uuid()}`,
    name,
    legalName,
    pan: pan || "PFXYZ1234F",
    gstin: gstin || "",
    purchasedSeats: Number(purchasedSeats || 4),
    packageType: packageType || "Standard",
    pricingMonthly: Number(pricingMonthly || 2499),
    purchaseStatus: purchaseStatus || "Active",
    registeredEmail: registeredEmail.toLowerCase()
  };
  db.organizations.push(newOrg);
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: "Platform SaaS Owner",
    action: "Register Organization Purchased",
    details: `Enrolled new customer organization '${name}' licensed for ${purchasedSeats} corporate user seats.`
  });
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/owner/organization/update", asyncRoute(async (req, res) => {
  const db = await readDB();
  const { id, name, legalName, pan, gstin, purchasedSeats, packageType, pricingMonthly, purchaseStatus, registeredEmail } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing required parameter: id" });
  }
  if (!db.organizations) db.organizations = [];
  const orgIdx = db.organizations.findIndex((o) => o.id === id);
  if (orgIdx === -1) {
    return res.status(404).json({ error: "Organization record not found." });
  }
  const existing = db.organizations[orgIdx];
  const updatedOrg = {
    ...existing,
    name: name || existing.name,
    legalName: legalName || existing.legalName,
    pan: pan !== void 0 ? pan : existing.pan,
    gstin: gstin !== void 0 ? gstin : existing.gstin,
    purchasedSeats: purchasedSeats !== void 0 ? Number(purchasedSeats) : existing.purchasedSeats,
    packageType: packageType || existing.packageType,
    pricingMonthly: pricingMonthly !== void 0 ? Number(pricingMonthly) : existing.pricingMonthly,
    purchaseStatus: purchaseStatus || existing.purchaseStatus,
    registeredEmail: registeredEmail ? registeredEmail.toLowerCase() : existing.registeredEmail
  };
  db.organizations[orgIdx] = updatedOrg;
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: "Platform SaaS Owner",
    action: "Update Organization Profile",
    details: `Updated subscription parameters for '${updatedOrg.name}' (License: ${updatedOrg.purchasedSeats} total seats).`
  });
  if (updatedOrg.name.toLowerCase() === db.company.name.toLowerCase()) {
    db.userSeatsLimit = updatedOrg.purchasedSeats;
  }
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/owner/organization/delete", asyncRoute(async (req, res) => {
  const db = await readDB();
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing organization identification: id" });
  }
  if (!db.organizations) db.organizations = [];
  const orgIdx = db.organizations.findIndex((o) => o.id === id);
  if (orgIdx === -1) {
    return res.status(404).json({ error: "Organization record not found." });
  }
  const deletedOrg = db.organizations[orgIdx];
  db.organizations.splice(orgIdx, 1);
  db.auditLogs.unshift({
    id: uuid(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user: "Platform SaaS Owner",
    action: "Remove Organization Track",
    details: `Suspended cloud tenant tracing for organization '${deletedOrg.name}' (${deletedOrg.registeredEmail}).`
  });
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/role", asyncRoute(async (req, res) => {
  const db = await readDB();
  db.role = req.body.role;
  await writeDB(db);
  res.json({ success: true, db });
}));
app.post("/api/reset", asyncRoute(async (req, res) => {
  const fresh = getInitialState();
  await writeDB(fresh);
  res.json(fresh);
}));
app.post("/api/ai/invoice-create", asyncRoute(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "No prompts provided." });
  }
  if (!ai) {
    return res.json({
      fallback: true,
      message: "Please configure your GEMINI_API_KEY in the Settings tab to enjoy real-time AI extract. Here is a simulated parse based on common client details:",
      data: {
        customerName: "Rajesh Khanna & Sons",
        items: [
          { name: "Consulting Consulting Rate Hours", qty: 10, rate: 5e3, gstRate: 18 }
        ]
      }
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
}));
app.post("/api/ai/reconcile", asyncRoute(async (req, res) => {
  const { bankFeed } = req.body;
  if (!bankFeed) {
    return res.status(400).json({ error: "Feed prompt is required." });
  }
  const db = await readDB();
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
}));
app.post("/api/ai/categorize", asyncRoute(async (req, res) => {
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
}));
app.post("/api/ai/explain-report", asyncRoute(async (req, res) => {
  const { reportType, data } = req.body;
  if (!ai) {
    return res.json({
      explanation: "### Bizkhata Al Financial Analyst Summary\nTo get personalized AI summaries and forecast charts, please activate the GEMINI_API_KEY in the Secrets panel.\n\nFrom the heuristic view:\n1. **Tax compliance** looks good, with CGST and SGST correctly structured between Interstate and Intrastate registers.\n2. **Bank Reserves** are stable, supported by a \u20B95,00,000 opening capital injection."
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
}));
app.post("/api/ai/generate-reminder", asyncRoute(async (req, res) => {
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
}));
if (process.env.VERCEL !== "1") {
  (async () => {
    readDB().then((db) => {
      cachedDb = db;
      console.log("Pre-primed database cache memory successfully on cold start.");
    }).catch((err) => {
      console.error("Failed to pre-prime database cache, using default initial state:", err);
      cachedDb = getInitialState();
    });
    if (process.env.NODE_ENV !== "production") {
      const vite = await (0, import_vite.createServer)({
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
} else {
  readDB().then((db) => {
    cachedDb = db;
    console.log("Vercel cold-start: Supabase state pre-loaded.");
  }).catch((err) => {
    console.error("Vercel cold-start: failed to pre-load state:", err);
    cachedDb = getInitialState();
  });
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
