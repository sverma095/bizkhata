import React, { useState } from "react";
import { DatabaseState, Account } from "../types.js";
import { Plus, Edit, Trash2, X, Save, Search } from "lucide-react";

interface Props {
  db: DatabaseState;
  onSaveAccount: (acc: any) => Promise<void>;
  onDeleteAccount: (code: string) => Promise<void>;
}

const ACCOUNT_GROUPS: Record<string, string[]> = {
  "Assets": ["Current Asset","Fixed Asset","Loans & Advances (Asset)","Investments","Cash & Bank","Accounts Receivable"],
  "Liabilities": ["Current Liability","Long-term Liability","Loans (Liability)","Accounts Payable","Duties & Taxes","GST Payable","TDS Payable"],
  "Income": ["Direct Income","Indirect Income","Other Income"],
  "Expenses": ["Direct Expense","Indirect Expense","Manufacturing Expense"],
  "Equity": ["Capital Account","Reserves & Surplus","Drawings","GST Input Credit (ITC)","TDS Receivable"],
};
const ACCOUNT_TYPES = Object.values(ACCOUNT_GROUPS).flat();
const TYPE_COLORS: Record<string, string> = {
  "Assets": "bg-emerald-100 text-emerald-700",
  "Liabilities": "bg-red-100 text-red-700",
  "Income": "bg-blue-100 text-blue-700",
  "Expenses": "bg-orange-100 text-orange-700",
  "Equity": "bg-purple-100 text-purple-700",
};

export default function ChartOfAccountsCRUD({ db, onSaveAccount, onDeleteAccount }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isSaving, setIsSaving] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("Asset");
  const [balance, setBalance] = useState(0);

  const resetForm = () => { setCode(""); setName(""); setType("Asset"); setBalance(0); setEditing(null); };

  const handleEdit = (acc: Account) => {
    setEditing(acc); setCode(acc.code); setName(acc.name); setType(acc.type); setBalance(acc.balance);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) return alert("Account code and name are required.");
    if (!editing && db.accounts.find(a => a.code === code.trim())) return alert("Account code already exists.");
    setIsSaving(true);
    try {
      await onSaveAccount({ code: code.trim(), name: name.trim(), type, balance });
      setShowForm(false); resetForm();
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (acc: Account) => {
    const usedIn = db.journals.some(j => j.lines.some(l => l.accountCode === acc.code));
    if (usedIn) return alert(`Cannot delete "${acc.name}" — it is used in journal entries.`);
    if (!confirm(`Delete account "${acc.name}" (${acc.code})? This cannot be undone.`)) return;
    try { await onDeleteAccount(acc.code); } catch (e: any) { alert(e.message); }
  };

  const filtered = db.accounts
    .filter((a: any) => filterType === "All" || (ACCOUNT_GROUPS[filterType] && ACCOUNT_GROUPS[filterType].includes(a.type)) || a.type === filterType)
    .filter((a: any) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()));

  const byType = ACCOUNT_TYPES.reduce((m, t) => { m[t] = filtered.filter((a: any) => a.type === t); return m; }, {} as Record<string, any[]>);
  const totalAssets = db.accounts.filter((a: any) => (ACCOUNT_GROUPS["Assets"] || []).includes(a.type)).reduce((s: number, a: any) => s + (a.balance || 0), 0);
  const totalLiabilities = db.accounts.filter((a: any) => (ACCOUNT_GROUPS["Liabilities"] || []).includes(a.type)).reduce((s: number, a: any) => s + (a.balance || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Chart of Accounts</h2>
          <p className="text-xs text-slate-500">Manage your complete account structure</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg">
          <Plus className="w-3.5 h-3.5" /> New Account
        </button>
      </div>

      {/* Stats — 5 main groups */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(ACCOUNT_GROUPS).map(([group, types]) => (
          <div key={group} className="card-lift bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-blue-300 transition"
            onClick={() => setFilterType(filterType === group ? "All" : group)}>
            <div className={`text-[10px] font-semibold uppercase ${filterType === group ? 'text-blue-600' : 'text-slate-500'}`}>{group}</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {db.accounts.filter((a: any) => types.includes(a.type)).length}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              ₹{db.accounts.filter((a: any) => types.includes(a.type)).reduce((s: number, a: any) => s + (a.balance || 0), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">{editing ? `Edit Account: ${editing.name}` : "New Account"}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Account Code *</label>
              <input value={code} onChange={e => setCode(e.target.value)} disabled={!!editing} placeholder="e.g. bank_hdfc" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-400" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Account Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HDFC Bank Current Account" className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Account Type *</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select account type...</option>
                {Object.entries(ACCOUNT_GROUPS).map(([group, types]) => (
                  <optgroup key={group} label={`── ${group} ──`}>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Opening Balance (₹)</label>
              <input type="number" value={balance} onChange={e => setBalance(parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2">
              <Save className="w-3.5 h-3.5" />{isSaving ? "Saving..." : (editing ? "Update Account" : "Create Account")}
            </button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-52" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["All", ...Object.keys(ACCOUNT_GROUPS)].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition ${filterType === t ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Accounts table grouped by type */}
      <div className="card-lift bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase">Code</th>
              <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase">Account Name</th>
              <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase">Type</th>
              <th className="py-3 px-4 text-right text-[10px] font-bold text-slate-500 uppercase">Balance (₹)</th>
              <th className="py-3 px-4 text-center text-[10px] font-bold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ACCOUNT_TYPES.map((t: string) => {
              const accs = byType[t];
              if (!accs || accs.length === 0) return null;
              const subtotal = accs.reduce((s: number, a: any) => s + (a.balance || 0), 0);
              return (
                <React.Fragment key={t}>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="px-4 py-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${TYPE_COLORS[Object.keys(ACCOUNT_GROUPS).find(g => ACCOUNT_GROUPS[g].includes(t)) || ''] || 'bg-gray-100 text-gray-700'}`}>{t}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{accs.length} accounts</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-xs text-slate-700">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  </tr>
                  {accs.map(acc => (
                    <tr key={acc.code} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">{acc.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{acc.name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[Object.keys(ACCOUNT_GROUPS).find(g => ACCOUNT_GROUPS[g].includes(acc.type)) || ''] || 'bg-gray-100 text-gray-600'}`}>{acc.type}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">₹{acc.balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(acc)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit className="w-3 h-3" /></button>
                          <button onClick={() => handleDelete(acc)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50">
            <tr>
              <td colSpan={3} className="px-4 py-2.5 font-bold text-xs text-slate-700">NET POSITION (Assets − Liabilities)</td>
              <td className={`px-4 py-2.5 text-right font-mono font-black text-sm ${totalAssets - totalLiabilities >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                ₹{(totalAssets - totalLiabilities).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
