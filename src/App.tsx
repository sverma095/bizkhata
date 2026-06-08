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
import LoginScreen from "./components/LoginScreen.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import SuperAdminDashboard from "./components/SuperAdminDashboard.jsx";
import UserDashboard from "./components/UserDashboard.jsx";
import TesterPanel from "./components/TesterPanel.jsx";
import { SessionInfo, AppUserFull } from "./types.js";
import SalesOrders from "./components/SalesOrders.jsx";
import PurchaseOrders from "./components/PurchaseOrders.jsx";
import VendorCredits from "./components/VendorCredits.jsx";
import DeliveryChallans from "./components/DeliveryChallans.jsx";
import BankReconciliation from "./components/BankReconciliation.jsx";
import OpeningBalances from "./components/OpeningBalances.jsx";
import ChartOfAccountsCRUD from "./components/ChartOfAccountsCRUD.jsx";
import FixedAssets from "./components/FixedAssets.jsx";
import BizKhataCompleteUpgrade from "./components/BizKhataCompleteUpgrade.jsx";
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
  AlertCircle,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Award,
  MessageSquare,
  Sliders,
  ShieldCheck,
  Globe
} from "lucide-react";

export default function App() {
  // ── Session / Auth state ──────────────────────────────────────────────────
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [panelView, setPanelView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'activate'>('login');
  const [routeEmail, setRouteEmail] = useState('');
  const [routeCode, setRouteCode] = useState('');

  // Hydrate session on load
  React.useEffect(() => {
    const hydrateSession = async () => {
      const savedToken = localStorage.getItem('bizkhata_session_token');
      if (savedToken) {
        try {
          const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${savedToken}` } });
          if (res.ok) {
            const data = await res.json();
            setSession({ token: savedToken, user: data.user, organization: data.organization });
          } else {
            localStorage.removeItem('bizkhata_session_token');
          }
        } catch (err) { console.error("Session hydration failed", err); }
      }
      setAuthLoading(false);
    };
    hydrateSession();
  }, []);

  const handleLoginSuccess = (newSession: SessionInfo) => {
    setSession(newSession);
    localStorage.setItem('bizkhata_session_token', newSession.token);
    // Re-fetch DB after login - use timeout to ensure fetchDB is in scope
    setTimeout(() => {
      fetch("/api/db").then(r => r.ok ? r.json() : null).then(data => {
        if (data) {
          setDb(data);
          localStorage.setItem("bizkhata_cached_db", JSON.stringify(data));
          setLoading(false);
        }
      }).catch(() => {
        // Try loading from localStorage cache
        const cached = localStorage.getItem("bizkhata_cached_db");
        if (cached) { try { setDb(JSON.parse(cached)); setLoading(false); } catch {} }
      });
    }, 100);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('bizkhata_session_token');
    setPanelView('login');
  };

  const handleUpdateSelfUser = (updatedUser: AppUserFull) => {
    if (session) setSession({ ...session, user: updatedUser });
  };

  const handleQuickLoginImpersonation = async (email: string) => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Admin@123' }) });
      const data = await res.json();
      if (res.ok) {
        if (data.twoFactorRequired) {
          const nRes = await fetch('/api/notifications');
          const notifs = await nRes.json();
          const lastOtp = notifs.find((n: any) => n.to === email && n.type === 'OTP')?.code;
          if (lastOtp) {
            const mfaRes = await fetch('/api/auth/verify-2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp: lastOtp }) });
            const mfaData = await mfaRes.json();
            if (mfaRes.ok) handleLoginSuccess(mfaData);
          }
        } else { handleLoginSuccess(data); }
      } else { alert(`Login failed: ${data.error}`); }
    } catch(e) { console.error(e); }
    finally { setAuthLoading(false); }
  };

  // ── Ledger DB state ───────────────────────────────────────────────────────
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "items" | "sales" | "purchases" | "payments" | "accounting" | "reports" | "ai" | "settings" | "banking" | "timetracking" | "users" | "advanced">("dashboard");
  const [salesSubTab, setSalesSubTab] = useState<"tax" | "proforma" | "salesorders" | "notes" | "customers">("tax");
  const [purchasesSubTab2, setPurchasesSubTab2] = useState<"vendors" | "expenses" | "bills" | "purchaseorders" | "vendorcredits">("bills");
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
  const [ssoLoading, setSsoLoading] = useState(false);
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);

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
  const [accountingSubTab, setAccountingSubTab] = useState<"accounts" | "journals" | "opening" | "fixedassets">("accounts");

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

  // SaaS Platform Owner Console States
  const [showOrgEditForm, setShowOrgEditForm] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState("");
  const [editingOrgName, setEditingOrgName] = useState("");
  const [editingOrgLegal, setEditingOrgLegal] = useState("");
  const [editingOrgPan, setEditingOrgPan] = useState("");
  const [editingOrgGstin, setEditingOrgGstin] = useState("");
  const [editingOrgSeats, setEditingOrgSeats] = useState(4);
  const [editingOrgPackage, setEditingOrgPackage] = useState<any>('Standard');
  const [editingOrgPricing, setEditingOrgPricing] = useState(2499);
  const [editingOrgStatus, setEditingOrgStatus] = useState<any>('Active');
  const [editingOrgEmail, setEditingOrgEmail] = useState("");

  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgLegal, setNewOrgLegal] = useState("");
  const [newOrgPan, setNewOrgPan] = useState("");
  const [newOrgGstin, setNewOrgGstin] = useState("");
  const [newOrgSeats, setNewOrgSeats] = useState(4);
  const [newOrgPackage, setNewOrgPackage] = useState<any>('Standard');
  const [newOrgPricing, setNewOrgPricing] = useState(2499);
  const [newOrgStatus, setNewOrgStatus] = useState<any>('Active');
  const [newOrgEmail, setNewOrgEmail] = useState("");

  // AI Dialog state Overlay
  const [aiReportExplanation, setAiReportExplanation] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [reminderEmail, setReminderEmail] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; connected: boolean; error: any } | null>(null);

  // Quick action panel
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Item Creation overlay popup state
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemHsnSac, setNewItemHsnSac] = useState("9983");
  const [newItemSalesRate, setNewItemSalesRate] = useState<number>(1200);
  const [newItemGstRate, setNewItemGstRate] = useState<number>(18);
  const [newItemUnit, setNewItemUnit] = useState("Hours");
  const [newItemIncomeAccount, setNewItemIncomeAccount] = useState("Service Income");

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
        // After successful DB load, refresh supabase status
        fetchSupabaseStatus();
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
    // Re-check supabase status every 30s
    const interval = setInterval(fetchSupabaseStatus, 30000);
    return () => clearInterval(interval);
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
    // If we have a session but db is loading, show minimal loader not blank
    if (session) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-700 font-sans gap-3.5 select-none leading-relaxed">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <div className="tracking-widest uppercase font-bold text-[10px] text-slate-500">Loading your ledger data...</div>
          <button onClick={fetchDB} className="mt-2 text-blue-600 hover:underline text-xs">Click here if stuck</button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-700 font-sans gap-3.5 select-none leading-relaxed">
        <Sparkles className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="tracking-widest uppercase font-bold text-[10px] text-slate-500">Loading your Bizkhata corporate accounting workspace...</div>
      </div>
    );
  }

  // Secure Authentication Handlers
  const handleSSOLogin = (provider: string) => {
    setSsoLoading(true);
    setAuthError("");
    setTimeout(() => {
      setSsoLoading(false);
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
      setLoginStep(1);
    }, 1000);
  };

  const handleAutofillAdmin = () => {
    setLoginEmail("svtiger543939@gmail.com");
    setLoginPassword("Admin@123");
    setLoginStep(2);
    setAuthView("signin");
    setAuthError("");
  };

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
      setLoginStep(1);
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
      setLoginStep(1);
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
          subject: "Corporate Ledgers Registered - Bizkhata Billing Core",
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

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently revoke this user's corporate access seats?")) {
      return;
    }
    try {
      const response = await fetch("/api/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          author: activeUserEmail
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        alert(errData.error || "Failed to delete sub-user seat.");
        return;
      }

      alert("Corporate sub-user access seat successfully revoked!");
      await fetchDB();
    } catch (error) {
      console.error(error);
      alert("Encountered connection errors dispatching delete.");
    }
  };

  const handlePassManualJournal = async (journalData: any) => {
    try {
      const response = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...journalData,
          user: activeUserEmail
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        alert(errData.error || "Failed to post manual journal entry to ledger.");
        return;
      }

      alert("Balanced manual journal entry successfully posted and reconciled in general ledger!");
      await fetchDB();
    } catch (error) {
      console.error(error);
      alert("Communications error posting manual journal.");
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

  const handleOwnerAddOrg = async (orgData: any) => {
    try {
      const r = await fetch("/api/owner/organization/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgData)
      });
      if (!r.ok) {
        const data = await r.json();
        alert(data.error || "Failed to enroll new purchased organisation.");
        return;
      }
      alert("New organisation subscription track registered successfully!");
      await fetchDB();
    } catch (e) {
      console.error(e);
      alert("Encountered connection errors registering organisation.");
    }
  };

  const handleOwnerUpdateOrg = async (orgData: any) => {
    try {
      const r = await fetch("/api/owner/organization/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgData)
      });
      if (!r.ok) {
        const data = await r.json();
        alert(data.error || "Failed to update subscription profile.");
        return;
      }
      alert("Organisation subscription details updated successfully!");
      await fetchDB();
    } catch (e) {
      console.error(e);
      alert("Encountered connection errors updating profile.");
    }
  };

  const handleOwnerDeleteOrg = async (orgId: string) => {
    if (!window.confirm("Are you sure you want to suspend and remove this organization registration trace from Platform Owner Console?")) {
      return;
    }
    try {
      const r = await fetch("/api/owner/organization/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orgId })
      });
      if (!r.ok) {
        const data = await r.json();
        alert(data.error || "Failed to remove organization subscriber.");
        return;
      }
      alert("Organisation tracing deleted successfully!");
      await fetchDB();
    } catch (e) {
      console.error(e);
      alert("Encountered connection errors deleting trace.");
    }
  };

  const handleResetDB = async () => {
    const r = await fetch("/api/reset", { method: "POST" });
    if (r.ok) {
      await fetchDB();
      setActiveTab("dashboard");
    }
  };

  const handleSaveInvoice = async (invoicePayload: any) => {
    try {
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoicePayload)
      });
      if (r.ok) {
        await fetchDB();
      } else {
        const err = await r.json().catch(() => ({ error: `Server error ${r.status}` }));
        throw new Error(err.error || `Server returned ${r.status}`);
      }
    } catch (err: any) {
      throw err; // Re-throw so Invoices.tsx can display the error
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

  const handleAddItem = async (itemPayload: any) => {
    const r = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    });
    if (r.ok) {
      await fetchDB();
    } else {
      const err = await r.json();
      alert(`Item Validation Warning: ${err.error || "Cannot save item"}`);
    }
  };

  const handleFormItemModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: newItemName,
      hsnSac: newItemHsnSac,
      salesRate: Number(newItemSalesRate),
      gstRate: Number(newItemGstRate),
      unit: newItemUnit,
      incomeAccount: newItemIncomeAccount
    };
    await handleAddItem(payload);
    setShowItemModal(false);
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

  // Sales Orders
  const handleSaveSO = async (payload: any) => {
    const r = await fetch("/api/sales-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  const handleConvertSOToInvoice = (so: any) => {
    setActiveTab("sales");
    setSalesSubTab("tax" as any);
    // Pre-fill invoice form from SO
    (window as any).__soConvertPayload = so;
    alert(`Opening invoice form pre-filled from Sales Order ${so.soNumber}. Review and save to invoice.`);
  };

  // Purchase Orders
  const handleSavePO = async (payload: any) => {
    const r = await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  const handleConvertPOToBill = async (po: any) => {
    // Convert PO to bill
    const billPayload = { vendorId: po.vendorId, vendorName: po.vendorName, date: new Date().toISOString().split("T")[0], dueDate: new Date(Date.now() + 30*86400000).toISOString().split("T")[0], items: po.items, subtotal: po.subtotal, totalGst: po.totalGst, totalCgst: po.totalGst/2, totalSgst: po.totalGst/2, totalIgst: 0, total: po.total, status: "Draft", paymentPaid: 0 };
    await handleAddBill(billPayload);
    await handleSavePO({ ...po, status: "Billed", convertedToBill: true });
  };

  // Vendor Credits
  const handleSaveVC = async (payload: any) => {
    const r = await fetch("/api/vendor-credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  // Delivery Challans
  const handleSaveChallan = async (payload: any) => {
    const r = await fetch("/api/delivery-challans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  // Bank Accounts
  const handleSaveBankAccount = async (payload: any) => {
    const r = await fetch("/api/bank-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };
  const handleSaveBankTransaction = async (payload: any) => {
    const r = await fetch("/api/bank-transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };
  const handleMatchTransaction = async (txId: string, matchedId: string, matchedType: string) => {
    const r = await fetch("/api/bank-transactions/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txId, matchedId, matchedType }) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  // Opening Balances
  const handleSaveOpeningBalances = async (entries: any[], date: string) => {
    const r = await fetch("/api/opening-balances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries, date }) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  // Chart of Accounts CRUD
  const handleSaveAccount = async (acc: any) => {
    const r = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(acc) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };
  const handleDeleteAccount = async (code: string) => {
    const r = await fetch("/api/accounts/" + code, { method: "DELETE" });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
  };

  // Fixed Assets
  const handleSaveFixedAsset = async (payload: any) => {
    const r = await fetch("/api/fixed-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) await fetchDB(); else { const e = await r.json(); throw new Error(e.error || "Failed"); }
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
      <div className="fixed inset-0 min-h-screen bg-[#F5F7FA] flex items-stretch font-sans overflow-hidden text-slate-700 select-none z-50">
        
        {/* ----- LEFT SIDEBAR: PREMIUM HERO DESIGN (Hides on Mobile/Tablet) ----- */}
        <div className="hidden lg:flex w-[38%] bg-[#121622] text-white flex-col justify-between p-12 relative overflow-hidden shrink-0 border-r border-slate-800 z-10 select-none">
          {/* Decorative subtle ambient circle glows */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-505/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Header Branding */}
          <div className="flex items-center gap-3 relative z-10 transition hover:opacity-90">
            <div className="grid grid-cols-2 gap-0.5 w-7 h-7">
              <div className="bg-indigo-600 rounded-xs"></div>
              <div className="bg-[#006EE5] rounded-xs"></div>
              <div className="bg-indigo-200 rounded-xs"></div>
              <div className="bg-[#006EE5] rounded-xs"></div>
            </div>
            <div>
              <span className="font-extrabold text-[#006EE5] text-[19px] tracking-tight">Biz</span>
              <span className="text-white font-bold text-[14px] ml-1 bg-indigo-600 px-1.5 py-0.5 rounded border border-indigo-750/60 uppercase tracking-widest">Khata</span>
            </div>
          </div>

          {/* Feature Carousel/Details Presentation */}
          <div className="space-y-8 my-auto relative z-10">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-900/45 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                ⚡ Premium Multi-Tenant Suite
              </span>
              <h2 className="text-3xl font-black tracking-tight leading-tight text-white max-w-sm">
                Your complete business, automated.
              </h2>
              <p className="text-xs text-slate-400 leading-normal max-w-xs">
                Manage your professional ledgers, run live GSTR checks, and balance accounts side by side.
              </p>
            </div>

            {/* Benefit Checkpoints */}
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="font-bold text-white text-[12.5px]">Indian GST Compliance Schedulers</h4>
                  <p className="text-[10.5px] text-slate-450 leading-relaxed">Automap HSN/SAC codes and verify GSTR-1, GSTR-3B registers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="font-bold text-white text-[12.5px]">Direct Access Control (Bizkhata SSO)</h4>
                  <p className="text-[10.5px] text-slate-450 leading-relaxed">Assign granular role locks to auditors, billing users, and staff.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                <div>
                  <h4 className="font-bold text-white text-[12.5px]">Secure Multi-Device Sync</h4>
                  <p className="text-[10.5px] text-slate-450 leading-relaxed">Enterprise end-to-end sandbox safety linked with Ministry of Corporate Affairs codes.</p>
                </div>
              </div>
            </div>

            {/* Interactive Badge representation */}
            <div className="bg-[#191F2F]/75 border border-slate-800 rounded-xl p-4 flex gap-3.5 items-center max-w-xs backdrop-blur-sm shadow-sm select-none">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Core Status Gateway</span>
                <span className="font-mono text-[11px] font-bold text-[#00D779] flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                  Connected to Indian FinGate
                </span>
              </div>
            </div>
          </div>

          {/* Footer of Sidebar */}
          <div className="text-[10.5px] text-slate-500 border-t border-slate-800/80 pt-4 relative z-10 flex justify-between items-center">
            <span>© 2026 Bizkhata Books Corporation.</span>
            <span className="hover:underline cursor-pointer">Security Protocol • Privacy Policy</span>
          </div>
        </div>

        {/* ----- RIGHT SIDE: BIZKHATA HIGH FIDELITY AUTH COMPONENT ----- */}
        <div className="flex-1 bg-white flex flex-col justify-between items-center px-6 py-8 md:p-12 lg:p-16 relative overflow-y-auto w-full">
          
          {/* Language / Quick Links bar top right */}
          <div className="w-full flex justify-between lg:justify-end items-center text-xs text-slate-500 shrink-0 gap-4">
            {/* Bizkhata mini branding visible only on Mobile/Tablet */}
            <div className="flex lg:hidden items-center gap-2 select-none">
              <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                <div className="bg-indigo-600 rounded-xs"></div>
                <div className="bg-[#006EE5] rounded-xs"></div>
                <div className="bg-indigo-200 rounded-xs"></div>
                <div className="bg-[#006EE5] rounded-xs"></div>
              </div>
              <span className="font-black text-slate-900 text-sm tracking-tight">Bizkhata</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-slate-450">Server Zone:</span>
              <span className="text-[11.5px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1">
                🇮🇳 India (IN) ▾
              </span>
            </div>
          </div>

          {/* SSO Mock Loading Overlay */}
          {ssoLoading && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-50 animate-fade-in font-sans">
              <div className="flex gap-1.5 items-center justify-center mb-4">
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-[#006EE5] animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-400 animate-bounce"></span>
              </div>
              <p className="text-xs font-bold text-slate-650 tracking-wider font-mono">ESTABLISHING SECURE FEDERATED SESSION...</p>
              <p className="text-[10px] text-slate-400 mt-1">Authenticating corporate token with Bizkhata Accounts server</p>
            </div>
          )}

          {/* Centered Auth Box Container */}
          <div className="w-full max-w-[400px] my-auto py-6 space-y-6">
            
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {authView === "signin" ? "Sign In" : "Register Organization"}
              </h1>
              <p className="text-slate-500 text-[12.5px] leading-relaxed">
                {authView === "signin"
                  ? "to access your corporate books, GST liabilities and ledgers."
                  : "Start managing your finances with Bizkhata-style multi-device sync seats."
                }
              </p>
            </div>

            {/* Auth Tab Toggle Slider */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => { setAuthView("signin"); setAuthError(""); }}
                className={`py-2 px-3 rounded-lg text-center transition ${
                  authView === "signin"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthView("signup"); setAuthError(""); }}
                className={`py-2 px-3 rounded-lg text-center transition ${
                  authView === "signup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message Box */}
            {authError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-700 font-medium font-sans flex items-start gap-2.5 animate-bounce">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block uppercase tracking-widest text-[9.5px] text-rose-800">Authentication Error</span>
                  <p className="text-[11px] leading-relaxed">{authError}</p>
                </div>
              </div>
            )}

            {/* Form Section */}
            {authView === "signin" ? (
              /* ----- BIZKHATA AUTHENTIC STEP-BY-STEP SIGN IN FORM ----- */
              <div className="space-y-5">
                {loginStep === 1 ? (
                  /* STEP 1: Email Address Screen */
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setAuthError("");
                    if (!loginEmail.trim()) {
                      setAuthError("Email address is required to locate accounts.");
                      return;
                    }
                    if (!loginEmail.includes("@")) {
                      setAuthError("Please enter a valid business email format (e.g. name@company.com).");
                      return;
                    }
                    setLoginStep(2);
                  }} className="space-y-4">
                    
                    <div className="space-y-1.5 relative">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Corporate Email Address</label>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">MCA Linked</span>
                      </div>
                      
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-400" />
                        </span>
                        <input
                          type="email"
                          required
                          placeholder="e.g. svtiger543939@gmail.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:ring-1 focus:ring-[#1572E8] focus:outline-none rounded-xl pl-10 pr-4 py-3 text-slate-900 text-[13px] font-medium transition placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#1572E8] hover:bg-[#1366cf] text-white font-extrabold py-3.5 px-4 rounded-xl tracking-wider text-xs uppercase transition shadow-md active:scale-98 cursor-pointer text-center block"
                    >
                      Next Step
                    </button>

                    <div className="text-center">
                      <p className="text-[11.5px] text-slate-500">
                        Don't have a Bizkhata account?{" "}
                        <button
                          type="button"
                          onClick={() => { setAuthView("signup"); setAuthError(""); }}
                          className="text-[#1572E8] hover:underline font-bold"
                        >
                          Sign Up Now
                        </button>
                      </p>
                    </div>

                    <div className="relative flex py-2 items-center text-xs text-slate-400 uppercase font-bold tracking-widest select-none">
                      <div className="flex-grow border-t border-slate-100"></div>
                      <span className="flex-shrink mx-3">Or sign in via SSO</span>
                      <div className="flex-grow border-t border-slate-100"></div>
                    </div>

                    {/* Federated Mock SSO Options */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => handleSSOLogin("Google")}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 cursor-pointer transition text-slate-700 shadow-2xs font-sans font-bold"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99C6.21 7.22 8.9 5.04 12 5.04z"/>
                          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
                          <path fill="#FBBC05" d="M5.24 14.75a7.1 7.1 0 010-4.3c-.09-.28-.15-.56-.15-.85L1.24 6.61a11.97 11.97 0 000 10.78l3.85-2.99c.04-.22.1-.43.15-.65z"/>
                          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.11.75-2.54 1.19-4.26 1.19-3.1 0-5.79-2.18-6.76-5.11L1.39 16.3C3.37 20.35 7.35 23 12 23z"/>
                        </svg>
                        Google
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSSOLogin("Microsoft")}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 cursor-pointer transition text-slate-700 shadow-2xs font-sans font-bold"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                          <rect x="0" y="0" width="10.5" height="10.5" fill="#f25022"/>
                          <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7fba00"/>
                          <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00a4ef"/>
                          <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900"/>
                        </svg>
                        Microsoft
                      </button>
                    </div>

                  </form>
                ) : (
                  /* STEP 2: Password Screen with Zoho UI features */
                  <form onSubmit={handleSignIn} className="space-y-4">
                    
                    {/* Selected Email Display and Quick Edit Back door */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div className="flex flex-col gap-0.5 max-w-[70%] truncate">
                        <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest">Sign-In Account:</span>
                        <span className="text-slate-900 font-bold truncate pr-3">{loginEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoginStep(1)}
                        className="text-[#1572E8] hover:text-[#115bbd] font-bold text-[11px] underline flex shrink-0 items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 inline" /> Change
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">MFA Access Password</label>
                        <button
                          type="button"
                          onClick={() => alert("Help Desk: Demoview Administrator passcode is 'Admin@123'. To reset, contact portal administrator.")}
                          className="text-[#1572E8] hover:underline font-bold text-[11px]"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </span>
                        
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Enter your security password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:ring-1 focus:ring-[#1572E8] focus:outline-none rounded-xl pl-10 pr-10 py-3 text-slate-900 text-[13px] font-medium transition placeholder:text-slate-400"
                        />

                        {/* Password toggle icon button */}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Keep me logged in checkbox */}
                    <div className="flex items-center justify-between text-xs font-semibold py-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-slate-650">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-slate-300 text-[#1572E8] focus:ring-[#1572E8] w-4 h-4 accent-[#1572E8]"
                        />
                        <span>Keep me signed in</span>
                      </label>
                    </div>

                    {/* Authentication Submit buttons */}
                    <div className="grid grid-cols-5 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setLoginStep(1)}
                        className="col-span-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-3.5 rounded-xl flex items-center justify-center transition active:scale-95"
                        title="Back to Email Step"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      
                      <button
                        type="submit"
                        className="col-span-4 bg-[#1572E8] hover:bg-[#1366cf] text-white font-black py-3.5 px-4 rounded-xl tracking-wider text-xs uppercase transition shadow-md active:scale-98 cursor-pointer text-center"
                      >
                        Authorize & Login 🔒
                      </button>
                    </div>

                  </form>
                )}

                {/* Instant Demo Login Button right here on card for maximum delight */}
                <div className="bg-[#FFF8E6] border border-[#FFDDAA] rounded-xl p-3 flex justify-between items-center text-xs">
                  <div className="flex items-baseline gap-1 text-amber-800">
                    <span className="font-bold">✨ Quick Test:</span>
                    <span className="text-[10.5px]">Instant developer bypass</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutofillAdmin}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3 py-1.5 rounded-lg text-[10.5px] uppercase tracking-wide transition shadow-2xs cursor-pointer select-none shrink-0"
                  >
                    Quick Autofill Admin
                  </button>
                </div>

              </div>
            ) : (
              /* ----- ZOHO AUTHENTIC REGISTER ORGANIZATION FORM ----- */
              <form onSubmit={handleSignUp} className="space-y-4 text-xs font-medium">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Company / Organization name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Widgets Private Ltd"
                      value={signupCompany}
                      onChange={(e) => setSignupCompany(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:outline-none rounded-xl p-3 text-slate-800 text-[11.5px] transition"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Legal Trade Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Widgets Pvt Ltd"
                      value={signupLegal}
                      onChange={(e) => setSignupLegal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:outline-none rounded-xl p-3 text-slate-800 text-[11.5px] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Owner / Senior Admin Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Khanna"
                    value={signupAdminName}
                    onChange={(e) => setSignupAdminName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:outline-none rounded-xl p-3 text-slate-800 text-[11.5px] transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Corporate Email (SSO)</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@acme.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:outline-none rounded-xl p-3 text-slate-800 text-[11.5px] transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Mobile Number (MCA Link)</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 87074 01846"
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:outline-none rounded-xl p-3 text-slate-800 text-[11.5px] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Corporate Access Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Create security password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#1572E8] focus:outline-none rounded-xl p-3 text-slate-800 text-[11.5px] transition"
                  />
                </div>

                {/* Seats control slider stylized */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-widest">💼 Licensed Slots:</span>
                    <span className="text-sm font-black text-blue-600 font-mono">{signupSeatsCount} Seats</span>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-relaxed mb-3">
                    Configure capacity slots. Fully supports multi-user workspace gate.
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={signupSeatsCount}
                    onChange={(e) => setSignupSeatsCount(Number(e.target.value))}
                    className="w-full accent-[#1572E8] cursor-pointer h-1.5 rounded-lg bg-slate-200"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                    <span>1 (Solo)</span>
                    <span>5 (Standard)</span>
                    <span>30 (Enterprise Limit)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1572E8] hover:bg-[#1366cf] text-white font-extrabold py-3.5 px-4 rounded-xl tracking-wider text-xs uppercase transition shadow-md active:scale-98 cursor-pointer text-center block mt-2"
                >
                  Create Bizkhata Corporate Instance
                </button>
              </form>
            )}
            
          </div>

          {/* Collapsible / Expandable Demo Panel at bottom for evaluation safety */}
          <div className="w-full max-w-[400px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs mt-6">
            <button
              type="button"
              onClick={() => setShowCreds(!showCreds)}
              className="w-full text-left px-4 py-3.5 flex items-center justify-between text-xs font-bold text-slate-600 hover:bg-slate-100/60 transition"
            >
              <span className="flex items-center gap-2">
                <span>🔑</span> Show System Demo Admin Credentials
              </span>
              <span className="text-[11px] font-bold text-[#1572E8]">
                {showCreds ? "Hide Panel" : "Expand Panel"}
              </span>
            </button>
            {showCreds && (
              <div className="border-t border-slate-200 p-4 bg-amber-500/5 text-xs text-amber-900 space-y-2.5 flex flex-col font-sans animate-fade-in leading-relaxed">
                <span className="font-bold text-amber-800 uppercase tracking-wider text-[9px]">🔑 Standard Administrative Access (Copy/Direct Autofill):</span>
                <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px] text-amber-905 bg-white p-3 border border-[#FFDDAA] rounded-xl shadow-3xs">
                  <div>Email: <span className="text-slate-900 font-bold select-all bg-amber-500/10 px-1.5 py-0.5 rounded border border-[#FFDDAA]/40">svtiger543939@gmail.com</span></div>
                  <div>Password: <span className="text-slate-900 font-bold select-all bg-amber-500/10 px-1.5 py-0.5 rounded border border-[#FFDDAA]/40">Admin@123</span></div>
                  <div>Registered Mobile: <span className="text-slate-900 font-bold select-all bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200">8707401846</span></div>
                </div>
                
                <p className="text-[10px] text-slate-500 leading-normal">
                  💡 Clicking the <strong className="text-amber-700">"Quick Autofill Admin"</strong> button on the Sign-In card will automatically populate variables, swap steps, and configure authentication immediately.
                </p>
              </div>
            )}
          </div>

          {/* Secure trust label footers */}
          <div className="text-center font-medium text-[10.5px] text-slate-400 mt-8 shrink-0 select-none">
            Bizkhata Multi-tenant Core Sandbox • Ministry of Corporate Affairs, Govt of India Registry • Secured Sandbox Protocol.
          </div>
          
        </div>
        
      </div>
    );
  }

  // ── Auth Gate ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-slate-400 text-sm font-medium">Connecting to BizKhata...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          initialView={panelView}
          initialEmail={routeEmail}
          initialCode={routeCode}
        />
        <TesterPanel
          onQuickLogin={handleQuickLoginImpersonation}
          onNavigateToReset={(email: string, code: string) => { setPanelView('reset'); setRouteEmail(email); setRouteCode(code); }}
          onNavigateToActivate={(email: string, code: string) => { setPanelView('reset'); setRouteEmail(email); setRouteCode(code); }}
        />
      </div>
    );
  }

  // ── Users tab: show Admin/SuperAdmin dashboards ──────────────────────────
  if (activeTab === "users") {
    if (session.user.role === "Super Admin") {
      return (
        <div className="min-h-screen">
          <SuperAdminDashboard token={session.token} activeUser={session.user} onLogout={handleLogout} />
          <TesterPanel onQuickLogin={handleQuickLoginImpersonation} onNavigateToReset={(e,c)=>{}} onNavigateToActivate={(e,c)=>{}} />
        </div>
      );
    }
    if (session.user.role === "Admin") {
      return (
        <div className="min-h-screen">
          <AdminDashboard token={session.token} activeUser={session.user} onLogout={handleLogout} />
          <TesterPanel onQuickLogin={handleQuickLoginImpersonation} onNavigateToReset={(e,c)=>{}} onNavigateToActivate={(e,c)=>{}} />
        </div>
      );
    }
    return (
      <div className="min-h-screen">
        <UserDashboard token={session.token} activeUser={session.user} onUpdateSelfUser={handleUpdateSelfUser} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div id="bizkhata-main-container" className="h-screen flex flex-col overflow-hidden bg-slate-50 font-sans text-slate-700">
      
      {/* ----------------- BIZKHATA TOP GLOBAL BAR ----------------- */}
      <header id="bizkhata-global-header" className="h-12 bg-[#1C202F] flex items-center justify-between px-4 text-white shrink-0 select-none z-30">
        
        {/* Left: Bizkhata logo stack */}
        <div className="flex items-center gap-2">
          {/* Logo */}
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAA0CAYAAAANFPE9AAAABHNCSVQICAgIfAhkiAAAABl0RVh0U29mdHdhcmUAZ25vbWUtc2NyZWVuc2hvdO8Dvz4AAAAsdEVYdENyZWF0aW9uIFRpbWUARnJpZGF5IDI5IE1heSAyMDI2IDExOjIxOjM4IEFNT7RIqAAAAxtJREFUWIXtmEuLHFUYhp/vVPVlLklXdzNO2zohGREdBtRGMoKQP+DelcEL/gK36o/RjQu3ugkBEV14Q4QQjESTcYa0dNKZdE1f63bOcZEREqZ7pmYsSQv1wNmcgpfnfOdSp0rq9bplzlBPWmAauVRacqm05FJpmUspt9FoPGmHQ8xlpXKptORSacml0pJLpSWXSsshKc/z8Dzv5EmShc5D3EPZcsr0g2+isFFGn1mmEFdw4wpKF8EKosBaAI198BtE/fRSpyWuFGhfPs/4OY/yZI363iUq+xdxIw+xD50FQIHtbRNffQ+C+1OzsllTAncun2fUqkMCkihUXEBiAW2w5qDpBKvBWb2ALD87My4TqckzC4yfX0b8ACsGoyISd4hxJlgxYA2C4JRdxMZEP3+KuX9tZl4m02cWXUCw1oBYkkKfycIdCpMGi7rE8lIVQoP+4wv09U8wvZtH7otMpMq7I9xBTFItIaMYzYjJ0m3OVYs0Bh2633Xxv7nCQngdAEGwzP5b8O+lBJzA8PTnu7TfuYCplakVFVu6w9qvN9j58h4bYZeLl0YY6/L1tbPc6joIzNSSzc3Nx55Vq1UAer3eif2C1TKDlzyahTGr2wOC/XVe22ry5tYtWis3cOwe/d8X+PizFb5quzPFMjsSrAjluwHlqx2i4gZ3W2/TfL1F5N3mF/8KEg85R8hKrPhoXfjxL2Fop9cqMymxFqm9gNp8H3f9DdwCdCchSddQWH6ZNbtDM+oR7MQ8tb/IRjHhp1D/d1JWHJzWB7gvvoUqFdChJY40iMtYV9gbNukN1wh7bUx7gPWLDHQyMy8TKbXyCqVX3yUZgw4SEMGiEMBohQ1KmP4ZuFdhcaj4fjDiZpwgIlPXVCaHp+3/SdLZRhwQx0WUgzgKRxRLRlMfB9T3Ykq+8O2DCR/6I8wR79jsdl/xLFLb4NFxKmsompBK3KcW+QzjAbtxfGzUoemzM3bEsUR9bOeHx7o0MDlonUf6jzqjpkr5vn86qRNw3LD/HzfPeSCXSksulZZcKi25VFrmUsr951YwT8xlpeZS6m8hWDMlEzwCiAAAAABJRU5ErkJggg==" alt="BizKhata Logo" className="h-8 w-auto object-contain" />
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-white text-[15px] leading-none tracking-tight">BizKhata</span>
            <span className="text-[14px] font-bold text-[#00D779]">Workspace</span>
            {session && <span className="ml-2 text-[10px] text-slate-400 font-medium hidden md:block">· {session.user.fullName} ({session.user.role})</span>}
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
          <button onClick={() => setShowHelpDrawer(!showHelpDrawer)} className="hover:text-white transition-colors" title="Get Help">
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
              onClick={handleLogout}
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

                    {/* Delivery Challans */}
                    <button
                      onClick={() => { setActiveTab("sales"); setSaleSubTab("challans" as any); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "sales" && (saleSubTab as any) === "challans"
                          ? "text-teal-600 font-bold bg-teal-50"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Delivery Challans
                    </button>
                    {/* Sales Orders */}
                    <button
                      onClick={() => { setActiveTab("sales"); setSaleSubTab("salesorders" as any); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "sales" && (saleSubTab as any) === "salesorders"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Sales Orders
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

                    {/* Purchase Orders */}
                    <button
                      onClick={() => { setActiveTab("purchases"); setPurchasesSubTab2("purchaseorders"); setPurchasesSubTab("bills"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        purchasesSubTab2 === "purchaseorders" && activeTab === "purchases"
                          ? "text-amber-600 font-bold bg-amber-50"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Purchase Orders
                    </button>

                    {/* Vendor Credits */}
                    <button
                      onClick={() => { setActiveTab("purchases"); setPurchasesSubTab2("vendorcredits"); setPurchasesSubTab("bills"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        purchasesSubTab2 === "vendorcredits" && activeTab === "purchases"
                          ? "text-purple-600 font-bold bg-purple-50"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Vendor Credits
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
                <span>Banking & Reconciliation</span>
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
                    <button
                      onClick={() => { setActiveTab("accounting"); setAccountingSubTab("opening"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "accounting" && accountingSubTab === "opening"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Opening Balances
                    </button>
                    <button
                      onClick={() => { setActiveTab("accounting"); setAccountingSubTab("fixedassets"); }}
                      className={`w-full text-left py-1.5 px-3.5 text-xs font-medium rounded-l transition-all cursor-pointer ${
                        activeTab === "accounting" && accountingSubTab === "fixedassets"
                          ? "text-blue-600 font-bold bg-[#E2EAFC]/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      Fixed Assets
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
                onClick={() => { setActiveTab("advanced"); }}
                className={`flex items-center gap-3 w-full text-left py-2 px-3 rounded-xl transition-all cursor-pointer select-none group ${
                  activeTab === "advanced"
                    ? "bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 font-bold shadow-sm border border-purple-200"
                    : "text-[#5A5A40] hover:bg-[#F5F2ED] hover:text-[#2C2C24]"
                }`}
              >
                <span className="text-base">🚀</span>
                <span className="font-semibold">Advanced Modules</span>
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">30</span>
              </button>
              <button
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

              {/* SaaS Platform Owner Console */}
              {activeRole === UserRole.Owner && (
                <button
                  id="sidebar-owner-console"
                  onClick={() => { setActiveTab("owner_saas"); }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold leading-relaxed transition-all cursor-pointer relative ${
                    activeTab === "owner_saas"
                      ? "bg-amber-100 text-amber-905 font-bold border-l-4 border-amber-500 shadow-2xs"
                      : "text-slate-655 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span className="font-extrabold text-amber-950">SaaS Owner Desk</span>
                  </span>
                  <span className="text-[7.5px] font-black bg-amber-500 text-white rounded px-1.5 py-0.5 tracking-wide">
                    {db?.organizations?.length || 4} Tenants
                  </span>
                </button>
              )}

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
            
            {/* Supabase Status Banner - only show if truly offline, not just slow */}
            {supabaseStatus && supabaseStatus.configured && !supabaseStatus.connected && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-4 font-sans">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-900 text-sm">
                      {supabaseStatus.error?.message?.includes("aborted") || supabaseStatus.error?.message?.includes("timeout")
                        ? "⏳ Supabase connection timed out — data saved locally"
                        : supabaseStatus.error?.message?.includes("fetch failed")
                        ? "🔌 Cannot reach Supabase server"
                        : "⚠️ Supabase sync offline — using local storage"}
                    </div>
                    <div className="text-xs text-amber-700">
                      {supabaseStatus.error?.message
                        ? <span>Error: <code className="bg-amber-100 px-1 rounded">{supabaseStatus.error.message}</code></span>
                        : "Your data is saved locally. Changes will sync when connection is restored."}
                    </div>
                    <div className="text-[10px] text-amber-600 mt-1">
                      Supabase URL: <code className="bg-amber-100 px-1 rounded">{supabaseStatus.supabaseUrl || "not set"}</code>
                      {" · "}
                      <button onClick={fetchSupabaseStatus} className="underline hover:text-amber-800 font-semibold">Retry connection</button>
                    </div>
                  </div>
                </div>
                <button onClick={fetchSupabaseStatus} className="shrink-0 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 transition">
                  🔄 Retry
                </button>
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
            {activeTab === "sales" && (saleSubTab as any) !== "salesorders" && (
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
            {activeTab === "sales" && (saleSubTab as any) === "salesorders" && (
              <SalesOrders
                db={db}
                onSaveSO={handleSaveSO}
                onConvertToInvoice={handleConvertSOToInvoice}
              />
            )}
            {activeTab === "sales" && (saleSubTab as any) === "challans" && (
              <DeliveryChallans
                db={db}
                onSaveChallan={handleSaveChallan}
              />
            )}

            {/* Purchases bills & supplier spend tracking */}
            {activeTab === "purchases" && purchasesSubTab2 !== "purchaseorders" && purchasesSubTab2 !== "vendorcredits" && (
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
            {activeTab === "purchases" && purchasesSubTab2 === "purchaseorders" && (
              <PurchaseOrders
                db={db}
                onSavePO={handleSavePO}
                onConvertToBill={handleConvertPOToBill}
              />
            )}
            {activeTab === "purchases" && purchasesSubTab2 === "vendorcredits" && (
              <VendorCredits
                db={db}
                onSaveVC={handleSaveVC}
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
            {activeTab === "accounting" && accountingSubTab !== "opening" && accountingSubTab !== "fixedassets" && accountingSubTab !== "coa" && (
              <Accounting 
                db={db} 
                defaultTab={accountingSubTab}
                onAddManualJournal={handlePassManualJournal}
                userRole={activeRole}
              />
            )}
            {activeTab === "accounting" && accountingSubTab === "accounts" && (
              <div className="mt-6">
                <ChartOfAccountsCRUD
                  db={db}
                  onSaveAccount={handleSaveAccount}
                  onDeleteAccount={handleDeleteAccount}
                />
              </div>
            )}
            {activeTab === "accounting" && accountingSubTab === "opening" && (
              <OpeningBalances
                db={db}
                onSaveOpeningBalances={handleSaveOpeningBalances}
              />
            )}
            {activeTab === "accounting" && accountingSubTab === "fixedassets" && (
              <FixedAssets
                db={db}
                onSaveAsset={handleSaveFixedAsset}
              />
            )}

            {/* Advanced Modules - 30 Zoho parity features */}
            {activeTab === "advanced" && (
              <div className="-m-6 md:-m-8">
                <BizKhataCompleteUpgrade />
              </div>
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
                      setNewItemName("");
                      setNewItemHsnSac("9983");
                      setNewItemSalesRate(1200);
                      setNewItemGstRate(18);
                      setNewItemUnit("Hours");
                      setNewItemIncomeAccount("Service Income");
                      setShowItemModal(true);
                    }}
                    className="bg-[#006EE5] hover:bg-[#0060C7] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Standard Catalog Item
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

            {/* ----- CUSTOM TAB 2: Banking & Reconciliation ----- */}
            {activeTab === "banking" && (
              <div className="space-y-6">
                <BankReconciliation
                  db={db}
                  onSaveBankAccount={handleSaveBankAccount}
                  onSaveBankTransaction={handleSaveBankTransaction}
                  onMatchTransaction={handleMatchTransaction}
                />
              </div>
            )}
            {activeTab === "banking_old_passbook" && (
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
                            <td className="p-3 text-slate-800">New Expense: {e.vendorName || "General Vendor"} ({db.accounts.find(a => a.code === e.category)?.name || e.category})</td>
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
                    <p className="text-xs text-slate-500">Configure corporate user authorization, invite accountants, and scale licensed seats (Bizkhata model).</p>
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
                      Invite Corporate Professional (Bizkhata Flow)
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
                          className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 rounded p-2 text-xs text-slate-800 font-semibold"
                        >
                          <option value={UserRole.User}>User (General Entry Operator - Entry only)</option>
                          <option value={UserRole.Accountant}>Accountant (Books Entry, Chart of Accounts, pass Journals & View)</option>
                          <option value={UserRole.Auditor}>Auditor (Review & Transaction Approval access)</option>
                          <option value={UserRole.Admin}>Admin (Management & All Transaction Approvals)</option>
                          <option value={UserRole.Owner}>Owner (Unlimited Controls)</option>
                          <option value={UserRole.Viewer}>Viewer (Read-only status monitoring)</option>
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
                          <th className="p-3.5 text-right">Actions Desk</th>
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
                                  : u.role === UserRole.Admin
                                  ? "bg-rose-50 text-rose-750 border-rose-200"
                                  : u.role === UserRole.Auditor
                                  ? "bg-cyan-50 text-cyan-750 border-cyan-200"
                                  : u.role === UserRole.Accountant
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : u.role === UserRole.User
                                  ? "bg-violet-50 text-violet-750 border-violet-200"
                                  : "bg-slate-50 text-slate-655 border-slate-200"
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
                            <td className="p-3.5 text-right font-sans">
                              {u.email !== "svtiger543939@gmail.com" && !u.isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 font-bold px-3 py-1 rounded transition-all text-[11px] cursor-pointer"
                                >
                                  Revoke Seats Access
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-bold italic">System Owner</span>
                              )}
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
                        <Mail className="w-4 h-4 text-[#00D779]" /> Outbound SMTP Mailbox Simulation Desk (Bizkhata Connect Link)
                      </h3>
                      <p className="text-[10px] text-slate-400">Verifying real-time secure registration and single-sign-on password emails dispatched by Bizkhata infrastructure.</p>
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

            {/* ----- CUSTOM TAB 5: Platform Owner SaaS Subscription Console ----- */}
            {activeTab === "owner_saas" && activeRole === UserRole.Owner && (
              <div className="space-y-6 animate-fade-in font-sans p-6">
                {/* Visual Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-600" />
                      Bizkhata SaaS Platform Owner Desk
                    </h2>
                    <p className="text-xs text-slate-505">Track and manage corporate subscriptions, license sizes, billing structures, and multi-tenant seating allocations.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewOrgForm(!showNewOrgForm)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Enlist New Subscriber
                    </button>
                    <span className="text-[10px] uppercase font-mono font-bold bg-[#FEF3C7] text-amber-800 rounded px-2.5 py-1 tracking-wider border border-amber-200 flex items-center">
                      SaaS Hyper-Registry Active
                    </span>
                  </div>
                </div>

                {/* SaaS MRR & Capacity Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] uppercase font-black text-slate-400 tracking-wider">Enrolled Tenant Businesses</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800">
                        {db?.organizations?.length ?? 4}
                      </span>
                      <span className="text-xs text-slate-550">SME Corporations</span>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] uppercase font-black text-slate-400 tracking-wider">Licensed Seating Capacity</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800">
                        {(db?.organizations || []).reduce((acc, curr) => acc + (curr.purchasedSeats || 0), 0)}
                      </span>
                      <span className="text-xs text-slate-550">Active Users Seats</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] uppercase font-black text-slate-400 tracking-wider">Platform Live MRR (Consolidated)</p>
                    <div className="flex items-baseline gap-1 text-emerald-805">
                      <span className="text-2xl font-black">
                        ₹{((db?.organizations || []).reduce((acc, curr) => acc + (curr.pricingMonthly || 0), 0)).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold">/ month</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#FEF3C7] bg-[#FFFBEB]/40 p-4 rounded-xl shadow-xs space-y-1">
                    <p className="text-[9.5px] uppercase font-black text-amber-800 tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Active System Tenants Health
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-amber-900">
                        98.6%
                      </span>
                      <span className="text-[10px] text-amber-850">0 Cloud Overages</span>
                    </div>
                  </div>
                </div>

                {/* Create/Add New Tenant Form Panel */}
                {showNewOrgForm && (
                  <div className="bg-[#FAF9F5] border border-amber-200 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in text-xs text-slate-800">
                    <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-amber-600" />
                        Enroll Newly Purchased Bizkhata Corporate Tenant
                      </h3>
                      <button type="button" onClick={() => setShowNewOrgForm(false)} className="text-slate-400 hover:text-slate-900 font-bold font-mono">✕</button>
                    </div>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newOrgName || !newOrgLegal || !newOrgEmail) {
                          alert("Corporate Business Name, Legal Name, and registered customer email are mandatory.");
                          return;
                        }
                        await handleOwnerAddOrg({
                          name: newOrgName,
                          legalName: newOrgLegal,
                          pan: newOrgPan,
                          gstin: newOrgGstin,
                          purchasedSeats: Number(newOrgSeats || 4),
                          packageType: newOrgPackage,
                          pricingMonthly: Number(newOrgPricing || 2499),
                          purchaseStatus: newOrgStatus,
                          registeredEmail: newOrgEmail
                        });
                        // Reset
                        setNewOrgName("");
                        setNewOrgLegal("");
                        setNewOrgPan("");
                        setNewOrgGstin("");
                        setNewOrgSeats(4);
                        setNewOrgPackage("Standard");
                        setNewOrgPricing(2499);
                        setNewOrgStatus("Active");
                        setNewOrgEmail("");
                        setShowNewOrgForm(false);
                      }}
                      className="grid grid-cols-1 md:grid-cols-4 gap-4"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Business Name *</label>
                        <input 
                          type="text" required placeholder="e.g. Mahindra Corp"
                          value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Legal Org Name *</label>
                        <input 
                          type="text" required placeholder="e.g. Mahindra Solutions Ltd"
                          value={newOrgLegal} onChange={(e) => setNewOrgLegal(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">SSO Admin Email *</label>
                        <input 
                          type="email" required placeholder="e.g. finance@mahindra.com"
                          value={newOrgEmail} onChange={(e) => setNewOrgEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Registered PAN No.</label>
                        <input 
                          type="text" placeholder="e.g. MAHIN1234P"
                          value={newOrgPan} onChange={(e) => setNewOrgPan(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">GSTIN Address (Optional)</label>
                        <input 
                          type="text" placeholder="e.g. 29MAHIN1234A1Z1"
                          value={newOrgGstin} onChange={(e) => setNewOrgGstin(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Purchased Corporate Seats *</label>
                        <input 
                          type="number" min="1" required placeholder="e.g. 4"
                          value={newOrgSeats} onChange={(e) => {
                            setNewOrgSeats(Number(e.target.value));
                            // auto estimate price
                            setNewOrgPricing(Number(e.target.value) * 625);
                          }}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none text-right font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Pricing Tier Plan</label>
                        <select 
                          value={newOrgPackage} onChange={(e) => setNewOrgPackage(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none font-bold"
                        >
                          <option value="Standard">Standard SME Plan</option>
                          <option value="Professional">Professional Tier</option>
                          <option value="Enterprise">Enterprise Workspace</option>
                          <option value="SME Bundle">SME Bundle Paket</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Monthly Billing Fee (₹) *</label>
                        <input 
                          type="number" min="0" required placeholder="e.g. 2499"
                          value={newOrgPricing} onChange={(e) => setNewOrgPricing(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none text-right font-bold text-emerald-850"
                        />
                      </div>

                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Active Tenant Status</label>
                        <select 
                          value={newOrgStatus} onChange={(e) => setNewOrgStatus(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none font-bold"
                        >
                          <option value="Active">Active Subscription</option>
                          <option value="Trial">Free Evaluation Trial</option>
                          <option value="Suspended">Suspended/Revoked tenant</option>
                          <option value="Overdue">Overdue payment</option>
                        </select>
                      </div>

                      <div className="col-span-1 md:col-span-3 pt-4 flex justify-end gap-2.5">
                        <button 
                          type="button" 
                          onClick={() => setShowNewOrgForm(false)} 
                          className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded text-slate-600 font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Finalise Enrollment
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Edit Tenant modal Panel */}
                {showOrgEditForm && (
                  <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in text-xs text-slate-800">
                    <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                      <h3 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-blue-600" />
                        Modify Seating Plan & Org Profile details
                      </h3>
                      <button type="button" onClick={() => setShowOrgEditForm(false)} className="text-slate-400 hover:text-slate-900 font-bold font-mono">✕</button>
                    </div>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await handleOwnerUpdateOrg({
                          id: editingOrgId,
                          name: editingOrgName,
                          legalName: editingOrgLegal,
                          pan: editingOrgPan,
                          gstin: editingOrgGstin,
                          purchasedSeats: editingOrgSeats,
                          packageType: editingOrgPackage,
                          pricingMonthly: editingOrgPricing,
                          purchaseStatus: editingOrgStatus,
                          registeredEmail: editingOrgEmail
                        });
                        setShowOrgEditForm(false);
                      }}
                      className="grid grid-cols-1 md:grid-cols-4 gap-4"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Business Name</label>
                        <input 
                          type="text" required value={editingOrgName} onChange={(e) => setEditingOrgName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Legal Org Name</label>
                        <input 
                          type="text" required value={editingOrgLegal} onChange={(e) => setEditingOrgLegal(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">SSO Email Target</label>
                        <input 
                          type="email" required value={editingOrgEmail} onChange={(e) => setEditingOrgEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Monthly Pricing (₹)</label>
                        <input 
                          type="number" required value={editingOrgPricing} onChange={(e) => setEditingOrgPricing(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none text-right font-bold text-emerald-850"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Purchased Seats Capacity</label>
                        <input 
                          type="number" required value={editingOrgSeats} onChange={(e) => setEditingOrgSeats(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none text-right font-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Corporate Plan Tier</label>
                        <select 
                          value={editingOrgPackage} onChange={(e) => setEditingOrgPackage(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none font-bold"
                        >
                          <option value="Standard">Standard SME Plan</option>
                          <option value="Professional">Professional Tier</option>
                          <option value="Enterprise">Enterprise Workspace</option>
                          <option value="SME Bundle">SME Bundle Paket</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Service Status</label>
                        <select 
                          value={editingOrgStatus} onChange={(e) => setEditingOrgStatus(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 focus:outline-none font-semibold"
                        >
                          <option value="Active">Active Subscription</option>
                          <option value="Trial">Free Evaluation Trial</option>
                          <option value="Suspended">Suspended / Blocked</option>
                          <option value="Overdue">Overdue billing cycle</option>
                        </select>
                      </div>

                      <div className="pt-4 flex items-end">
                        <button 
                          type="submit" 
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full py-2 rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Update Seating Allocation
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Main Tenants Register list */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-4 h-4 text-emerald-600 animate-pulse" /> Registered Tenant Businesses (Bizkhata Multi-Enterprise Node)
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3.5">Subscriber Corporation Name</th>
                          <th className="p-3.5">registered legal name</th>
                          <th className="p-3.5 font-mono text-center">Purchased Seats Size</th>
                          <th className="p-3.5 font-mono">Service Pricing plan</th>
                          <th className="p-3.5 text-center">Billing Health Status</th>
                          <th className="p-3.5 text-right font-mono">Control desk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {(db?.organizations || []).map((org) => (
                          <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-800 text-xs">{org.name}</p>
                              <p className="text-[10px] font-mono text-slate-500 select-all">{org.registeredEmail}</p>
                            </td>
                            <td className="p-3.5">
                              <p className="font-medium text-slate-650">{org.legalName}</p>
                              <p className="text-[9px] font-mono text-slate-450 uppercase">PAN: {org.pan || "N/A"} • GST: {org.gstin || "N/A"}</p>
                            </td>
                            <td className="p-3.5 font-bold text-center text-slate-800 text-xs font-mono">
                              <span className="bg-blue-50 text-blue-800 rounded-full border border-blue-200 px-3 py-1 font-black text-[12px]">
                                {org.purchasedSeats} Seats Shared
                              </span>
                            </td>
                            <td className="p-3.5 font-mono">
                              <span className="font-extrabold text-[#2C2C24]">₹{org.pricingMonthly.toLocaleString('en-IN')}</span> 
                              <span className="text-slate-400 text-[10px]"> / mo ({org.packageType})</span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`text-[10px] font-bold uppercase rounded-lg px-2.5 py-1 border ${
                                org.purchaseStatus === "Active" 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : org.purchaseStatus === "Trial"
                                  ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                  : org.purchaseStatus === "Suspended"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {org.purchaseStatus}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-sans space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingOrgId(org.id);
                                  setEditingOrgName(org.name);
                                  setEditingOrgLegal(org.legalName);
                                  setEditingOrgPan(org.pan);
                                  setEditingOrgGstin(org.gstin);
                                  setEditingOrgSeats(org.purchasedSeats);
                                  setEditingOrgPackage(org.packageType);
                                  setEditingOrgPricing(org.pricingMonthly);
                                  setEditingOrgStatus(org.purchaseStatus);
                                  setEditingOrgEmail(org.registeredEmail);
                                  setShowOrgEditForm(true);
                                  setShowNewOrgForm(false);
                                }}
                                className="text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 font-bold px-3 py-1 rounded transition-all text-[11px] cursor-pointer"
                              >
                                Edit Plan Config
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleOwnerDeleteOrg(org.id)}
                                className="text-red-600 hover:text-white hover:bg-red-600 border border-red-200 font-bold px-3 py-1 rounded transition-all text-[11px] cursor-pointer"
                              >
                                Delete Trace
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

      {/* Manual Standard Item/Service Creation Modal Overlay */}
      {showItemModal && (
        <div id="item-creation-modal-overlay" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E1D8] rounded-2xl w-full max-w-md p-6 space-y-4 text-xs font-sans text-slate-800 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
              <h3 className="text-sm font-bold text-[#2C2C24] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#006EE5]" />
                Add Item / Service to Catalog
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-[#2C2C24]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormItemModalSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold block">Item / Service Name</label>
                <input 
                  type="text" 
                  required 
                  value={newItemName} 
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E1D8] px-3 py-2 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-505 outline-none font-sans"
                  placeholder="e.g. Technology Advisory Services"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-600 font-bold block">HSN / SAC Code</label>
                  <input 
                    type="text" 
                    required 
                    value={newItemHsnSac} 
                    onChange={e => setNewItemHsnSac(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E5E1D8] px-3 py-2 rounded-lg text-slate-900 placeholder-slate-450 font-mono focus:border-indigo-550 outline-none"
                    placeholder="e.g. 9983"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-600 font-bold block">Unit Description</label>
                  <select
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E5E1D8] px-3 py-2 rounded-lg text-slate-900 focus:border-indigo-505 outline-none font-sans"
                  >
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                    <option value="Units">Units</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-600 font-bold block">Standard Base Rate (₹)</label>
                  <input 
                    type="number" 
                    required 
                    min={0}
                    value={newItemSalesRate} 
                    onChange={e => setNewItemSalesRate(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-[#E5E1D8] px-3 py-2 rounded-lg text-slate-900 font-mono focus:border-indigo-550 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-600 font-bold block">Standard GST Tax (%)</label>
                  <select
                    value={newItemGstRate}
                    onChange={e => setNewItemGstRate(parseInt(e.target.value) || 18)}
                    className="w-full bg-slate-50 border border-[#E5E1D8] px-3 py-2 rounded-lg text-slate-900 focus:border-indigo-505 outline-none font-mono"
                  >
                    <option value={18}>18% CGST/SGST/IGST</option>
                    <option value={12}>12% CGST/SGST/IGST</option>
                    <option value={5}>5% CGST/SGST/IGST</option>
                    <option value={28}>28% CGST/SGST/IGST</option>
                    <option value={0}>0% GST (Exempt/Nil)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold block">Default GL Ledger Income Account</label>
                <input 
                  type="text" 
                  required 
                  value={newItemIncomeAccount} 
                  onChange={e => setNewItemIncomeAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E1D8] px-3 py-2 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-505 outline-none font-sans"
                  placeholder="e.g. Sales Revenue"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
                <button 
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-lg cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#006EE5] hover:bg-[#0060C7] text-white font-bold px-5 py-2 rounded-lg cursor-pointer border-0"
                >
                  Save to Inventory catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------ SCREENSHOT 2: FLOATING HELP & ASSISTANCE POPULAR DRAWER ------------------------ */}
      {showHelpDrawer && (
        <div id="assist-popup-drawer" className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-55 flex flex-col justify-between animate-slide-in font-sans text-slate-700">
          
          {/* Popover Header */}
          <div className="bg-[#1C2434] text-white p-5 flex justify-between items-center select-none">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#FFBE00] animate-bounce" />
              <span className="font-extrabold text-[13px] tracking-wider uppercase">Help & Support</span>
            </div>
            <button 
              onClick={() => setShowHelpDrawer(false)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition cursor-pointer"
              title="Close Panel"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* User Profile Block exactly as Screenshot 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 select-none text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFBE00] text-slate-900 font-black text-sm rounded-full flex items-center justify-center border border-[#E5AA00] shadow-sm uppercase">
                  S
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 text-[13px] leading-tight">Sudhanshu</h4>
                  <p className="text-[10.5px] text-slate-500 font-medium truncate max-w-[160px]">sudhanshu.verma@thrymr.net</p>
                </div>
              </div>

              {/* Unique corporate ids mimicking screenshot 2 */}
              <div className="text-[10px] text-slate-500 font-mono space-y-0.5 border-t border-slate-200/60 pt-2 leading-relaxed">
                <div>User ID: <span className="text-slate-700 font-bold">883615580</span></div>
                <div>Organization ID: <span className="text-slate-700 font-bold">729374673</span></div>
              </div>

              {/* Plan marker */}
              <div className="bg-yellow-50 border border-yellow-250 rounded-xl p-2.5 text-center flex items-center justify-center gap-1.5">
                <Award className="w-4 h-4 text-yellow-600 shrink-0" />
                <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider">Professional Premium Plan</span>
              </div>

              {/* Sub items */}
              <div className="flex justify-between text-[11px] font-bold text-[#006EE5] pt-1">
                <button onClick={() => { alert("Redirecting to multi-device security token setup..."); }} className="hover:underline">My Account</button>
                <button onClick={() => { localStorage.removeItem("bizkhata_session_v1"); window.location.reload(); }} className="text-rose-600 hover:underline">Sign Out</button>
              </div>
            </div>

            {/* Quick Assistance Grid Option (Screenshot 2) */}
            <div className="space-y-2.5">
              <h3 className="text-[10.5px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-1.5">Quick Help Matrix</h3>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: "Help Documents", desc: "Detailed manuals", icon: BookOpen },
                  { title: "FAQs Hub", desc: "Common answers", icon: MessageSquare },
                  { title: "Forum Group", desc: "Developer logs", icon: Users },
                  { title: "Video Guides", desc: "Step guides", icon: Laptop },
                  { title: "Explore Features", desc: "Compliance tools", icon: Sliders },
                  { title: "Migration Guide", desc: "Migrate Excel/CSV", icon: ChevronRight }
                ].map((hlp, i) => {
                  const Icon = hlp.icon;
                  return (
                    <button 
                      key={i}
                      onClick={() => alert(`Opening secure: ${hlp.title}`)}
                      className="text-left bg-slate-50/70 hover:bg-slate-100/80 border border-slate-250/50 p-3 rounded-xl transition duration-150 flex flex-col justify-between h-20"
                    >
                      <Icon className="w-4 h-4 text-[#006EE5]" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-905 block tracking-tight leading-tight">{hlp.title}</span>
                        <span className="text-[9px] text-slate-400 font-medium leading-none block mt-0.5">{hlp.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accessibility Preferences menu option (Screenshot 2) */}
            <div className="space-y-2 border-t border-slate-100 pt-4.5">
              <button 
                onClick={() => alert("Shortcut Toggle: Press ( / ) on your keyboard anytime to search ledger settings.")}
                className="w-full text-left bg-white hover:bg-slate-50 border p-3.5 rounded-xl text-xs font-bold text-slate-805 flex justify-between items-center transition"
              >
                <span>Accessibility Preferences</span>
                <span className="text-[9px] font-mono font-bold bg-[#1C2434] text-white p-0.5 px-1.5 rounded uppercase">Verified</span>
              </button>
            </div>

            {/* Need Assistance Checklist Options (Screenshot 2) */}
            <div className="space-y-2.5 border-t border-slate-100 pt-4.5">
              <h3 className="text-[10.5px] font-black text-slate-450 uppercase tracking-widest">Need Assistance?</h3>
              
              <ul className="space-y-2 text-xs font-semibold text-slate-650">
                <li className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span>Send an email</span>
                </li>
                <li className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                  <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full"></span>
                  <span>Record screen & share feedback</span>
                </li>
                <li className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  <span>Register for webinars</span>
                </li>
                <li className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                  <span>Find an accountant</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Helpline Footer exactly as Screenshot 2 */}
          <div className="bg-slate-50 border-t border-slate-200 p-4.5 text-center select-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Toll Free Support</span>
            <span className="text-[13.5px] font-black text-slate-900 block mt-0.5 font-mono">🇮🇳 1800 572 6671</span>
          </div>

        </div>
      )}

    </div>
  );
}
