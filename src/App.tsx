import React, { useState, useEffect } from "react";
import { DatabaseState, UserRole, CompanyInfo, Invoice, Payment, Vendor, Expense, Bill, Item } from "./types.js";

// Components Imports
import Dashboard from "./components/Dashboard.jsx";
import Invoices from "./components/Invoices.jsx";
import Payments from "./components/Payments.jsx";
import Purchases from "./components/Purchases.jsx";
import Accounting from "./components/Accounting.jsx";
import Reports from "./components/Reports.jsx";
import AIAssistant from "./components/AIAssistant.jsx";
import CompanySetup from "./components/CompanySetup.jsx";

// Lucide Icons
import { 
  LayoutDashboard, 
  FileCheck2, 
  Users, 
  DollarSign, 
  BookOpen, 
  FolderLock, 
  Building, 
  Sparkles, 
  Check, 
  Search, 
  ChevronRight, 
  ChevronDown,
  LogOut, 
  AlertTriangle,
  History,
  ShieldAlert,
  Clock,
  Mail,
  X,
  Plus,
  Package,
  CreditCard,
  NotebookTabs,
  ShoppingBag,
  Bell,
  Settings,
  HelpCircle,
  Play,
  Pause,
  Trash2,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function App() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "items" | "sales" | "purchases" | "payments" | "accounting" | "reports" | "ai" | "settings" | "banking" | "timetracking" | "users">("dashboard");
  const [loading, setLoading] = useState(true);

  // Secure user login state persistence logic
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const cache = localStorage.getItem("bizkhata_session_v1");
      return cache ? JSON.parse(cache) : null;
    } catch {
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState("");

  // Zoho multi-user recruitment structures
  const [newlyInvitedUser, setNewlyInvitedUser] = useState<any>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMobile, setInviteMobile] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.Viewer);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Seats threshold states
  const [customSeatsVal, setCustomSeatsVal] = useState<number>(5);
  const [seatsLoading, setSeatsLoading] = useState(false);

  // Corporate signup registers
  const [signupCompany, setSignupCompany] = useState("");
  const [signupLegal, setSignupLegal] = useState("");
  const [signupAdminName, setSignupAdminName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupSeatsCount, setSignupSeatsCount] = useState<number>(5);

  // Sub-tabs routing configurations
  const [saleSubTab, setSaleSubTab] = useState<"tax" | "proforma" | "notes" | "customers">("tax");
  const [purchasesSubTab, setPurchasesSubTab] = useState<"vendors" | "expenses" | "bills">("vendors");
  const [accountingSubTab, setAccountingSubTab] = useState<"accounts" | "journals">("accounts");

  // Sidebar fold configurations
  const [salesExpanded, setSalesExpanded] = useState(true);
  const [purchasesExpanded, setPurchasesExpanded] = useState(true);
  const [accountantExpanded, setAccountantExpanded] = useState(true);

  // Global Global Search value Mock
  const [globalSearch, setGlobalSearch] = useState("");

  // Running stopwatch state for Time Tracking module
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [trackingCustomer, setTrackingCustomer] = useState("");
  const [trackingItem, setTrackingItem] = useState("item_1");
  const [trackingNotes, setTrackingNotes] = useState("");
  const [loggedTimes, setLoggedTimes] = useState<Array<{
    id: string;
    customer: string;
    item: string;
    notes: string;
    duration: string;
    date: string;
  }>>([
    {
      id: "time_1",
      customer: "Zenith Tech Labs Karnataka Pvt Ltd",
      item: "Premium Software Architecture Consulting",
      notes: "Sprint Planning & MIS double-entry reviews under standard GST standards",
      duration: "02 hr 15 min",
      date: "2026-05-25"
    }
  ]);

  // AI Dialog state Overlay
  const [aiReportExplanation, setAiReportExplanation] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [reminderEmail, setReminderEmail] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; connected: boolean; error: any } | null>(null);

  // Quick action panel
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  const fetchSupabaseStatus = async () => {
    try {
      const r = await fetch("/api/supabase-status");
      if (r.ok) {
        const data = await r.json();
        setSupabaseStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch supabase status", e);
    }
  };

  const createClientFallbackState = (): DatabaseState => {
    return {
      company: {
        name: "Bizkhata Pvt Ltd",
        legalName: "Bizkhata Solutions Private Limited",
        gstin: "29AAAAA0000A1Z1", // Karnataka GSTIN
        pan: "AAAAA1111A",
        address: "102 tech Hub, Double Road, Indiranagar, Bengaluru",
        state: "Karnataka",
        currency: "INR",
        financialYear: "2026-2027"
      },
      role: UserRole.Owner,
      customers: [
        {
          id: "cust_1",
          name: "Rajesh Khanna & Sons",
          legalName: "Rajesh Khanna Enterprises Ltd",
          gstin: "27BBBBB1111B1Z2", // Maharashtra GSTIN - Interstate
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
          gstin: "29CCCCC2222C1Z4", // Karnataka GSTIN - Intrastate
          pan: "CCCCC2222C",
          email: "accounts@zenithhub.co.in",
          phone: "+91-9123456789",
          billingAddress: "80 Feet Road, Koramangala, Bengaluru",
          state: "Karnataka",
          paymentTerms: "Due on Receipt",
          openingBalance: 0
        }
      ],
      vendors: [],
      items: [],
      accounts: [
        { code: "bank_account", name: "Bank Account", type: "Asset", balance: 500000 },
        { code: "capital", name: "Capital", type: "Equity", balance: 500000 }
      ],
      invoices: [],
      creditNotes: [],
      payments: [],
      expenses: [],
      bills: [],
      journals: [
        {
          id: "j_init",
          date: "2026-04-01",
          reference: "Opening Balance",
          description: "Initial capital contribution in bank account",
          lines: [
            { id: "line_init_1", accountCode: "bank_account", accountName: "Bank Account", debit: 500000, credit: 0 },
            { id: "line_init_2", accountCode: "capital", accountName: "Capital", debit: 0, credit: 500000 }
          ]
        }
      ],
      auditLogs: [
        { id: "audit_init", timestamp: new Date().toISOString(), user: "svtiger543939@gmail.com", action: "DATABASE_INITIALIZATION", details: "Client-side fallback initialized safely" }
      ],
      users: [
        { id: "usr_default_admin", name: "System Administrator (MCA)", email: "svtiger543939@gmail.com", mobile: "8707401846", role: UserRole.Owner, password: "Admin@123" }
      ],
      userSeatsLimit: 5,
      mailLogs: []
    };
  };

  const loadClientFallback = () => {
    try {
      const cached = localStorage.getItem("bizkhata_cached_db");
      if (cached) {
        setDb(JSON.parse(cached));
        console.log("Successfully loaded database state from offline client-side localStorage cache.");
      } else {
        const fallback = createClientFallbackState();
        setDb(fallback);
        localStorage.setItem("bizkhata_cached_db", JSON.stringify(fallback));
        console.log("No offline client-side cache found. Initialized default fallback state.");
      }
    } catch (err) {
      console.error("Critical fallback state failure:", err);
    }
  };

  const fetchDB = async () => {
    try {
      const r = await fetch("/api/db");
      if (r.ok) {
        const data = await r.json();
        setDb(data);
        localStorage.setItem("bizkhata_cached_db", JSON.stringify(data));
      } else {
        console.warn("Backend API returned non-ok status. Attempting client-side local cache fallback...");
        loadClientFallback();
      }
    } catch (err) {
      console.error("Failed to load Bizkhata parameters.", err);
      loadClientFallback();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDB();
    fetchSupabaseStatus();
  }, []);

  // Update localized seats slider threshold on fresh database load
  useEffect(() => {
    if (db?.userSeatsLimit) {
      setCustomSeatsVal(db.userSeatsLimit);
    }
  }, [db?.userSeatsLimit]);

  // Time-tracker countdown interval
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  if (loading || !db) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-700 font-sans gap-3.5 select-none leading-relaxed">
        <Sparkles className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="tracking-widest uppercase font-bold text-[10px] text-slate-500">Loading your Bizkhata corporate accounting workspace...</div>
      </div>
    );
  }

  // Secure Authentication Handlers
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!loginEmail || !loginPassword) {
      setAuthError("Email and Password are required to sign in.");
      return;
    }

    const currentUsers = db?.users || [];
    // User credentials search block
    const foundUser = currentUsers.find(
      u => u.email.toLowerCase() === loginEmail.trim().toLowerCase() && u.password === loginPassword.trim()
    );

    if (foundUser) {
      localStorage.setItem("bizkhata_session_v1", JSON.stringify(foundUser));
      setCurrentUser(foundUser);
      setLoginEmail("");
      setLoginPassword("");
    } else if (loginEmail.trim().toLowerCase() === "svtiger543939@gmail.com" && loginPassword.trim() === "Admin@123") {
      // Immediate Admin fail-safe credentials
      const adminObj = {
        id: "usr_default_admin",
        name: "System Administrator (MCA)",
        email: "svtiger543939@gmail.com",
        mobile: "8707401846",
        role: UserRole.Owner,
        isOwner: true
      };
      localStorage.setItem("bizkhata_session_v1", JSON.stringify(adminObj));
      setCurrentUser(adminObj);
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setAuthError("Invalid credentials. Please verify your email and password.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!signupCompany || !signupAdminName || !signupEmail || !signupMobile || !signupPassword) {
      setAuthError("All registration fields (Email, Mobile, Name & Company) are mandatory.");
      return;
    }

    const requestedSeats = Number(signupSeatsCount) || 5;

    // Create the primary administrator account
    const ownerUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 11),
      name: signupAdminName,
      email: signupEmail.trim().toLowerCase(),
      mobile: signupMobile,
      role: UserRole.Owner,
      password: signupPassword,
      isOwner: true
    };

    const newCompany = {
      name: signupCompany,
      legalName: signupLegal || (signupCompany + " Pvt Ltd"),
      gstin: "29AAAAA" + Math.floor(1000 + Math.random() * 9000) + "A1Z1",
      pan: "AAAAA" + Math.floor(1000 + Math.random() * 9000) + "A",
      address: "Corporate Headquarters Suite, Karnataka, India",
      state: "Karnataka",
      currency: "INR",
      financialYear: "2026-2027"
    };

    // Update state memory
    const updatedDb = {
      ...db,
      company: newCompany,
      role: UserRole.Owner,
      users: [ownerUser],
      userSeatsLimit: requestedSeats,
      mailLogs: [
        {
          id: "mail_welcome",
          to: signupEmail.toLowerCase(),
          subject: "Corporate Ledgers Registered - Zoho Books & Bizkhata Billing Core",
          body: `Hi ${signupAdminName},\n\nYour fresh billing instance has been successfully deployed for ${signupCompany} with ${requestedSeats} user seats capacity.\n\nEnjoy the ledger!\n\nBizkhata Central.`,
          timestamp: new Date().toISOString()
        }
      ]
    } as any;

    try {
      // Sync configurations with Node backend express layers
      await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany)
      });

      await fetch("/api/user-seats/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatsLimit: requestedSeats, author: signupEmail })
      });

      await fetch("/api/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupAdminName,
          email: signupEmail,
          mobile: signupMobile,
          role: UserRole.Owner,
          author: "Self System Init"
        })
      });

      await fetchDB();
    } catch (err) {
      console.error("Failed to sync structural registration server-side:", err);
    }

    setDb(updatedDb);
    localStorage.setItem("bizkhata_session_v1", JSON.stringify(ownerUser));
    setCurrentUser(ownerUser);

    setSignupCompany("");
    setSignupLegal("");
    setSignupAdminName("");
    setSignupEmail("");
    setSignupMobile("");
    setSignupPassword("");
    setSignupSeatsCount(5);
    setAuthView("signin");
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !inviteMobile) {
      alert("Name, Email, and Mobile are mandatory parameters.");
      return;
    }

    setInviteLoading(true);

    try {
      const response = await fetch("/api/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          mobile: inviteMobile,
          role: inviteRole,
          author: activeUserEmail
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        alert(errData.error || "Failed to resource sub-user seat.");
        return;
      }

      const resJson = await response.json();
      setNewlyInvitedUser({
        name: inviteName,
        email: inviteEmail,
        password: resJson.password
      });

      setInviteName("");
      setInviteEmail("");
      setInviteMobile("");
      setInviteRole(UserRole.Viewer);
      await fetchDB();
    } catch (error) {
      console.error(error);
      alert("Encountered connection errors dispatching user.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateCorporateSeats = async () => {
    if (!customSeatsVal || isNaN(customSeatsVal) || customSeatsVal < 1) {
      alert("Capacity slots must be a valid positive integer value.");
      return;
    }
    setSeatsLoading(true);
    try {
      const response = await fetch("/api/user-seats/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatsLimit: Number(customSeatsVal),
          author: activeUserEmail
        })
      });

      if (response.ok) {
        await fetchDB();
        alert(`Corporate capacity limit successfully updated to ${customSeatsVal} seats!`);
      } else {
        alert("Server failed to scale seat capacity.");
      }
    } catch (error) {
      console.error(error);
      alert("Communications error setting capacities.");
    } finally {
      setSeatsLoading(false);
    }
  };

  // API Call Brokers
  const handleUpdateCompany = async (companyData: CompanyInfo) => {
    const r = await fetch("/api/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(companyData)
    });
    if (r.ok) await fetchDB();
  };

  const handleUpdateRole = async (role: UserRole) => {
    const r = await fetch("/api/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    if (r.ok) await fetchDB();
  };

  const handleResetDB = async () => {
    const r = await fetch("/api/reset", { method: "POST" });
    if (r.ok) {
      await fetchDB();
      setActiveTab("dashboard");
    }
  };

  const handleSaveInvoice = async (invoicePayload: any) => {
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoicePayload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Ledger Validation Warning: ${err.error || "Cannot write post"}`);
    }
  };

  const handleIssueCreditNote = async (payload: any) => {
    const r = await fetch("/api/credit-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Ledger Validation Warning: ${err.error || "Cannot write balance update"}`);
    }
  };

  const handleRecordPayment = async (payload: any) => {
    const r = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Ledger Validation Warning: ${err.error || "Cannot match indices"}`);
    }
  };

  const handleAddVendor = async (vPayload: any) => {
    const r = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vPayload)
    });
    if (r.ok) await fetchDB();
  };

  const handleAddCustomer = async (cPayload: any) => {
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cPayload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Customer Validation Warning: ${err.error || "Cannot save customer"}`);
    }
  };

  const handleAddExpense = async (ePayload: any) => {
    const r = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ePayload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Out of Balance: ${err.error}`);
    }
  };

  const handleAddBill = async (bPayload: any) => {
    const r = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bPayload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Validation mismatch: ${err.error}`);
    }
  };

  const handlePayBill = async (bPayPayload: any) => {
    const r = await fetch("/api/bills/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bPayPayload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Payment Posting Failed: ${err.error}`);
    }
  };

  // AI OCR integration
  const handleParseRawInvoiceTextAPI = async (rawText: string) => {
    const r = await fetch("/api/ai/parse-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText })
    });
    if (r.ok) {
      return await r.json();
    } else {
      throw new Error("Cannot parse");
    }
  };

  const handleReconcileTransactionAPI = async (payload: any) => {
    const r = await fetch("/api/ai/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Failed: ${err.error}`);
    }
  };

  const handleTriggerConversationalCopilotAPI = async (query: string): Promise<string> => {
    const r = await fetch("/api/ai/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    if (r.ok) {
      const res = await r.json();
      return res.reply;
    } else {
      return "Unable to consult. Verify API access keys.";
    }
  };

  const handleUniversalAITrigger = async (feature: string, payload?: any) => {
    if (feature === "explain-report") {
      setLoadingAI(true);
      setAiReportExplanation("");
      try {
        const response = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const content = await response.json();
          setAiReportExplanation(content.explanation);
        } else {
          setAiReportExplanation("Failed to prompt CA-analyst module. Check GEMINI_API_KEY limits.");
        }
      } catch {
        setAiReportExplanation("Failed to connect.");
      }
      setLoadingAI(false);
    } else if (feature === "generate-reminder") {
      setReminderLoading(true);
      setReminderEmail(null);
      try {
        const response = await fetch("/api/ai/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice: payload })
        });
        if (response.ok) {
          const data = await response.json();
          setReminderEmail(data.emailTemplate);
        } else {
          alert("Could not generate reminder draft using server-side Gemini.");
        }
      } catch {
        alert("Verification check failed.");
      }
      setReminderLoading(false);
    } else if (feature === "categorize") {
      alert("AI Auto-classification completed! Category mapped to 'Software Subscription & Internet' based on AWS metadata heuristics.");
    }
  };

  // Format Stopwatch numbers
  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  // Submit dynamic timesheet
  const handleLogStopwatch = () => {
    if (timerSeconds <= 0 && !trackingNotes) {
      alert("Please track some time first!");
      return;
    }
    const durationStr = `${Math.floor(timerSeconds / 3600)} hr ${Math.floor((timerSeconds % 3600) / 60)} min`;
    const selectedCust = trackingCustomer || db.customers[0]?.legalName || "General Customer";
    const selectedItm = db.items.find(i => i.id === trackingItem)?.name || "Consulting Hours";
    
    const newLog = {
      id: "time_" + Date.now(),
      customer: selectedCust,
      item: selectedItm,
      notes: trackingNotes || "No notes logged",
      duration: durationStr,
      date: new Date().toISOString().split('T')[0]
    };
    
    setLoggedTimes([newLog, ...loggedTimes]);
    setTimerSeconds(0);
    setTimerRunning(false);
    setTrackingNotes("");
    alert("Timesheet successfully logged under Customer Registers!");
  };

  const activeRole = currentUser?.role || db?.role || UserRole.Owner;
  const activeUserEmail = currentUser?.email || "svtiger543939@gmail.com";
  const activeUserName = currentUser?.name || "System Administrator";

  const isTabBlockedForRole = (tabName: string) => {
    if (activeRole === UserRole.BillingUser && (tabName === "reports" || tabName === "accounting")) {
      return true;
    }
    return false;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0E111E] text-slate-100 flex flex-col justify-center items-center p-4 md:p-8 font-sans selection:bg-blue-650 selection:text-white leading-relaxed relative">
        <div className="absolute inset-x-0 top-0 h-[300px] bg-radial-gradient from-blue-900/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="w-full max-w-md space-y-6">
          {/* Main Logo Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 border border-emerald-400 font-black text-white text-xl shadow-lg mb-2">
              BK
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-sans sm:text-3xl">Bizkhata Enterprise</h1>
            <p className="text-xs text-slate-400">Zoho-style Corporate Ledger & Multi-user Workspace Gate</p>
          </div>

          {/* Admin Credentials Alert Plate */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 space-y-1.5 flex flex-col font-sans">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[9.5px]">🔑 Standard Administrative Access (Copy to Login):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10.5px] mt-1 text-amber-200">
              <div>Email: <span className="text-white font-bold select-all bg-amber-500/15 px-1 rounded">svtiger543939@gmail.com</span></div>
              <div>Password: <span className="text-white font-bold select-all bg-amber-500/15 px-1 rounded">Admin@123</span></div>
              <div className="sm:col-span-2">Registered Mobile: <span className="text-white font-bold select-all bg-amber-500/15 px-1 tracking-wide rounded">8707401846</span></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
              *To simulate a multi-tenant corporate owner subscription purchase, select the <strong>"Register Organization"</strong> panel tab below.
            </p>
          </div>

          {/* Authentication Panel Box */}
          <div className="bg-[#1A1E2E] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Tab Toggles */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                onClick={() => { setAuthView("signin"); setAuthError(""); }}
                className={`flex-1 py-3 text-center font-bold tracking-wide uppercase transition ${
                  authView === "signin" 
                    ? "bg-[#141724] text-[#00D779] border-b-2 border-emerald-500" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In Portal
              </button>
              <button
                onClick={() => { setAuthView("signup"); setAuthError(""); }}
                className={`flex-1 py-3 text-center font-bold tracking-wide uppercase transition ${
                  authView === "signup" 
                    ? "bg-[#141724] text-[#00D779] border-b-2 border-emerald-500" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Register Organization
              </button>
            </div>

            <div className="p-6">
              {authError && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 text-xs text-rose-300 font-sans flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 animate-ping" />
                  <span>{authError}</span>
                </div>
              )}

              {authView === "signin" ? (
                /* ----- SIGN IN FORM ----- */
                <form onSubmit={handleSignIn} className="space-y-4 text-xs font-sans">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. svtiger543939@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg p-3 text-white transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">MFA Credentials Password</label>
                      <button type="button" onClick={() => alert("Please consult your org administrator to retrieve generated sub-user passcodes.")} className="text-[#FFBE00] text-[10.5px] hover:underline font-semibold">
                        Retrieve Passcode?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg p-3 text-white transition-all text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg tracking-wide uppercase transition shadow-md cursor-pointer text-center text-xs mt-2"
                  >
                    Authenticate Security Session
                  </button>
                </form>
              ) : (
                /* ----- SIGN UP / PURCHASE FORM ----- */
                <form onSubmit={handleSignUp} className="space-y-4 text-xs font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Company / Org Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Widgets Private Ltd"
                        value={signupCompany}
                        onChange={(e) => setSignupCompany(e.target.value)}
                        className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-lg p-3 text-white text-xs transition"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Legal Trade Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Widgets Pvt Ltd"
                        value={signupLegal}
                        onChange={(e) => setSignupLegal(e.target.value)}
                        className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-lg p-3 text-white text-xs transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Senior Admin / Owner Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Khanna"
                      value={signupAdminName}
                      onChange={(e) => setSignupAdminName(e.target.value)}
                      className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-lg p-3 text-white text-xs transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Corporate Email (SSO)</label>
                      <input
                        type="email"
                        required
                        placeholder="owner@acme.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-lg p-3 text-white text-xs transition"
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mobile Number (MCA Link)</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={signupMobile}
                        onChange={(e) => setSignupMobile(e.target.value)}
                        className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-lg p-3 text-white text-xs transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Corporate Access Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Create account password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full bg-[#141724] placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 rounded-lg p-3 text-white text-xs transition"
                    />
                  </div>

                  <div className="space-y-1.5 bg-[#141724]/60 p-4 border border-slate-800 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10.5px] font-bold text-slate-300 uppercase tracking-wide">💼 Licensed Seats:</span>
                      <span className="text-xl font-black text-amber-400 font-mono">{signupSeatsCount} Users</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                      Configure capacity slots. Default subscription matches 5 corporate seats.
                    </p>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={signupSeatsCount}
                      onChange={(e) => setSignupSeatsCount(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                      <span>1 User (Single Seat)</span>
                      <span>5 Seats (Subscribed)</span>
                      <span>30 Users Max Enterprise</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#00D779] hover:bg-emerald-400 text-slate-950 font-extrabold py-3 px-4 rounded-lg tracking-wide uppercase transition shadow-md cursor-pointer text-center text-xs mt-2"
                  >
                    Purchase License & Setup Ledger
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Secure gateway trust labels */}
          <div className="text-center text-[10px] text-slate-500">
            Zoho Books Multi-tenant Core Engine • Ministry of Corporate Affairs (MCA), Govt of India.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="bizkhata-main-container" className="h-screen flex flex-col overflow-hidden bg-slate-50 font-sans text-slate-700 select-all">
      
      {/* ----------------- BIZKHATA TOP GLOBAL BAR ----------------- */}
      <header id="bizkhata-global-header" className="h-12 bg-[#1C202F] flex items-center justify-between px-4 text-white shrink-0 select-none z-30">
        
        {/* Left: Bizkhata logo stack */}
        <div className="flex items-center gap-2">
          {/* Logo symbol */}
          <div className="flex justify-center items-center w-6 h-6 rounded-md bg-emerald-600 border border-emerald-500 shadow-sm font-black text-white text-[11px]">
            B
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-white text-[15px] leading-none tracking-tight">Bizkhata</span>
            <span className="text-[14px] font-bold text-[#00D779]">Workspace</span>
          </div>
        </div>

        {/* Middle: Integrated search box */}
        <div className="flex-1 max-w-xl mx-8 relative">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search in Customers ( / )"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-[#2E3345] text-slate-200 placeholder-slate-400 text-xs rounded border-0 pl-9 pr-4 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#FFBE00] transition-all"
            />
          </div>
        </div>

        {/* Right: Quick buttons and profile avatar */}
        <div className="flex items-center gap-4 text-slate-300">
          
          {/* Organization Switcher */}
          <div className="hidden md:flex items-center gap-1.5 cursor-pointer text-xs text-slate-100 hover:text-white font-semibold">
            <span className="max-w-[150px] truncate">{db.company.legalName || "Thrymr Software"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Quick Plus Action */}
          <div className="relative">
            <button 
              onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
              className="bg-[#006EE5] hover:bg-[#0060C7] text-white p-1.5 rounded transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title="Quick Create"
            >
              <Plus className="w-3.5 h-3.5 font-black text-white" />
            </button>

            {showQuickAddMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-slate-200 shadow-xl text-slate-800 text-xs z-50 p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1">Quick Add</p>
                <hr className="border-slate-100" />
                <button 
                  onClick={() => { setActiveTab("sales"); setSaleSubTab("tax"); setShowQuickAddMenu(false); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-50 hover:text-blue-600 rounded flex items-center gap-2"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-slate-500" /> Tax Invoice
                </button>
                <button 
                  onClick={() => { setActiveTab("purchases"); setPurchasesSubTab("bills"); setShowQuickAddMenu(false); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-50 hover:text-blue-600 rounded flex items-center gap-2"
                >
                  <NotebookTabs className="w-3.5 h-3.5 text-slate-500" /> Vendor Bill
                </button>
                <button 
                  onClick={() => { setActiveTab("purchases"); setPurchasesSubTab("expenses"); setShowQuickAddMenu(false); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-50 hover:text-blue-600 rounded flex items-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Expense Logs
                </button>
                <button 
                  onClick={() => { setActiveTab("timetracking"); setShowQuickAddMenu(false); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-50 hover:text-blue-600 rounded flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Start Track Timer
                </button>
              </div>
            )}
          </div>

          {/* Quick Info contacts */}
          <button onClick={() => alert("Helpline: 18005726671 available Mon-Fri.")} className="hover:text-white transition-colors" title="Get Help">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Notify Bell */}
          <button className="relative hover:text-white transition-colors" title="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* Settings */}
          <button onClick={() => setActiveTab("settings")} className="hover:text-white transition-colors" title="Settings">
            <Settings className="w-4 h-4" />
          </button>

          {/* User profile avatar info layout */}
          <div className="flex items-center gap-3 border-l border-slate-700 pl-3 select-none">
            <div className="w-7 h-7 bg-emerald-500 border border-emerald-600 text-white font-extrabold text-xs rounded-full flex items-center justify-center uppercase shadow-sm">
              {activeUserName ? activeUserName[0] : "A"}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-[10.5px] font-bold text-slate-100 leading-none truncate max-w-[110px]">{activeUserName}</span>
              <span className="text-[9px] text-[#00D779] font-medium mt-0.5 leading-none">{activeRole}</span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("bizkhata_session_v1");
                setCurrentUser(null);
                setActiveTab("dashboard");
              }}
              className="p-1 hover:text-white text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 hover:text-rose-300" />
            </button>
          </div>

        </div>
      </header>
      
      {/* ----------------- SUB HEADER & CONTENT CONTAINER ----------------- */}
      <div id="zoho-main-body" className="flex-1 flex overflow-hidden">
        
        {/* LEFT COMPREHENSIVE SIDEBAR PANEL */}
        <aside id="zoho-left-sidebar" className="w-[230px] bg-[#F3F4F7] border-r border-slate-200 shrink-0 flex flex-col justify-between select-none overflow-y-auto">
          
          <div className="py-2.5">
            <nav className="space-y-0.5">
              
              {/* Home Menu */}
              <button
                id="sidebar-home"
                onClick={() => { setActiveTab("dashboard"); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>Home (Dashboard)</span>
              </button>

              {/* Items Menu */}
              <button
                id="sidebar-items"
                onClick={() => { setActiveTab("items"); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  activeTab === "items"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Package className="w-4 h-4 text-slate-500" />
                <span>Items Catalog</span>
              </button>

              {/* ----------------- Sales Folder Accordion ----------------- */}
              <div>
                <button
                  onClick={() => setSalesExpanded(!salesExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100/70 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <FileCheck2 className="w-4 h-4 text-slate-500" />
                    <span>Sales</span>
                  </span>
                  {salesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {salesExpanded && (
                  <div className="bg-[#EBECF2]/40 pl-8 space-y-0.5 py-0.5">
                    
                    {/* Estimates / proforma invoices */}
                    <button
                      onClick={() => { setActiveTab("sales"); setSaleSubTab("proforma"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "sales" && saleSubTab === "proforma"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Estimates
                    </button>

                    {/* Clients Directory */}
                    <button
                      onClick={() => { setActiveTab("sales"); setSaleSubTab("customers"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "sales" && saleSubTab === "customers"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Clients Directory
                    </button>

                    {/* Tax invoices */}
                    <button
                      onClick={() => { setActiveTab("sales"); setSaleSubTab("tax"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "sales" && saleSubTab === "tax"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Invoices
                    </button>

                    {/* Payments received */}
                    <button
                      onClick={() => { setActiveTab("payments"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "payments"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Payments Received
                    </button>

                    {/* Credit notes */}
                    <button
                      onClick={() => { setActiveTab("sales"); setSaleSubTab("notes"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "sales" && saleSubTab === "notes"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Credit Notes
                    </button>
                    
                  </div>
                )}
              </div>

              {/* ----------------- Purchases Folder Accordion ----------------- */}
              <div>
                <button
                  onClick={() => setPurchasesExpanded(!purchasesExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100/70 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-slate-500" />
                    <span>Purchases</span>
                  </span>
                  {purchasesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {purchasesExpanded && (
                  <div className="bg-[#EBECF2]/40 pl-8 space-y-0.5 py-0.5">
                    
                    {/* Vendors */}
                    <button
                      onClick={() => { setActiveTab("purchases"); setPurchasesSubTab("vendors"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "purchases" && purchasesSubTab === "vendors"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Vendors
                    </button>

                    {/* Expenses */}
                    <button
                      onClick={() => { setActiveTab("purchases"); setPurchasesSubTab("expenses"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "purchases" && purchasesSubTab === "expenses"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Expenses
                    </button>

                    {/* Bills */}
                    <button
                      onClick={() => { setActiveTab("purchases"); setPurchasesSubTab("bills"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "purchases" && purchasesSubTab === "bills"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Bills
                    </button>
                    
                  </div>
                )}
              </div>

              {/* Time Tracking stopwatch Menu */}
              <button
                id="sidebar-time"
                onClick={() => { setActiveTab("timetracking"); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  activeTab === "timetracking"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Time Tracking</span>
              </button>

              {/* Banking Statement passbook Menu */}
              <button
                id="sidebar-banking"
                onClick={() => { setActiveTab("banking"); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  activeTab === "banking"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Banking Passbook</span>
              </button>

              {/* ----------------- Accountant Folder Accordion ----------------- */}
              <div>
                <button
                  onClick={() => setAccountantExpanded(!accountantExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100/70 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    <span>Accountant Desk</span>
                  </span>
                  {accountantExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {accountantExpanded && (
                  <div className="bg-[#EBECF2]/40 pl-8 space-y-0.5 py-0.5">
                    
                    {/* Chart of Accounts */}
                    <button
                      onClick={() => { setActiveTab("accounting"); setAccountingSubTab("accounts"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "accounting" && accountingSubTab === "accounts"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Chart of Accounts
                    </button>

                    {/* Journals */}
                    <button
                      onClick={() => { setActiveTab("accounting"); setAccountingSubTab("journals"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "accounting" && accountingSubTab === "journals"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Manual Journals
                    </button>
                    
                  </div>
                )}
              </div>

              {/* Reports Menu */}
              <button
                id="sidebar-reports"
                disabled={isTabBlockedForRole("reports")}
                onClick={() => { setActiveTab("reports"); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  isTabBlockedForRole("reports")
                    ? "opacity-35 cursor-not-allowed select-none bg-transparent"
                    : activeTab === "reports"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <FolderLock className="w-4 h-4 text-slate-500" />
                <span>Reports Center</span>
              </button>

              {/* Assist Workspace Menu */}
              <button
                id="sidebar-ai"
                onClick={() => { setActiveTab("ai"); }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  activeTab === "ai"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs animate-pulse"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  <span>AI Copilot Smart Desk</span>
                </span>
                <span className="text-[7.5px] font-bold bg-violet-600 text-white rounded px-1 tracking-widest uppercase">
                  Active
                </span>
              </button>

              {/* Zoho Multi-User Seat Registry */}
              <button
                id="sidebar-users"
                onClick={() => { setActiveTab("users"); }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                  activeTab === "users"
                    ? "bg-[#E2EAFC] text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs"
                    : "text-slate-650 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Users & Roles Desk</span>
                </span>
                <span className="text-[7.5px] font-black bg-blue-600 text-white rounded px-1.5 py-0.5 tracking-wide">
                  {db?.users?.length || 2} / {db?.userSeatsLimit || 5} Seats
                </span>
              </button>

            </nav>
          </div>

          {/* System settings and current status bar */}
          <div className="p-3 border-t border-slate-200 bg-[#EBECF2]/40 space-y-1 text-[10.5px]">
            <p className="text-slate-400 font-medium">FINANCIAL INSTANCE:</p>
            <p className="font-mono text-slate-800 font-bold uppercase truncate">{db.company.name}</p>
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] mt-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>GSTR BALANCED G-TRAC</span>
            </div>
            
            {supabaseStatus && supabaseStatus.configured && (
              <div className={`flex items-center gap-1.5 text-[9.5px] font-bold ${supabaseStatus.connected ? 'text-emerald-700' : 'text-amber-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${supabaseStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                <span>{supabaseStatus.connected ? 'SUPABASE CLOUD SYNCED' : 'SUPABASE fallback LOCAL'}</span>
              </div>
            )}
          </div>

        </aside>

        {/* COMPREHENSIVE MAIN VIEW CONTAINER WORKSPACE */}
        <main id="zoho-main-viewport" className="flex-1 overflow-y-auto flex flex-col justify-between bg-white relative">
          
          {/* Actual content section */}
          <div id="zoho-viewport-content" className="p-6 md:p-8 flex-1 max-w-7xl mx-auto w-full">
            
            {/* Supabase Status Banner */}
            {supabaseStatus && supabaseStatus.configured && !supabaseStatus.connected && (
              <div className="mb-6 bg-amber-50/70 border border-amber-300 rounded-xl p-5 space-y-3 shadow-xs font-sans">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 px-1.5 bg-amber-100/80 rounded text-amber-800 font-bold text-[9.5px] uppercase font-mono border border-amber-250">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Supabase Sync Offline</span>
                  </div>
                  <h3 className="text-xs font-bold text-amber-900">
                    Database State Mirroring Table "bizkhata_state" Not Initialized
                  </h3>
                </div>
                <p className="text-[11.5px] text-amber-800 leading-relaxed">
                  You have configured real-time Database connection parameters for <strong>Supabase PostgreSQL Cloud</strong>. However, the system is falling back to safe local session storage because the necessary database table is missing or restricted by default Row-Level Security rules.
                </p>
                <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 space-y-2.5 mt-2 shadow-inner">
                  <p className="font-mono text-[10.5px] font-bold text-amber-400">⚡ How to complete your Backend Deployment (in 30 seconds):</p>
                  <ol className="list-decimal list-inside text-[10.5px] space-y-1.5 text-slate-300">
                    <li>Open your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline text-sky-400 font-bold hover:text-sky-300">Supabase Project Console</a>.</li>
                    <li>Click on the <strong>SQL Editor</strong> tab on the left sidebar, and select "New query".</li>
                    <li>Open the file <span className="font-mono text-amber-300">/supabase_schema.sql</span> (Option A) from your source code repository, copy the SQL scripts, paste them into the code field and click <strong>"Run"</strong>.</li>
                  </ol>
                </div>
                {supabaseStatus.error && (
                  <div className="bg-amber-100/40 p-2.5 rounded border border-amber-200 font-mono text-[10px] text-amber-900 overflow-x-auto max-h-[80px]">
                    <strong>API Diagnostics Error Object:</strong> {JSON.stringify(supabaseStatus.error)}
                  </div>
                )}
              </div>
            )}

            {/* Dashboard tab router */}
            {activeTab === "dashboard" && (
              <Dashboard 
                db={db}
                onNavigate={(view: any) => {
                  if (view === "invoices") {
                    setActiveTab("sales");
                    setSaleSubTab("tax");
                  } else if (view === "purchases") {
                    setActiveTab("purchases");
                    setPurchasesSubTab("bills");
                  } else if (view === "settings") {
                     setActiveTab("settings");
                  } else if (view === "ai") {
                     setActiveTab("ai");
                  } else {
                    setActiveTab(view);
                  }
                }}
                onTriggerAI={handleUniversalAITrigger} 
              />
            )}

            {/* Invoices and Estimate bills segment */}
            {activeTab === "sales" && (
              <Invoices 
                db={db} 
                onSaveInvoice={handleSaveInvoice}
                onIssueCreditNote={handleIssueCreditNote}
                onAddCustomer={handleAddCustomer}
                onTriggerAI={handleUniversalAITrigger}
                userRole={activeRole}
                defaultTab={saleSubTab}
              />
            )}

            {/* Purchases bills & supplier spend tracking */}
            {activeTab === "purchases" && (
              <Purchases 
                db={db} 
                onAddVendor={handleAddVendor}
                onAddExpense={handleAddExpense}
                onAddBill={handleAddBill}
                onPayBill={handlePayBill}
                onTriggerAI={handleUniversalAITrigger}
                defaultTab={purchasesSubTab}
              />
            )}

            {/* Payments received list */}
            {activeTab === "payments" && (
              <Payments 
                db={db} 
                onRecordPayment={handleRecordPayment}
              />
            )}

            {/* double entry charts audits */}
            {activeTab === "accounting" && (
              <Accounting 
                db={db} 
                defaultTab={accountingSubTab}
              />
            )}

            {/* static MIS charts & dynamic summaries audits */}
            {activeTab === "reports" && (
              <Reports 
                db={db} 
                onTriggerAI={handleUniversalAITrigger}
                isLoadingAI={loadingAI}
                aiExplanation={aiReportExplanation}
              />
            )}

            {/* Gemini assistant dashboard OCR parsing */}
            {activeTab === "ai" && (
              <AIAssistant 
                db={db} 
                onParseInvoice={handleParseRawInvoiceTextAPI}
                onReconcileTransaction={handleReconcileTransactionAPI}
                onTriggerCopilot={handleTriggerConversationalCopilotAPI}
              />
            )}

            {/* system parameters configuration */}
            {activeTab === "settings" && (
              <CompanySetup 
                db={db}
                onUpdateCompany={handleUpdateCompany}
                onUpdateRole={handleUpdateRole}
                onResetDB={handleResetDB}
                currentUserEmail={activeUserEmail}
              />
            )}

            {/* ----- CUSTOM TAB 1: Items Catalog ----- */}
            {activeTab === "items" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Items and Services Inventory</h2>
                    <p className="text-xs text-slate-500">Track standard consulting fees, sales rates, and GST tax percentages.</p>
                  </div>
                  <button 
                    onClick={() => {
                      alert("To customize or load more items, add a Tax Invoice line or configure standard billing values under configuration keys.");
                    }}
                    className="bg-[#006EE5] hover:bg-[#0060C7] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> New Item Catalog
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Unique Items</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{db.items.length}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Standard GST Brackets</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">18% CGST/SGST</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Customers Mapped</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{db.customers.length}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Vendors Tracked</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{db.vendors.length}</p>
                  </div>
                </div>

                {/* Table display */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3.5">Item/Service Name</th>
                        <th className="p-3.5">SAC / HSN Code</th>
                        <th className="p-3.5">Billing Rate</th>
                        <th className="p-3.5 flex items-center gap-1">GST Tax <span className="text-[9px] bg-blue-100 text-blue-800 rounded px-1">%</span></th>
                        <th className="p-3.5">Unit</th>
                        <th className="p-3.5">Mapping Income Acc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {db.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-semibold text-slate-900">{item.name}</td>
                          <td className="p-3.5 font-mono text-slate-600">{item.hsnSac || "998311"}</td>
                          <td className="p-3.5 font-mono text-slate-800 font-semibold">₹ {Number(item.salesRate).toLocaleString()} / hr</td>
                          <td className="p-3.5 font-mono text-slate-700">{item.gstRate || 18}%</td>
                          <td className="p-3.5 text-slate-500">{item.unit || "Hours"}</td>
                          <td className="p-3.5 text-slate-600">
                            <span className="bg-slate-100 px-2.5 py-1 rounded text-[10.5px] border border-slate-200">
                              {item.incomeAccount || "Service Income"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ----- CUSTOM TAB 2: Banking statement ----- */}
            {activeTab === "banking" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Virtual Banking Passbook Ledger</h2>
                    <p className="text-xs text-slate-500">Live reconciliation of capital balance sheet transfers with double-entry ledgers.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="p-1 px-3 text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                      ● Bank Acc Reconciled
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-tr from-blue-700 to-indigo-800 text-white p-6 rounded-xl space-y-3 shadow-md relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-14 text-white font-extrabold translate-x-5 translate-y-5">
                      <CreditCard className="w-48 h-48" />
                    </div>
                    <p className="text-[10px] font-bold tracking-widest text-slate-200 uppercase">Primary Bank Account</p>
                    <h3 className="text-2xl font-black font-mono tracking-tight">
                      ₹ {(db.accounts.find(a => a.code === "bank_account")?.balance || 500000).toLocaleString('en-IN')}
                    </h3>
                    <p className="text-[10px] text-slate-300">Journal Asset: #bank_account • Local IFSC HDFC00012</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Income Cash Flow Inflow</p>
                      <h4 className="text-xl font-bold text-emerald-600 font-mono mt-2">
                        + ₹ {db.payments.reduce((sum, p) => sum + p.amountReceived, 0).toLocaleString()}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500">From registered client payment receipts</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Suppliers Expense Outflow</p>
                      <h4 className="text-xl font-bold text-rose-500 font-mono mt-2">
                        - ₹ {(db.expenses.reduce((sum, e) => sum + e.total, 0) + db.bills.filter(b => b.status === "Paid").reduce((sum, b) => sum + b.total, 0)).toLocaleString()}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500">From verified MSME vendor bills and card outflows</p>
                  </div>
                </div>

                {/* Bank transactions table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Passbook ledger transactions audit trail</h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3">Reference Date</th>
                          <th className="p-3">Audit Reference code</th>
                          <th className="p-3">Transaction Description</th>
                          <th className="p-3">Direct Inflow</th>
                          <th className="p-3">Direct Outflow</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans font-medium text-slate-700">
                        {/* Opening entry */}
                        <tr>
                          <td className="p-3">2026-04-01</td>
                          <td className="p-3 font-mono text-slate-400">#j_init</td>
                          <td className="p-3">Opening contribution capital to reserves</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">+ ₹ 5,00,000</td>
                          <td className="p-3 text-slate-400">-</td>
                          <td className="p-3"><span className="text-[9.5px] font-bold bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-200">Reconciled</span></td>
                        </tr>
                        {/* Dynamic Payments inflow */}
                        {db.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3">{p.date}</td>
                            <td className="p-3 font-mono text-slate-500">{p.receiptNumber}</td>
                            <td className="p-3 text-slate-800">Payment credit from customer {p.customerName}</td>
                            <td className="p-3 font-mono text-emerald-600 font-bold">+ ₹ {p.amountReceived.toLocaleString()}</td>
                            <td className="p-3 text-slate-400">-</td>
                            <td className="p-3"><span className="text-[9.5px] font-bold bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-200">Reconciled</span></td>
                          </tr>
                        ))}
                        {/* Dynamic Expenses / Paid Bills */}
                        {db.expenses.map((e) => (
                          <tr key={e.id}>
                            <td className="p-3">{e.date}</td>
                            <td className="p-3 font-mono text-slate-500">Exp-{e.id}</td>
                            <td className="p-3 text-slate-800">Spend Outflow of {e.vendorName || "General Vendor"} ({e.category})</td>
                            <td className="p-3 text-slate-400">-</td>
                            <td className="p-3 font-mono text-rose-500 font-bold">- ₹ {e.total.toLocaleString()}</td>
                            <td className="p-3"><span className="text-[9.5px] font-bold bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-200">Reconciled</span></td>
                          </tr>
                        ))}
                        {db.bills.filter(b => b.status === "Paid").map((b) => (
                          <tr key={b.id}>
                            <td className="p-3">{b.date}</td>
                            <td className="p-3 font-mono text-slate-500">{b.billNumber}</td>
                            <td className="p-3 text-slate-800">Bill paid to vendor {b.vendorName}</td>
                            <td className="p-3 text-slate-400">-</td>
                            <td className="p-3 font-mono text-rose-500 font-bold">- ₹ {b.total.toLocaleString()}</td>
                            <td className="p-3"><span className="text-[9.5px] font-bold bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-200">Reconciled</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ----- CUSTOM TAB 3: Stopwatch Time Tracking ----- */}
            {activeTab === "timetracking" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Timesheets Hours Tracker</h2>
                    <p className="text-xs text-slate-500">Track and log billable consulting and software audits hours directly to customer accounts.</p>
                  </div>
                  <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-spin text-blue-600" /> Standard Bizkhata Stopwatch engine
                  </div>
                </div>

                {/* Live Stopwatch Form Row */}
                <div className="bg-[#1C202F] text-white p-6 rounded-xl shadow-lg border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Digital Live Dial */}
                  <div className="md:col-span-3 text-center md:text-left space-y-1 md:border-r md:border-slate-800 pr-0 md:pr-6">
                    <p className="text-[9px] uppercase tracking-widest text-[#FFBE00] font-black">Live stopwatch ticker</p>
                    <div className="text-4xl font-extrabold font-mono tracking-widest text-white py-1">
                      {formatStopwatch(timerSeconds)}
                    </div>
                    <div className="flex gap-2 justify-center md:justify-start">
                      {timerRunning ? (
                        <button 
                          onClick={() => setTimerRunning(false)}
                          className="px-3 py-1 text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-1 transition-all"
                        >
                          <Pause className="w-3 h-3 text-white" /> Pause
                        </button>
                      ) : (
                        <button 
                          onClick={() => setTimerRunning(true)}
                          className="px-3 py-1 text-[11px] font-bold bg-[#FFBE00] hover:bg-[#E5AA00] text-slate-900 rounded flex items-center gap-1 transition-all"
                        >
                          <Play className="w-3 h-3 text-slate-900 fill-slate-900" /> Start Timer
                        </button>
                      )}
                      
                      <button 
                        onClick={() => { setTimerSeconds(0); setTimerRunning(false); }}
                        className="px-3 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Customer and billing select parameters */}
                  <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block">Customer Account Name</label>
                      <select 
                        value={trackingCustomer} 
                        onChange={(e) => setTrackingCustomer(e.target.value)}
                        className="bg-[#2E3345] border-0 text-white text-xs p-2 rounded w-full focus:outline-none"
                      >
                        <option value="">Select Customer Account...</option>
                        {db.customers.map(c => (
                          <option key={c.id} value={c.legalName}>{c.legalName} ({c.state})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block">Inventory Service Item</label>
                      <select 
                        value={trackingItem} 
                        onChange={(e) => setTrackingItem(e.target.value)}
                        className="bg-[#2E3345] border-0 text-white text-xs p-2 rounded w-full focus:outline-none"
                      >
                        {db.items.map(i => (
                          <option key={i.id} value={i.id}>{i.name} (₹{i.salesRate}/hr)</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block">Brief billable notes / description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Sprint design & legal GST filing checks..."
                        value={trackingNotes} 
                        onChange={(e) => setTrackingNotes(e.target.value)}
                        className="bg-[#2E3345] border-0 text-white text-xs p-2 rounded w-full placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Add action log button */}
                  <div className="md:col-span-2 text-center md:text-right">
                    <button 
                      onClick={handleLogStopwatch}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-lg block w-full transition shadow-md cursor-pointer text-center"
                    >
                      Log Billable Time
                    </button>
                  </div>

                </div>

                {/* List entries layout */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Timesheet Logs history</h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3.5">Logged Date</th>
                          <th className="p-3.5">Assigned Customer</th>
                          <th className="p-3.5">Service Task</th>
                          <th className="p-3.5">Working Narrative Details</th>
                          <th className="p-3.5">Total Duration</th>
                          <th className="p-3.5">Tax compliance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {loggedTimes.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-mono text-slate-500">{log.date}</td>
                            <td className="p-3.5 font-bold text-slate-800">{log.customer}</td>
                            <td className="p-3.5 text-slate-600 font-semibold">{log.item}</td>
                            <td className="p-3.5 text-slate-500 text-xs italic">"{log.notes}"</td>
                            <td className="p-3.5 font-mono text-blue-700 font-extrabold">{log.duration}</td>
                            <td className="p-3.5">
                              <span className="text-[9.5px] font-bold bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-200">
                                Billable Link Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ----- CUSTOM TAB 4: Zoho Multi-User Roles & Seating Panel ----- */}
            {activeTab === "users" && (
              <div className="space-y-6 animate-fade-in font-sans">
                
                {/* Visual Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Corporate Seats & Team Directory</h2>
                    <p className="text-xs text-slate-500">Configure corporate user authorization, invite accountants, and scale licensed seats (Zoho Books model).</p>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold bg-[#E2EAFC] text-blue-800 rounded px-2.5 py-1 tracking-wider border border-blue-200">
                     Symmetric SSO Engine Active
                  </span>
                </div>

                {/* Dashboard Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Subscribed Seats</p>
                    <div className="text-2xl font-black text-slate-805 font-mono">
                      {db?.userSeatsLimit || 5} <span className="text-xs font-medium text-slate-400">Users</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-emerald-500 h-full transition duration-300" 
                        style={{ width: `${Math.min(100, (((db?.users?.length || 2) / (db?.userSeatsLimit || 5)) * 100))}%` }} 
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Occupied Seats</p>
                    <div className="text-2xl font-black text-slate-805 text-emerald-600 font-mono">
                      {db?.users?.length || 2} <span className="text-xs font-medium text-slate-400">Active</span>
                    </div>
                    <p className="text-[9px] text-slate-505 mt-1">Configured account credentials</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Vacant Slots</p>
                    <div className="text-2xl font-black text-slate-805 text-blue-600 font-mono">
                      {Math.max(0, (db?.userSeatsLimit || 5) - (db?.users?.length || 2))} <span className="text-xs font-medium text-slate-400 text-slate-500">Free</span>
                    </div>
                    <p className="text-[9px] text-slate-505 mt-1">Ready for sub-tenant invite</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <p className="text-[9px] font-extrabold text-[#00D779] uppercase tracking-wider">Session Actor</p>
                      <p className="text-[11.5px] font-bold truncate max-w-[130px]" title={activeUserName}>{activeUserName}</p>
                      <p className="text-[9.5px] text-slate-400 uppercase tracking-widest font-mono text-[8px]">{activeRole}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 font-bold text-[#00D779] flex items-center justify-center uppercase text-xs">
                      {activeUserName ? activeUserName[0] : "A"}
                    </div>
                  </div>
                </div>

                {/* Newly Invited Success Alert Modal Overlay inside tab */}
                {newlyInvitedUser && (
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl space-y-3 shadow-sm animate-fade-in text-xs">
                    <div className="flex justify-between items-center text-emerald-900 font-bold">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10.5px]">
                        📬 Simulated SSO Password Multi-tenant Invitation Dispatched!
                      </span>
                      <button 
                        onClick={() => setNewlyInvitedUser(null)}
                        className="text-emerald-500 hover:text-emerald-900 bg-emerald-100/50 p-1 rounded-full w-5 h-5 flex items-center justify-center font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="text-emerald-800 space-y-2 leading-relaxed text-xs">
                      <p>
                        An email containing setup instructions and secure access codes has been successfully sent to <strong className="underline select-all">{newlyInvitedUser.email}</strong>.
                      </p>
                      <div className="bg-white border border-emerald-100 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans mt-3 shadow-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Configured Name:</span>
                          <span className="font-semibold text-slate-800">{newlyInvitedUser.name}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Login Email address:</span>
                          <span className="font-semibold text-slate-800 select-all">{newlyInvitedUser.email}</span>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                          <span className="text-[9.5px] uppercase font-mono font-bold text-amber-700 block">Received SSO Password:</span>
                          <span className="font-mono text-xs font-black text-slate-900 select-all">{newlyInvitedUser.password}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50/50 border border-slate-200/50 p-2 rounded">
                        *Tip: You may copy the password above, click <strong>"Sign Out"</strong> at the header, and immediately log in as the newly created user to verify their system permissions!
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary Panel Action Cards: Upgrade Seating AND Invite Forms */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: Invite Form Panel */}
                  <div className="lg:col-span-12 xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                      Invite Corporate Professional (Zohobooks Flow)
                    </h3>
                    
                    <form onSubmit={handleInviteUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Member Full Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Anand Mahindra"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded p-2 text-xs text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Linked Mobile No. (MCA Link) *</label>
                        <input 
                          type="tel" 
                          required
                          placeholder="e.g. 9811223344"
                          value={inviteMobile}
                          onChange={(e) => setInviteMobile(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded p-2 text-xs text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">SSO Email Address *</label>
                        <input 
                          type="email" 
                          required
                          placeholder="e.g. anand@mahindra.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded p-2 text-xs text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">System Domain Access Role *</label>
                        <select 
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded p-2 text-xs text-slate-800 font-medium"
                        >
                          <option value={UserRole.Viewer}>Viewer (Read-only GST status)</option>
                          <option value={UserRole.Accountant}>Accountant (Double-entry Books)</option>
                          <option value={UserRole.BillingUser}>BillingUser (Sales desk - blocked reports)</option>
                          <option value={UserRole.Owner}>Owner (Unlimited controls)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={inviteLoading}
                          className="bg-blue-650 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition tracking-wide text-xs cursor-pointer shadow-sm"
                        >
                          {inviteLoading ? "Mailing password..." : "Invite Member & Generate Credentials"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* RIGHT: Upgrade Limit slider simulator */}
                  <div className="lg:col-span-12 xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                      Adjust Subscribed Seats Capacity on-demand
                    </h3>
                    
                    <div className="space-y-3 text-xs font-sans">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-605">Current Capacity Limit:</span>
                        <span className="text-lg font-black text-blue-700 font-mono">{db?.userSeatsLimit || 5} User Seats</span>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Set Capacity Slider:</label>
                        <input 
                          type="range"
                          min="1"
                          max="25"
                          value={customSeatsVal}
                          onChange={(e) => setCustomSeatsVal(Number(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer h-1 rounded-sm bg-slate-200"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-1">
                          <span>1 Seat</span>
                          <span> {customSeatsVal} Selected Slots</span>
                          <span>25 Seats Maximum</span>
                        </div>
                      </div>

                      <button
                        onClick={handleUpdateCorporateSeats}
                        disabled={seatsLoading}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 p-3 rounded-lg w-full text-center transition text-xs flex justify-center items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {seatsLoading ? "Updating quota config..." : "Simulate Licensing Change (Scale)"}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Team Directory Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Corporate Team Directory</h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3.5">System User Name</th>
                          <th className="p-3.5">SSO Email Address</th>
                          <th className="p-3.5">Registered Mobile</th>
                          <th className="p-3.5">Assigned Domain Role</th>
                          <th className="p-3.5">System Status</th>
                          <th className="p-3.5">Assigned Access Password</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {(db?.users || [
                          { id: "usr_default_admin", name: "System Administrator (MCA)", email: "svtiger543939@gmail.com", mobile: "8707401846", role: UserRole.Owner, password: "Admin@123" }
                        ]).map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5 font-bold text-slate-800">{u.name}</td>
                            <td className="p-3.5 font-mono text-slate-600 select-all">{u.email}</td>
                            <td className="p-3.5 font-mono text-slate-500">{u.mobile}</td>
                            <td className="p-3.5">
                              <span className={`text-[9px] font-bold uppercase rounded px-2 py-0.5 border ${
                                u.role === UserRole.Owner 
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : u.role === UserRole.Accountant
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : u.role === UserRole.BillingUser
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-slate-50 text-slate-650 border-slate-200"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[10.5px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SSO Synchronous
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded select-all border border-slate-200">
                                {u.password || "Admin@123 (Default)"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulated Outbound SMTP Mailbox (Zoho Connect) */}
                <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl space-y-4 shadow-lg border border-slate-800 font-sans leading-relaxed">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#00D779] uppercase tracking-widest flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-[#00D779]" /> Outbound SMTP Mailbox Simulation Desk (Zoho Connect Link)
                      </h3>
                      <p className="text-[10px] text-slate-400">Verifying real-time secure registration and single-sign-on password emails dispatched by Zoho infrastructure.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const clearedDb = { ...db, mailLogs: [] };
                        setDb(clearedDb);
                        alert("Simulated SMTP memory records successfully cleared!");
                      }} 
                      className="text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1 text-[10px] font-semibold tracking-wide border border-slate-800 rounded"
                    >
                      Empty Outbox List
                    </button>
                  </div>

                  {(!db?.mailLogs || db.mailLogs.length === 0) ? (
                    <div className="p-6 text-center text-slate-500 font-mono text-[10.5px]">
                      No outgoing email records logged. Try creating a sub-user above to review real-time password dispatching mock mails!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                      {db.mailLogs.map((mail) => (
                        <div key={mail.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-sans text-xs space-y-2 mt-1">
                          <div className="flex justify-between items-center text-[10.5px] border-b border-slate-800 pb-2">
                            <div>
                              To: <strong className="text-emerald-400 select-all">{mail.to}</strong>
                            </div>
                            <span className="font-mono text-slate-500 text-[10px]">{mail.timestamp ? new Date(mail.timestamp).toLocaleTimeString() : 'Just now'}</span>
                          </div>
                          <div className="font-semibold text-slate-202">
                            Subject: {mail.subject}
                          </div>
                          <pre className="whitespace-pre-line text-slate-400 font-sans text-[11px] leading-relaxed select-text mt-1 p-3 bg-slate-900 border border-slate-850 rounded-lg max-h-[200px] overflow-y-auto">
                            {mail.body}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Solid humble compliance footer */}
          <footer className="p-4 border-t border-slate-200 text-center text-[10.5px] text-slate-550 select-none bg-slate-50">
            Bizkhata Ledger Synchronization Engine • GSTIN Interstater compliance compliant with Ministry of Corporate Affairs, India.
          </footer>

        </main>
      </div>

      {/* ----------------- AI DOCKET REMINDERS OVERLAYS ----------------- */}
      {reminderLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-[#2C2C24] rounded-2xl p-6 text-center space-y-3 font-mono text-xs max-w-sm shadow-xl animate-bounce">
            <Sparkles className="mx-auto w-6 h-6 animate-spin text-[#5A5A40]" />
            <p className="font-semibold">Gemini AI is generating payment reminders...</p>
          </div>
        </div>
      )}

      {reminderEmail && (
        <div id="ai-reminder-email-overlay" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xl space-y-4 text-xs font-sans text-slate-800 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-250 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 animate-bounce" />
                AI Generated Payment Reminder Email
              </h3>
              <button onClick={() => setReminderEmail(null)} className="text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-4 border border-slate-200 rounded-xl leading-relaxed select-all font-sans">
              <span className="text-[10px] uppercase font-bold font-mono text-slate-400 block mb-2">Subject Draft:</span>
              <p className="whitespace-pre-line text-slate-850 font-medium">{reminderEmail}</p>
            </div>

            <p className="text-[10px] text-slate-505 font-mono uppercase tracking-wide">
              *Copy this draft and send to the customer's email or registered account.
            </p>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setReminderEmail(null)}
                className="bg-blue-650 hover:bg-blue-700 font-bold text-white text-xs px-5 py-2 rounded-lg"
              >
                Dismiss Email Draft
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
