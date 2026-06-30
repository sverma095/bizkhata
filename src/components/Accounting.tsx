import React, { useState, useEffect } from "react";
import { DatabaseState, Account, JournalEntry, JournalLine } from "../types.js";
import { 
  BookOpen, 
  Layers, 
  ArrowRight, 
  Plus, 
  Check, 
  AlertTriangle, 
  Search, 
  Calendar,
  Layers2,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  FileCheck2,
  FileText,
  Building,
  CheckSquare,
  Square,
  Network
} from "lucide-react";

interface AccountingProps {
  db: DatabaseState;
  onAddManualJournal?: (journal: Omit<JournalEntry, "id">) => Promise<void>;
  defaultTab?: "accounts" | "journals" | "tree";
  userRole?: string;
}

// Tree view specialized item interface
interface AccountTreeItem {
  id: string;
  name: string;
  code: string;
  type: string;
  locked?: boolean;
  documents?: string;
  level: number; // For indentation
  isLast?: boolean; // For branching visuals
}

export default function Accounting({ db, defaultTab, onAddManualJournal, userRole }: AccountingProps) {
  const [activeTab, setActiveTab] = useState<"accounts" | "journals" | "tree">(defaultTab || "accounts");

  // Manual Journal Entry Form State
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [jDate, setJDate] = useState(new Date().toISOString().split("T")[0]);
  const [jRef, setJRef] = useState(`JB-226-${Math.floor(1000 + Math.random() * 9000)}`);
  const [jDesc, setJDesc] = useState("");
  const [jLines, setJLines] = useState<Array<{ accountCode: string; debit: number; credit: number }>>([
    { accountCode: "bank_account", debit: 0, credit: 0 },
    { accountCode: "salary_expense", debit: 0, credit: 0 }
  ]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>([]);
  const [filterAccountType, setFilterAccountType] = useState<string>("All Accounts");

  // Selection toggle for tree view
  const toggleSelectTreeItem = (id: string) => {
    if (selectedTreeIds.includes(id)) {
      setSelectedTreeIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedTreeIds(prev => [...prev, id]);
    }
  };

  const toggleSelectAllTree = (allIds: string[]) => {
    if (selectedTreeIds.length === allIds.length) {
      setSelectedTreeIds([]);
    } else {
      setSelectedTreeIds(allIds);
    }
  };

  // Static high-fidelity array mimicking Screenshot 8 exactly
  const initialTreeData: AccountTreeItem[] = [
    { id: "tr_1", name: "thrymr nandyal", code: "TH-ND-001", type: "Other Asset", level: 0 },
    { id: "tr_2", name: "Advance Tax", code: "AT-120001", type: "Other Current Asset", locked: true, level: 0 },
    { id: "tr_3", name: "Employee Advance", code: "EA-120002", type: "Other Current Asset", locked: true, level: 0 },
    { id: "tr_4", name: "Prepaid Expenses", code: "PE-120003", type: "Other Current Asset", level: 0 },
    { id: "tr_5", name: "TDS Receivable", code: "TR-120004", type: "Other Current Asset", level: 0 },
    { id: "tr_6", name: "Input Tax Credits", code: "ITC-120100", type: "Other Current Asset", level: 0 },
    { id: "tr_7", name: "Input IGST", code: "IGST-120101", type: "Other Current Asset", level: 1 },
    { id: "tr_8", name: "Input CGST", code: "CGST-120102", type: "Other Current Asset", level: 1 },
    { id: "tr_9", name: "Input SGST", code: "SGST-120103", type: "Other Current Asset", level: 1 },
    { id: "tr_10", name: "Input CESS", code: "CESS-120104", type: "Other Current Asset", level: 1, isLast: true },
    { id: "tr_11", name: "Reverse Charge Tax Input but not due", code: "RCD-120200", type: "Other Current Asset", level: 0 },
    { id: "tr_12", name: "Loans & Advances (Asset)", code: "LA-120300", type: "Other Current Asset", level: 0 },
    { id: "tr_13", name: "Health Insurance (Employees)", code: "HI-120301", type: "Other Current Asset", level: 1, isLast: true },
    { id: "tr_14", name: "Rent Deposit", code: "RD-120400", type: "Other Current Asset", level: 0 },
    { id: "tr_15", name: "C Chakradhar Naidu (Nandyal Rent Deposit)", code: "CCN-120401", type: "Other Current Asset", level: 1 },
    { id: "tr_16", name: "C Chakravathy Naidu (Nandyal Rent Deposit)", code: "CCRN-120402", type: "Other Current Asset", level: 1 },
    { id: "tr_17", name: "I Sprout Business Centre Pvt Ltd Deposit", code: "ISB-120403", type: "Other Current Asset", level: 1 },
    { id: "tr_18", name: "Neeru Mehrotra Laknow Rent (Deposite)", code: "NML-120404", type: "Other Current Asset", level: 1 },
    { id: "tr_19", name: "Rental Deposit (Madhu Murthy)", code: "RDM-120405", type: "Other Current Asset", level: 1 },
    { id: "tr_20", name: "Tech Hub (Bangloor Deposit)", code: "THB-120406", type: "Other Current Asset", level: 1, isLast: true }
  ];

  // Apply search query and filter to tree data
  const filteredTreeData = initialTreeData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterAccountType === "All Accounts") {
      return matchesSearch;
    } else {
      return matchesSearch && item.type === filterAccountType;
    }
  });

  const allFilteredTreeIds = filteredTreeData.map(item => item.id);

  // Filter basic accounts or journals
  const filteredAccounts = db.accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJournals = db.journals.filter(je => 
    je.reference.toLowerCase().includes(searchQuery.toLowerCase()) || 
    je.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    je.date.includes(searchQuery)
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupTheme: Record<Account["type"], { border: string; bg: string; text: string }> = {
    Asset: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800" },
    Liability: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-800" },
    Income: { border: "border-sky-200", bg: "bg-sky-50", text: "text-sky-800" },
    Expense: { border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-800" },
    Equity: { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-800" }
  };

  return (
    <div id="accounting-board-container" className="space-y-6 animate-fade-in p-2">
      
      {/* Upper Navigation Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#F5F2ED] p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex flex-wrap bg-white p-1.5 rounded-lg border border-[#E5E1D8] gap-2 w-full lg:w-auto">
          <button
            id="tab-btn-chart-of-accounts"
            onClick={() => setActiveTab("accounts")}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "accounts" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Chart of Accounts Catalog
          </button>
          
          <button
            id="tab-btn-all-accounts-tree"
            onClick={() => setActiveTab("tree")}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "tree" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-indigo-500" />
            All Accounts Tree View <span className="text-[8px] bg-indigo-100 text-indigo-700 font-mono font-bold px-1 rounded uppercase">Screenshot 8</span>
          </button>

          <button
            id="tab-btn-journal-books"
            onClick={() => setActiveTab("journals")}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "journals" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Layers2 className="w-3.5 h-3.5" />
            Double-Entry Journal Logs
          </button>
        </div>

        {/* Live Ledger Search Field */}
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C867A]" />
          <input 
            id="ledger-search-box"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Account Name, Code..."
            className="w-full bg-white border border-[#E5E1D8] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#2C2C24] focus:border-[#D4CDBC] outline-none"
          />
        </div>
      </div>

      {/* ----------------- SCREENSHOT 8: ALL ACCOUNTS TREE VIEW ----------------- */}
      {activeTab === "tree" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 font-sans animate-fade-in">
          
          {/* Header row exactly as Screenshot 8 */}
          <div className="bg-slate-50 border-b border-slate-200 p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <select 
                value={filterAccountType} 
                onChange={(e) => setFilterAccountType(e.target.value)}
                className="bg-white border text-xs font-bold text-slate-900 rounded px-3 py-1.5 focus:border-[#006EE5] outline-none cursor-pointer"
              >
                <option value="All Accounts">All Accounts ▾</option>
                <option value="Other Asset">Other Asset</option>
                <option value="Other Current Asset">Other Current Asset</option>
              </select>
              <span className="text-slate-400 font-medium">| Showing {filteredTreeData.length} active ledger mappings</span>
            </div>

            <button 
              onClick={() => {
                alert("Creating a new double-entry general ledger slot under Bizkhata compliance rules.");
              }}
              className="bg-[#006EE5] hover:bg-[#0060C7] text-white font-bold p-1 px-4.5 rounded text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Account
            </button>
          </div>

          {/* Table representing nested structure from Screenshot 8 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 w-12 text-center">
                    <button 
                      onClick={() => toggleSelectAllTree(allFilteredTreeIds)} 
                      className="focus:outline-none"
                    >
                      {selectedTreeIds.length === allFilteredTreeIds.length && allFilteredTreeIds.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#006EE5]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-12 text-center">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </th>
                  <th className="p-3.5">ACCOUNT NAME</th>
                  <th className="p-3.5 w-44">ACCOUNT CODE</th>
                  <th className="p-3.5 w-52">ACCOUNT TYPE</th>
                  <th className="p-3.5 w-48 text-right pr-6">DOCUMENTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTreeData.map((item) => {
                  const isSelected = selectedTreeIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/75 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}
                    >
                      <td className="p-3.5 text-center">
                        <button 
                          onClick={() => toggleSelectTreeItem(item.id)}
                          className="focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#006EE5]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      
                      <td className="p-3.5 text-center">
                        {item.locked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-200 hover:text-slate-400 mx-auto transition cursor-pointer" />
                        )}
                      </td>

                      <td className="p-3.5 font-sans">
                        <div className="flex items-center">
                          {/* Screenshot indentation visual links */}
                          {item.level > 0 && (
                            <div className="flex shrink-0 select-none">
                              {/* Indentation spaces */}
                              <div className="w-5"></div>
                              {/* Connection pipe symbol */}
                              <div className="w-5 border-l-2 border-slate-200 border-b-2 h-3.5 -mt-3 mr-1.5 rounded-bl"></div>
                            </div>
                          )}
                          <span className={`text-[12.5px] ${item.level > 0 ? "text-slate-650 font-medium font-sans" : "text-slate-900 font-bold font-sans"}`}>
                            {item.name}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-500 tracking-wider">
                        {item.code}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] border ${
                          item.type === "Other Asset" 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}>
                          {item.type}
                        </span>
                      </td>

                      <td className="p-3.5 text-right pr-6 font-mono font-bold text-slate-400">
                        {item.documents || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick interactive note at the bottom */}
          <div className="border-t border-slate-100 p-4 bg-slate-50 text-[11px] text-slate-500 font-mono text-center">
            Double-Entry Chart of Accounts Trees • Compliant with ICFAI System Protocols
          </div>

        </div>
      )}

      {/* CHART OF ACCOUNTS CATALOG CARD VIEW */}
      {activeTab === "accounts" && (
        <div id="panel-chart-of-accounts" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {(["Asset", "Liability", "Income", "Expense", "Equity"] as Array<Account["type"]>).map((groupName) => {
            const groupAccs = filteredAccounts.filter(a => a.type === groupName);
            const theme = groupTheme[groupName];

            return (
              <div 
                key={groupName} 
                id={`coa-grp-${groupName.toLowerCase()}`}
                className="bg-white border border-[#E5E1D8] rounded-2xl p-5 space-y-4 hover:border-[#D4CDBC] transition shadow-sm"
              >
                <div className={`flex justify-between items-center bg-[#FDFBF7] p-3.5 rounded-lg border ${theme.border}`}>
                  <h4 className="text-sm font-semibold text-[#2C2C24] tracking-tight">{groupName}s</h4>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${theme.bg} ${theme.text}`}>
                    {groupAccs.length} accounts
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {groupAccs.length > 0 ? (
                    groupAccs.map((acc) => (
                      <div 
                        key={acc.code} 
                        id={`coa-card-${acc.code}`}
                        className="flex justify-between items-center p-3 bg-[#FDFBF7] hover:bg-[#F5F2ED] rounded-lg border border-[#E5E1D8] hover:border-[#D4CDBC] transition"
                      >
                        <div className="space-y-0.5 max-w-[150px] truncate">
                          <p className="text-xs font-semibold text-[#2C2C24] truncate">{acc.name}</p>
                          <p className="text-[10px] text-[#8C867A] font-mono">{acc.code}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#2C2C24]">
                          ₹ {acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-[#8C867A] italic py-6 text-center">No accounts found in search filter.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BALANCED JOURNAL BOOKS VIEW */}
      {activeTab === "journals" && (
        <div id="panel-journal-books" className="space-y-4 animate-fade-in">
          
          {/* Create Manual Journal Card or Overlay */}
          {showJournalForm && (
            <div className="bg-slate-50 border border-[#E5E1D8] rounded-2xl p-6 space-y-4 animate-fade-in shadow-xs text-xs font-sans text-slate-800">
              <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-2.5">
                <h4 className="text-sm font-bold text-[#2C2C24] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Pass Double-Entry Manual Journal
                </h4>
                <button 
                  onClick={() => setShowJournalForm(false)} 
                  className="p-1 text-slate-400 hover:text-slate-900 bg-white border border-[#E5E1D8] rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Journal Ref No. *</label>
                  <input 
                    type="text" 
                    value={jRef} 
                    onChange={(e) => setJRef(e.target.value)} 
                    className="w-full bg-white border border-[#E5E1D8] p-2 rounded text-slate-800 font-mono font-bold focus:outline-none"
                    placeholder="e.g. JB-2026-003"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Posting Ledger Date *</label>
                  <input 
                    type="date" 
                    value={jDate} 
                    onChange={(e) => setJDate(e.target.value)} 
                    className="w-full bg-white border border-[#E5E1D8] p-2 rounded text-slate-800 font-bold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Narration / Description *</label>
                  <input 
                    type="text" 
                    value={jDesc} 
                    onChange={(e) => setJDesc(e.target.value)} 
                    className="w-full bg-white border border-[#E5E1D8] p-2 rounded text-slate-800 focus:outline-none"
                    placeholder="Provide standard audit remark..."
                  />
                </div>
              </div>

              {/* Journal lines entry */}
              <div className="space-y-3 pt-3 border-t border-[#E5E1D8]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2C2C24] uppercase text-[10px] tracking-wider">Transaction Lines List (Standard bookkeeping check):</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setJLines(prev => [...prev, { accountCode: db.accounts[0]?.code || "bank_account", debit: 0, credit: 0 }]);
                    }}
                    className="bg-white hover:bg-slate-150 border border-[#E5E1D8] text-slate-700 font-bold px-3 py-1 rounded flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" /> Add Debit/Credit Line
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {jLines.map((line, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-xl border border-[#E5E1D8]">
                      
                      {/* Account select option */}
                      <div className="flex-1 space-y-1 min-w-[200px]">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Designated General Account:</span>
                        <select 
                          value={line.accountCode} 
                          onChange={(e) => {
                            const newLines = [...jLines];
                            newLines[idx].accountCode = e.target.value;
                            setJLines(newLines);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-semibold focus:outline-none"
                        >
                          {db.accounts.map(acc => (
                            <option key={acc.code} value={acc.code}>
                              {acc.name} ({acc.code}) - Balance: ₹{acc.balance.toLocaleString('en-IN')}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Debit amount */}
                      <div className="w-full sm:w-28 space-y-1">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Debit Dr. (₹)</span>
                        <input 
                          type="number" 
                          min="0"
                          value={line.debit || ""} 
                          onChange={(e) => {
                            const newLines = [...jLines];
                            newLines[idx].debit = Number(e.target.value);
                            if (Number(e.target.value) > 0) {
                              newLines[idx].credit = 0; // standard double-entry is mutually exclusive
                            }
                            setJLines(newLines);
                          }}
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-right font-mono font-bold text-emerald-800 focus:outline-none"
                        />
                      </div>

                      {/* Credit amount */}
                      <div className="w-full sm:w-28 space-y-1">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Credit Cr. (₹)</span>
                        <input 
                          type="number" 
                          min="0"
                          value={line.credit || ""} 
                          onChange={(e) => {
                            const newLines = [...jLines];
                            newLines[idx].credit = Number(e.target.value);
                            if (Number(e.target.value) > 0) {
                              newLines[idx].debit = 0; // standard double-entry mutually exclusive
                            }
                            setJLines(newLines);
                          }}
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-right font-mono font-bold text-rose-800 focus:outline-none"
                        />
                      </div>

                      {/* Remove line */}
                      <button 
                        type="button" 
                        disabled={jLines.length <= 2}
                        onClick={() => {
                          setJLines(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/50 p-2 rounded border border-rose-150 transition self-end cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Remove transaction line"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Validation and Totals Row */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-4 bg-white border border-[#E5E1D8] rounded-xl text-xs font-mono">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-650 flex items-center gap-1.5">
                      <span>Debit Total Sum:</span> 
                      <strong className="text-emerald-700">₹{jLines.reduce((acc, curr) => acc + (curr.debit || 0), 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="font-bold text-slate-650 flex items-center gap-1.5">
                      <span>Credit Total Sum:</span> 
                      <strong className="text-rose-700">₹{jLines.reduce((acc, curr) => acc + (curr.credit || 0), 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 font-sans">
                    {(() => {
                      const debits = jLines.reduce((a, b) => a + (b.debit || 0), 0);
                      const credits = jLines.reduce((a, b) => a + (b.credit || 0), 0);
                      const diff = Math.abs(debits - credits);
                      
                      if (diff < 0.01 && debits > 0) {
                        return (
                          <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1 text-[10.5px] font-bold flex items-center gap-1">
                            ✓ Balance Matching. Verified Compliant
                          </div>
                        );
                      } else if (debits === 0) {
                        return (
                          <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 text-[10.5px] font-bold">
                            ⚠️ Enter positive values to balance the columns.
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-rose-800 bg-rose-50 border border-rose-200 rounded px-2.5 py-1 text-[10.5px] font-bold">
                            ✕ Out of Balance by ₹{diff.toLocaleString()}
                          </div>
                        );
                      }
                    })()}

                    {formError && (
                      <p className="text-[10px] text-red-600 font-semibold italic mt-1 font-sans">{formError}</p>
                    )}
                  </div>
                </div>

                {/* Save and submit buttons */}
                <div className="flex justify-end gap-3.5 pt-3 border-t border-[#E5E1D8] font-bold">
                  <button 
                    type="button" 
                    onClick={() => setShowJournalForm(false)} 
                    className="border border-[#E5E1D8] px-4 py-2 rounded text-[#8C867A] hover:bg-[#FDFBF7] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      const debits = jLines.reduce((a, b) => a + (b.debit || 0), 0);
                      const credits = jLines.reduce((a, b) => a + (b.credit || 0), 0);
                      if (debits === 0 || credits === 0) {
                        setFormError("Journal columns cannot be blank. Enter numeric debit/credit allocations.");
                        return;
                      }
                      if (Math.abs(debits - credits) > 0.01) {
                        setFormError("Double-entry violation: All journals must have total debits exactly equal to total credits before posting.");
                        return;
                      }
                      setFormError("");
                      
                      if (onAddManualJournal) {
                        const formatted = jLines.map(line => {
                          const accMatched = db.accounts.find(a => a.code === line.accountCode);
                          return {
                            accountCode: line.accountCode,
                            accountName: accMatched ? accMatched.name : "Other account",
                            debit: Number(line.debit || 0),
                            credit: Number(line.credit || 0)
                          };
                        });
                        await onAddManualJournal({
                          date: jDate,
                          reference: jRef,
                          description: jDesc || "Passed manual journal entry",
                          lines: formatted
                        });
                        setShowJournalForm(false);
                        setJDesc("");
                        setJRef(`JB-226-${Math.floor(1000 + Math.random() * 9000)}`);
                        setJLines([
                          { accountCode: "bank_account", debit: 0, credit: 0 },
                          { accountCode: "salary_expense", debit: 0, credit: 0 }
                        ]);
                      }
                    }} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-650 px-5 py-2 rounded flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Commit Balanced Entry
                  </button>
                </div>

              </div>
            </div>
          )}

          <div className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2C2C24]">Balanced Accounting Books</h3>
                <p className="text-[11px] text-[#8C867A]">Dual line entry validation: Sum(Debit) must match Sum(Credit) for all legal tax filings.</p>
              </div>
              
              <div className="flex items-center gap-3">
                {userRole === "Auditor" || userRole === "User" || userRole === "Billing User" || userRole === "Viewer" ? (
                  <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold leading-none select-none">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Only Ledger</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowJournalForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Pass Manual Journal
                  </button>
                )}
                
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  Ledgers Balanced
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredJournals.length > 0 ? (
                filteredJournals.map((je) => {
                  const totalDebit = je.lines.reduce((acc, curr) => acc + curr.debit, 0);
                  const totalCredit = je.lines.reduce((acc, curr) => acc + curr.credit, 0);
                  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                  return (
                    <div 
                      key={je.id} 
                      id={`je-block-${je.id}`}
                      className="bg-[#FDFBF7] rounded-xl border border-[#E5E1D8] p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#E5E1D8]/60 pb-2.5">
                        <div className="space-y-1">
                          <h4 id={`je-num-ref-${je.id}`} className="text-xs font-bold text-[#2C2C24] flex items-center gap-2.5">
                            {je.reference}
                            <span className="text-[10px] text-[#8C867A] font-mono font-normal flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#5A5A40]" /> {je.date}
                            </span>
                          </h4>
                          <p className="text-[11px] text-[#8C867A]">{je.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#5A5A40] font-mono font-bold bg-[#E5E1D8]/40 px-2 py-0.5 rounded">
                            Balanced Base: ₹{totalDebit.toLocaleString('en-IN')}
                          </span>
                          {!isBalanced && (
                            <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-800" /> Out of Balance!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ledger Lines breakdown table */}
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#E5E1D8] text-[10px] text-[#8C867A] uppercase font-bold tracking-wider">
                              <th className="py-1.5 px-2">Account Code & Name</th>
                              <th className="py-1.5 px-2 text-right">Debit (Dr.)</th>
                              <th className="py-1.5 px-2 text-right">Credit (Cr.)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E1D8]/40 text-xs">
                            {je.lines.map((ln) => (
                              <tr key={ln.id} className="text-[#2C2C24]">
                                <td className="py-2 px-2 max-w-[200px] truncate">
                                  <div className="font-semibold text-[#2C2C24]">{ln.accountName}</div>
                                  <div className="text-[9px] text-[#8C867A] font-mono">{ln.accountCode}</div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-[#2C2C24] font-medium">
                                  {ln.debit > 0 ? `₹${ln.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-"}
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-[#2C2C24] font-medium">
                                  {ln.credit > 0 ? `₹${ln.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#8C867A] py-12 text-center border border-dashed border-[#E5E1D8] rounded-xl bg-[#FDFBF7]/50">No matching journals found for selection query.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
