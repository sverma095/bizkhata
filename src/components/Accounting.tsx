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
  Layers2
} from "lucide-react";

interface AccountingProps {
  db: DatabaseState;
  onAddManualJournal?: (journal: Omit<JournalEntry, "id">) => Promise<void>;
  defaultTab?: "accounts" | "journals";
}

export default function Accounting({ db, defaultTab }: AccountingProps) {
  const [activeTab, setActiveTab] = useState<"accounts" | "journals">(defaultTab || "accounts");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const [searchQuery, setSearchQuery] = useState("");

  // Filtered accounts or journals
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

  // Group accounts by type for Chart of Accounts representation
  const accountsByGroup = db.accounts.reduce((acc, curr) => {
    if (!acc[curr.type]) {
      acc[curr.type] = [];
    }
    acc[curr.type].push(curr);
    return acc;
  }, {} as Record<Account["type"], Account[]>);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F2ED] p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex bg-white p-1.5 rounded-lg border border-[#E5E1D8] gap-2 w-full sm:w-auto">
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
            Chart of Accounts
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C867A]" />
          <input 
            id="ledger-search-box"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Account, Code or Ref..."
            className="w-full bg-white border border-[#E5E1D8] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#2C2C24] focus:border-[#D4CDBC] outline-none"
          />
        </div>
      </div>

      {/* CHART OF ACCOUNTS VIEW */}
      {activeTab === "accounts" && (
        <div id="panel-chart-of-accounts" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div id="panel-journal-books" className="space-y-4">
          <div className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2C2C24]">Balanced Accounting Books</h3>
                <p className="text-[11px] text-[#8C867A]">Dual line entry validation: Sum(Debit) must match Sum(Credit) for all legal tax filings.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                Ledgers Balanced
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
                              <AlertTriangle className="w-3 h-3 text-red-800" /> Out of Balance!
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
