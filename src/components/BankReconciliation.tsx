import React, { useState, useRef } from "react";
import { DatabaseState, BankAccount, BankTransaction } from "../types.js";
import { Plus, Upload, X, Check, AlertCircle, RefreshCw, Building2 } from "lucide-react";

interface Props {
  db: DatabaseState;
  onSaveBankAccount: (acc: any) => Promise<void>;
  onSaveBankTransaction: (tx: any) => Promise<void>;
  onMatchTransaction: (txId: string, matchedId: string, matchedType: string) => Promise<void>;
}

export default function BankReconciliation({ db, onSaveBankAccount, onSaveBankTransaction, onMatchTransaction }: Props) {
  const [activeView, setActiveView] = useState<"accounts" | "reconcile" | "import">("accounts");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // New bank account form
  const [accName, setAccName] = useState("");
  const [accBankName, setAccBankName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accIfsc, setAccIfsc] = useState("");
  const [accType, setAccType] = useState<"Current" | "Savings" | "OD" | "CC">("Current");
  const [accOpeningBal, setAccOpeningBal] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const bankAccounts: BankAccount[] = (db as any).bankAccounts || [];
  const bankTransactions: BankTransaction[] = (db as any).bankTransactions || [];
  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);
  const accountTxns = bankTransactions.filter(t => t.bankAccountId === selectedAccountId);
  const unreconciled = accountTxns.filter(t => t.status === "Unreconciled");

  const handleSaveAccount = async () => {
    if (!accName || !accNumber) return alert("Account name and number required.");
    setIsSaving(true);
    try {
      await onSaveBankAccount({ name: accName, bankName: accBankName, accountNumber: accNumber, ifsc: accIfsc, type: accType, openingBalance: accOpeningBal, currentBalance: accOpeningBal, currency: "INR" });
      setShowAddAccount(false); setAccName(""); setAccBankName(""); setAccNumber(""); setAccIfsc(""); setAccOpeningBal(0);
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) { alert("Select a bank account first."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const errors: string[] = [];
      const rows: any[] = [];
      // Try to parse CSV — expect: Date, Description, Debit, Credit, Balance
      lines.slice(1).forEach((line, idx) => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 4) { errors.push(`Row ${idx + 2}: Not enough columns (need Date, Desc, Debit, Credit)`); return; }
        const [date, desc, debitStr, creditStr, balStr] = cols;
        const debit = parseFloat(debitStr) || 0;
        const credit = parseFloat(creditStr) || 0;
        const balance = parseFloat(balStr) || 0;
        if (!date || !desc) { errors.push(`Row ${idx + 2}: Missing date or description`); return; }
        rows.push({ date, description: desc, debit, credit, balance, bankAccountId: selectedAccountId, status: "Unreconciled", source: "import" });
      });
      setImportErrors(errors);
      setImportPreview(rows.slice(0, 10));
      if (rows.length > 0) {
        if (confirm(`Import ${rows.length} transactions? ${errors.length} rows had errors.`)) {
          Promise.all(rows.map(r => onSaveBankTransaction(r))).then(() => {
            setImportPreview([]); setImportErrors([]); alert(`✅ Imported ${rows.length} transactions successfully.`);
          });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Auto-match: find invoices/bills that match amount
  const findMatch = (tx: BankTransaction) => {
    if (tx.credit > 0) {
      // Credit = money in = payment received
      const inv = db.invoices.find(i => Math.abs(i.total - tx.credit) < 1 && i.status !== "Paid");
      if (inv) return { id: inv.id, type: "invoice", label: `Invoice ${inv.invoiceNumber} — ${inv.customerName}` };
    }
    if (tx.debit > 0) {
      // Debit = money out = bill payment
      const bill = db.bills.find(b => Math.abs(b.total - tx.debit) < 1 && b.status !== "Paid");
      if (bill) return { id: bill.id, type: "bill", label: `Bill ${bill.billNumber} — ${bill.vendorName}` };
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Bank Reconciliation</h2>
          <p className="text-xs text-slate-500">Match bank transactions with your books</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddAccount(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Add Bank Account
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["accounts", "reconcile", "import"] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)} className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition ${activeView === v ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {v === "reconcile" ? "Reconcile Transactions" : v === "import" ? "Import Statement" : "Bank Accounts"}
          </button>
        ))}
      </div>

      {/* Add account form */}
      {showAddAccount && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Add Bank Account</h3>
            <button onClick={() => setShowAddAccount(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Account Name", val: accName, set: setAccName, ph: "e.g. HDFC Current A/C" },
              { label: "Bank Name", val: accBankName, set: setAccBankName, ph: "e.g. HDFC Bank" },
              { label: "Account Number", val: accNumber, set: setAccNumber, ph: "XXXXXXXXXXXX" },
              { label: "IFSC Code", val: accIfsc, set: setAccIfsc, ph: "HDFC0001234" },
            ].map(f => (
              <div key={f.label} className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Account Type</label>
              <select value={accType} onChange={e => setAccType(e.target.value as any)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                {["Current", "Savings", "OD", "CC"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Opening Balance (₹)</label>
              <input type="number" value={accOpeningBal} onChange={e => setAccOpeningBal(parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddAccount(false)} className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={handleSaveAccount} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">{isSaving ? "Saving..." : "Save Account"}</button>
          </div>
        </div>
      )}

      {/* BANK ACCOUNTS VIEW */}
      {activeView === "accounts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.length === 0 ? (
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <div className="font-semibold">No bank accounts added yet</div>
              <div className="text-[10px] mt-1">Click "Add Bank Account" to get started</div>
            </div>
          ) : bankAccounts.map(acc => {
            const txns = bankTransactions.filter(t => t.bankAccountId === acc.id);
            const inflow = txns.reduce((s, t) => s + t.credit, 0);
            const outflow = txns.reduce((s, t) => s + t.debit, 0);
            const unrecon = txns.filter(t => t.status === "Unreconciled").length;
            return (
              <div key={acc.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedAccountId(acc.id); setActiveView("reconcile"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{acc.name}</div>
                    <div className="text-[10px] text-slate-500">{acc.bankName} • {acc.type}</div>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-slate-500 bg-slate-50 rounded px-2 py-1">{acc.accountNumber} • IFSC: {acc.ifsc}</div>
                <div className="flex justify-between text-xs">
                  <div><div className="text-slate-400 text-[10px]">Balance</div><div className="font-bold text-slate-900">₹{(acc.currentBalance + inflow - outflow).toLocaleString("en-IN")}</div></div>
                  <div className="text-right"><div className="text-slate-400 text-[10px]">Unreconciled</div><div className={`font-bold ${unrecon > 0 ? "text-amber-600" : "text-emerald-600"}`}>{unrecon} txns</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECONCILE VIEW */}
      {activeView === "reconcile" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-52">
              <option value="">-- Select Account --</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {selectedAccountId && <span className="text-xs text-slate-500">{unreconciled.length} unreconciled transaction(s)</span>}
          </div>
          {selectedAccountId && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{["Date","Description","Debit (₹)","Credit (₹)","Balance (₹)","Status","Match","Action"].map(h => (
                    <th key={h} className="py-3 px-3 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountTxns.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">No transactions. Import a bank statement to get started.</td></tr>
                  ) : accountTxns.map(tx => {
                    const match = findMatch(tx);
                    return (
                      <tr key={tx.id} className={`hover:bg-slate-50 ${tx.status === "Reconciled" ? "opacity-60" : ""}`}>
                        <td className="py-2.5 px-3 font-mono">{tx.date}</td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-48 truncate" title={tx.description}>{tx.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-600">{tx.debit > 0 ? `₹${tx.debit.toLocaleString("en-IN")}` : "—"}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{tx.credit > 0 ? `₹${tx.credit.toLocaleString("en-IN")}` : "—"}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{tx.balance > 0 ? `₹${tx.balance.toLocaleString("en-IN")}` : "—"}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${tx.status === "Reconciled" ? "bg-emerald-100 text-emerald-700" : tx.status === "Excluded" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>{tx.status}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-500">{match ? <span className="text-blue-600 font-semibold">{match.label}</span> : "—"}</td>
                        <td className="py-2.5 px-3">
                          {tx.status === "Unreconciled" && (
                            <div className="flex gap-1">
                              {match && (
                                <button onClick={() => onMatchTransaction(tx.id, match.id, match.type)} className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-bold rounded hover:bg-emerald-700 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Match
                                </button>
                              )}
                              <button onClick={() => onSaveBankTransaction({ ...tx, status: "Excluded" })} className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-semibold rounded hover:bg-slate-200">Exclude</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* IMPORT VIEW */}
      {activeView === "import" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-2">
            <div className="font-bold text-sm">Import Bank Statement (CSV)</div>
            <div>Expected CSV format: <span className="font-mono bg-blue-100 px-1 rounded">Date, Description, Debit, Credit, Balance</span></div>
            <div className="text-[10px] text-blue-600">First row should be headers. Date format: YYYY-MM-DD or DD/MM/YYYY</div>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-52">
              <option value="">-- Select Bank Account --</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button onClick={() => fileRef.current?.click()} disabled={!selectedAccountId} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Upload className="w-3.5 h-3.5" /> Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </div>
          {importErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <div className="text-xs font-bold text-red-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Import Warnings</div>
              {importErrors.map((e, i) => <div key={i} className="text-[10px] text-red-600">{e}</div>)}
            </div>
          )}
          {importPreview.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600 uppercase">Preview (first 10 rows)</div>
              <table className="w-full text-xs"><thead className="bg-slate-50 border-b"><tr>{["Date","Description","Debit","Credit","Balance"].map(h=><th key={h} className="py-2 px-3 text-left text-[10px] font-bold text-slate-500">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{importPreview.map((r,i)=><tr key={i}><td className="py-1.5 px-3 font-mono">{r.date}</td><td className="py-1.5 px-3 truncate max-w-48">{r.description}</td><td className="py-1.5 px-3 text-right font-mono text-red-600">{r.debit>0?`₹${r.debit}`:"—"}</td><td className="py-1.5 px-3 text-right font-mono text-emerald-600">{r.credit>0?`₹${r.credit}`:"—"}</td><td className="py-1.5 px-3 text-right font-mono">{r.balance>0?`₹${r.balance}`:"—"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
