import React, { useState, useEffect } from "react";
import { DatabaseState } from "../types.js";
import { 
  ArrowUpRight, 
  TrendingUp, 
  Percent, 
  Calculator, 
  Wallet, 
  ArrowRight,
  Sparkles,
  ChevronDown,
  Plus,
  Phone,
  Clock,
  ExternalLink,
  CheckCircle,
  Circle
} from "lucide-react";

interface DashboardProps {
  db: DatabaseState;
  onNavigate: (view: string) => void;
  onTriggerAI: (feature: string) => void;
  token?: string;
}

// Onboarding checklist component
function OnboardingChecklist({ token, onNavigate }: { token?: string; onNavigate: (v: string) => void }) {
  const [steps, setSteps] = useState<any[]>([]);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch('/api/onboarding/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSteps(d.steps); setPercent(d.percent); } })
      .catch(() => {});
  }, [token]);

  const navMap: Record<string, string> = {
    company: "settings", opening_balances: "settings", customers: "sales",
    items: "sales", invoice: "sales", expense: "purchases", bank: "banking"
  };

  if (steps.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-800">Getting Started</h4>
          <p className="text-xs text-gray-500">Complete these steps to get the most out of Ledgerio</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-blue-600">{percent}%</span>
          <p className="text-xs text-gray-400">complete</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-gray-100 h-2 rounded-full mb-4 overflow-hidden">
        <div className="bg-blue-600 h-full rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map((step: any) => (
          <button key={step.id} onClick={() => !step.done && onNavigate(navMap[step.id] || "settings")}
            className={`flex items-center gap-3 p-3 rounded-lg text-left transition ${step.done ? 'bg-green-50 border border-green-100 cursor-default' : 'bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 cursor-pointer'}`}>
            {step.done
              ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
            <span className={`text-sm font-medium ${step.done ? 'text-green-700 line-through' : 'text-gray-700'}`}>{step.label}</span>
          </button>
        ))}
      </div>
      {percent === 100 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 font-semibold text-center">
          🎉 All done! Your Ledgerio is fully set up.
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ db, onNavigate, onTriggerAI, token }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "fiscal" | "getstarted">("dashboard");
  const [cashFlowPeriod, setCashFlowPeriod] = useState("This Fiscal Year");
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);
  const [accrualMode, setAccrualMode] = useState<"Accrual" | "Cash">("Accrual");

  // Financial calculations
  const taxInvoices = db.invoices.filter(i => !i.isProforma);
  const totalSales = taxInvoices.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Total Collections
  const totalCollections = db.payments.reduce((acc, curr) => acc + curr.amountReceived, 0);

  // Outstanding Receivables
  const outstandingInvoices = taxInvoices.filter(i => i.status !== "Paid");
  const totalOutstanding = outstandingInvoices.reduce((acc, curr) => acc + (curr.total - (curr.paymentReceived || 0)), 0);

  // Overdue Invoices
  const presentDate = new Date().toISOString().split('T')[0];
  const totalOverdue = outstandingInvoices
    .filter(i => i.dueDate < presentDate)
    .reduce((acc, curr) => acc + (curr.total - (curr.paymentReceived || 0)), 0);

  // GST Payable
  const gstPayableAcc = db.accounts.find(a => a.code === "gst_payable")?.balance || 0;

  // Expenses this month
  const totalExpenses = db.expenses.reduce((acc, curr) => acc + curr.total, 0) + 
                        db.bills.reduce((acc, curr) => acc + curr.total, 0);

  // Bank Balance
  const bankBalance = db.accounts.find(a => a.code === "bank_account")?.balance || 0;

  // Income & Expense details
  const totalIncomeValue = db.accounts
    .filter(a => a.type === "Income")
    .reduce((acc, curr) => acc + curr.balance, 0);
  const totalExpenseValue = db.accounts
    .filter(a => a.type === "Expense")
    .reduce((acc, curr) => acc + curr.balance, 0);
  const estimatedProfit = totalIncomeValue - totalExpenseValue;

  // Customer Wise Breakdown
  const customerSalesMap: Record<string, number> = {};
  taxInvoices.forEach(inv => {
    customerSalesMap[inv.customerName] = (customerSalesMap[inv.customerName] || 0) + inv.subtotal;
  });
  const customerSalesList = Object.entries(customerSalesMap).map(([name, sales]) => ({ name, value: sales }));

  // Expense Category Map
  const expenseMap: Record<string, number> = {};
  db.expenses.forEach(e => {
    const accName = db.accounts.find(a => a.code === e.category)?.name || "Other";
    expenseMap[accName] = (expenseMap[accName] || 0) + e.total;
  });
  db.bills.forEach(b => {
    expenseMap["Item Inventory"] = (expenseMap["Item Inventory"] || 0) + b.total;
  });
  const expenseCategoryList = Object.entries(expenseMap).map(([name, amount]) => ({ name, value: amount }));

  // Dynamic dashboard values
  // Receivables Card totals (real data only)
  const finalReceivables = totalOutstanding;
  const finalOverdueReceivables = totalOverdue;
  const finalCurrentReceivables = Math.max(0, finalReceivables - finalOverdueReceivables);

  // Payables Card totals (Unpaid Bills — real data only)
  const dynamicUnpaidBills = db.bills.filter(b => b.status !== "Paid").reduce((acc, curr) => acc + (curr.total - (curr.paymentPaid || 0)), 0);
  const finalPayables = dynamicUnpaidBills;
  const finalOverduePayables = db.bills.filter(b => b.status !== "Paid" && b.dueDate < presentDate).reduce((acc, c) => acc + (c.total - (c.paymentPaid || 0)), 0);
  const finalCurrentPayables = Math.max(0, finalPayables - finalOverduePayables);

  // ── Period filter state (declared in JSX below via useState) ──
  // We compute period-aware values here using cashFlowPeriod + showPeriodDrop states
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);
  const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31);

  const periodBoundsMap: Record<string, { from: Date; to: Date }> = {
    "This Fiscal Year":  { from: fyStart, to: fyEnd },
    "Last Fiscal Year":  { from: new Date(fyStart.getFullYear() - 1, 3, 1), to: new Date(fyStart.getFullYear(), 2, 31) },
    "This Quarter": (() => {
      const m = now.getMonth();
      const qStarts = [3,6,9,0];
      const q = m>=3&&m<=5?0:m>=6&&m<=8?1:m>=9&&m<=11?2:3;
      const qsm = qStarts[q];
      const yr = qsm===0 ? now.getFullYear() : now.getFullYear();
      const from = new Date(yr, qsm, 1);
      return { from, to: new Date(from.getFullYear(), from.getMonth()+3, 0) };
    })(),
    "This Month": { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth()+1, 0) },
    "Last Month": { from: new Date(now.getFullYear(), now.getMonth()-1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) },
  };

  const pb = periodBoundsMap[cashFlowPeriod] || periodBoundsMap["This Fiscal Year"];
  const inPeriod = (dateStr: string) => { const d = new Date(dateStr); return d >= pb.from && d <= pb.to; };

  // Period-filtered totals (real data only — no base dummy values)
  const periodPayments = db.payments.filter(p => inPeriod(p.date));
  const periodExpensesP = db.expenses.filter(e => inPeriod(e.date));
  const periodBillsP = db.bills.filter(b => inPeriod(b.date));
  const periodInvoicesP = db.invoices.filter(i => !i.isProforma && inPeriod(i.date));

  const finalIncoming = periodPayments.reduce((s,p) => s + (p.amountReceived||0), 0);
  const finalOutgoing = periodExpensesP.reduce((s,e) => s + (e.total||0), 0)
                      + periodBillsP.reduce((s,b) => s + (b.total||0), 0);
  // Opening balance = sum of bank/cash account current balances (no dummy base)
  const baseStart = (db.bankAccounts || []).reduce((s,a) => s + (a.currentBalance || 0), 0);
  const finalEnd  = baseStart + finalIncoming - finalOutgoing;

  // Period receivables
  const pUnpaidInv = periodInvoicesP.filter(i => i.status !== "Paid");
  const periodReceivables   = pUnpaidInv.reduce((s,i) => s+(i.total-(i.paymentReceived||0)), 0);
  const periodOverdueRec    = pUnpaidInv.filter(i => i.dueDate < presentDate).reduce((s,i) => s+(i.total-(i.paymentReceived||0)), 0);
  // Period payables
  const pUnpaidBills = periodBillsP.filter(b => b.status !== "Paid");
  const periodPayables  = pUnpaidBills.reduce((s,b) => s+(b.total-(b.paymentPaid||0)), 0);
  const periodOverduePay = pUnpaidBills.filter(b => b.dueDate < presentDate).reduce((s,b) => s+(b.total-(b.paymentPaid||0)), 0);

  // Month-by-month breakdown for chart
  const monthLabels: string[] = [];
  const monthIncoming: number[] = [];
  const monthOutgoing: number[] = [];
  {
    const cur = new Date(pb.from.getFullYear(), pb.from.getMonth(), 1);
    const end = new Date(pb.to.getFullYear(), pb.to.getMonth(), 1);
    while (cur <= end) {
      const ym = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`;
      monthLabels.push(cur.toLocaleDateString("en-IN",{month:"short",year:"2-digit"}));
      monthIncoming.push(db.payments.filter(p=>p.date?.startsWith(ym)).reduce((s,p)=>s+(p.amountReceived||0),0));
      monthOutgoing.push(
        db.expenses.filter(e=>e.date?.startsWith(ym)).reduce((s,e)=>s+(e.total||0),0)+
        db.bills.filter(b=>b.date?.startsWith(ym)).reduce((s,b)=>s+(b.total||0),0)
      );
      cur.setMonth(cur.getMonth()+1);
    }
  }

  // Format Currencies in standard Indian Numbering system (Lakhs / Crores)
  const formatIndianCurrency = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div id="bizkhata-dashboard-wrapper" className="space-y-6 font-sans text-slate-800 animate-fade-in pb-12">
      
      {/* 1. Hero header — gradient banner with inline quick stats */}
      <div id="bizkhata-greeting-helpline-card" className="relative overflow-hidden rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative p-5 md:p-6 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 rounded-xl flex items-center justify-center font-black text-lg shadow-md uppercase shrink-0">
                {(db.company.name || db.company.legalName || "B")[0].toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <h1 id="bizkhata-hello-title" className="text-xl font-bold text-white tracking-tight">
                  Hello, {db.company.name || "Welcome"}
                </h1>
                <div className="flex items-center text-xs text-slate-300 font-medium hover:text-white cursor-pointer transition-colors w-fit">
                  <span>{db.company.legalName || db.company.name || "Your Organisation"} • All Locations</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
            <div className="text-left md:text-right space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-200">Ledgerio Support</span>
                <span className="font-bold text-amber-400 font-mono text-sm">bizkhata.com</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Mon - Fri • 9:00 AM - 7:00 PM • Toll Free</p>
            </div>
          </div>

          {/* Inline quick stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Bank Balance</p>
              <p className={`text-lg font-bold font-mono ${bankBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>₹{Math.abs(bankBalance).toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Overdue Receivables</p>
              <p className={`text-lg font-bold font-mono ${totalOverdue > 0 ? "text-amber-400" : "text-emerald-400"}`}>₹{totalOverdue.toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Income (YTD)</p>
              <p className="text-lg font-bold font-mono text-sky-400">₹{Math.abs(totalIncomeValue).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub Navigation Tabs: Dashboard, Fiscal Year-End Tasks, Getting Started */}
      <div id="bk-dashboard-tabs" className="border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "fiscal", label: "Fiscal Year-End Tasks" },
            { id: "getstarted", label: "Getting Started" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === tab.id 
                  ? "text-blue-600 border-b-2 border-blue-600 font-bold" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* AI Quick Desk trigger button */}
        <div className="pb-2 flex gap-2">
          <button 
            id="btn-ai-dashboard-analysis"
            onClick={() => onTriggerAI("explain-report")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-650 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            AI Projections
          </button>
          <button 
            onClick={() => onNavigate("ai")}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
          >
            Ask Copilot <ArrowRight className="w-3" />
          </button>
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* 3. Receivables & Payables Grid (Two distinct clean cards) */}
          <div id="bk-kpi-main-row" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD A: Total Receivables */}
            <div id="bk-receivables-panel" className="card-lift bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">Total Receivables</span>
                <button 
                  onClick={() => onNavigate("sales")}
                  className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-500">Total Unpaid Invoices</p>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatIndianCurrency(periodReceivables)}
                </div>
              </div>

              {/* Progress bar ratio split */}
              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div 
                    title="Current portion"
                    style={{ width: `${(finalCurrentReceivables / finalReceivables) * 100}%` }} 
                    className="bg-blue-500 h-full transition-all duration-300"
                  />
                  <div 
                    title="Overdue portion"
                    style={{ width: `${(finalOverdueReceivables / finalReceivables) * 100}%` }} 
                    className="bg-orange-500 h-full transition-all duration-300"
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                    Current: <strong className="font-mono">{formatIndianCurrency(finalCurrentReceivables)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 cursor-pointer hover:underline text-orange-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                    Overdue: <strong className="font-mono">{formatIndianCurrency(finalOverdueReceivables)}</strong>
                    <ChevronDown className="w-3 h-3 text-orange-650" />
                  </span>
                </div>
              </div>
            </div>

            {/* CARD B: Total Payables */}
            <div id="bk-payables-panel" className="card-lift bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">Total Payables</span>
                <button 
                  onClick={() => onNavigate("purchases")}
                  className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-500">Total Unpaid Bills</p>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatIndianCurrency(periodPayables)}
                </div>
              </div>

              {/* Progress bar ratio split */}
              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div 
                    title="Current payables"
                    style={{ width: `${(finalCurrentPayables / finalPayables) * 100}%` }} 
                    className="bg-sky-400 h-full transition-all duration-300"
                  />
                  <div 
                    title="Overdue payables"
                    style={{ width: `${(finalOverduePayables / finalPayables) * 100}%` }} 
                    className="bg-orange-500 h-full transition-all duration-300"
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" />
                    Current: <strong className="font-mono">{formatIndianCurrency(finalCurrentPayables)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 cursor-pointer hover:underline text-orange-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                    Overdue: <strong className="font-mono">{formatIndianCurrency(finalOverduePayables)}</strong>
                    <ChevronDown className="w-3 h-3 text-orange-650" />
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 3.5 Overdue Alerts */}
          {(totalOverdue > 0 || db.bills.filter(b => b.status !== "Paid" && b.dueDate < presentDate).length > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-orange-800">
                <span className="text-lg">⚠️</span>
                <span className="font-bold text-sm">Action Required</span>
              </div>
              {totalOverdue > 0 && (
                <div className="flex-1 min-w-48">
                  <div className="text-xs text-orange-700 font-semibold">Overdue Receivables</div>
                  <div className="font-mono font-bold text-orange-900">₹{totalOverdue.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                  <div className="text-[10px] text-orange-600">{outstandingInvoices.filter(i => i.dueDate < presentDate).length} invoice(s) past due</div>
                </div>
              )}
              {db.bills.filter(b => b.status !== "Paid" && b.dueDate < presentDate).length > 0 && (
                <div className="flex-1 min-w-48">
                  <div className="text-xs text-orange-700 font-semibold">Overdue Payables</div>
                  <div className="font-mono font-bold text-orange-900">₹{db.bills.filter(b => b.status !== "Paid" && b.dueDate < presentDate).reduce((a,c)=>a+(c.total-(c.paymentPaid||0)),0).toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                  <div className="text-[10px] text-orange-600">{db.bills.filter(b => b.status !== "Paid" && b.dueDate < presentDate).length} bill(s) past due</div>
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => onNavigate("sales")} className="text-xs font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1.5 rounded-lg cursor-pointer border border-orange-200">
                  Collect Payments →
                </button>
                <button onClick={() => onNavigate("purchases")} className="text-xs font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1.5 rounded-lg cursor-pointer border border-orange-200">
                  Pay Bills →
                </button>
              </div>
            </div>
          )}

          {/* 4. Cash Flow area line Chart segment aligned with screenshot */}
          <div id="bk-cashflow-panel" className="card-lift bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Cash Flow</h3>
              <div className="relative inline-block">
                <button
                  onClick={() => setShowPeriodDrop(p => !p)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition"
                >
                  <span>{cashFlowPeriod}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
                {showPeriodDrop && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-40 py-1 text-xs text-slate-700">
                    {["This Fiscal Year","Last Fiscal Year","This Quarter","This Month","Last Month"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setCashFlowPeriod(opt); setShowPeriodDrop(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition ${cashFlowPeriod === opt ? "font-bold text-blue-600 bg-blue-50" : ""}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* SVG Area Line Chart */}
              <div className="lg:col-span-3 h-64 relative bg-slate-50/20 border border-slate-100 rounded-lg p-2">
                
                {/* Horizontal grid lines */}
                <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none text-[9px] text-slate-400 font-mono px-1">
                  <div className="border-b border-dashed border-slate-200 w-full flex justify-between pr-2"><span>25 M</span></div>
                  <div className="border-b border-dashed border-slate-200 w-full flex justify-between pr-2"><span>20 M</span></div>
                  <div className="border-b border-dashed border-slate-200 w-full flex justify-between pr-2"><span>15 M</span></div>
                  <div className="border-b border-dashed border-slate-200 w-full flex justify-between pr-2"><span>10 M</span></div>
                  <div className="border-b border-dashed border-slate-200 w-full flex justify-between pr-2"><span>5 M</span></div>
                  <div className="border-b border-dashed border-slate-200 w-full flex justify-between pr-2"><span>0</span></div>
                </div>

                {/* Dynamic chart — real period data */}
                {(() => {
                  const H=180, W=1000, PAD=50;
                  const maxVal = Math.max(...monthIncoming, ...monthOutgoing, 1);
                  const n = monthLabels.length;
                  const xp = (i: number) => n<=1 ? W/2 : PAD + (i/(n-1))*(W-PAD*2);
                  const yp = (v: number) => H - PAD - ((v/maxVal)*(H-PAD*2));
                  const makePath = (arr: number[]) => arr.reduce((d,v,i)=>d+(i===0?`M ${xp(i)} ${yp(v)}`:`L ${xp(i)} ${yp(v)}`), "");
                  const incPath = makePath(monthIncoming);
                  const outPath = makePath(monthOutgoing);
                  return (
                    <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="inc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a73e8" stopOpacity="0.3"/><stop offset="100%" stopColor="#1a73e8" stopOpacity="0"/></linearGradient>
                        <linearGradient id="out-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2"/><stop offset="100%" stopColor="#f43f5e" stopOpacity="0"/></linearGradient>
                      </defs>
                      {[0.25,0.5,0.75,1].map((t,i)=>(
                        <line key={i} x1={PAD} x2={W-PAD} y1={yp(maxVal*t)} y2={yp(maxVal*t)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"/>
                      ))}
                      {monthLabels.length > 0 ? (
                        <>
                          <path d={incPath+` L ${xp(n-1)} ${H-PAD} L ${xp(0)} ${H-PAD} Z`} fill="url(#inc-g)"/>
                          <path d={incPath} fill="none" stroke="#1a73e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d={outPath+` L ${xp(n-1)} ${H-PAD} L ${xp(0)} ${H-PAD} Z`} fill="url(#out-g)"/>
                          <path d={outPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3"/>
                          {monthIncoming.map((v,i)=>(
                            <circle key={`i${i}`} cx={xp(i)} cy={yp(v)} r="4" fill="#1a73e8" stroke="#fff" strokeWidth="2">
                              <title>{monthLabels[i]} Incoming: ₹{v.toLocaleString("en-IN")}</title>
                            </circle>
                          ))}
                          {monthOutgoing.map((v,i)=>(
                            <circle key={`o${i}`} cx={xp(i)} cy={yp(v)} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="2">
                              <title>{monthLabels[i]} Outgoing: ₹{v.toLocaleString("en-IN")}</title>
                            </circle>
                          ))}
                        </>
                      ) : (
                        <text x={W/2} y={H/2} textAnchor="middle" fontSize="18" fill="#94a3b8">No data for this period</text>
                      )}
                    </svg>
                  );
                })()}

                {/* X Axis Month Labels */}
                <div className="absolute bottom-1 inset-x-0 flex justify-between px-1 text-[8.5px] font-semibold text-slate-500 font-sans tracking-tight">
                  <span>Apr 2026</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                  <span>Nov</span>
                  <span>Dec</span>
                  <span>Jan 2027</span>
                  <span>Feb</span>
                  <span>Mar 25</span>
                  <span>Mar 27</span>
                </div>
              </div>

              {/* Status balances card column at right side */}
              <div className="space-y-4">
                {/* 1. Cash as on 01 Apr */}
                <div className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-sm inline-block" />
                    Opening Balance (Bank + Cash)
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono">
                    {formatIndianCurrency(baseStart)}
                  </p>
                </div>

                {/* 2. Incoming */}
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" />
                    Incoming
                  </span>
                  <p className="text-sm font-bold text-emerald-700 font-mono">
                    {formatIndianCurrency(finalIncoming)} <span className="text-xs font-semibold">( + )</span>
                  </p>
                </div>

                {/* 3. Outgoing */}
                <div className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm inline-block" />
                    Outgoing
                  </span>
                  <p className="text-sm font-bold text-rose-700 font-mono">
                    {formatIndianCurrency(finalOutgoing)} <span className="text-xs font-semibold">( - )</span>
                  </p>
                </div>

                {/* 4. Cash as on 31 Mar */}
                <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm inline-block" />
                    Cash as on 31 Mar 2027
                  </span>
                  <p className="text-sm font-bold text-blue-800 font-mono">
                    {formatIndianCurrency(finalEnd)} <span className="text-xs font-semibold">( = )</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Income and Expense + Top Expenses Row */}
          <div id="bk-additional-kpis" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* KPI Left: Income and Expense Card */}
            <div className="card-lift bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">Income and Expense</span>
                <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-md text-[10px] font-bold">
                  <button 
                    onClick={() => setAccrualMode("Accrual")}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer ${accrualMode === "Accrual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    Accrual
                  </button>
                  <button 
                    onClick={() => setAccrualMode("Cash")}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer ${accrualMode === "Cash" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    Cash
                  </button>
                </div>
              </div>

              {/* Stacked indicators */}
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-550 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" /> Total Income
                    </span>
                    <strong className="font-mono text-emerald-700 font-bold">{formatIndianCurrency(totalIncomeValue || totalSales || 0)}</strong>
                  </div>
                  {/* Dynamic income bar */}
                  <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    {(() => {
                      const inc = totalIncomeValue || totalSales || 0;
                      const exp = totalExpenseValue || totalExpenses || 0;
                      const max = Math.max(inc, exp, 1);
                      return <div style={{ width: `${Math.min(100, (inc/max)*100)}%` }} className="bg-emerald-500 h-full rounded-full transition-all" />;
                    })()}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-550 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" /> Total Expense
                    </span>
                    <strong className="font-mono text-rose-700 font-bold">{formatIndianCurrency(totalExpenseValue || totalExpenses || 0)}</strong>
                  </div>
                  {/* Dynamic expense bar */}
                  <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    {(() => {
                      const inc = totalIncomeValue || totalSales || 0;
                      const exp = totalExpenseValue || totalExpenses || 0;
                      const max = Math.max(inc, exp, 1);
                      return <div style={{ width: `${Math.min(100, (exp/max)*100)}%` }} className="bg-rose-500 h-full rounded-full transition-all" />;
                    })()}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-550">Net Margin:</span>
                  <span className={`font-mono font-bold  ${estimatedProfit >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"} px-2.5 py-1 rounded-full text-[11px]`}>
                    {estimatedProfit >= 0 ? "+" : ""}{formatIndianCurrency(estimatedProfit || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Right: Top Expenses Breakdown */}
            <div className="card-lift bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">Top Expenses</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Allocation</span>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {expenseCategoryList.length > 0 ? (
                  expenseCategoryList.map((item, index) => {
                    const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{item.name}</span>
                          <span className="font-mono text-slate-700 font-bold">{formatIndianCurrency(item.value)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div style={{ width: `${Math.max(5, percentage)}%` }} className="bg-indigo-500 h-full rounded-full transition-all duration-300" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No expense record found. Try adding bills or vendor expenses in Purchases.
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {activeTab === "fiscal" && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <Calculator className="w-12 h-12 text-blue-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Fiscal Year-End Balancing Assistant</h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Ledgerio automatically manages your Indian GST liabilities, TDS provisions, MSME aging alerts, and double-entry depreciation journals for the transition of Books from FY 25-26 into FY 26-27 under section 43B(h).
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer">
              Launch Reconciliation Audit
            </button>
            <button 
              onClick={() => onTriggerAI("explain-report")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer"
            >
              Get Tax Forecast
            </button>
          </div>
        </div>
      )}

      {activeTab === "getstarted" && (
        <div className="space-y-6">
          {/* Live Onboarding Progress */}
          <OnboardingChecklist token={token} onNavigate={onNavigate} />

          {/* Data Export Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-800 mb-1">Data Export & Backup</h4>
            <p className="text-xs text-gray-500 mb-4">Export your data anytime. Your data belongs to you.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Tally XML", desc: "Import into Tally ERP 9/Prime", url: "/api/export/tally", color: "blue" },
                { label: "Invoices CSV", desc: "All approved invoices", url: "/api/export/csv/invoices", color: "green" },
                { label: "Expenses CSV", desc: "All expense records", url: "/api/export/csv/expenses", color: "amber" },
                { label: "Full Backup (JSON)", desc: "Complete data backup", url: "/api/export/json", color: "purple" },
              ].map(exp => (
                <a key={exp.label}
                  href={exp.url}
                  onClick={e => {
                    e.preventDefault();
                    const a = document.createElement('a');
                    a.href = exp.url;
                    a.setAttribute('download', '');
                    // Add auth header via fetch
                    fetch(exp.url, { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.blob())
                      .then(blob => {
                        const url = URL.createObjectURL(blob);
                        a.href = url;
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                  }}
                  className={`block border rounded-xl p-4 hover:shadow-md transition cursor-pointer ${
                    exp.color === 'blue' ? 'border-blue-100 bg-blue-50 hover:bg-blue-100' :
                    exp.color === 'green' ? 'border-green-100 bg-green-50 hover:bg-green-100' :
                    exp.color === 'amber' ? 'border-amber-100 bg-amber-50 hover:bg-amber-100' :
                    'border-purple-100 bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  <p className="font-semibold text-gray-800 text-sm">{exp.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{exp.desc}</p>
                </a>
              ))}
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["customers","vendors","bills","journals","payments"].map(type => (
                <button key={type}
                  onClick={() => {
                    fetch(`/api/export/csv/${type}`, { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.blob()).then(blob => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `bizkhata-${type}.csv`;
                        a.click();
                      });
                  }}
                  className="text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg transition capitalize"
                >
                  {type} CSV
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}



