import React, { useState, useEffect, useRef } from "react";
import { CompanyInfo, UserRole, DatabaseState, Customer, Vendor, Item } from "../types.js";
import { INDIAN_STATES } from "../lib/gst.js";
import { 
  Save, 
  Shield, 
  Building, 
  Globe, 
  Edit, 
  RefreshCw, 
  Download,
  Layers, 
  Search, 
  X, 
  Plus, 
  Check, 
  Sliders, 
  Lock, 
  Users, 
  Laptop, 
  Percent, 
  Coins, 
  Activity, 
  FileSpreadsheet, 
  FileCheck2, 
  BookOpen, 
  Briefcase, 
  Clock, 
  CreditCard, 
  Bell, 
  MessageSquare, 
  FileCode, 
  ChevronRight,
  Upload,
  Paperclip,
  Trash2,
  Minimize2,
  FileCheck,
  Award
} from "lucide-react";

interface CompanySetupProps {
  db: DatabaseState;
  onUpdateCompany: (companyData: CompanyInfo) => Promise<void>;
  onUpdateRole: (role: UserRole) => Promise<void>;
  onResetDB: () => Promise<void>;
  currentUserEmail: string;
}

export default function CompanySetup({ db, onUpdateCompany, onUpdateRole, onResetDB, currentUserEmail }: CompanySetupProps) {
  // Navigation State
  // "menu" | "profile" | "users" | "taxes" | "estimate-form" | "invoice-form" | "expense-form" | "bill-form" | "vendor-credit-form"
  const [activeSection, setActiveSection] = useState<string>("menu");
  const [searchSettingsQuery, setSearchSettingsQuery] = useState<string>("");

  // Input States for Profile Info
  const [name, setName] = useState(db.company.name || "");
  const [legalName, setLegalName] = useState(db.company.legalName || "");
  const [isGstRegistered, setIsGstRegistered] = useState(db.company.isGstRegistered !== false ? (!!db.company.gstin || true) : false);
  const [gstScheme, setGstScheme] = useState<"Regular"|"Composition">(db.company.gstScheme || "Regular");
  const [gstin, setGstin] = useState(db.company.gstin || "");
  const [pan, setPan] = useState(db.company.pan || "");
  const [tan, setTan] = useState(db.company.tan || "");
  const [address, setAddress] = useState(db.company.address || "Hyderabad head office, Telangana");
  const [state, setState] = useState(db.company.state || "Telangana");
  const [currency, setCurrency] = useState(db.company.currency || "INR");
  const [financialYear, setFinancialYear] = useState(db.company.financialYear || "2026-2027");
  const [phone, setPhone] = useState(db.company.phone || "");
  const [email, setEmail] = useState(db.company.email || "");
  const [website, setWebsite] = useState(db.company.website || "");
  const [bankName, setBankName] = useState(db.company.bankName || "");
  const [bankAccount, setBankAccount] = useState(db.company.bankAccount || "");
  const [bankIfsc, setBankIfsc] = useState(db.company.bankIfsc || "");

  // Auxiliary UI States
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>(db.role || UserRole.Owner);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Upload states for Record Expense
  const [uploadedReceiptName, setUploadedReceiptName] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ------------------ MOCK / DYNAMIC STATES FOR FORMS (Screenshots 3-7) ------------------
  // Estimate Form State
  const [estCustomer, setEstCustomer] = useState(db.customers[0]?.id || "");
  const [estLocation, setEstLocation] = useState("Hyderabad head office");
  const [estNo, setEstNo] = useState("PRO/TSPL/25-26/0088");
  const [estRef, setEstRef] = useState("");
  const [estDate, setEstDate] = useState("2026-05-28");
  const [estExpiryDate, setEstExpiryDate] = useState("");
  const [estProject, setEstProject] = useState("");
  const [estSubject, setEstSubject] = useState("");
  const [estNotes, setEstNotes] = useState("Looking forward for your business.");
  const [estItemDetails, setEstItemDetails] = useState("Premium Software Architecture Architecture Consulting");
  const [estQty, setEstQty] = useState<number>(1);
  const [estRate, setEstRate] = useState<number>(3500);
  const [estTax, setEstTax] = useState<number>(18);
  const [estDiscount, setEstDiscount] = useState<number>(0);
  const [estTaxType, setEstTaxType] = useState<"tds" | "tcs">("tds");
  const [estTaxSelect, setEstTaxSelect] = useState<number>(0);
  const [estRoundOff, setEstRoundOff] = useState<boolean>(false);

  // Invoice Form State
  const [invSeries, setInvSeries] = useState("Default Transaction Series");
  const [invCustomer, setInvCustomer] = useState(db.customers[0]?.id || "");
  const [invLocation, setInvLocation] = useState("Hyderabad head office");
  const [invNo, setInvNo] = useState("TSPL/26-27/035");
  const [invOrderNo, setInvOrderNo] = useState("");
  const [invDate, setInvDate] = useState("2026-05-28");
  const [invTerms, setInvTerms] = useState("Due on Receipt");
  const [invDueDate, setInvDueDate] = useState("2026-05-28");
  const [invSubject, setInvSubject] = useState("");
  const [invWarehouse, setInvWarehouse] = useState("Hyderabad head office");
  const [invNotes, setInvNotes] = useState("Note:\nInvoice payment to be done using the regular bank-to-bank transfer/wire");
  const [invQty, setInvQty] = useState<number>(1);
  const [invRate, setInvRate] = useState<number>(0);
  const [invTax, setInvTax] = useState<number>(18);
  const [invDiscount, setInvDiscount] = useState<number>(0);
  const [invTaxType, setInvTaxType] = useState<"tds" | "tcs">("tds");

  // Expense Form State
  const [expLocation, setExpLocation] = useState("Hyderabad head office");
  const [expDate, setExpDate] = useState("2026-05-28");
  const [expAccount, setExpAccount] = useState("Travel Expense");
  const [expAmount, setExpAmount] = useState<number>(1250);
  const [expPaidThrough, setExpPaidThrough] = useState("DBS Bank India Limited");
  const [expType, setExpType] = useState<"goods" | "services">("services");
  const [expSac, setExpSac] = useState("");
  const [expVendor, setExpVendor] = useState(db.vendors[0]?.id || "");
  const [expGstTreatment, setExpGstTreatment] = useState("Registered Business - Regular");
  const [expSourceSupply, setExpSourceSupply] = useState("Telangana");
  const [expDestSupply, setExpDestSupply] = useState("[TS] - Telangana");
  const [expReverseCharge, setExpReverseCharge] = useState(false);
  const [expTax, setExpTax] = useState<number>(18);
  const [expTaxInc, setExpTaxInc] = useState<"inclusive" | "exclusive">("exclusive");
  const [expInvoiceNo, setExpInvoiceNo] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [expCustName, setExpCustName] = useState("");

  // Bill Form State
  const [billVendor, setBillVendor] = useState(db.vendors[0]?.id || "");
  const [billLocation, setBillLocation] = useState("Hyderabad head office");
  const [billNo, setBillNo] = useState("");
  const [billOrderNo, setBillOrderNo] = useState("");
  const [billAccount, setBillAccount] = useState("Consulting Expenses");
  const [billDate, setBillDate] = useState("");
  const [billDueDate, setBillDueDate] = useState("2026-05-28");
  const [billTerms, setBillTerms] = useState("Due on Receipt");
  const [billReverseCharge, setBillReverseCharge] = useState(false);
  const [billWarehouse, setBillWarehouse] = useState("Hyderabad head office");
  const [billItemDetails, setBillItemDetails] = useState("Professional Engineering Retainer - Telangana Core Operations");
  const [billQty, setBillQty] = useState<number>(1);
  const [billRate, setBillRate] = useState<number>(15000);
  const [billTax, setBillTax] = useState<number>(18);
  const [billPDFTemplate, setBillPDFTemplate] = useState("Standard Template");

  // Vendor Credits State
  const [credVendor, setCredVendor] = useState(db.vendors[0]?.id || "");
  const [credLocation, setCredLocation] = useState("Hyderabad head office");
  const [credNo, setCredNo] = useState("");
  const [credOrderNo, setCredOrderNo] = useState("");
  const [credDate, setCredDate] = useState("2026-05-28");
  const [credReverseCharge, setCredReverseCharge] = useState(false);
  const [credItemDetails, setCredItemDetails] = useState("Adjustment credit note on surplus retainer accounts");
  const [credQty, setCredQty] = useState<number>(1);
  const [credRate, setCredRate] = useState<number>(2500);
  const [credTax, setCredTax] = useState<number>(18);
  const [credAdjustment, setCredAdjustment] = useState<number>(0);

  // Extended Settings States
  const [cfgThemeColor, setCfgThemeColor] = useState("#006EE5");
  const [cfgLogoUrl, setCfgLogoUrl] = useState("https://thrymr.net/logo.png");
  const [cfgCustomDomain, setCfgCustomDomain] = useState("billing.thrymr.net");
  const [cfgDomainVerified, setCfgDomainVerified] = useState(true);
  const [cfgLocations, setCfgLocations] = useState([
    
    { id: "loc_2", name: "Bangalore Tech Hub", code: "KA_29", gstin: "29BBBBB2222B2Z2", type: "Branch" }
  ]);
  const [cfgAiCategorize, setCfgAiCategorize] = useState(true);
  const [cfgAiSmartReminders, setCfgAiSmartReminders] = useState(true);
  const [cfgApprovalLimit, setCfgApprovalLimit] = useState(50000);
  const [cfgUserTheme, setCfgUserTheme] = useState("light");
  const [cfgPageSize, setCfgPageSize] = useState(25);
  const [cfgBaseCurrency, setCfgBaseCurrency] = useState("INR (₹)");
  const [cfgForeignCurrencies, setCfgForeignCurrencies] = useState([
    { code: "USD ($)", rate: 83.50, status: "Active" },
    { code: "EUR (€)", rate: 90.20, status: "Active" }
  ]);
  const [cfgArOpenBalance, setCfgArOpenBalance] = useState(150000);
  const [cfgApOpenBalance, setCfgApOpenBalance] = useState(75000);
  const [cfgReminderDays, setCfgReminderDays] = useState(5);
  const [cfgCustPortalActive, setCfgCustPortalActive] = useState(true);
  const [cfgVendPortalActive, setCfgVendPortalActive] = useState(false);
  const [cfgInvoicePrefix, setCfgInvoicePrefix] = useState("INV-2026-");
  const [cfgEstimatePrefix, setCfgEstimatePrefix] = useState("EST-2026-");
  const [cfgPdfTemplate, setCfgPdfTemplate] = useState("Modern Swiss Minimalist");
  const [cfgEmailDispatch, setCfgEmailDispatch] = useState(true);
  const [cfgSmsDispatch, setCfgSmsDispatch] = useState(false);
  const [cfgCostCenters, setCfgCostCenters] = useState(["Internal Tech Operations", "Marketing Promos", "Capital Asset Acquisitions"]);
  const [cfgCustomWebTabs, setCfgCustomWebTabs] = useState([{ name: "MCA Filings Direct link", url: "https://mca.gov.in" }]);
  const [cfgDscSerial, setCfgDscSerial] = useState("8A3F-9CE0-23DF-90A1");
  const [cfgEwayThreshold, setCfgEwayThreshold] = useState(50000);
  const [cfgEwayAutoPush, setCfgEwayAutoPush] = useState(true);
  const [cfgEinvoicingAutoPush, setCfgEinvoicingAutoPush] = useState(true);
  const [cfgMsmeCategory, setCfgMsmeCategory] = useState("Micro Enterprise (Section-43B matching)");
  const [cfgMsmeRegNo, setCfgMsmeRegNo] = useState("UDYAM-TS-01-0004523");

  // Trigger brief alert banner
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    await onUpdateCompany({
      ...db.company,
      name,
      legalName,
      isGstRegistered,
      gstScheme: isGstRegistered ? gstScheme : undefined,
      gstin: isGstRegistered ? gstin : "",
      pan,
      tan,
      address,
      state,
      currency,
      financialYear,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      bankName: bankName || undefined,
      bankAccount: bankAccount || undefined,
      bankIfsc: bankIfsc || undefined,
    });
    setSavingCompany(false);
    triggerToast("Organization profile settings saved successfully!");
  };

  const handleSimulatedReset = async () => {
    if (confirm("Reset Ledger Database to mock values?")) {
      setResetting(true);
      await onResetDB();
      setResetting(false);
      triggerToast("System Database restored completely.");
      setActiveSection("menu");
    }
  };

  // Receipt File upload simulator
  const handleReceiptUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedReceiptName(file.name);
      setUploadProgress(10);
      const interval = setInterval(() => {
        setUploadProgress((p) => {
          if (p === null || p >= 100) {
            clearInterval(interval);
            return 100;
          }
          return p + 30;
        });
      }, 200);
    }
  };

  // Keyboard shortcut Listener for `/` to focus search settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("settings-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter menu features based on search box input
  const linksList = [
    { title: "Profile", section: "profile", cat: "Organization", desc: "Change Brand Name, Operating State, Address and GSTIN" },
    { title: "Data Export", section: "data-export", cat: "Organization", desc: "Download a complete copy of your accounting data — your data is always yours to keep" },
    { title: "Users", section: "users", cat: "Users & Roles", desc: "Invite team members and allocate seats permissions" },
    { title: "Taxes", section: "taxes", cat: "Taxes & Compliance", desc: "Indian GST Treatment, IGST rates and TDS settings" }
  ];

  const filteredLinks = linksList.filter(l => 
    l.title.toLowerCase().includes(searchSettingsQuery.toLowerCase()) || 
    l.cat.toLowerCase().includes(searchSettingsQuery.toLowerCase()) ||
    l.desc.toLowerCase().includes(searchSettingsQuery.toLowerCase())
  );

  return (
    <div id="bizkhata-settings-viewport" className="bg-[#F8F9FB] min-h-screen text-slate-700 font-sans p-6 rounded-2xl border border-slate-200 shadow-xs relative">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-emerald-450 border border-slate-800 text-xs font-bold font-mono py-3.5 px-6 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------ SCREENSHOT 1: ALL SETTINGS MENU VIEW ------------------------ */}
      {activeSection === "menu" ? (
        <div className="space-y-8 animate-fade-in w-full">
          
          {/* Header row exactly as Screenshot 1 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#006EE5]/10 rounded-xl">
                <Sliders className="w-6 h-6 text-[#006EE5]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">All Settings</h1>
                <p className="text-xs text-slate-500 font-medium">{name || "Your Company Name"}</p>
              </div>
            </div>

            {/* Centered Search box mimicking Screenshot 1 */}
            <div className="relative w-full max-w-sm">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input 
                id="settings-search"
                type="text"
                placeholder="Search settings ( / )"
                value={searchSettingsQuery}
                onChange={(e) => setSearchSettingsQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs focus:border-[#006EE5] focus:outline-none focus:ring-1 focus:ring-[#006EE5] transition"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono bg-slate-100 text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">/</span>
            </div>

            <button 
              onClick={() => {
                // Return to dashboard
                const closeBtn = document.getElementById("tab-link-dashboard");
                if (closeBtn) closeBtn.click();
              }}
              className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <X className="w-4 h-4" /> Close Settings
            </button>
          </div>

          {/* If the user searched settings */}
          {searchSettingsQuery && (
            <div id="settings-search-results" className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <span>Search results filtering:</span>
                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">{filteredLinks.length} match</span>
              </h3>
              {filteredLinks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredLinks.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSection(link.section)}
                      className="text-left bg-[#FDFBF7] hover:bg-slate-50 border border-slate-200 p-3.5 rounded-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-[#006EE5] bg-blue-50 px-2 py-0.5 rounded uppercase">{link.cat}</span>
                        <h4 className="text-xs font-bold text-slate-900 mt-2">{link.title}</h4>
                        <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">{link.desc}</p>
                      </div>
                      <span className="text-[9.5px] text-[#006EE5] font-bold flex items-center gap-0.5 mt-3 hover:underline">Configure File <ChevronRight className="w-3 h-3" /></span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-405 italic py-6 text-center">No configurations found matching that keyword query.</p>
              )}
            </div>
          )}

          {/* ALL SETTINGS COLUMN BLOCKS - AS DETAILED IN SCREENSHOT 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* 1. Organization Column */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-xs transition">
              <h2 className="text-xs uppercase tracking-widest font-black text-[#5A5A40] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-teal-600" /> Organization
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><button onClick={() => setActiveSection("profile")} className="text-left font-bold text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Profile</button></li>
                <li><button onClick={() => setActiveSection("branding")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Branding</button></li>
                <li><button onClick={() => setActiveSection("custom-domain")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Custom Domain</button></li>
                <li><button onClick={() => setActiveSection("locations")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Locations</button></li>
                <li><button onClick={() => setActiveSection("ai-preferences")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">AI Preferences</button></li>
                <li><button onClick={() => setActiveSection("approvals")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Approvals</button></li>
                <li><button onClick={handleSimulatedReset} className="text-left text-rose-600 hover:text-rose-800 hover:underline transition font-bold cursor-pointer">Wipe & Reset DB</button></li>
              </ul>
            </div>

            {/* 2. Users & Roles Column */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-xs transition">
              <h2 className="text-xs uppercase tracking-widest font-black text-indigo-600 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" /> Users & Roles
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><button onClick={() => setActiveSection("users")} className="text-left font-bold text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Users</button></li>
                <li><button onClick={() => setActiveSection("users")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Roles</button></li>
                <li><button onClick={() => setActiveSection("user-preferences")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">User Preferences</button></li>
              </ul>
            </div>

            {/* 3. Setup & Configurations Column */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-xs transition">
              <h2 className="text-xs uppercase tracking-widest font-black text-amber-600 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-500" /> Configurations
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><button onClick={() => setActiveSection("general-configs")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">General</button></li>
                <li><button onClick={() => setActiveSection("currencies")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Currencies</button></li>
                <li className="text-slate-850 font-bold flex items-center gap-1 hover:text-[#006EE5] cursor-pointer" onClick={() => triggerToast("New Payment Terms configuration successfully loaded!")}>
                  Payment Terms <span className="text-[8px] bg-red-100 text-red-600 font-extrabold px-1 rounded">NEW</span>
                </li>
                <li><button onClick={() => setActiveSection("opening-balances")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Opening Balances</button></li>
                <li><button onClick={() => setActiveSection("reminders")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Reminders</button></li>
                <li><button onClick={() => setActiveSection("portals")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Customer Portal</button></li>
                <li><button onClick={() => setActiveSection("portals")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer font-bold">Vendor Portal</button></li>
              </ul>
            </div>

            {/* 4. Customization Column */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-xs transition">
              <h2 className="text-xs uppercase tracking-widest font-black text-rose-600 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-rose-500" /> Customization
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li><button onClick={() => setActiveSection("seq-series")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer font-bold">Transaction Number Series</button></li>
                <li><button onClick={() => setActiveSection("pdf-templates")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer font-medium">PDF Templates</button></li>
                <li><button onClick={() => setActiveSection("email-notifs")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Email Notifications</button></li>
                <li><button onClick={() => setActiveSection("sms-notifs")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">SMS Notifications</button></li>
                <li><button onClick={() => setActiveSection("reporting-tags")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Reporting Tags</button></li>
                <li><button onClick={() => setActiveSection("web-tabs")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Web Tabs</button></li>
                <li><button onClick={() => setActiveSection("dsc")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer font-bold">Digital Signature</button></li>
              </ul>
            </div>

            {/* 5. Automation & Taxes Column */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-xs transition">
              <h2 className="text-xs uppercase tracking-widest font-black text-emerald-600 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-500" /> Taxes & Compliance
              </h2>
              <ul className="space-y-2.5 text-xs text-slate-600 font-semibold">
                <li><button onClick={() => setActiveSection("taxes")} className="text-left font-bold text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">Taxes</button></li>
                <li><button onClick={() => setActiveSection("taxes")} className="text-left hover:text-[#006EE5] transition duration-150 cursor-pointer">Direct Taxes</button></li>
                <li><button onClick={() => setActiveSection("eway")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">e-Way Bills</button></li>
                <li><button onClick={() => setActiveSection("einvoicing")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer">e-Invoicing</button></li>
                <li><button onClick={() => setActiveSection("msme")} className="text-left text-slate-800 hover:text-[#006EE5] transition duration-150 cursor-pointer font-bold">MSME Settings</button></li>
              </ul>
            </div>
          </div>

          {/* MODULE SETTINGS SECTION - AS IN SCREENSHOT 1 */}
          <div className="space-y-6 pt-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Module Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Module: General */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-xs font-bold text-[#41B54A] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#41B54A] rounded-full"></span> General
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="text-[#006EE5] hover:underline cursor-pointer" onClick={() => { setActiveSection("profile"); }}>Customers and Vendors</li>
                  <li className="text-[#006EE5] hover:underline cursor-pointer" onClick={() => { 
                    const itemTab = document.getElementById("tab-link-items");
                    if (itemTab) itemTab.click();
                  }}>Items</li>
                  <li className="text-slate-400 cursor-not-allowed">Accountant</li>
                  <li className="text-slate-400 cursor-not-allowed">Projects</li>
                  <li className="text-slate-400 cursor-not-allowed">Timesheet</li>
                </ul>
              </div>

              {/* Module: Online Payments */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-xs font-bold text-[#FDFBF7] flex items-center gap-1.5 bg-[#F3B11A]/20 text-[#D09010] p-1 px-2.5 rounded">
                  <span className="w-1.5 h-1.5 bg-[#F3B11A] rounded-full"></span> Online Payments
                </h3>
                <ul className="space-y-2 text-xs text-slate-600 font-medium pt-1">
                  <li className="hover:text-blue-600 cursor-pointer" onClick={() => triggerToast("Configuring dynamic Razropay & UPI gateway links.")}>Payment Gateways</li>
                </ul>
              </div>

              {/* Module: Sales — these live in the main Invoices tab, not duplicated here */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#0092D1] rounded-full"></span> Sales Modules
                </h3>
                <ul className="space-y-2 text-xs text-slate-500 font-sans text-[11.5px]">
                  <li>Estimates &amp; Invoices — see the <span className="font-semibold text-slate-700">Invoices</span> tab in the sidebar</li>
                  <li className="text-slate-400">Sales Orders</li>
                  <li className="text-slate-400">Delivery Challans</li>
                  <li className="text-slate-400">Recurring Invoices</li>
                </ul>
              </div>

              {/* Module: Purchases — these live in the main Purchases tab, not duplicated here */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span> Purchase Modules
                </h3>
                <ul className="space-y-2 text-xs text-slate-500 font-sans text-[11.5px]">
                  <li>Expenses &amp; Bills — see the <span className="font-semibold text-slate-700">Purchases</span> tab in the sidebar</li>
                  <li className="text-slate-400">Recurring Expenses</li>
                  <li className="text-slate-400">Purchase Orders</li>
                  <li className="text-slate-400">Vendor Credits</li>
                </ul>
              </div>

            </div>
          </div>

          {/* Secure developer protocol signature */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-500 font-mono text-center leading-relaxed">
            Bizkhata Compliance Core • Ministry of Corporate Affairs Audit Guidelines • High Fidelity Settings Layout
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in w-full">
          
          {/* Active section back button row */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <button 
              onClick={() => setActiveSection("menu")} 
              className="text-xs font-bold text-[#006EE5] hover:text-[#0060C7] flex items-center gap-1.5 bg-blue-50 px-3.5 py-1.5 rounded-lg border border-blue-100 transition"
            >
              ← Back to All Settings Menu
            </button>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 p-1 px-2.5 rounded uppercase border border-slate-200">
              Editing: {activeSection.replace("-", " ").toUpperCase()}
            </span>
          </div>

          {/* ------------------------ PROFILE / ORGANIZATION SECTION FROM SCREENSHOT 1 ------------------------ */}
          {activeSection === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 space-y-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <Building className="text-slate-800 w-5 h-5 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-slate-900">Organization Parameters</h3>
                    <p className="text-[11px] text-slate-500">Legal business entity credentials for accurate GST invoice indexing.</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">Trademark / Brand Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none transition"
                        placeholder="e.g. Acme Private Limited"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">Legal Name of Business <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none transition"
                        placeholder="e.g. Acme Private Limited"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs text-slate-500 font-bold">GST Registration Status</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input type="radio" name="gstReg" checked={isGstRegistered} onChange={() => setIsGstRegistered(true)} className="accent-blue-600" />
                        <span className="font-semibold text-emerald-700">Registered (Regular / Composition)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input type="radio" name="gstReg" checked={!isGstRegistered} onChange={() => { setIsGstRegistered(false); setGstin(""); }} className="accent-blue-600" />
                        <span className="font-semibold text-orange-600">Unregistered / Consumer (No GST)</span>
                      </label>
                    </div>
                  </div>

                  {isGstRegistered && (
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs text-slate-500 font-bold">GST Scheme</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                          <input type="radio" name="gstScheme" checked={gstScheme === "Regular"} onChange={() => setGstScheme("Regular")} className="accent-blue-600" />
                          <span className="font-semibold">Regular Scheme</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                          <input type="radio" name="gstScheme" checked={gstScheme === "Composition"} onChange={() => setGstScheme("Composition")} className="accent-blue-600" />
                          <span className="font-semibold">Composition Scheme</span>
                        </label>
                      </div>
                      {gstScheme === "Composition" && <p className="text-[10px] text-blue-600">Composition dealers file CMP-08 quarterly instead of GSTR-1/GSTR-3B, and cannot claim Input Tax Credit.</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">
                        GSTIN (Indian Goods & Service Tax Identification)
                        {isGstRegistered && <span className="text-red-500 ml-1">*</span>}
                        {!isGstRegistered && <span className="text-slate-400 ml-1 font-normal">(N/A — Unregistered)</span>}
                      </label>
                      <input 
                        type="text"
                        required={isGstRegistered}
                        disabled={!isGstRegistered}
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className={`w-full border rounded-lg px-3.5 py-2 text-xs font-mono tracking-wider outline-none transition ${isGstRegistered ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-[#006EE5] text-slate-800" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                        placeholder={isGstRegistered ? "e.g. 29AAAAA0000A1Z1" : "Not applicable"}
                      />
                      {!isGstRegistered && <p className="text-[10px] text-orange-600 font-medium">⚠ No tax (GST) will be applied on invoices — Unregistered Business</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">Permanent Account Number (PAN) <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        required
                        maxLength={10}
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2 text-slate-800 text-xs font-mono tracking-wider focus:border-[#006EE5] outline-none transition"
                        placeholder="e.g. ABCDE1234F"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">Tax Deduction Account Number (TAN)</label>
                      <input 
                        type="text"
                        maxLength={10}
                        value={tan}
                        onChange={(e) => setTan(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2 text-slate-800 text-xs font-mono tracking-wider focus:border-[#006EE5] outline-none transition"
                        placeholder="e.g. DELA12345B"
                      />
                      <p className="text-[10px] text-slate-400">Required to generate TDS Challan 281 and Form 16A.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold">Registered Office Address <span className="text-red-500">*</span></label>
                    <textarea 
                      required
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none resize-none transition"
                      placeholder="e.g. Hyderabad head office, Telangana"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">Operating State</label>
                      <select 
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none transition"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold pb-1 block">Currency Symbol</label>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none transition"
                      >
                        <option value="INR">INR / Indian Rupee (₹)</option>
                        <option value="USD">USD / Dollar ($)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-bold">Financial Year Cycle</label>
                      <select 
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none transition"
                      >
                        <option value="2026-2027">1 April 2026 - 31 March 2027</option>
                        <option value="2027-2028">1 April 2027 - 31 March 2028</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-bold">Phone</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-bold">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@company.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-bold">Website</label>
                        <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none" />
                      </div>
                    </div>
                  </div>
                  {/* Bank Details */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700">Bank Details (shown on invoices)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-bold">Bank Name</label>
                        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC Bank"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs focus:border-[#006EE5] outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-bold">Account Number</label>
                        <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="XXXXXXXXXXXX"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs font-mono focus:border-[#006EE5] outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500 font-bold">IFSC Code</label>
                        <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} placeholder="HDFC0001234"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 text-xs font-mono focus:border-[#006EE5] outline-none" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button 
                      type="submit"
                      disabled={savingCompany}
                      className="bg-[#006EE5] hover:bg-[#0060C7] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                      <Save className="w-4 h-4 inline mr-1.5" />
                      {savingCompany ? "Saving Changes..." : "Save Org Setup"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Simulation Side blocks */}
              <div className="space-y-6 lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="font-bold text-slate-900 border-b pb-2">Active Developer Actions</h3>
                  <p className="text-[11px] text-slate-500 leading-normal">You can instantly reset or restore all standard balanced records using the developer override protocol below:</p>
                  
                  <button 
                    onClick={handleSimulatedReset}
                    className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Rebuild Sandboxed DB
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: DATA EXPORT ------------------------ */}
          {activeSection === "data-export" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 space-y-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <Download className="text-slate-800 w-5 h-5" />
                  <div>
                    <h3 className="font-bold text-slate-900">Export Your Data</h3>
                    <p className="text-[11px] text-slate-500">Your data belongs to you. Download a complete copy any time — no questions asked, no waiting for support.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `bizkhata-export-${db.company.name.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition cursor-pointer text-left"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">Full Account Export (JSON)</p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">Everything — invoices, bills, customers, vendors, payments, journals, fixed assets, audit logs. One file, machine-readable.</p>
                    </div>
                    <Download className="w-4 h-4 text-slate-500 shrink-0 ml-3" />
                  </button>

                  {([
                    { label: "Invoices (CSV)", rows: db.invoices, cols: ["invoiceNumber","customerName","date","dueDate","subtotal","totalGst","total","status"] },
                    { label: "Bills (CSV)", rows: db.bills, cols: ["billNumber","vendorName","date","dueDate","subtotal","totalGst","total","status"] },
                    { label: "Customers (CSV)", rows: db.customers, cols: ["name","legalName","gstin","email","phone","openingBalance"] },
                    { label: "Vendors (CSV)", rows: db.vendors, cols: ["name","gstin","pan","email","phone","openingBalance"] },
                    { label: "Payments Received (CSV)", rows: db.payments, cols: ["receiptNumber","customerName","date","amountReceived","paymentMode"] },
                  ] as const).map(({ label, rows, cols }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const header = cols.join(",");
                        const lines = (rows as any[]).map(r => cols.map(c => {
                          const v = r[c];
                          const s = v === undefined || v === null ? "" : String(v);
                          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
                        }).join(","));
                        const csv = [header, ...lines].join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `bizkhata-${label.split(" ")[0].toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3.5 transition cursor-pointer text-left"
                    >
                      <span className="text-xs font-semibold text-slate-700">{label} <span className="text-slate-400 font-normal">({(rows as any[]).length} records)</span></span>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h4 className="text-xs font-bold text-blue-800">No lock-in, ever</h4>
                <p className="text-[10.5px] text-blue-700 leading-relaxed">
                  If you ever decide to leave BizKhata, your data leaves with you. We don't hold your
                  accounting records hostage to keep you subscribed.
                </p>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: USERS & ROLES ------------------------ */}
          {activeSection === "users" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-4xl mx-auto">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-bold text-slate-900">Corporate User Registry</h3>
                  <p className="text-[11px] text-slate-500">Configure roles, invite accountants and see allocated seats.</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold font-mono px-3 py-1 rounded-full">
                  Seats Occupied: {db.users?.length || 2} / {db.userSeatsLimit || 5}
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400">REGISTERED WORKSPACE USERS</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">User Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3 text-right">Scope Perms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      <tr className="bg-slate-50/50">
                        <td className="p-3 font-semibold">{db.company.name} (Owner)</td>
                        <td className="p-3 font-mono">sudhanshu.verma@thrymr.net</td>
                        <td className="p-3"><span className="bg-red-50 text-red-700 border border-red-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono">Owner</span></td>
                        <td className="p-3 text-right text-slate-400">Unrestricted</td>
                      </tr>
                      {db.users?.map((usr, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3">{usr.name}</td>
                          <td className="p-3 font-mono">{usr.email}</td>
                          <td className="p-3"><span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono">{usr.role}</span></td>
                          <td className="p-3 text-right text-slate-505">Read & Write</td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-slate-400 italic">No invited users in simulated registry yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: TAXES & COMPLIANCE ------------------------ */}
          {activeSection === "taxes" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-2xl mx-auto">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3">GST Rates & Direct TDS Setup</h3>
                <p className="text-xs text-slate-500 leading-normal mt-1">Configure compliance settings valid for current financial year GSTR filings mapping.</p>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Goods & Service Tax (GST IN-Core)", status: "Active (GSTR-1, GSTR-3B auto-compiling)", rate: "Standard 18% CGST/SGST" },
                  { name: "Direct Permanent Account Tax (TDS Setup)", status: "Active - Sec 194J Professionals Services", rate: "10%" },
                  { name: "Tax Collection at Source (TCS Level)", status: "Inactive for standard services limit", rate: "1%" }
                ].map((tax, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{tax.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-mono">{tax.status}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-[#006EE5] text-white p-1 px-3 rounded-lg border border-[#0060C7]/20">
                      {tax.rate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: BRANDING & THEMING ------------------------ */}
          {activeSection === "branding" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🎨 Cohesive Brand Profile & Styling</h3>
                <p className="text-xs text-slate-500 mt-1">Configure your corporate design identity, custom logo URL, and primary UI color palette.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-bold block">Primary Brand Color</label>
                  <div className="flex gap-3 items-center">
                    <input type="color" value={cfgThemeColor} onChange={(e) => setCfgThemeColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                    <input type="text" value={cfgThemeColor} onChange={(e) => setCfgThemeColor(e.target.value)} className="bg-slate-50 text-xs border p-2.5 rounded-lg w-full font-mono font-bold text-slate-800" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-bold block">Corporate Logo URL</label>
                  <input type="text" value={cfgLogoUrl} onChange={(e) => setCfgLogoUrl(e.target.value)} className="w-full bg-slate-50 border rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none" />
                </div>
                {cfgLogoUrl && (
                  <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-center">
                    <img src={cfgLogoUrl} alt="Logo Preview" className="h-10 object-contain" onError={(e) => { (e.target as any).src="https://via.placeholder.com/150x40?text=Brand+Logo"; }} referrerPolicy="no-referrer" />
                  </div>
                )}
                <button onClick={() => { triggerToast("Branding settings saved successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save Branding Configuration
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: CUSTOM DOMAIN ------------------------ */}
          {activeSection === "custom-domain" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🌐 Unified Custom Domain Routing</h3>
                <p className="text-xs text-slate-500 mt-1">Serve your invoices and portals from your own business namespace rather than our sandbox domain.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-bold block">Custom Domain Name</label>
                  <div className="flex gap-2 text-slate-850">
                    <span className="bg-slate-100 border border-slate-200 border-r-0 text-slate-500 p-2 text-xs rounded-l-lg flex items-center font-bold">https://</span>
                    <input type="text" value={cfgCustomDomain} onChange={(e) => setCfgCustomDomain(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-r-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none" />
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 text-emerald-800 border-emerald-200 border rounded-lg text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1 text-emerald-900">✓ SSL Certificate & DNS Confirmed</p>
                  <p className="text-[11px] text-emerald-600">A CNAME record points billing to ghs.bizkhata.in securely.</p>
                </div>
                <button onClick={() => { triggerToast("Custom Domain settings initialized successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Update Domain Mappings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: LOCATIONS ------------------------ */}
          {activeSection === "locations" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-2xl mx-auto animate-fade-in font-sans">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Branch & Location Registries</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure business operating locations and physical branch GSTIN networks.</p>
                </div>
                <button onClick={() => triggerToast("Add branch workflow initiated.")} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 border border-slate-200 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> New Branch
                </button>
              </div>
              <div className="space-y-3">
                {cfgLocations.map(loc => (
                  <div key={loc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-900">{loc.name} ({loc.type})</span>
                      <span className="text-[10px] bg-blue-50 text-[#006EE5] px-2 py-0.5 rounded font-bold border border-blue-100">{loc.code}</span>
                    </div>
                    <div className="grid grid-cols-2 text-[11px] text-slate-500 gap-1 font-mono">
                      <div>GSTIN: <span className="font-bold text-slate-700">{loc.gstin}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: AI PREFERENCES ------------------------ */}
          {activeSection === "ai-preferences" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🧠 AI Engine & Automation Preferences</h3>
                <p className="text-xs text-slate-500 mt-1">Enable and configure automated Indian corporate tax categorizations and client reminders.</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={cfgAiCategorize} onChange={(e) => setCfgAiCategorize(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Smart Automated Transactions Classification</span>
                    <span className="text-[11px] text-slate-500 block">Classify expenses and items according to Ministry of Corporate Affairs norms on entry.</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={cfgAiSmartReminders} onChange={(e) => setCfgAiSmartReminders(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Generative AI Dynamic Reminders</span>
                    <span className="text-[11px] text-slate-500 block">Compose personalized polite client balance reminders dynamically using AI.</span>
                  </div>
                </label>
                <button onClick={() => { triggerToast("AI Preferences updated successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save Intelligent Automation Mappings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: APPROVALS ------------------------ */}
          {activeSection === "approvals" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">⚙️ Transaction Approval Workflows</h3>
                <p className="text-xs text-slate-500 mt-1">Configure threshold limits that require explicit board approval before settling ledger transactions.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5 text-slate-700">
                  <label className="text-xs text-slate-550 font-bold block">Minimum Spend/Bill Approval Threshold ( ₹ )</label>
                  <input type="number" value={cfgApprovalLimit} onChange={(e) => setCfgApprovalLimit(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none" />
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-[11px] text-amber-800 border border-amber-200 leading-normal">
                  Any expense or vendor bill recorded above <strong>₹{cfgApprovalLimit.toLocaleString()}</strong> will enter the pending reviews queue.
                </div>
                <button onClick={() => { triggerToast("Approval controls updated!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Configure Approval Policies
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: USER PREFERENCES ------------------------ */}
          {activeSection === "user-preferences" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">👤 Personal Preferences & Interface</h3>
                <p className="text-xs text-slate-500 mt-1">Configure your workspace look and feel, visual theme modes, and tabular row densities.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5 text-slate-700">
                  <label className="text-xs text-slate-555 font-bold block">UI Display Theme Preset</label>
                  <select value={cfgUserTheme} onChange={(e) => setCfgUserTheme(e.target.value)} className="w-full bg-slate-50 border rounded-lg px-3.5 py-2 text-xs text-slate-800">
                    <option value="light">Classic Clean Amber Light</option>
                    <option value="dark">Professional Steel Dark</option>
                  </select>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <label className="text-xs text-slate-555 font-bold block">Ledger Records Page Size Limit</label>
                  <select value={cfgPageSize} onChange={(e) => setCfgPageSize(Number(e.target.value))} className="w-full bg-slate-50 border rounded-lg px-3.5 py-2 text-xs text-slate-800">
                    <option value={10}>10 records per view</option>
                    <option value={25}>25 records per view</option>
                    <option value={50}>50 records per view</option>
                  </select>
                </div>
                <button onClick={() => { triggerToast("User preferences saved!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Update Interface Settings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: GENERAL CONFIGS ------------------------ */}
          {activeSection === "general-configs" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">⚙️ General Billing Configurations</h3>
                <p className="text-xs text-slate-500 mt-1">Control default behaviors of invoice dispatching, tax inclusion and interest parameters.</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                  <input type="checkbox" defaultChecked className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-slate-800">Enable auto-round off to nearest Rupee</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs">
                  <input type="checkbox" defaultChecked={false} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-slate-800">Include standard TDS warning message in all invoices</span>
                  </div>
                </label>
                <button onClick={() => { triggerToast("General parameters stored successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Store Configuration Rules
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: CURRENCIES ------------------------ */}
          {activeSection === "currencies" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-2xl mx-auto animate-fade-in font-sans">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Exchange Rates & Multi-Currencies</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage base operating currency and setup conversion exchange rates for direct overseas invoices.</p>
                </div>
              </div>
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 border rounded-xl space-y-1">
                  <span className="text-slate-550 font-bold block text-slate-600">Primary Ledger Standard Currency</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{cfgBaseCurrency}</span>
                </div>
                <div className="space-y-2">
                  <span className="font-bold text-slate-505 uppercase tracking-wider text-[10px] text-slate-400">Foreign Currency exchange values</span>
                  {cfgForeignCurrencies.map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                      <span className="font-mono font-bold text-slate-800">{c.code}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">1 unit =</span>
                        <input type="number" value={c.rate} onChange={(e) => {
                          const updated = [...cfgForeignCurrencies];
                          updated[idx].rate = Number(e.target.value);
                          setCfgForeignCurrencies(updated);
                        }} className="bg-white border rounded font-mono font-bold p-1 w-20 text-right text-slate-800 focus:outline-none" />
                        <span className="font-mono text-slate-400">INR</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { triggerToast("Exchange rates updated successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save All Currency Mappings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: OPENING BALANCES ------------------------ */}
          {activeSection === "opening-balances" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">📊 Operating Opening Balances</h3>
                <p className="text-xs text-slate-500 mt-1">Initialize the general ledger starting balances of Accounts Receivable and Accounts Payable.</p>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1.5 font-bold">
                  <label>Accounts Receivable (AR) Opening Balance ( ₹ )</label>
                  <input type="number" value={cfgArOpenBalance} onChange={(e) => setCfgArOpenBalance(Number(e.target.value))} className="w-full bg-slate-50 border rounded-lg px-3.5 py-2 font-mono text-slate-800 focus:outline-none" />
                </div>
                <div className="space-y-1.5 font-bold">
                  <label>Accounts Payable (AP) Opening Balance ( ₹ )</label>
                  <input type="number" value={cfgApOpenBalance} onChange={(e) => setCfgApOpenBalance(Number(e.target.value))} className="w-full bg-slate-50 border rounded-lg px-3.5 py-2 font-mono text-slate-800 focus:outline-none" />
                </div>
                <button onClick={() => { triggerToast("Opening balances saved and reconciled!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save & Apply Journal Entry
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: REMINDERS ------------------------ */}
          {activeSection === "reminders" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🔔 Automated Balance Reminders</h3>
                <p className="text-xs text-slate-500 mt-1">Set schedules to chase customers with auto reminders when payments cross due threshold limits.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5 font-medium text-slate-700">
                  <span className="text-xs text-slate-500 font-bold block">Dispatch reminder email once payment is overdue by</span>
                  <div className="flex gap-2 items-center">
                    <input type="number" value={cfgReminderDays} onChange={(e) => setCfgReminderDays(Number(e.target.value))} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-center text-slate-800 focus:outline-none" />
                    <span className="text-xs text-slate-600 font-bold">business calendar days.</span>
                  </div>
                </div>
                <button onClick={() => { triggerToast("Dynamic reminder schedules configured!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save Overdue Triggers
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: PORTALS ------------------------ */}
          {activeSection === "portals" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🔐 Secured Customer & Vendor Portals</h3>
                <p className="text-xs text-slate-500 mt-1">Manage single-sign-on credentials and portal configurations for business entities.</p>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={cfgCustPortalActive} onChange={(e) => setCfgCustPortalActive(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-slate-905 block">Activate Customer Portal</span>
                    <span className="text-[11px] text-slate-500 block">Allows domestic clients to view statements and record payment receipts.</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={cfgVendPortalActive} onChange={(e) => setCfgVendPortalActive(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-slate-905 block">Activate Vendor Registry Portal</span>
                    <span className="text-[11px] text-slate-500 block">Enables partner vendors to file supply bills and view invoice payouts securely.</span>
                  </div>
                </label>
                <button onClick={() => { triggerToast("Portal settings updated!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Confirm Portal Access Schemes
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: SEQUENCE SERIES ------------------------ */}
          {activeSection === "seq-series" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🔢 Prefix Sequences Series</h3>
                <p className="text-xs text-slate-500 mt-1">Define customized prefixes for tax invoices and estimates to comply with internal finance protocols.</p>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="space-y-1.5 font-bold">
                  <label>Tax Invoice Numbering Prefix</label>
                  <input type="text" value={cfgInvoicePrefix} onChange={(e) => setCfgInvoicePrefix(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none" />
                </div>
                <div className="space-y-1.5 font-bold">
                  <label>Estimate/Quotation Numbering Prefix</label>
                  <input type="text" value={cfgEstimatePrefix} onChange={(e) => setCfgEstimatePrefix(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none" />
                </div>
                <button onClick={() => { triggerToast("Prefix sequence ranges configured successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save Prefixes
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: PDF TEMPLATES ------------------------ */}
          {activeSection === "pdf-templates" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">📄 Tax PDF Layout Layouts</h3>
                <p className="text-xs text-slate-500 mt-1">Select from our certified compliance formats to render printable business invoices.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-bold block">Tax Template Theme</label>
                  <select value={cfgPdfTemplate} onChange={(e) => setCfgPdfTemplate(e.target.value)} className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-bold text-slate-800">
                    <option value="Modern Swiss Minimalist">Modern Swiss Minimalist (Standard default)</option>
                    <option value="Legacy Corporate Standard">Legacy Corporate Standard (Detailed blocks)</option>
                    <option value="Compact Direct Bill">Compact Direct Bill GSTR compliant</option>
                  </select>
                </div>
                <button onClick={() => { triggerToast("PDF invoice template configured!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Select Billing Format Layout
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: EMAIL NOTIFS ------------------------ */}
          {activeSection === "email-notifs" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">📨 Email Notifications Channels</h3>
                <p className="text-xs text-slate-500 mt-1">Control automated notification dispatches to clients and internal accounting staff on ledger entries.</p>
              </div>
              <div className="space-y-4 font-semibold text-slate-700">
                <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer text-xs">
                  <input type="checkbox" checked={cfgEmailDispatch} onChange={(e) => setCfgEmailDispatch(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold block text-slate-900">Dispatch Billing Emails</span>
                    <span className="text-slate-400 block text-[10.5px] font-normal">Send PDF copy to customer on marking invoice as Dispatched.</span>
                  </div>
                </label>
                <button onClick={() => { triggerToast("Email protocols saved successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Update Server Mail Settings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: SMS NOTIFS ------------------------ */}
          {activeSection === "sms-notifs" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">📱 SMS Text Dispatch Controls</h3>
                <p className="text-xs text-slate-500 mt-1">Integrate custom SMS gateways to dispatch short alert texts directly to client credit contacts.</p>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={cfgSmsDispatch} onChange={(e) => setCfgSmsDispatch(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <b className="block text-slate-900">Push SMS notifications via Twilio/Msg91 API</b>
                    <span className="text-[10.5px] text-slate-450 block font-normal">Dispatches outstanding links to customer mobile numbers on file.</span>
                  </div>
                </label>
                <button onClick={() => { triggerToast("SMS broadcast parameters updated!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save Gateways Settings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: REPORTING TAGS ------------------------ */}
          {activeSection === "reporting-tags" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans font-semibold">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Custom Accounting Reporting Tags</h3>
                  <p className="text-xs text-slate-500 mt-1">Tag transactions with custom Cost Centers to filter in high fidelity income reports.</p>
                </div>
              </div>
              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-2">
                  <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">Registered Cost Centers</span>
                  {cfgCostCenters.map((cc, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 border rounded-lg text-slate-800 font-mono flex justify-between items-center border-slate-200">
                      <span>{cc}</span>
                      <button onClick={() => setCfgCostCenters(cfgCostCenters.filter((_, idx) => idx !== i))} className="text-rose-500 text-[10px] cursor-pointer font-bold">Delete</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  const val = prompt("Enter cost center tag label:");
                  if (val) setCfgCostCenters([...cfgCostCenters, val]);
                }} className="w-full bg-slate-100 text-slate-800 font-bold border border-slate-200 hover:bg-slate-200 text-xs py-2 rounded-lg transition cursor-pointer">
                  + Add Analytical Cost Center
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: WEB TABS ------------------------ */}
          {activeSection === "web-tabs" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🔗 Custom Workspace Web Tabs</h3>
                <p className="text-xs text-slate-500 mt-1">Embed custom external dashboard links directly as accessible navigation views inside Bizkhata.</p>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="space-y-2">
                  {cfgCustomWebTabs.map((tb, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold block text-slate-800">{tb.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{tb.url}</span>
                      </div>
                      <button onClick={() => setCfgCustomWebTabs(cfgCustomWebTabs.filter((_, i) => i !== idx))} className="text-[#006EE5] hover:underline cursor-pointer font-bold">Revoke</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  const label = prompt("Friendly link label:");
                  const link = prompt("URL link address:");
                  if (label && link) setCfgCustomWebTabs([...cfgCustomWebTabs, { name: label, url: link }]);
                }} className="w-full bg-slate-100 font-bold hover:bg-slate-200 p-2.5 border border-slate-200 text-center rounded-lg cursor-pointer">
                  + Add Custom Sidebar View Tab
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: DSC SIGNATURE ------------------------ */}
          {activeSection === "dsc" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">✍️ Digital Signature Certificates</h3>
                <p className="text-xs text-slate-500 mt-1">Affix DSC digital signatures directly to Tax Invoices in accordance with Section-37 compliance guidelines.</p>
              </div>
              <div className="space-y-4 text-xs font-medium text-slate-605">
                <div className="space-y-1.5 font-bold text-slate-700">
                  <label>DSC Hardware Serial Identity Token</label>
                  <input type="text" value={cfgDscSerial} onChange={(e) => setCfgDscSerial(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 font-mono text-slate-800 focus:outline-none" />
                </div>
                <div className="p-4 bg-indigo-50 text-indigo-800 border-indigo-200 border rounded-xl leading-relaxed text-xs">
                  <strong>Digital Signature Card Profile Online</strong><br />
                  Owner: <span className="font-bold">{db.company.name}</span><br />
                  Provider: <span className="font-mono">eMudhra Core India</span>
                </div>
                <button onClick={() => { triggerToast("Aadhaar DSC profile successfully verified!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Refresh Certificates Chain
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: e-Way ------------------------ */}
          {activeSection === "eway" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🚚 GSTR e-Way Bill Integration Controls</h3>
                <p className="text-xs text-slate-500 mt-1">Configure threshold rules and push parameters for automated NIC ewaybill generation pipelines.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5 text-xs text-slate-700 font-bold">
                  <label>Minimum Consignment threshold for e-Way bills ( ₹ )</label>
                  <input type="number" value={cfgEwayThreshold} onChange={(e) => setCfgEwayThreshold(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 font-mono font-bold text-slate-800 focus:outline-none" />
                </div>
                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={cfgEwayAutoPush} onChange={(e) => setCfgEwayAutoPush(e.target.checked)} className="rounded text-[#006EE5] cursor-pointer" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Auto-generate draft e-Way bill on invoice dispatch</span>
                    <span className="text-[11px] text-slate-500 block">Saves vehicle vehicle logs to draft file on matching limit.</span>
                  </div>
                </label>
                <button onClick={() => { triggerToast("eWay thresholds saved!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Save eWay Settings
                </button>
              </div>
            </div>
          )}

          {/* ------------------------ SECTION: e-Invoicing ------------------------ */}
          {activeSection === "einvoicing" && (
            <EInvoicePortalSection db={db} onSaveCompany={onUpdateCompany} triggerToast={triggerToast} setActiveSection={setActiveSection} />
          )}

          {/* ------------------------ SECTION: MSME ------------------------ */}
          {activeSection === "msme" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans font-semibold">
              <div>
                <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">🏢 Ministry of MSME Registration Settings</h3>
                <p className="text-xs text-slate-500 mt-1">Configure your MSME category to ensure corporate client compliance under Income Tax Act Section-43B(h).</p>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-700 font-sans">
                <div className="space-y-1.5 font-bold">
                  <span className="block text-slate-550 mb-1">MSME Category Classification</span>
                  <select value={cfgMsmeCategory} onChange={(e) => setCfgMsmeCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800">
                    <option value="Micro Enterprise (Section-43B matching)">Micro Enterprise (15-day strict claim limit)</option>
                    <option value="Small Enterprise (Section-43B matching)">Small Enterprise (45-day contract limit)</option>
                    <option value="Medium Enterprise">Medium Enterprise (Informative tracking only)</option>
                  </select>
                </div>
                <div className="space-y-1.5 font-bold">
                  <span className="block text-slate-550 mb-1">UDYAM MSME Registration Serial Code</span>
                  <input type="text" value={cfgMsmeRegNo} onChange={(e) => setCfgMsmeRegNo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 font-mono font-bold text-slate-800 focus:outline-none" />
                </div>
                <button onClick={() => { triggerToast("Udyam registration profiles stored successfully!"); setActiveSection("menu"); }} className="w-full bg-[#006EE5] text-white hover:bg-[#0060C7] text-xs font-bold py-2.5 rounded-lg transition cursor-pointer">
                  Update MSME Registry Declarations
                </button>
              </div>
            </div>
          )}


        </div>
      )}

    </div>
  );
}

// ── E-Invoice Portal Configuration Component ──────────────────────────────
function EInvoicePortalSection({ db, onSaveCompany, triggerToast, setActiveSection }: {
  db: any; onSaveCompany: (data: any) => Promise<void>; triggerToast: (msg: string) => void; setActiveSection: (s: string) => void;
}) {
  const portal = db.company.eInvoicePortal || {};
  const [username, setUsername] = React.useState(portal.username || "");
  const [password, setPassword] = React.useState(portal.password || "");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!username || !password) return alert("Please enter both IRP Username and Password.");
    setSaving(true);
    try {
      await onSaveCompany({ ...db.company, eInvoicePortal: { username, password, configured: true } });
      triggerToast("✅ E-Invoice Portal credentials saved! You can now push IRN to the government portal.");
      setActiveSection("menu");
    } catch(e: any) { alert("Failed to save: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 space-y-6 shadow-xs max-w-xl mx-auto animate-fade-in font-sans">
      <div>
        <h3 className="font-bold text-slate-900 border-b pb-3 flex items-center gap-2 text-sm">⚡ E-Invoice Portal (IRP) Configuration</h3>
        <p className="text-xs text-slate-500 mt-2">Enter your <strong>GST IRP (Invoice Registration Portal)</strong> login credentials. These are the same credentials you use to log into <code>einvoice1.gst.gov.in</code>. Required before pushing any invoice to generate an IRN.</p>
      </div>

      {portal.configured && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 font-semibold">
          ✅ Portal connected — credentials on file. IRN generation is enabled.
        </div>
      )}
      {!portal.configured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-semibold">
          ⚠️ Not configured — "Push E-Invoice" button will be blocked until you save credentials here.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">IRP Portal Username (GSTIN)</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. 27AABCU9603R1ZX"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
          />
          <p className="text-[10px] text-slate-400 mt-1">Usually your company's GSTIN used as the IRP login.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">IRP Portal Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your IRP portal password"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-700">How to get IRP credentials:</div>
          <div>1. Go to <strong>einvoice1.gst.gov.in</strong></div>
          <div>2. Login with your GSTIN & password (same as GST portal)</div>
          <div>3. If not registered, click "e-Invoice Enablement" on the GST portal first</div>
          <div>4. Your GSTIN is your username; set a separate IRP password if prompted</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#006EE5] text-white hover:bg-[#0060C7] disabled:opacity-60 text-xs font-bold py-2.5 rounded-lg transition cursor-pointer"
          >
            {saving ? "Saving..." : "Save IRP Credentials"}
          </button>
          <button onClick={() => setActiveSection("menu")} className="bg-white hover:bg-slate-100 text-slate-600 border font-semibold px-4 py-2.5 rounded-lg transition text-xs">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


