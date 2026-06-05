import React, { useState } from "react";
import { DatabaseState, Account } from "../types.js";
import { Save, AlertCircle, CheckCircle2, Info } from "lucide-react";

interface Props {
  db: DatabaseState;
  onSaveOpeningBalances: (entries: any[], date: string) => Promise<void>;
}

export default function OpeningBalances({ db, onSaveOpeningBalances }: Props) {
  const [date, setDate] = useState(db.openingBalanceDate || new Date().toISOString().split("T")[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Build editable balance map from existing accounts
  const [balances, setBalances] = useState<Record<string, { debit: number; credit: number }>>(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    db.accounts.forEach(acc => {
      map[acc.code] = {
        debit: acc.type === "Asset" || acc.type === "Expense" ? acc.balance : 0,
        credit: acc.type === "Liability" || acc.type === "Income" || acc.type === "Equity" ? acc.balance : 0,
      };
    });
    return map;
  });

  const accountsByType = (type: string) => db.accounts.filter(a => a.type === type);

  const totalDebits = Object.values(balances).reduce((s, b) => s + (b.debit || 0), 0);
  const totalCredits = Object.values(balances).reduce((s, b) => s + (b.credit || 0), 0);
  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 0.01;

  const updateBalance = (code: string, field: "debit" | "credit", value: number) => {
    setBalances(prev => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
  };

  const handleSave = async () => {
    if (!isBalanced) return alert(`Balances don't match. Difference: ₹${Math.abs(difference).toLocaleString("en-IN")}. Please ensure total debits = total credits.`);
    setIsSaving(true);
    try {
      const entries = db.accounts.map(acc => ({
        accountCode: acc.code,
        accountName: acc.name,
        debit: balances[acc.code]?.debit || 0,
        credit: balances[acc.code]?.credit || 0,
      })).filter(e => e.debit > 0 || e.credit > 0);
      await onSaveOpeningBalances(entries, date);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const SECTIONS = [
    { type: "Asset", label: "Assets", side: "debit" as const, color: "emerald" },
    { type: "Liability", label: "Liabilities", side: "credit" as const, color: "red" },
    { type: "Equity", label: "Equity", side: "credit" as const, color: "blue" },
    { type: "Income", label: "Income", side: "credit" as const, color: "purple" },
    { type: "Expense", label: "Expenses", side: "debit" as const, color: "orange" },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-slate-900">Opening Balances</h2>
        <p className="text-xs text-slate-500 mt-0.5">Enter your account balances as of your migration date. This is a one-time setup when switching from another system.</p>
      </div>

      {db.openingBalancesSet && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Opening balances have been set as of {db.openingBalanceDate}. You can update them below.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
        <div className="flex items-start gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">How to enter opening balances:</div>
            <div>• <strong>Assets</strong> (Cash, Bank, Receivables, Fixed Assets) → Enter in <strong>Debit</strong> column</div>
            <div>• <strong>Liabilities & Equity</strong> (Loans, Payables, Capital) → Enter in <strong>Credit</strong> column</div>
            <div>• Total Debits must equal Total Credits for the entry to be valid</div>
          </div>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Opening Balance Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="text-xs text-slate-500">This should be the day before you start using BizKhata (e.g. March 31, 2025 if you start April 1, 2025)</div>
      </div>

      {/* Balance entry table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2.5">
          <div className="col-span-6">Account</div>
          <div className="col-span-2 text-center">Type</div>
          <div className="col-span-2 text-right">Debit (₹)</div>
          <div className="col-span-2 text-right">Credit (₹)</div>
        </div>
        {SECTIONS.map(section => {
          const accounts = accountsByType(section.type);
          if (accounts.length === 0) return null;
          const sectionTotal = accounts.reduce((s, a) => s + (section.side === "debit" ? balances[a.code]?.debit || 0 : balances[a.code]?.credit || 0), 0);
          return (
            <div key={section.type}>
              <div className={`px-4 py-2 bg-slate-50 border-y border-slate-100 flex justify-between items-center`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">{section.label}</span>
                <span className="font-mono text-xs font-bold text-slate-700">₹{sectionTotal.toLocaleString("en-IN")}</span>
              </div>
              {accounts.map(acc => (
                <div key={acc.code} className="grid grid-cols-12 px-4 py-2 border-b border-slate-100 items-center hover:bg-slate-50">
                  <div className="col-span-6">
                    <div className="text-xs font-semibold text-slate-800">{acc.name}</div>
                    <div className="text-[9px] font-mono text-slate-400">{acc.code}</div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{acc.type}</span>
                  </div>
                  <div className="col-span-2 pr-1">
                    <input type="number" min={0} step={0.01} value={balances[acc.code]?.debit || ""} onChange={e => updateBalance(acc.code, "debit", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`w-full border rounded px-2 py-1 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-emerald-400 ${section.side === "debit" ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`} />
                  </div>
                  <div className="col-span-2 pl-1">
                    <input type="number" min={0} step={0.01} value={balances[acc.code]?.credit || ""} onChange={e => updateBalance(acc.code, "credit", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`w-full border rounded px-2 py-1 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-red-400 ${section.side === "credit" ? "border-red-200 bg-red-50/30" : "border-slate-200"}`} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Totals row */}
        <div className="grid grid-cols-12 px-4 py-3 bg-slate-800 text-white items-center">
          <div className="col-span-8 font-bold text-xs">TOTAL</div>
          <div className="col-span-2 text-right font-mono font-bold text-emerald-400">₹{totalDebits.toLocaleString("en-IN")}</div>
          <div className="col-span-2 text-right font-mono font-bold text-red-400">₹{totalCredits.toLocaleString("en-IN")}</div>
        </div>

        {/* Balance check */}
        <div className={`px-4 py-3 flex items-center justify-between ${isBalanced ? "bg-emerald-50" : "bg-red-50"}`}>
          <div className={`flex items-center gap-2 text-xs font-semibold ${isBalanced ? "text-emerald-700" : "text-red-700"}`}>
            {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {isBalanced ? "✅ Balanced — Total Debits = Total Credits" : `⚠️ Out of balance by ₹${Math.abs(difference).toLocaleString("en-IN")} (Debits ${difference > 0 ? "exceed" : "below"} Credits)`}
          </div>
          <button onClick={handleSave} disabled={isSaving || !isBalanced} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-lg transition">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : saved ? "✅ Saved!" : "Save Opening Balances"}
          </button>
        </div>
      </div>
    </div>
  );
}
