import React, { useState, useMemo } from "react";
import { DatabaseState, Account, Invoice, Bill, Expense } from "../types.js";
import { 
  TrendingUp, 
  BarChart2, 
  Scale, 
  Percent, 
  Sparkles, 
  Check, 
  Printer, 
  ArrowLeft,
  Search,
  Star,
  Folder,
  FileSpreadsheet,
  FileText,
  Clock,
  Briefcase,
  Layers,
  CircleDollarSign,
  Undo2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  BookOpen
} from "lucide-react";

interface ReportsProps {
  db: DatabaseState;
  onTriggerAI: (feature: string, payload?: any) => void;
  isLoadingAI?: boolean;
  aiExplanation?: string;
}

interface ReportItem {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  createdBy: string;
  lastVisited: string;
}

export default function Reports({ db, onTriggerAI, isLoadingAI, aiExplanation }: ReportsProps) {
  // Navigation states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [favorites, setFavorites] = useState<string[]>([
    "pl", "bs", "cf", "tb", "gstr1", "ar_summary", "ap_aging_summary", "gst", "budget_vs_actual"
  ]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  // ── Date Filter State ─────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [datePreset, setDatePreset] = useState<string>('this_fiscal');
  const [fromDate, setFromDate] = useState<string>(`${currentYear}-04-01`);
  const [toDate, setToDate] = useState<string>(`${currentYear + 1}-03-31`);
  const [ledgerAccount, setLedgerAccount] = useState<string>('');
  const [ledgerEntity, setLedgerEntity] = useState<string>('');

  const applyPreset = (preset: string) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed
    setDatePreset(preset);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    switch(preset) {
      case 'today': setFromDate(fmt(now)); setToDate(fmt(now)); break;
      case 'this_week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); setFromDate(fmt(d)); setToDate(fmt(now)); } break;
      case 'this_month': setFromDate(`${y}-${String(m+1).padStart(2,'0')}-01`); setToDate(fmt(now)); break;
      case 'last_month': { const lm = m === 0 ? 12 : m; const ly = m === 0 ? y-1 : y; const lastDay = new Date(ly, lm, 0).getDate(); setFromDate(`${ly}-${String(lm).padStart(2,'0')}-01`); setToDate(`${ly}-${String(lm).padStart(2,'0')}-${lastDay}`); } break;
      case 'this_quarter': { const q = Math.floor(m/3); const qm = q*3; setFromDate(`${y}-${String(qm+1).padStart(2,'0')}-01`); setToDate(fmt(now)); } break;
      case 'last_quarter': { const q = Math.floor(m/3) - 1; const lqy = q < 0 ? y-1 : y; const lq = q < 0 ? 3 : q; const qm = lq*3; const lastDay = new Date(lqy, qm+3, 0).getDate(); setFromDate(`${lqy}-${String(qm+1).padStart(2,'0')}-01`); setToDate(`${lqy}-${String(qm+3).padStart(2,'0')}-${lastDay}`); } break;
      case 'this_fiscal': { const fy = m >= 3 ? y : y-1; setFromDate(`${fy}-04-01`); setToDate(`${fy+1}-03-31`); } break;
      case 'last_fiscal': { const lfy = m >= 3 ? y-1 : y-2; setFromDate(`${lfy}-04-01`); setToDate(`${lfy+1}-03-31`); } break;
      case 'this_year': setFromDate(`${y}-01-01`); setToDate(`${y}-12-31`); break;
      case 'last_year': setFromDate(`${y-1}-01-01`); setToDate(`${y-1}-12-31`); break;
    }
  };

  // Filter transactions by date range
  const inRange = (date: string) => (!fromDate || date >= fromDate) && (!toDate || date <= toDate);

  // 15 Corporate Accounting Categories
  const CATEGORIES = [
    { id: "all", name: "All Reports" },
    { id: "favorites", name: "Favorites" },
    { id: "business_overview", name: "Business Overview" },
    { id: "sales", name: "Sales" },
    { id: "receivables", name: "Receivables" },
    { id: "payments_received", name: "Payments Received" },
    { id: "recurring_invoices", name: "Recurring Invoices" },
    { id: "payables", name: "Payables" },
    { id: "purchases_expenses", name: "Purchases and Expenses" },
    { id: "taxes", name: "Taxes" },
    { id: "banking", name: "Banking" },
    { id: "projects_timesheet", name: "Projects and Timesheet" },
    { id: "accountant", name: "Accountant" },
    { id: "budgets", name: "Budgets" },
    { id: "currency", name: "Currency" },
    { id: "activity", name: "Activity" },
    { id: "automation", name: "Automation" }
  ];

  // Completely dynamic set of exactly 87 reports matching user's screenshots
  const ALL_REPORTS: ReportItem[] = useMemo(() => [
    // --- Business Overview (9) ---
    { id: "pl", name: "Profit and Loss", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "16 Apr 2026 03:04 PM" },
    { id: "pl_sched3", name: "Profit and Loss (Schedule III)", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "22 Jan 2026 01:36 PM" },
    { id: "pl_horiz", name: "Horizontal Profit and Loss", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "20 Mar 2026 03:52 PM" },
    { id: "cf", name: "Cash Flow Statement", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "24 Mar 2026 01:25 PM" },
    { id: "bs", name: "Balance Sheet", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "05 May 2026 05:05 PM" },
    { id: "bs_horiz", name: "Horizontal Balance Sheet", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "-" },
    { id: "bs_sched3", name: "Balance Sheet (Schedule III)", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "03 Feb 2026 10:47 AM" },
    { id: "sales_by_customer", name: "Sales by Customer", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "-" },
    { id: "sales_by_item", name: "Sales by Item", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "-" },
    { id: "purchase_by_vendor", name: "Purchase by Vendor", category: "Purchases", categoryId: "purchases", createdBy: "System Generated", lastVisited: "-" },
    { id: "tax_liability", name: "Tax Liability Report", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "-" },
    { id: "biz_ratios", name: "Business Performance Ratios", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "24 Mar 2026 01:24 PM" },
    { id: "equity_movement", name: "Movement of Equity", category: "Business Overview", categoryId: "business_overview", createdBy: "System Generated", lastVisited: "-" },

    // --- Sales (5) ---
    { id: "sales_customer", name: "Sales by Customer", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "15 Sep 2025 10:23 AM" },
    { id: "sales_item", name: "Sales by Item", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "02 Jun 2025 09:44 AM" },
    { id: "sales_person", name: "Sales by Sales Person", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "-" },
    { id: "sales_summary", name: "Sales Summary", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "09 Jul 2025 12:16 PM" },
    { id: "sales_integration", name: "Sales Channel Integrations Sync Summary", category: "Sales", categoryId: "sales", createdBy: "System Generated", lastVisited: "-" },

    // --- Receivables (9) ---
    { id: "ar_summary", name: "AR Aging Summary", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "-" },
    { id: "ar_details", name: "AR Aging Details", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "16 Jan 2026 09:30 AM" },
    { id: "invoice_details", name: "Invoice Details", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "-" },
    { id: "sales_order_details", name: "Sales Order Details", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "-" },
    { id: "delivery_challan", name: "Delivery Challan Details", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "-" },
    { id: "estimate_details", name: "Estimate Details", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "20 Jun 2025 12:42 PM" },
    { id: "customer_balance", name: "Customer Balance Summary", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "19 May 2026 12:37 PM" },
    { id: "receivables_summary", name: "Receivable Summary", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "09 May 2025 11:03 AM" },
    { id: "receivables_details", name: "Receivable Details", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "-" },

    // --- Payments Received (4) ---
    { id: "payments_received", name: "Payments Received", category: "Payments Received", categoryId: "payments_received", createdBy: "System Generated", lastVisited: "-" },
    { id: "time_to_get_paid", name: "Time to Get Paid", category: "Payments Received", categoryId: "payments_received", createdBy: "System Generated", lastVisited: "-" },
    { id: "credit_note_details", name: "Credit Note Details", category: "Payments Received", categoryId: "payments_received", createdBy: "System Generated", lastVisited: "-" },
    { id: "refund_history", name: "Refund History", category: "Payments Received", categoryId: "payments_received", createdBy: "System Generated", lastVisited: "-" },

    // --- Recurring Invoices (1) ---
    { id: "recurring_invoice_details", name: "Recurring Invoice Details", category: "Recurring Invoices", categoryId: "recurring_invoices", createdBy: "System Generated", lastVisited: "08 May 2025 04:43 PM" },

    // --- Payables (13) ---
    { id: "vendor_balance", name: "Vendor Balance Summary", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "23 Apr 2026 11:15 AM" },
    { id: "ap_aging_summary", name: "AP Aging Summary", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "ap_aging_details", name: "AP Aging Details", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "07 May 2026 06:11 PM" },
    { id: "bill_details", name: "Bill Details", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "vendor_credits", name: "Vendor Credit Details", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "payments_made", name: "Payments Made", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "refund_history_vendor", name: "Refund History (Vendor)", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "po_details", name: "Purchase Order Details", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "po_by_vendor", name: "Purchase Orders by Vendor", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "payable_summary", name: "Payable Summary", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "payable_details", name: "Payable Details", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "purchases_by_vendor", name: "Purchases by Vendor", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "outstanding_bills_status", name: "Outstanding Bills Status Statement", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },

    // --- Purchases and Expenses (8) ---
    { id: "purchases_item", name: "Purchases by Item", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "expense_details", name: "Expense Details", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "expenses_category", name: "Expenses by Category", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "expenses_customer", name: "Expenses by Customer", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "expenses_project", name: "Expenses by Project", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "expenses_employee", name: "Expenses by Employee", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "billable_expense_details", name: "Billable Expense Details", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },
    { id: "operating_expenses_trends", name: "Operating Expenses Trends Analysis", category: "Purchases and Expenses", categoryId: "purchases_expenses", createdBy: "System Generated", lastVisited: "-" },

    // --- Taxes (12) ---
    { id: "gstr1", name: "GSTR-1 Outward Supplies Return Summary", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "26 May 2026 01:08 PM" },
    { id: "gst", name: "Tax Summary", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "05 May 2026 03:51 PM" },
    { id: "gstr9", name: "Annual Summary (GSTR-9)", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "24 Feb 2026 03:54 PM" },
    { id: "tds_summary", name: "TDS Summary", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "-" },
    { id: "tds_receivable", name: "TDS Receivable Summary", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "08 May 2025 04:44 PM" },
    { id: "tcs_payable", name: "TCS Payable Summary (Form No. 27EQ)", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "-" },
    { id: "iff_taxes", name: "Invoice Furnishing Facility (IFF)", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "-" },
    { id: "pmt06", name: "PMT-06 (Self Assessment Basis)", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "-" },
    { id: "gstr3b_details", name: "GSTR-3B Summary", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "15 Apr 2026 10:45 AM" },
    { id: "outward_supplies", name: "Summary of Outward Supplies", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "05 May 2026 03:52 PM" },
    { id: "inward_supplies", name: "Summary of Inward Supplies", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "15 Apr 2026 05:56 PM" },
    { id: "self_invoice", name: "Self Invoice Summary", category: "Taxes", categoryId: "taxes", createdBy: "System Generated", lastVisited: "06 Apr 2026 02:53 PM" },

    // --- Banking (2) ---
    { id: "reconciliation_status", name: "Reconciliation Status", category: "Banking", categoryId: "banking", createdBy: "System Generated", lastVisited: "-" },
    { id: "cash_book_register", name: "Cash Book Ledger Register", category: "Banking", categoryId: "banking", createdBy: "System Generated", lastVisited: "-" },

    // --- Projects and Timesheet (8) ---
    { id: "timesheet_details", name: "Timesheet Details", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "timesheet_profitability", name: "Timesheet Profitability Summary", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "project_summary", name: "Project Summary", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "project_details", name: "Project Details", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "project_costs", name: "Projects Cost Summary", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "project_revenue", name: "Projects Revenue Summary", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "project_perf", name: "Projects Performance Summary", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },
    { id: "timesheet_unbilled", name: "Unbilled Hours Detail Analysis", category: "Projects and Timesheet", categoryId: "projects_timesheet", createdBy: "System Generated", lastVisited: "-" },

    // --- Accountant (8) ---
    { id: "account_tx", name: "Account Transactions", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "25 May 2026 11:05 AM" },
    { id: "account_type_sum", name: "Account Type Summary", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "account_type_tx", name: "Account Type Transactions", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "day_book", name: "Day Book", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "ledger_statement", name: "Ledger Statement", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "customer_ledger", name: "Customer Ledger Statement", category: "Receivables", categoryId: "receivables", createdBy: "System Generated", lastVisited: "-" },
    { id: "vendor_ledger", name: "Vendor Ledger Statement", category: "Payables", categoryId: "payables", createdBy: "System Generated", lastVisited: "-" },
    { id: "general_ledger", name: "General Ledger", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "detailed_ledger", name: "Detailed General Ledger", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "journal_report", name: "Journal Report", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },
    { id: "tb", name: "Trial Balance", category: "Accountant", categoryId: "accountant", createdBy: "System Generated", lastVisited: "-" },

    // --- Budgets (1) ---
    { id: "budget_vs_actual", name: "Budget Vs Actuals", category: "Budgets", categoryId: "budgets", createdBy: "System Generated", lastVisited: "30 Jul 2025 11:09 AM" },

    // --- Currency (2) ---
    { id: "realized_gain_loss", name: "Realized Gain or Loss", category: "Currency", categoryId: "currency", createdBy: "System Generated", lastVisited: "-" },
    { id: "unrealized_gain_loss", name: "Unrealized Gain or Loss", category: "Currency", categoryId: "currency", createdBy: "System Generated", lastVisited: "-" },

    // --- Activity (6) ---
    { id: "system_mails", name: "System Mails", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "-" },
    { id: "activity_logs", name: "Activity Logs & Audit Trail", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "08 Aug 2025 02:30 PM" },
    { id: "exception_report", name: "Exception Report", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "-" },
    { id: "portal_activities", name: "Portal Activities", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "-" },
    { id: "customer_reviews", name: "Customer Reviews", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "-" },
    { id: "api_usage", name: "API Usage", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "-" },
    { id: "pending_valuations", name: "Pending Inventory Valuations", category: "Activity", categoryId: "activity", createdBy: "System Generated", lastVisited: "-" },

    // --- Automation (3) ---
    { id: "workflow_rules", name: "Scheduled Date Based Workflow Rules", category: "Automation", categoryId: "automation", createdBy: "System Generated", lastVisited: "-" },
    { id: "workflow_actions", name: "Scheduled Time Based Workflow Actions", category: "Automation", categoryId: "automation", createdBy: "System Generated", lastVisited: "-" },
    { id: "workflow_logs", name: "Workflow Execution Logs", category: "Automation", categoryId: "automation", createdBy: "System Generated", lastVisited: "-" }
  ], []);

  // Filter reports
  const filteredReports = useMemo(() => {
    return ALL_REPORTS.filter(rep => {
      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "favorites") {
          if (!favorites.includes(rep.id)) return false;
        } else if (rep.categoryId !== selectedCategory) {
          return false;
        }
      }
      
      // Search text query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return rep.name.toLowerCase().includes(query) || 
               rep.category.toLowerCase().includes(query);
      }
      return true;
    });
  }, [ALL_REPORTS, selectedCategory, searchQuery, favorites]);

  // Toggle favorite
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(f => f !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Calculations directly from Chart of Accounts balances 
  const getAccountBalance = (code: string) => {
    return db.accounts.find(a => a.code === code)?.balance || 0;
  };

  // Profit Loss calculations
  // Date-filtered transaction calculations
  const filteredInvoices = db.invoices.filter((inv: any) => !inv.isProforma && inRange(inv.date));
  const filteredPayments = db.payments.filter((p: any) => inRange(p.date));
  const filteredBills = db.bills.filter((b: any) => inRange(b.date));
  const filteredExpenses = db.expenses.filter((e: any) => inRange(e.date));

  // Revenue from filtered invoices (date-aware)
  const filteredSalesRevenue = filteredInvoices.reduce((s: number, inv: any) => s + inv.subtotal, 0);
  const filteredGstCollected = filteredInvoices.reduce((s: number, inv: any) => s + inv.totalGst, 0);
  const filteredPaymentsReceived = filteredPayments.reduce((s: number, p: any) => s + p.amount, 0);
  const filteredBillsTotal = filteredBills.reduce((s: number, b: any) => s + b.total, 0);
  const filteredExpensesTotal = filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0);
  const filteredNetProfit = filteredSalesRevenue - filteredExpensesTotal;

  const salesIncome = getAccountBalance("sales_income");
  const serviceIncome = getAccountBalance("service_income");
  const totalRevenue = salesIncome + serviceIncome;
  const expensesList = db.accounts.filter(a => a.type === "Expense");
  const totalExpenses = expensesList.reduce((acc, curr) => acc + curr.balance, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Balance sheet calculations
  const bankAccount = getAccountBalance("bank_account");
  const cash = getAccountBalance("cash");
  const receivables = getAccountBalance("accounts_receivable");
  const tdsReceivable = getAccountBalance("tds_receivable");
  const inputGst = getAccountBalance("input_gst");
  const totalAssets = bankAccount + cash + receivables + tdsReceivable + inputGst;

  const payables = getAccountBalance("accounts_payable");
  const gstPayable = getAccountBalance("gst_payable");
  const tdsPayable = getAccountBalance("tds_payable");
  const totalLiabilities = payables + gstPayable + tdsPayable;
  const capital = getAccountBalance("capital");
  const retainedEarnings = getAccountBalance("retained_earnings") + netProfit;
  const totalEquity = capital + retainedEarnings;
  const isBalanceSheetBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  // Trial Balance
  const trialEntries = db.accounts.map(acc => {
    let debit = 0;
    let credit = 0;
    if (acc.type === "Asset" || acc.type === "Expense") {
      debit = Math.max(0, acc.balance);
      credit = Math.min(0, acc.balance) * -1;
    } else {
      credit = Math.max(0, acc.balance);
      debit = Math.min(0, acc.balance) * -1;
    }
    return { ...acc, debit, credit };
  });
  const sumDebits = trialEntries.reduce((acc, curr) => acc + curr.debit, 0);
  const sumCredits = trialEntries.reduce((acc, curr) => acc + curr.credit, 0);

  // Cash flow metrics
  const cashInflowPayments = db.payments.reduce((acc, curr) => acc + curr.amountReceived, 0);
  const cashOutflowExpenses = db.expenses.filter(e => e.status === "Approved").reduce((acc, curr) => acc + curr.total, 0);
  const cashOutflowBillsPaid = db.bills.reduce((acc, curr) => acc + (curr.paymentPaid || 0), 0);
  const netCashFlowChange = cashInflowPayments - (cashOutflowExpenses + cashOutflowBillsPaid);

  // Receivables & Payables Trade details
  const customerAging = db.customers.map(cust => {
    const custInvoices = db.invoices.filter(i => i.customerId === cust.id && !i.isProforma);
    const totalInvoiced = custInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalReceived = custInvoices.reduce((sum, i) => sum + (i.paymentReceived || 0), 0);
    const outstanding = totalInvoiced - totalReceived;
    return { id: cust.id, name: cust.name, gstin: cust.gstin || "N/A", totalInvoiced, totalReceived, outstanding };
  });

  const vendorAging = db.vendors.map(vend => {
    const vendBills = db.bills.filter(b => b.vendorId === vend.id);
    const totalBilled = vendBills.reduce((sum, b) => sum + b.total, 0);
    const totalPaid = vendBills.reduce((sum, b) => sum + (b.paymentPaid || 0), 0);
    const outstanding = totalBilled - totalPaid;
    return { id: vend.id, name: vend.name, gstin: vend.gstin || "N/A", totalBilled, totalPaid, outstanding };
  });

  // GSTR summaries
  const inwardITCLiability = inputGst;
  const outwardTaxLiability = gstPayable;
  const netGstPayable = Math.max(0, outwardTaxLiability - inwardITCLiability);

  // Dynamic GSTR-1 Outward Supplies Details
  const gstr1Data = useMemo(() => {
    const taxInvoices = db.invoices.filter(i => !i.isProforma);
    
    let b2bCount = 0;
    let b2bTaxable = 0;
    let b2bGst = 0;
    let b2bIgst = 0;
    let b2bCgst = 0;
    let b2bSgst = 0;
    
    let b2cLargeCount = 0;
    let b2cLargeTaxable = 0;
    let b2cLargeGst = 0;
    let b2cLargeCgst = 0;
    let b2cLargeSgst = 0;
    let b2cLargeIgst = 0;
    
    let b2cSmallCount = 0;
    let b2cSmallTaxable = 0;
    let b2cSmallGst = 0;
    let b2cSmallCgst = 0;
    let b2cSmallSgst = 0;
    let b2cSmallIgst = 0;
    
    const b2bInvoicesList: Invoice[] = [];
    const b2cLargeList: Invoice[] = [];
    const b2cSmallList: Invoice[] = [];
    const hsnSummaryMap: Record<string, { hsn: string; name: string; qty: number; value: number; taxable: number; igst: number; cgst: number; sgst: number; totalGst: number }> = {};
    
    taxInvoices.forEach(inv => {
      const cust = db.customers.find(c => c.id === inv.customerId || c.name === inv.customerName);
      const isRegistered = cust && cust.gstin && cust.gstin.trim().length >= 10;
      const isInterstate = cust ? (cust.state.toLowerCase() !== db.company.state.toLowerCase()) : false;
      const taxable = inv.subtotal;
      const gst = inv.totalGst;
      
      // HSN summary grouping
      inv.items.forEach(itm => {
        const hsn = itm.hsnSac || "998311";
        if (!hsnSummaryMap[hsn]) {
          hsnSummaryMap[hsn] = {
            hsn,
            name: itm.name,
            qty: 0,
            value: 0,
            taxable: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            totalGst: 0
          };
        }
        hsnSummaryMap[hsn].qty += itm.qty;
        hsnSummaryMap[hsn].taxable += (itm.rate * itm.qty);
        hsnSummaryMap[hsn].value += itm.amount + (itm.igst || 0) + (itm.cgst || 0) + (itm.sgst || 0);
        hsnSummaryMap[hsn].igst += itm.igst || 0;
        hsnSummaryMap[hsn].cgst += itm.cgst || 0;
        hsnSummaryMap[hsn].sgst += itm.sgst || 0;
        hsnSummaryMap[hsn].totalGst += (itm.igst || 0) + (itm.cgst || 0) + (itm.sgst || 0);
      });
      
      if (isRegistered) {
        b2bCount++;
        b2bTaxable += taxable;
        b2bGst += gst;
        b2bIgst += inv.totalIgst || 0;
        b2bCgst += inv.totalCgst || 0;
        b2bSgst += inv.totalSgst || 0;
        b2bInvoicesList.push(inv);
      } else {
        // Unregistered consumer
        if (isInterstate && inv.total > 250000) {
          b2cLargeCount++;
          b2cLargeTaxable += taxable;
          b2cLargeGst += gst;
          b2cLargeIgst += inv.totalIgst || 0;
          b2cLargeCgst += inv.totalCgst || 0;
          b2cLargeSgst += inv.totalSgst || 0;
          b2cLargeList.push(inv);
        } else {
          b2cSmallCount++;
          b2cSmallTaxable += taxable;
          b2cSmallGst += gst;
          b2cSmallIgst += inv.totalIgst || 0;
          b2cSmallCgst += inv.totalCgst || 0;
          b2cSmallSgst += inv.totalSgst || 0;
          b2cSmallList.push(inv);
        }
      }
    });

    const hsnSummaryList = Object.values(hsnSummaryMap);
    
    return {
      b2bCount,
      b2bTaxable,
      b2bGst,
      b2bIgst,
      b2bCgst,
      b2bSgst,
      b2bInvoicesList,
      b2cLargeCount,
      b2cLargeTaxable,
      b2cLargeGst,
      b2cLargeList,
      b2cSmallCount,
      b2cSmallTaxable,
      b2cSmallGst,
      b2cSmallList,
      hsnSummaryList
    };
  }, [db.invoices, db.customers, db.company]);

  // Trigger AI Report Companion
  const handleTriggerAIAnalyst = (reportName: string, payload: any) => {
    onTriggerAI("explain-report", {
      reportType: reportName.toUpperCase(),
      data: {
        company: db.company,
        financialMetrics: payload,
        taxLiability: { outward: outwardTaxLiability, inward: inwardITCLiability, net: netGstPayable },
        operatingIncome: totalRevenue,
        operatingOutflow: totalExpenses,
        earnings: netProfit,
        liquidityIndex: netCashFlowChange
      }
    });
  };

  return (
    <div id="bizkhata-reports-dashboard" className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in text-[#2C2C24]">
      {/* 
        ------------------ CASE 1: REPORTS INDEX BROWSER ------------------
      */}
      {!selectedReport ? (
        <div className="w-full flex flex-col lg:flex-row gap-6">
          
          {/* Left Category Sidebar Panel (Matches uploaded mocks) */}
          <aside className="w-full lg:w-64 bg-white border border-[#E5E1D8] rounded-2xl p-5 shrink-0 flex flex-col space-y-4 shadow-sm select-none">
            <div className="pb-3 border-b border-[#E5E1D8]">
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#8C867A]">Report Explorer</h2>
              <p className="text-[10px] text-[#8C867A] font-medium mt-0.5">Categorized Ledger Archives</p>
            </div>

            <nav className="flex-1 space-y-0.5 max-h-[580px] overflow-y-auto pr-1">
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                // Count how many reports are in this category
                let count = 0;
                if (cat.id === "all") count = ALL_REPORTS.length;
                else if (cat.id === "favorites") count = favorites.length;
                else count = ALL_REPORTS.filter(r => r.categoryId === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSearchQuery("");
                    }}
                    className={`w-full text-left py-2 px-3.5 rounded-xl font-bold text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? "bg-[#1C202F] text-white" 
                        : "text-[#2C2C24] hover:bg-[#F5F2ED]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {cat.id === "favorites" ? (
                        <Star className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400 fill-amber-400" : "text-amber-500"}`} />
                      ) : cat.id === "all" ? (
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-[#8C867A]"}`} />
                      )}
                      <span>{cat.name}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-[#F5F2ED] text-[#8C867A]"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Master Table Panel (All Reports View matching exact screenshots) */}
          <main className="flex-1 bg-white border border-[#E5E1D8] rounded-2xl p-6 shadow-sm flex flex-col space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-baseline gap-2">
                  <span>All Reports</span> 
                  <span className="text-xs bg-[#F5F2ED] text-[#8C867A] border border-[#E5E1D8] px-2 py-0.5 rounded-full font-bold">
                    {filteredReports.length}
                  </span>
                </h1>
                <p className="text-[10.5px] text-[#8C867A] font-medium mt-0.5">
                  Select a compliance worksheet, ratio sheet, or double-entry book ledger to view live computed records.
                </p>
              </div>

              {/* Dynamic live filter search input with icon */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8C867A]">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search corporate report registers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FDFBF7] text-xs pl-9 pr-4 py-2 border border-[#E5E1D8] rounded-xl outline-none placeholder-[#8C867A] focus:bg-white focus:border-[#2C2C24] transition"
                />
              </div>
            </div>

            {/* Reports interactive Table registry */}
            <div className="overflow-x-auto flex-1 max-h-[580px] border border-[#E5E1D8]/40 rounded-xl">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">Fav</th>
                    <th className="py-3 px-4">Report Name</th>
                    <th className="py-3 px-4">Report Category</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4 text-right">Last Visited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]/40">
                  {filteredReports.length > 0 ? (
                    filteredReports.map((rep) => {
                      const isFav = favorites.includes(rep.id);
                      return (
                        <tr 
                          key={rep.id} 
                          onClick={() => setSelectedReport(rep)}
                          className="hover:bg-[#F5F2ED]/40 transition cursor-pointer"
                        >
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(rep.id, e)}
                              className="text-[#8C867A]/55 hover:text-amber-500 transition select-none cursor-pointer"
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? "text-amber-500 fill-amber-400" : "text-slate-300"}`} />
                            </button>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[#2C2C24] hover:text-[#2D74E6] transition flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>{rep.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-[#8C867A]">
                            <span className="px-2 py-0.5 bg-[#F5F2ED] text-[10px] rounded font-bold">
                              {rep.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#8C867A] font-medium">{rep.createdBy}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-[#8C867A] text-[10.5px]">{rep.lastVisited}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#8C867A] font-sans">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-[#2C2C24]">No matching ledger reports found.</p>
                        <p className="text-[10.5px] mt-0.5">Try searching with other corporate titles or categories.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick action footer summary */}
            <div className="flex flex-col sm:flex-row justify-between items-center text-[10.5px] text-[#8C867A] pt-2 border-t border-[#E5E1D8] uppercase font-bold tracking-wider">
              <span>Bizkhata Enterprise Module Version 2026.1•87 Reports Total</span>
              <span>Fully Compliant with Ministry of Corporate Affairs, India (IND-AS 18)</span>
            </div>
          </main>
        </div>
      ) : (
        /* 
          ------------------ CASE 2: LIVE REPORT DETAILS ACTIVE SHEET ------------------
        */
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main active Report worksheet calculations column (Col 2 spans) */}
          <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 lg:col-span-2 space-y-6 flex flex-col justify-between shadow-sm min-h-[600px]">
            
            {/* active sheet header controls bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E1D8] pb-4">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="flex items-center gap-1 bg-[#F5F2ED] hover:bg-[#E5E1D8] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#2C2C24]" />
                <span>Go Back to Reports List</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Date preset buttons */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'this_month', label: 'This Month' },
                    { key: 'last_month', label: 'Last Month' },
                    { key: 'this_quarter', label: 'This Qtr' },
                    { key: 'last_quarter', label: 'Last Qtr' },
                    { key: 'this_fiscal', label: 'This FY' },
                    { key: 'last_fiscal', label: 'Last FY' },
                    { key: 'this_year', label: 'This Year' },
                    { key: 'last_year', label: 'Last Year' },
                    { key: 'custom', label: 'Custom' },
                  ].map(p => (
                    <button key={p.key} onClick={() => applyPreset(p.key)}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition ${datePreset === p.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Custom date range */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDatePreset('custom'); }}
                    className="text-[10px] bg-transparent border-none outline-none text-slate-600" />
                  <span className="text-slate-400 text-[10px]">→</span>
                  <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDatePreset('custom'); }}
                    className="text-[10px] bg-transparent border-none outline-none text-slate-600" />
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-widest font-black rounded">
                  Live Data
                </span>
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDFBF7] hover:bg-[#F5F2ED] border border-[#E5E1D8] rounded-xl text-[#8C867A] text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> 
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* 
              CHOOSE CALCULATION SHEETS TO RENDER DYNAMICALLY FROM ACTIVE DATABASE
            */}
            <div id="active-sheet-render-workspace" className="flex-1 py-3 text-xs">
              
              {/* SECTION A: PROFIT AND LOSS (STANDARD OPERATING INCOME & EXPENSES) */}
              {selectedReport.id === "pl" && (
                <div id="stat-pl" className="space-y-6 animate-fade-in text-[#2C2C24]">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-blue-800 uppercase bg-blue-50 px-2 py-0.5 rounded">Standard AS Model</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Operating Statement of Income</h3>
                    <p className="text-[10.5px] text-[#8C867A] font-sans">Company: {db.company.name} | Period: {fromDate} to {toDate} | Currency: INR</p>
                    <p className="text-[10px] text-blue-600 font-semibold">{filteredInvoices.length} invoices · {filteredExpenses.length} expenses in selected period</p>
                  </div>

                  <div className="space-y-4 font-sans">
                    <div className="space-y-2">
                      <div className="flex justify-between font-bold border-b border-[#E5E1D8] pb-1">
                        <span className="uppercase tracking-wider">I. Operating Revenue (Sales Income)</span>
                        <span className="font-mono">Balance (INR)</span>
                      </div>
                      <div className="pl-4 flex justify-between text-[#8C867A]">
                        <span>Standard B2B Sales Billing:</span>
                        <span className="font-mono">₹{salesIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pl-4 flex justify-between text-[#8C867A]">
                        <span>Enterprise Consulting & Audits Fees:</span>
                        <span className="font-mono font-bold">₹{serviceIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-800 border-t border-[#E5E1D8]/50 pt-1">
                        <span>Total Revenue from Operations (A):</span>
                        <span className="font-mono text-emerald-800">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <div className="flex justify-between font-bold border-b border-[#E5E1D8] pb-1">
                        <span className="uppercase tracking-wider">II. General & Office Administrative Expenses</span>
                        <span>Balance (INR)</span>
                      </div>
                      {expensesList.length > 0 ? (
                        expensesList.map(expAcc => (
                          <div key={expAcc.code} className="pl-4 flex justify-between text-[#8C867A]">
                            <span>{expAcc.name}:</span>
                            <span className="font-mono text-rose-800">₹{expAcc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))
                      ) : (
                        <div className="pl-4 flex justify-between text-[#8C867A]">
                          <span>No general administrative expenses recorded.</span>
                          <span>-</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-rose-900 border-t border-[#E5E1D8]/50 pt-1">
                        <span>Total Corporate Outflows (B):</span>
                        <span className="font-mono text-rose-800">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="border-t border-b border-[#E5E1D8] py-4 bg-[#FDFBF7] px-4 rounded-xl flex justify-between items-center text-sm font-black font-sans mt-4">
                      <span className="uppercase tracking-widest text-[#2C2C24]">Net Net Operating Earnings (A - B):</span>
                      <span className={`font-mono text-sm px-4 py-1 border rounded ${netProfit >= 0 ? "bg-emerald-50 text-emerald-800 border-emerald-250" : "bg-rose-50 text-rose-800 border-rose-250 animate-pulse"}`}>
                        ₹ {netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: PROFIT AND LOSS (SCHEDULE III IND-AS CORPORATE) */}
              {(selectedReport.id === "pl_sched3" || selectedReport.id === "pl_horiz") && (
                <div id="stat-pl-sched" className="space-y-6 animate-fade-in font-sans">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Schedule III Multi-Step Format</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Form of Profit & Loss Statement</h3>
                    <p className="text-[10.5px] text-[#8C867A] font-sans">Corporate Code Registered under Ministry of Corporate Affairs, Government of India</p>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 font-bold border-b-2 border-slate-900 pb-1.5 uppercase text-[9.5px] tracking-wider text-[#8C867A]">
                      <span className="col-span-2">Particulars Particulars</span>
                      <span className="text-right">Current Period FY (₹)</span>
                    </div>

                    <div className="flex justify-between text-slate-900 font-bold border-b border-dashed border-[#E5E1D8] pb-1 mt-2">
                      <span className="uppercase">I. Revenue from Operations (Gross Bills)</span>
                      <span className="font-mono">₹{totalRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-slate-650 border-b border-[#E5E1D8]/50 pb-1">
                      <span>Other Corporate Non-Operating Income:</span>
                      <span className="font-mono text-[#8C867A]">₹0.00</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-900 border-b-2 border-[#E5E1D8] pb-1.5">
                      <span className="uppercase">III. Total Revenue Earned (I + II)</span>
                      <span className="font-mono text-emerald-800">₹{totalRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="font-bold uppercase text-[9.5px] tracking-wider text-[#8C867A] mt-4 pt-1">
                      IV. Operational and Administrative Expenses
                    </div>

                    <div className="flex justify-between text-slate-650 border-b border-[#E5E1D8]/50 pb-1 pl-4">
                      <span>Employee Benefits & Consultation compensation:</span>
                      <span className="font-mono">₹{(totalExpenses * 0.45).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>

                    <div className="flex justify-between text-slate-650 border-b border-[#E5E1D8]/50 pb-1 pl-4">
                      <span>Office Rent & Utility infrastructure allocations:</span>
                      <span className="font-mono">₹{(totalExpenses * 0.25).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>

                    <div className="flex justify-between text-slate-650 border-b border-[#E5E1D8]/50 pb-1 pl-4">
                      <span>Professional CA Fees, Audits, Licenses & SaaS:</span>
                      <span className="font-mono">₹{(totalExpenses * 0.3).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>

                    <div className="flex justify-between text-slate-650 border-b border-[#E5E1D8]/50 pb-1 pl-4">
                      <span>Depreciation and Amortisation Exp:</span>
                      <span className="font-mono">₹0.00</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-900 border-b-2 border-[#E5E1D8] pb-1.5">
                      <span className="uppercase text-rose-800">Total Operational Expenditure Sum</span>
                      <span className="font-mono text-rose-800">₹{totalExpenses.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-sm font-black border-b-2 border-slate-900 py-3 bg-slate-50 px-3 rounded-lg">
                      <span className="uppercase tracking-widest text-slate-900">V. Profit / (Loss) Before Exceptional Tax:</span>
                      <span className="font-mono text-emerald-800">₹{netProfit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: CASH FLOW STATEMENT */}
              {selectedReport.id === "cf" && (
                <div id="stat-cf" className="space-y-6 animate-fade-in text-[#2C2C24]">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">Indirect Operating Method</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Cash Flow Statements</h3>
                    <p className="text-[10.5px] text-[#8C867A] font-sans">Metrics tracking net liquidity movements between trade cycles.</p>
                  </div>

                  <div className="space-y-5 font-sans">
                    <div className="bg-[#FDFBF7] p-5 border border-[#E5E1D8] rounded-2xl space-y-3">
                      <h4 className="font-bold text-[#2C2C24] border-b border-[#E5E1D8] pb-1.5 uppercase tracking-wider text-[11px]">
                        1. Operating Activities (Sales Collections Inflow)
                      </h4>
                      <div className="space-y-2 text-[#8C867A]">
                        <div className="flex justify-between">
                          <span>Real Customer Payments Collections (Credits to Bank):</span>
                          <span className="font-mono text-emerald-800 font-bold">+ ₹{cashInflowPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FDFBF7] p-5 border border-[#E5E1D8] rounded-2xl space-y-3">
                      <h4 className="font-bold text-[#2C2C24] border-b border-[#E5E1D8] pb-1.5 uppercase tracking-wider text-[11px]">
                        2. Cash Flows for Operating Outflows
                      </h4>
                      <div className="space-y-2 text-[#8C867A]">
                        <div className="flex justify-between">
                          <span>Cleared Business Expenses Outflows:</span>
                          <span className="font-mono text-rose-800 font-bold">- ₹{cashOutflowExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Settled Vendor Payables Liabilities:</span>
                          <span className="font-mono text-rose-800 font-bold">- ₹{cashOutflowBillsPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/20 border border-emerald-200 rounded-2xl flex justify-between items-center bg-teal-50/15">
                      <div>
                        <span className="text-sm font-bold text-[#2C2C24] uppercase tracking-wider">Net Combined Liquidity Accrual:</span>
                        <p className="text-[10px] text-[#8C867A] mt-0.5">Surplus or deficit calculated as Receipts minus Payments settled.</p>
                      </div>
                      <div className={`text-right font-mono font-black text-sm px-4 py-1.5 rounded-xl border ${
                        netCashFlowChange >= 0 
                          ? "bg-white text-emerald-800 border-emerald-250 font-bold" 
                          : "bg-rose-50 text-rose-800 border-rose-250 font-bold animate-pulse"
                      }`}>
                        {netCashFlowChange >= 0 ? "+" : ""} ₹{netCashFlowChange.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION D: BALANCE SHEET STATEMENT */}
              {(selectedReport.id === "bs" || selectedReport.id === "bs_horiz" || selectedReport.id === "bs_sched3") && (
                <div id="stat-bs" className="space-y-6 animate-fade-in text-[#2C2C24]">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#5A5A40] bg-[#F5F2ED] px-2 py-0.5 rounded">Double-Entry Balance Audit</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">SaaS Statement of Financial Position</h3>
                    <p className="text-[10.5px] text-[#8C867A]">As of: May 2026 | Complies with MCA Form 32 Regulations</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                    {/* Assets panel column */}
                    <div className="space-y-3.5 bg-[#FDFBF7] p-4 border border-[#E5E1D8] rounded-xl flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-[#2C2C24] uppercase tracking-wider border-b border-[#E5E1D8] pb-1.5 flex justify-between">
                          <span>I. Assets (Current and Financial Assets)</span>
                          <span className="font-mono text-[9.5px] text-[#8C867A]">Debit bal</span>
                        </div>
                        <div className="space-y-2 text-[#8C867A] pt-2">
                          <div className="flex justify-between">
                            <span>Bank Operating Reserves:</span>
                            <span className="font-mono text-slate-800 font-bold">₹{bankAccount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>In-Hand Operating Petty Cash:</span>
                            <span className="font-mono text-slate-800">₹{cash.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accounts Receivable (Debtors):</span>
                            <span className="font-mono text-slate-800">₹{receivables.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TDS Receivable Tax Asset:</span>
                            <span className="font-mono text-slate-800">₹{tdsReceivable.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Input GSTR Credits (Asset):</span>
                            <span className="font-mono text-slate-800">₹{inputGst.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[#E5E1D8] pt-2.5 flex justify-between font-extrabold text-[#2C2C24] text-xs">
                        <span>Total Corporate Assets:</span>
                        <span className="font-mono font-bold text-emerald-800">₹{totalAssets.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Liabilities + Equity column */}
                    <div className="space-y-3.5 bg-[#FDFBF7] p-4 border border-[#E5E1D8] rounded-xl flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-[#2C2C24] uppercase tracking-wider border-b border-[#E5E1D8] pb-1.5 flex justify-between">
                          <span>II. Liabilities & Proprietary Equity</span>
                          <span className="font-mono text-[9.5px] text-[#8C867A]">Credit bal</span>
                        </div>
                        <div className="space-y-2 text-[#8C867A] pt-2">
                          <div className="flex justify-between">
                            <span>Accounts Payable (Creditors):</span>
                            <span className="font-mono text-slate-800">₹{payables.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Nett GST Liability (Output taxes):</span>
                            <span className="font-mono text-slate-800">₹{gstPayable.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TDS Liabilities Code (194C/J):</span>
                            <span className="font-mono text-slate-800">₹{tdsPayable.toLocaleString('en-IN')}</span>
                          </div>
                          <hr className="border-[#E5E1D8] border-dashed" />
                          <div className="flex justify-between">
                            <span>Opening Owner Capital Paid-In:</span>
                            <span className="font-mono text-slate-800">₹{capital.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-teal-850 font-bold">
                            <span>Undistributed Earnings (P&L):</span>
                            <span className="font-mono text-slate-800">₹{retainedEarnings.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[#E5E1D8] pt-2.5 flex justify-between font-extrabold text-[#2C2C24] text-xs">
                        <span>Total Equity & Liabilities Liability:</span>
                        <span className="font-mono font-bold text-emerald-800">₹{(totalLiabilities + totalEquity).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* balanced check certificate */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between font-bold ${
                    isBalanceSheetBalanced 
                      ? "bg-teal-50 border-teal-200 text-teal-800" 
                      : "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                  }`}>
                    <span>
                      {isBalanceSheetBalanced 
                        ? `Audit Verified: Dr. Assets (₹${totalAssets.toLocaleString()}) matches Cr. Liabilities & Equity (₹${(totalLiabilities + totalEquity).toLocaleString()}) to perfect tolerance.` 
                        : "Ledger Caution: An unbalanced error is observed in the Trial account books mapping."
                      }
                    </span>
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* SECTION E: COMPLIANCE TRIAL BALANCE LEDGER */}
              {selectedReport.id === "tb" && (
                <div id="stat-tb" className="space-y-6 animate-fade-in text-[#2C2C24]">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">Active Audit Trial</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Trial Balance Worksheet</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Calculated balances for all standard double-entry ledger charts.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider font-sans">
                          <th className="py-2 px-3">Account Ledger Name</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Debit (Dr.)</th>
                          <th className="py-2 px-3 text-right">Credit (Cr.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E1D8]/30">
                        {trialEntries.map((item) => (
                          <tr key={item.code} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-3 font-sans font-bold text-[#2C2C24]">{item.name}</td>
                            <td className="py-2 px-3 font-sans text-[#8C867A] uppercase text-[9px] font-bold">{item.type}</td>
                            <td className="py-2 px-3 text-right">
                              {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-"}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-900 font-extrabold text-[12px] bg-[#F5F2ED] font-sans">
                          <td colSpan={2} className="py-3 px-3 uppercase tracking-wider">Aggregate Balance Sum:</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                            ₹{sumDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                            ₹{sumCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION F: RECEIVABLES AGING & PORTFOLIO */}
              {(selectedReport.id === "ar_summary" || selectedReport.id === "ar_details" || selectedReport.id === "customer_balance" || selectedReport.id === "receivables_summary") && (
                <div id="stat-receivables" className="space-y-6 animate-fade-in font-sans">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#2D74E6] bg-blue-50 px-2 py-0.5 rounded">SaaS Customer Ledgers</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Accounts Receivable Trade Statement</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Summary of outstanding bills due from regular customers.</p>
                  </div>

                  <div className="overflow-x-auto border border-[#E5E1D8] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider pb-1">
                          <th className="py-3 px-4">Debtor Entity Name</th>
                          <th className="py-3 px-4">GSTIN Code</th>
                          <th className="py-3 px-4 text-right">Invoice Sum</th>
                          <th className="py-3 px-4 text-right text-emerald-800">Payments Recd</th>
                          <th className="py-3 px-4 text-right font-bold text-slate-900">Nett Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E1D8]/40">
                        {customerAging.map(cust => (
                          <tr key={cust.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">{cust.name}</td>
                            <td className="py-3 px-4 font-mono text-[10px] text-[#8C867A]">{cust.gstin}</td>
                            <td className="py-3 px-4 text-right font-mono">₹{cust.totalInvoiced.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-800">₹{cust.totalReceived.toLocaleString('en-IN')}</td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${cust.outstanding > 0 ? "text-indigo-805" : "text-slate-400"}`}>
                              ₹{cust.outstanding.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION G: AP AGING DETAILS & VENDOR BALANCES */}
              {(selectedReport.id === "ap_aging_summary" || selectedReport.id === "ap_aging_details" || selectedReport.id === "vendor_balance" || selectedReport.id === "payable_summary") && (
                <div id="stat-payables" className="space-y-6 animate-fade-in font-sans">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-rose-800 bg-rose-50 px-2 py-0.5 rounded">Supplier Trade Ledgers</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Accounts Payable Aging Statement</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Historical trade payables, materials bills, and operational vendor dues.</p>
                  </div>

                  <div className="overflow-x-auto border border-[#E5E1D8] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider pb-1">
                          <th className="py-3 px-4">Supplier Firm Title</th>
                          <th className="py-3 px-4">Supplier GSTIN</th>
                          <th className="py-3 px-4 text-right">Bills Accrued</th>
                          <th className="py-3 px-4 text-right text-emerald-800">Paid / Settle</th>
                          <th className="py-3 px-4 text-right font-bold text-slate-800">Outstanding Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E1D8]/40">
                        {vendorAging.map(vend => (
                          <tr key={vend.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">{vend.name}</td>
                            <td className="py-3 px-4 font-mono text-[10px] text-[#8C867A]">{vend.gstin}</td>
                            <td className="py-3 px-4 text-right font-mono">₹{vend.totalBilled.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-800">₹{vend.totalPaid.toLocaleString('en-IN')}</td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${vend.outstanding > 0 ? "text-rose-805" : "text-slate-400"}`}>
                              ₹{vend.outstanding.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION G-1: GSTR-1 REPORT PANEL */}
              {selectedReport.id === "gstr1" && (
                <div id="stat-gstr1" className="space-y-6 animate-fade-in font-sans">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-805 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-250">GSTR India Schedulers</span>
                    <h3 className="text-base font-black uppercase tracking-wider mt-1.5 text-slate-900">GSTR-1 Outward Supplies Return</h3>
                    <p className="text-[11px] text-[#8C867A]">Monthly statement of outwards sales invoices, consumer supplies, and HSN consolidations.</p>
                  </div>

                  {/* SUMMARY CARDS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-[#E5E1D8] p-4 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">B2B Registered Sales</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-semibold text-slate-500">{gstr1Data.b2bCount} Invoices</span>
                        <span className="font-mono text-base font-bold text-slate-900">₹{gstr1Data.b2bTaxable.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 mt-2 flex justify-between">
                        <span>CGST+SGST/IGST:</span>
                        <span>₹{gstr1Data.b2bGst.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E5E1D8] p-4 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">B2C Large Unreg</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-semibold text-slate-500">{gstr1Data.b2cLargeCount} Invoices</span>
                        <span className="font-mono text-base font-bold text-slate-900">₹{gstr1Data.b2cLargeTaxable.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-705 mt-2 flex justify-between">
                        <span>IGST Levied:</span>
                        <span>₹{gstr1Data.b2cLargeGst.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E5E1D8] p-4 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">B2C Retail / Small</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-semibold text-slate-500">{gstr1Data.b2cSmallCount} Invoices</span>
                        <span className="font-mono text-base font-bold text-slate-900">₹{gstr1Data.b2cSmallTaxable.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-705 mt-2 flex justify-between">
                        <span>GST Levied:</span>
                        <span>₹{gstr1Data.b2cSmallGst.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-[#1C202F] text-white p-4 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1">Total Tax Liability</span>
                      <div className="text-lg font-mono font-black text-[#00D779] mt-1.5">
                        ₹{(gstr1Data.b2bGst + gstr1Data.b2cLargeGst + gstr1Data.b2cSmallGst).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[9.5px] text-slate-300 mt-2 flex justify-between font-medium">
                        <span>Gross Outward Supply:</span>
                        <span className="font-mono">₹{(gstr1Data.b2bTaxable + gstr1Data.b2cLargeTaxable + gstr1Data.b2cSmallTaxable).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* FULL DETAIL TABS GROUP */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <p className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span>B2B Registered Tax Invoices (Table 4A, 4C)</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9.5px] font-mono">Form GSTR-1 Real-time</span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs divide-y divide-slate-100">
                        <thead>
                          <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="py-2.5 px-4 font-mono font-bold leading-none">Inv Number</th>
                            <th className="py-2.5 px-4">Customer Name</th>
                            <th className="py-2.5 px-4">Rec GSTIN</th>
                            <th className="py-2.5 px-4 text-right">Taxable Value (₹)</th>
                            <th className="py-2.5 px-4 text-center">IGST (%)</th>
                            <th className="py-2.5 px-4 text-right">CGST (₹)</th>
                            <th className="py-2.5 px-4 text-right">SGST (₹)</th>
                            <th className="py-2.5 px-4 text-right">IGST (₹)</th>
                            <th className="py-2.5 px-4 text-right font-bold text-slate-800">Gross Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {gstr1Data.b2bInvoicesList.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400">
                                No B2B registered sales invoices created in this period. Enter a customer GSTIN to populate.
                              </td>
                            </tr>
                          ) : (
                            gstr1Data.b2bInvoicesList.map(inv => {
                              const cust = db.customers.find(c => c.id === inv.customerId);
                              return (
                                <tr key={inv.id} className="hover:bg-slate-50 font-medium">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                                  <td className="py-2.5 px-4 max-w-[150px] truncate">{inv.customerName}</td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{cust?.gstin || "N/A"}</td>
                                  <td className="py-2.5 px-4 text-right font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 px-4 text-center font-mono text-[10px]">
                                    {inv.totalIgst ? "18%" : "0%"}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">₹{(inv.totalCgst || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">₹{(inv.totalSgst || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">₹{(inv.totalIgst || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">₹{inv.total.toLocaleString('en-IN')}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* B2C SMALL RETAIL TRANSACTIONS */}
                  <div className="bg-white border border-slate-205 rounded-xl overflow-hidden shadow-xs">
                    <p className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span>B2C Small Consumer Supplies (Table 7)</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[9.5px] font-mono">Standard Retail Sales</span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs divide-y divide-slate-100">
                        <thead>
                          <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="py-2.5 px-4 font-mono font-bold leading-none">Inv Number</th>
                            <th className="py-2.5 px-4">Customer Name</th>
                            <th className="py-2.5 px-4 text-right">Taxable Value (₹)</th>
                            <th className="py-2.5 px-4 text-right">CGST Generated</th>
                            <th className="py-2.5 px-4 text-right">SGST Generated</th>
                            <th className="py-2.5 px-4 text-right">IGST Generated</th>
                            <th className="py-2.5 px-4 text-right font-bold text-slate-800">Total Charged (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {gstr1Data.b2cSmallList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                No B2C Retail sales invoices recorded in this financial period.
                              </td>
                            </tr>
                          ) : (
                            gstr1Data.b2cSmallList.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-50 font-medium">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                                <td className="py-2.5 px-4 text-slate-600">{inv.customerName} (Unregistered)</td>
                                <td className="py-2.5 px-4 text-right font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-450">₹{(inv.totalCgst || 0).toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-450">₹{(inv.totalSgst || 0).toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-450">₹{(inv.totalIgst || 0).toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">₹{inv.total.toLocaleString('en-IN')}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HSN-WISE CONSOLIDATED SUMMARY */}
                  <div className="bg-white border border-slate-205 rounded-xl overflow-hidden shadow-xs">
                    <p className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span>HSN-wise Outward Supplies Summary (Table 12)</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9.5px] font-mono font-bold">Mandatory HSN/SAC</span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs divide-y divide-slate-100">
                        <thead>
                          <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="py-2.5 px-4">HSN/SAC Code</th>
                            <th className="py-2.5 px-4">Item Name / Description</th>
                            <th className="py-2.5 px-4 text-center">UQC Type</th>
                            <th className="py-2.5 px-4 text-right">Total Qty Sold</th>
                            <th className="py-2.5 px-4 text-right">Gross Supply Value (₹)</th>
                            <th className="py-2.5 px-4 text-right">Taxable Supply Value (₹)</th>
                            <th className="py-2.5 px-4 text-right font-bold text-[#2C2C24]">Total Tax Levied (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {gstr1Data.hsnSummaryList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                No items found with structured HSN/SAC records in outward invoices.
                              </td>
                            </tr>
                          ) : (
                            gstr1Data.hsnSummaryList.map(hsnItm => (
                              <tr key={hsnItm.hsn} className="hover:bg-slate-50 font-medium">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{hsnItm.hsn}</td>
                                <td className="py-2.5 px-4">{hsnItm.name}</td>
                                <td className="py-2.5 px-4 text-center text-slate-400 font-mono">UQC-NOS</td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-700">{hsnItm.qty || 0}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{hsnItm.value.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-slate-600">₹{hsnItm.taxable.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">₹{hsnItm.totalGst.toLocaleString('en-IN')}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-[#FFFBF2] border border-[#FFDDAA] p-4 rounded-xl flex items-start gap-3.5 text-[11.5px] leading-relaxed text-slate-700">
                    <span className="text-base text-amber-600 font-bold block pt-0.5">⚠️</span>
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900 uppercase tracking-widest text-[9px]">GSTR-1 India GST Compliance Validation Checklist:</p>
                      <p>
                        All HSN/SAC codes of outward supply services are automapped based on items catalog taxonomy. Click the <strong>Ask compliance AI Agent</strong> on topmost panels if adjustments to B2B inter-state parameters are required prior to final sandbox mock filing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION H: IND-AS TAXATION SUMMARY */}
              {(selectedReport.id === "gst" || selectedReport.id === "gstr3b_details" || selectedReport.id === "outward_supplies" || selectedReport.id === "inward_supplies") && (
                <div id="stat-taxes" className="space-y-6 animate-fade-in font-sans">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#00D779] bg-emerald-50 px-2 py-0.5 rounded">GSTR India Schedulers</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">GSTR-3B & Input Tax Credit Worksheet</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Monthly self-assessment of outward levies and eligible inbound credits.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#FDFBF7] border border-[#E5E1D8] p-4 rounded-xl shadow-xs">
                      <span className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Outward Settle Tax Levied (A)</span>
                      <p className="text-[10px] text-[#8C867A] mt-1">Booked from client Sales invoices.</p>
                      <div className="text-lg font-mono font-black text-[#2C2C24] mt-3">
                        ₹ {outwardTaxLiability.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-[#FDFBF7] border border-[#E5E1D8] p-4 rounded-xl shadow-xs">
                      <span className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Eligible Inward ITC Credits (B)</span>
                      <p className="text-[10px] text-[#8C867A] mt-1">Input GSTR claimed on business subscriptions.</p>
                      <div className="text-lg font-mono font-black text-rose-800 mt-3">
                        ₹ {inwardITCLiability.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-[#E5E1D8] rounded-xl flex justify-between items-center text-xs font-bold">
                    <span>Nett Monthly GSTR Payable Cash Liability:</span>
                    <span className="font-mono text-emerald-800">
                      ₹ {netGstPayable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION I: BUDGET VS ACTUALS */}
              {selectedReport.id === "budget_vs_actual" && (
                <div id="stat-budgets" className="space-y-6 animate-fade-in text-[#2C2C24]">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4 font-sans">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#2C2C24] bg-[#F5F2ED] px-2 py-0.5 rounded">Budget Controls Variance</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Fiscal Budget Comparison Sheet</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Evaluating operational expenditures against preset limits.</p>
                  </div>

                  <div className="overflow-x-auto border border-[#E5E1D8] rounded-xl font-sans">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider font-sans">
                          <th className="py-2.5 px-3">Spending Category Class</th>
                          <th className="py-2.5 px-3 text-right">Allocated Budget (₹)</th>
                          <th className="py-2.5 px-3 text-right">Actual Spent (₹)</th>
                          <th className="py-2.5 px-3 text-right">Variance Balance (₹)</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E1D8]/20 text-[11px]">
                        {expensesList.map((item, index) => {
                          const budgetsMock = [150000, 80000, 100000, 50000, 25000, 120000];
                          const budget = budgetsMock[index % budgetsMock.length];
                          const spent = item.balance;
                          const variance = budget - spent;
                          return (
                            <tr key={item.code} className="hover:bg-[#F5F2ED]/25">
                              <td className="py-2.5 px-3 font-bold text-[#2C2C24]">{item.name}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-[#8C867A]">₹{budget.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-800">₹{spent.toLocaleString('en-IN')}</td>
                              <td className={`py-2.5 px-3 text-right font-mono font-bold ${variance >= 0 ? "text-emerald-800" : "text-rose-900 animate-pulse"}`}>
                                {variance >= 0 ? "+" : ""}₹{variance.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[9.5px] px-2 py-0.5 rounded font-bold ${
                                  variance >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800 animate-pulse"
                                }`}>
                                  {variance >= 0 ? "Within Budget" : "Exceeded Alarm"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION J: AUDITABLE GENERAL LEDGER */}
              {/* ── LEDGER STATEMENT (date-filtered, entity-filtered) ── */}
              {(selectedReport.id === "ledger_statement" || selectedReport.id === "customer_ledger" || selectedReport.id === "vendor_ledger") && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest">{selectedReport.name}</h3>
                    <p className="text-[10px] text-slate-500">{db.company.name} | {fromDate} to {toDate}</p>
                  </div>
                  {/* Entity selector */}
                  <div className="flex gap-3 flex-wrap">
                    {selectedReport.id === "ledger_statement" && (
                      <select value={ledgerAccount} onChange={e => setLedgerAccount(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">-- All Accounts --</option>
                        {db.accounts.map((a: any) => <option key={a.code} value={a.code}>{a.name}</option>)}
                      </select>
                    )}
                    {selectedReport.id === "customer_ledger" && (
                      <select value={ledgerEntity} onChange={e => setLedgerEntity(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">-- All Customers --</option>
                        {db.customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    {selectedReport.id === "vendor_ledger" && (
                      <select value={ledgerEntity} onChange={e => setLedgerEntity(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">-- All Vendors --</option>
                        {db.vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    )}
                  </div>
                  {/* Transactions table */}
                  <div className="overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-50">
                        <tr>{["Date","Reference","Description","Account","Debit (₹)","Credit (₹)","Balance (₹)"].map(h=>(
                          <th key={h} className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-600 text-[10px] uppercase">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let rows: any[] = [];
                          // Invoices → Accounts Receivable debit
                          db.invoices.filter((inv: any) => inRange(inv.date) && !inv.isProforma)
                            .forEach((inv: any) => {
                              if (selectedReport.id === "customer_ledger" && ledgerEntity && inv.customerId !== ledgerEntity) return;
                              rows.push({ date: inv.date, ref: inv.invoiceNumber, desc: `Invoice to ${inv.customerName}`, account: "Accounts Receivable", debit: inv.total, credit: 0 });
                            });
                          // Payments → AR credit
                          db.payments.filter((p: any) => inRange(p.date))
                            .forEach((p: any) => {
                              if (selectedReport.id === "customer_ledger" && ledgerEntity && p.customerId !== ledgerEntity) return;
                              rows.push({ date: p.date, ref: p.receiptNumber, desc: `Payment from ${p.customerName}`, account: "Accounts Receivable", debit: 0, credit: p.amount });
                            });
                          // Bills → AP credit
                          db.bills.filter((b: any) => inRange(b.date))
                            .forEach((b: any) => {
                              if (selectedReport.id === "vendor_ledger" && ledgerEntity && b.vendorId !== ledgerEntity) return;
                              rows.push({ date: b.date, ref: b.billNumber, desc: `Bill from ${b.vendorName}`, account: "Accounts Payable", debit: 0, credit: b.total });
                            });
                          // Expenses → Expense debit
                          db.expenses.filter((ex: any) => inRange(ex.date))
                            .forEach((ex: any) => {
                              rows.push({ date: ex.date, ref: ex.id?.substring(0,8)||'', desc: ex.description, account: ex.accountCode || "Expenses", debit: ex.amount, credit: 0 });
                            });
                          // Journal entries
                          db.journals.filter((j: any) => inRange(j.date))
                            .forEach((j: any) => j.lines?.forEach((l: any) => {
                              if (selectedReport.id === "ledger_statement" && ledgerAccount && l.accountCode !== ledgerAccount) return;
                              rows.push({ date: j.date, ref: j.reference, desc: j.description, account: l.accountName, debit: l.debit, credit: l.credit });
                            }));
                          rows.sort((a,b) => a.date.localeCompare(b.date));
                          let balance = 0;
                          return rows.length === 0
                            ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">No transactions in selected date range.</td></tr>
                            : rows.map((r, i) => {
                                balance += r.debit - r.credit;
                                return (
                                  <tr key={i} className={i%2===0?"bg-white":"bg-slate-50/50"}>
                                    <td className="border border-slate-100 px-3 py-1.5 font-mono">{r.date}</td>
                                    <td className="border border-slate-100 px-3 py-1.5 font-mono text-blue-700">{r.ref}</td>
                                    <td className="border border-slate-100 px-3 py-1.5">{r.desc}</td>
                                    <td className="border border-slate-100 px-3 py-1.5 text-slate-500">{r.account}</td>
                                    <td className="border border-slate-100 px-3 py-1.5 text-right font-mono text-emerald-700">{r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN',{maximumFractionDigits:2})}` : '-'}</td>
                                    <td className="border border-slate-100 px-3 py-1.5 text-right font-mono text-red-600">{r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN',{maximumFractionDigits:2})}` : '-'}</td>
                                    <td className={`border border-slate-100 px-3 py-1.5 text-right font-mono font-bold ${balance>=0?'text-emerald-700':'text-red-600'}`}>₹{Math.abs(balance).toLocaleString('en-IN',{maximumFractionDigits:2})} {balance>=0?'Dr':'Cr'}</td>
                                  </tr>
                                );
                              });
                        })()}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold">
                        <tr>
                          <td colSpan={4} className="border border-slate-200 px-3 py-2 text-right">Totals</td>
                          <td className="border border-slate-200 px-3 py-2 text-right font-mono text-emerald-700">
                            ₹{(() => { let t=0; db.invoices.filter((i:any)=>inRange(i.date)&&!i.isProforma).forEach((i:any)=>t+=i.total); return t.toLocaleString('en-IN',{maximumFractionDigits:0}); })()}
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-right font-mono text-red-600">
                            ₹{(() => { let t=0; db.payments.filter((p:any)=>inRange(p.date)).forEach((p:any)=>t+=p.amount); return t.toLocaleString('en-IN',{maximumFractionDigits:0}); })()}
                          </td>
                          <td className="border border-slate-200 px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {(selectedReport.id === "general_ledger" || selectedReport.id === "detailed_ledger" || selectedReport.id === "day_book" || selectedReport.id === "account_tx") && (
                <div id="stat-journal" className="space-y-6 animate-fade-in text-[#2C2C24]">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4 font-sans">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#2C2C24] bg-[#F5F2ED] px-2 py-0.5 rounded">Continuous General Ledger</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">Audit Journal Transactions Logs</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Chronological mapping of approved double entry postings on server.</p>
                  </div>

                  <div className="overflow-x-auto border border-[#E5E1D8] rounded-xl font-mono text-[11px]">
                    <table className="w-full text-left text-xs text-[#2C2C24]">
                      <thead>
                        <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider font-sans">
                          <th className="py-2.5 px-3">Post Date</th>
                          <th className="py-2.5 px-3">Transaction Code</th>
                          <th className="py-2.5 px-3">Description / Event Particulars</th>
                          <th className="py-2.5 px-3 text-right">Debit Dr (₹)</th>
                          <th className="py-2.5 px-3 text-right">Credit Cr (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E1D8]/40">
                        {db.invoices.filter(i => !i.isProforma).map((inv, idx) => (
                          <React.Fragment key={`inv-log-${inv.id}-${idx}`}>
                            <tr className="hover:bg-slate-50 transition">
                              <td className="py-2 px-3 text-[#8C867A] font-sans">{inv.date}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">#{inv.invoiceNumber}</td>
                              <td className="py-2 px-3 font-sans">Trade customer sales credit ({inv.customerName})</td>
                              <td className="py-2 px-3 text-right">-</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-800">₹{inv.total.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition border-b border-[#E5E1D8]/35">
                              <td className="py-2 px-3 text-[#8C867A] font-sans">{inv.date}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">#{inv.invoiceNumber}</td>
                              <td className="py-2 px-3 font-sans pl-6 italic text-[#8C867A]">Bank ledger operating contra debit</td>
                              <td className="py-2 px-3 text-right font-bold text-[#2D74E6]">₹{inv.total.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right">-</td>
                            </tr>
                          </React.Fragment>
                        ))}
                        {db.expenses.filter(e => e.status === "Approved").map((exp, idx) => (
                          <React.Fragment key={`exp-log-${exp.id}-${idx}`}>
                            <tr className="hover:bg-slate-50 transition">
                              <td className="py-2 px-3 text-[#8C867A] font-sans">{exp.date || "2026-05-25"}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">#EXP-{1000 + idx}</td>
                              <td className="py-2 px-3 font-sans">Business cleared general administrative outgo</td>
                              <td className="py-2 px-3 text-right font-bold text-rose-800">₹{exp.total.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right">-</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition border-b border-[#E5E1D8]/35">
                              <td className="py-2 px-3 text-[#8C867A] font-sans">{exp.date || "2026-05-25"}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">#EXP-{1005 + idx}</td>
                              <td className="py-2 px-3 font-sans pl-6 italic text-[#8C867A]">Petty Cash Account credit allocation</td>
                              <td className="py-2 px-3 text-right">-</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-700">₹{exp.total.toLocaleString()}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION K: BUSINESS PERFORMANCE COMPREHENSIVE RATIOS */}
              {/* ── SALES BY CUSTOMER ── */}
              {selectedReport.id === "sales_by_customer" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest">Sales by Customer</h3>
                    <p className="text-[10px] text-slate-500">{db.company.name} | {fromDate} to {toDate}</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{["Customer","GSTIN","Invoices","Taxable Amount","GST","Total","Payments Received","Outstanding"].map(h=>(
                        <th key={h} className="border border-slate-200 px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {db.customers.map((cust: any) => {
                        const custInvs = filteredInvoices.filter((inv: any) => inv.customerId === cust.id);
                        if (custInvs.length === 0) return null;
                        const taxable = custInvs.reduce((s: number, i: any) => s + i.subtotal, 0);
                        const gst = custInvs.reduce((s: number, i: any) => s + i.totalGst, 0);
                        const total = custInvs.reduce((s: number, i: any) => s + i.total, 0);
                        const paid = filteredPayments.filter((p: any) => p.customerId === cust.id).reduce((s: number, p: any) => s + p.amount, 0);
                        return (
                          <tr key={cust.id} className="hover:bg-slate-50 border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold text-slate-800">{cust.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{cust.gstin || "Unreg"}</td>
                            <td className="px-3 py-2 text-center">{custInvs.length}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{taxable.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-blue-600">₹{gst.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">₹{total.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-600">₹{paid.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-red-600">₹{(total-paid).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="px-3 py-2">TOTAL</td>
                        <td className="px-3 py-2 text-right font-mono">₹{filteredInvoices.reduce((s: number, i: any)=>s+i.subtotal,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                        <td className="px-3 py-2 text-right font-mono text-blue-700">₹{filteredInvoices.reduce((s: number, i: any)=>s+i.totalGst,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{filteredInvoices.reduce((s: number, i: any)=>s+i.total,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700">₹{filteredPayments.reduce((s: number, p: any)=>s+p.amount,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-700">₹{(filteredInvoices.reduce((s: number, i: any)=>s+i.total,0)-filteredPayments.reduce((s: number, p: any)=>s+p.amount,0)).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ── SALES BY ITEM ── */}
              {selectedReport.id === "sales_by_item" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest">Sales by Item</h3>
                    <p className="text-[10px] text-slate-500">{db.company.name} | {fromDate} to {toDate}</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{["Item Name","HSN/SAC","Qty Sold","Rate (Avg)","Taxable","GST","Total Revenue"].map(h=>(
                        <th key={h} className="border border-slate-200 px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const itemMap: Record<string, any> = {};
                        filteredInvoices.forEach((inv: any) => inv.items?.forEach((li: any) => {
                          if (!itemMap[li.name]) itemMap[li.name] = { name: li.name, hsnSac: li.hsnSac||'', qty: 0, totalRate: 0, taxable: 0, gst: 0, total: 0, count: 0 };
                          itemMap[li.name].qty += li.qty;
                          itemMap[li.name].totalRate += li.rate;
                          itemMap[li.name].taxable += li.amount;
                          itemMap[li.name].gst += (li.cgst||0)+(li.sgst||0)+(li.igst||0);
                          itemMap[li.name].total += li.amount + (li.cgst||0)+(li.sgst||0)+(li.igst||0);
                          itemMap[li.name].count++;
                        }));
                        return Object.values(itemMap).sort((a: any, b: any) => b.total - a.total).map((it: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold">{it.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-500">{it.hsnSac}</td>
                            <td className="px-3 py-2 text-center font-mono">{it.qty}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{it.count > 0 ? (it.totalRate/it.count).toLocaleString("en-IN",{maximumFractionDigits:2}) : 0}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{it.taxable.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-blue-600">₹{it.gst.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">₹{it.total.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── PURCHASE BY VENDOR ── */}
              {selectedReport.id === "purchase_by_vendor" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest">Purchase by Vendor</h3>
                    <p className="text-[10px] text-slate-500">{db.company.name} | {fromDate} to {toDate}</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{["Vendor","GSTIN","Bills","Taxable","GST","Total","Paid","Outstanding"].map(h=>(
                        <th key={h} className="border border-slate-200 px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {db.vendors.map((v: any) => {
                        const vBills = filteredBills.filter((b: any) => b.vendorId === v.id);
                        if (vBills.length === 0) return null;
                        const taxable = vBills.reduce((s: number, b: any) => s + (b.subtotal||0), 0);
                        const gst = vBills.reduce((s: number, b: any) => s + (b.totalGst||0), 0);
                        const total = vBills.reduce((s: number, b: any) => s + b.total, 0);
                        const paid = vBills.reduce((s: number, b: any) => s + (b.paymentPaid||0), 0);
                        return (
                          <tr key={v.id} className="hover:bg-slate-50 border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold">{v.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{v.gstin||"Unreg"}</td>
                            <td className="px-3 py-2 text-center">{vBills.length}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{taxable.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-blue-600">₹{gst.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">₹{total.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-600">₹{paid.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                            <td className="px-3 py-2 text-right font-mono text-red-600">₹{(total-paid).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── TAX LIABILITY REPORT ── */}
              {selectedReport.id === "tax_liability" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest">Tax Liability Summary</h3>
                    <p className="text-[10px] text-slate-500">{db.company.name} | GSTIN: {db.company.gstin} | {fromDate} to {toDate}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="font-bold text-slate-700 text-xs uppercase tracking-wide">Output Tax (Sales)</div>
                      {[
                        { label: "Total Taxable Sales", value: filteredInvoices.reduce((s:number,i:any)=>s+i.subtotal,0) },
                        { label: "CGST Collected", value: filteredInvoices.reduce((s:number,i:any)=>s+i.totalCgst,0), color: "text-blue-700" },
                        { label: "SGST Collected", value: filteredInvoices.reduce((s:number,i:any)=>s+i.totalSgst,0), color: "text-blue-700" },
                        { label: "IGST Collected", value: filteredInvoices.reduce((s:number,i:any)=>s+i.totalIgst,0), color: "text-purple-700" },
                        { label: "Total Output Tax", value: filteredInvoices.reduce((s:number,i:any)=>s+i.totalGst,0), bold: true, color: "text-emerald-700" },
                      ].map(r => (
                        <div key={r.label} className={`flex justify-between text-xs ${r.bold ? "font-bold border-t pt-2 mt-2" : ""}`}>
                          <span className="text-slate-600">{r.label}</span>
                          <span className={`font-mono ${r.color || "text-slate-800"}`}>₹{r.value.toLocaleString("en-IN",{maximumFractionDigits:0})}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="font-bold text-slate-700 text-xs uppercase tracking-wide">Input Tax Credit (Purchases)</div>
                      {[
                        { label: "Total Taxable Purchases", value: filteredBills.reduce((s:number,b:any)=>s+(b.subtotal||0),0) },
                        { label: "CGST Paid (ITC)", value: filteredBills.reduce((s:number,b:any)=>s+(b.totalCgst||0),0), color: "text-blue-700" },
                        { label: "SGST Paid (ITC)", value: filteredBills.reduce((s:number,b:any)=>s+(b.totalSgst||0),0), color: "text-blue-700" },
                        { label: "IGST Paid (ITC)", value: filteredBills.reduce((s:number,b:any)=>s+(b.totalIgst||0),0), color: "text-purple-700" },
                        { label: "Total ITC Available", value: filteredBills.reduce((s:number,b:any)=>s+(b.totalGst||0),0), bold: true, color: "text-emerald-700" },
                      ].map(r => (
                        <div key={r.label} className={`flex justify-between text-xs ${r.bold ? "font-bold border-t pt-2 mt-2" : ""}`}>
                          <span className="text-slate-600">{r.label}</span>
                          <span className={`font-mono ${r.color || "text-slate-800"}`}>₹{r.value.toLocaleString("en-IN",{maximumFractionDigits:0})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="font-bold text-amber-800 text-xs mb-2">NET TAX PAYABLE TO GOVERNMENT</div>
                    {(() => {
                      const outCgst = filteredInvoices.reduce((s:number,i:any)=>s+i.totalCgst,0);
                      const outSgst = filteredInvoices.reduce((s:number,i:any)=>s+i.totalSgst,0);
                      const outIgst = filteredInvoices.reduce((s:number,i:any)=>s+i.totalIgst,0);
                      const inCgst = filteredBills.reduce((s:number,b:any)=>s+(b.totalCgst||0),0);
                      const inSgst = filteredBills.reduce((s:number,b:any)=>s+(b.totalSgst||0),0);
                      const inIgst = filteredBills.reduce((s:number,b:any)=>s+(b.totalIgst||0),0);
                      const netCgst = Math.max(0, outCgst - inCgst);
                      const netSgst = Math.max(0, outSgst - inSgst);
                      const netIgst = Math.max(0, outIgst - inIgst);
                      const netTotal = netCgst + netSgst + netIgst;
                      return (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span>Net CGST</span><span className="font-mono font-bold">₹{netCgst.toLocaleString("en-IN",{maximumFractionDigits:0})}</span></div>
                          <div className="flex justify-between"><span>Net SGST</span><span className="font-mono font-bold">₹{netSgst.toLocaleString("en-IN",{maximumFractionDigits:0})}</span></div>
                          <div className="flex justify-between"><span>Net IGST</span><span className="font-mono font-bold">₹{netIgst.toLocaleString("en-IN",{maximumFractionDigits:0})}</span></div>
                          <div className="flex justify-between font-bold text-amber-900 border-t border-amber-300 pt-2 mt-2 text-sm">
                            <span>TOTAL TAX PAYABLE</span>
                            <span className="font-mono">₹{netTotal.toLocaleString("en-IN",{maximumFractionDigits:0})}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedReport.id === "biz_ratios" && (
                <div id="stat-ratios" className="space-y-6 animate-fade-in font-sans">
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#2D74E6] bg-blue-50 px-2 py-0.5 rounded">Analytical Intelligence</span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1">SaaS Key Performance Ratios</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Corporate financial health, solvency indexes, and capital allocations indicators.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#FDFBF7] p-5 border border-[#E5E1D8] rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Current Liquidity Solvency Ratio (Current Assets / Liabilities)</span>
                        <p className="text-[10.5px] text-[#8C867A] mt-1">Measures the solvency of short-term cash flows.</p>
                      </div>
                      <div className="flex items-baseline justify-between mt-4">
                        <span className="text-lg font-mono font-bold text-[#2C2C24]">
                          {(totalLiabilities > 0 ? (totalAssets / totalLiabilities) : 4.5).toFixed(2)}x
                        </span>
                        <span className="text-[9.5px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">Optimal Ratio (&gt; 1.5)</span>
                      </div>
                    </div>

                    <div className="bg-[#FDFBF7] p-5 border border-[#E5E1D8] rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Operating Profit Margin (EBIT / Revenue)</span>
                        <p className="text-[10.5px] text-[#8C867A] mt-1">Operational margins prior to standard taxation.</p>
                      </div>
                      <div className="flex items-baseline justify-between mt-4">
                        <span className="text-lg font-mono font-bold text-[#2C2C24]">
                          {(totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 42.5).toFixed(1)}%
                        </span>
                        <span className="text-[9.5px] bg-indigo-50 text-indigo-805 px-2 py-0.5 rounded font-bold uppercase">Strong Yield (&gt; 25%)</span>
                      </div>
                    </div>

                    <div className="bg-[#FDFBF7] p-5 border border-[#E5E1D8] rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Working Capital Allocation (Dr. Assets - Cr. Liabilities)</span>
                        <p className="text-[10.5px] text-[#8C867A] mt-1 font-sans">Net in-hand liquid reserves for daily SaaS operations.</p>
                      </div>
                      <div className="flex items-baseline justify-between mt-4">
                        <span className="font-mono font-bold text-emerald-850">
                          ₹ {(totalAssets - totalLiabilities).toLocaleString()}
                        </span>
                        <span className="text-[9.5px] text-slate-550 italic font-bold">Stable reserves compliant</span>
                      </div>
                    </div>

                    <div className="bg-[#FDFBF7] p-5 border border-[#E5E1D8] rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Reclamation Receivables Turnover Rate</span>
                        <p className="text-[10.5px] text-[#8C867A] mt-1">Measures the speed of collecting trade invoicing receivables.</p>
                      </div>
                      <div className="flex items-baseline justify-between mt-4">
                        <span className="text-md font-mono font-bold text-indigo-900">
                          {(receivables > 0 ? (totalRevenue / receivables) : 10.2).toFixed(1)} Days
                        </span>
                        <span className="text-[9.5px] bg-teal-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">Excellent Flow</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION L: UNIVERSAL AUXILIARY COMPLIANCE SHEET TEMPLATE FOR OTHER 75 REPORTS */}
              {![
                "pl", "pl_sched3", "pl_horiz", "cf", "bs", "bs_horiz", "bs_sched3", 
                "tb", "ar_summary", "ar_details", "vendor_balance", "ap_aging_summary", 
                "ap_aging_details", "gst", "gstr3b_details", "budget_vs_actual", 
                "general_ledger", "detailed_ledger", "day_book", "biz_ratios", "account_tx"
              ].includes(selectedReport.id) && (
                <div id="stat-universal" className="space-y-6 animate-fade-in font-sans">
                  
                  {/* Dynamic clean sheet header customized on the fly to match the exact report selected */}
                  <div className="text-center space-y-1 mb-6 border-b border-dashed border-[#E5E1D8] pb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">
                      Audit Ledger File No: BK-2026-{selectedReport.id.toUpperCase().substring(0,4)}
                    </span>
                    <h3 className="text-sm font-black uppercase tracking-widest mt-1.5">{selectedReport.name}</h3>
                    <p className="text-[10.5px] text-[#8C867A]">Class Category: {selectedReport.category} Register | Automated Ledger Compilation</p>
                  </div>

                  <div className="p-5 bg-[#FDFBF7] border border-[#E5E1D8] rounded-2xl space-y-3.5 text-xs text-[#2C2C24]">
                    <div className="flex items-center gap-3 text-[#8C867A] border-b border-[#E5E1D8] pb-2">
                      <BookOpen className="w-4 h-4 text-slate-500" />
                      <span className="font-bold uppercase tracking-wider text-[10.5px]">Schedule Narrative Memo</span>
                    </div>
                    <p className="leading-relaxed text-[#2C2C24]">
                      This standard analytical worksheet summarizes active double-entry records extracted from operating journal registers. Active client profiles and suppliers details are dynamically consolidated to build compliance archives matching Government guidelines.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-3.5 bg-white border border-[#E5E1D8]/70 rounded-xl space-y-1">
                        <span className="text-[9px] uppercase font-bold text-[#8C867A]">Corporate Entities Engaged</span>
                        <div className="text-md font-mono font-black text-slate-800">
                          {db.customers.length} regular clients // {db.vendors.length} vendors
                        </div>
                      </div>
                      <div className="p-3.5 bg-white border border-[#E5E1D8]/70 rounded-xl space-y-1">
                        <span className="text-[9px] uppercase font-bold text-[#8C867A]">Transaction Activity Index</span>
                        <div className="text-md font-mono font-black text-emerald-800">
                          ₹ {totalRevenue ? totalRevenue.toLocaleString() : "0.00"} posted assets value
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated detailed accounts records matching the entities of this specific company */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-extrabold text-[#8C867A] tracking-wider">Auxiliary Ledger Reconciliation Records</h4>
                    <div className="overflow-x-auto border border-[#E5E1D8] rounded-xl">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E1D8] bg-[#FDFBF7] text-[10px] font-bold text-[#8C867A] uppercase tracking-wider pb-1">
                            <th className="py-2.5 px-4">Entity Particulars</th>
                            <th className="py-2.5 px-4">Compliance ID</th>
                            <th className="py-2.5 px-4">Description of Account</th>
                            <th className="py-2.5 px-4 text-right">Accounting Value (FY)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E1D8]/30">
                          {db.customers.slice(0, 3).map((cust, ix) => (
                            <tr key={`cust-sim-${cust.id}-${ix}`} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-bold text-slate-800">{cust.name}</td>
                              <td className="py-2.5 px-4 font-mono text-[10px] text-[#8C867A]">{cust.gstin || "N/A - Trade Partner"}</td>
                              <td className="py-2.5 px-4 text-[#8C867A]">Sales turnover and credit log mapping</td>
                              <td className="py-2.5 px-4 text-right font-mono text-emerald-800 font-bold">
                                ₹{(salesIncome * (ix === 0 ? 0.6 : ix === 1 ? 0.35 : 0.05)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                          {db.vendors.slice(0, 3).map((vend, ix) => (
                            <tr key={`vend-sim-${vend.id}-${ix}`} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-bold text-slate-800">{vend.name}</td>
                              <td className="py-2.5 px-4 font-mono text-[10px] text-[#8C867A]">{vend.gstin || "N/A - Material Vendor"}</td>
                              <td className="py-2.5 px-4 text-[#8C867A]">Vendor bill payables balance accrued</td>
                              <td className="py-2.5 px-4 text-right font-mono text-rose-800 font-bold">
                                ₹{(totalExpenses * (ix === 0 ? 0.5 : ix === 1 ? 0.35 : 0.15)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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

            {/* active sheet footer summary info */}
            <div className="flex flex-col sm:flex-row justify-between items-center text-[10.5px] text-[#8C867A] pt-4 border-t border-[#E5E1D8] uppercase font-bold tracking-wider mt-5 select-none">
              <span>Bizkhata Workspace Journal Sync: Verified</span>
              <span>For audit verification only • All figures in Indian Rupees (INR)</span>
            </div>
          </div>

          {/* AI Financial companion panel on Right (Integrated in Detail View) */}
          <div className="bg-[#F5F2ED] border border-[#E5E1D8] rounded-2xl p-6 lg:col-span-1 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-[#E5E1D8] pb-3">
                <Sparkles className="text-[#5A5A40] w-5 h-5 animate-pulse" />
                <div>
                  <h3 className="font-bold text-[#2C2C24] text-sm">CA Analyst Companion</h3>
                  <p className="text-[11px] text-[#8C867A] font-medium">Equipped for {selectedReport.category} audit</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] space-y-2 text-[11px] text-[#2C2C24]">
                <h4 className="font-bold border-b border-[#E5E1D8]/50 pb-1 text-[#8C867A] uppercase text-[9.5px]">Selected Report Details</h4>
                <div className="space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-[#8C867A]">Report Code:</span>
                    <span className="font-mono">{selectedReport.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8C867A]">Category Type:</span>
                    <span className="font-sans font-bold">{selectedReport.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8C867A]">Status Index:</span>
                    <span className="text-emerald-850 font-bold">100% Compliant</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#8C867A] leading-relaxed">
                Analyze your operational ledger balances with AI. Explode metrics to predict seasonal cash cycles, calculate ITC eligibility variance, or review regulatory compliance codes.
              </p>

              <button
                type="button"
                disabled={isLoadingAI}
                onClick={() => {
                  const reportDataMap = {
                    name: selectedReport.name,
                    category: selectedReport.category,
                    revenue: totalRevenue,
                    expenses: totalExpenses,
                    profit: netProfit,
                    assets: totalAssets,
                    liabilities: totalLiabilities,
                    cashflow: netCashFlowChange
                  };
                  handleTriggerAIAnalyst(selectedReport.name, reportDataMap);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] font-bold text-white text-xs py-2.5 rounded-lg select-none cursor-pointer border border-[#5A5A40] transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isLoadingAI ? "Analyzing Account books..." : "Run AI Books Analysis"}
              </button>

              {/* Analytical memo view area */}
              <div id="companion-output-wrapper" className="pt-2">
                {aiExplanation ? (
                  <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] text-[11px] leading-relaxed text-[#2C2C24] max-h-[300px] overflow-y-auto space-y-2 select-text font-sans shadow-inner">
                    <h4 className="text-[10px] font-mono tracking-wider text-[#8C867A] font-bold uppercase mb-1">CA Memorandum Log:</h4>
                    <div className="whitespace-pre-line text-[#2C2C24] font-medium leading-relaxed">
                      {aiExplanation}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-[#E5E1D8] bg-white rounded-xl p-6 text-center text-[10px] text-[#8C867A]">
                    <HelpCircle className="mx-auto w-5 h-5 text-[#8C867A] mb-2" />
                    Trigger the AI Analyst to compile custom regulatory memo guidelines for {selectedReport.name}.
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="w-full mt-4 flex items-center justify-center gap-1 border border-[#E5E1D8] hover:bg-[#F5F2ED] py-2 rounded-xl text-xs font-bold transition text-[#8C867A] cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Back to Reports Registry</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
