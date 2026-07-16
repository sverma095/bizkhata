import React, { useState } from "react";
import { DatabaseState, FixedAsset } from "../types.js";
import { Plus, X, Edit, TrendingDown } from "lucide-react";

interface Props { db: DatabaseState; onSaveAsset: (a: any) => Promise<void>; onRunDepreciation?: () => Promise<{ posted: any[] }>; }

const CATEGORIES = ["Plant & Machinery","Computer & Software","Furniture & Fixtures","Vehicles","Land & Building","Office Equipment","Other"];

export default function FixedAssets({ db, onSaveAsset, onRunDepreciation }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningDep, setIsRunningDep] = useState(false);
  const [disposing, setDisposing] = useState<FixedAsset | null>(null);
  const [disposalProceeds, setDisposalProceeds] = useState(0);
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split("T")[0]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Computer & Software");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [cost, setCost] = useState(0);
  const [depMethod, setDepMethod] = useState<"SLM"|"WDV">("SLM");
  const [usefulLife, setUsefulLife] = useState(5);
  const [salvage, setSalvage] = useState(0);
  const [invoiceRef, setInvoiceRef] = useState("");
  const [isCwip, setIsCwip] = useState(false);

  const assets: FixedAsset[] = (db as any).fixedAssets || [];

  const calcDepreciation = (asset: FixedAsset) => {
    if (asset.status === "CWIP") {
      return { annual: 0, accumulated: 0, currentValue: asset.cost };
    }
    const years = (new Date().getFullYear() - new Date(asset.purchaseDate).getFullYear()) + 1;
    if (asset.depreciationMethod === "SLM") {
      const annualDep = (asset.cost - asset.salvageValue) / asset.usefulLife;
      const accDep = Math.min(annualDep * Math.min(years, asset.usefulLife), asset.cost - asset.salvageValue);
      return { annual: annualDep, accumulated: accDep, currentValue: asset.cost - accDep };
    } else { // WDV
      let val = asset.cost;
      const rate = 1 - Math.pow(asset.salvageValue / asset.cost, 1 / asset.usefulLife);
      let acc = 0;
      for (let i = 0; i < Math.min(years, asset.usefulLife); i++) { const dep = val * rate; acc += dep; val -= dep; }
      return { annual: val * rate, accumulated: acc, currentValue: Math.max(val, asset.salvageValue) };
    }
  };

  const resetForm = () => { setName(""); setCategory("Computer & Software"); setPurchaseDate(new Date().toISOString().split("T")[0]); setCost(0); setDepMethod("SLM"); setUsefulLife(5); setSalvage(0); setInvoiceRef(""); setIsCwip(false); setEditing(null); };

  const handleEdit = (a: FixedAsset) => { setEditing(a); setName(a.name); setCategory(a.category); setPurchaseDate(a.purchaseDate); setCost(a.cost); setDepMethod(a.depreciationMethod); setUsefulLife(a.usefulLife); setSalvage(a.salvageValue); setInvoiceRef(a.invoiceRef || ""); setShowForm(true); };

  const handleSubmit = async () => {
    if (!name || !cost) return alert("Name and cost required.");
    const status = isCwip ? "CWIP" : "Active";
    const dep = isCwip
      ? { currentValue: cost, accumulated: 0 }
      : calcDepreciation({ cost, salvageValue: salvage, depreciationMethod: depMethod, usefulLife, purchaseDate, name, category, id: "", status: "Active", currentValue: cost, accumulatedDepreciation: 0 } as any);
    setIsSaving(true);
    try {
      await onSaveAsset({ name, category, purchaseDate, cost, depreciationMethod: depMethod, usefulLife, salvageValue: salvage, currentValue: dep.currentValue, accumulatedDepreciation: dep.accumulated, status, invoiceRef: invoiceRef || undefined, ...(editing ? { id: editing.id } : {}) });
      setShowForm(false); resetForm();
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const handleCapitalize = async (a: FixedAsset) => {
    if (!window.confirm(`Capitalize "${a.name}"? This moves it from CWIP to an Active asset and starts depreciation from today.`)) return;
    await onSaveAsset({ ...a, status: "Active", purchaseDate: new Date().toISOString().split("T")[0], capitalizedDate: new Date().toISOString().split("T")[0] });
  };

  const openDisposeModal = (a: FixedAsset) => {
    setDisposing(a);
    setDisposalProceeds(0);
    setDisposalDate(new Date().toISOString().split("T")[0]);
  };

  const handleConfirmDispose = async () => {
    if (!disposing) return;
    const dep = calcDepreciation(disposing);
    const gainLoss = disposalProceeds - dep.currentValue;
    setIsSaving(true);
    try {
      await onSaveAsset({
        ...disposing,
        status: "Disposed",
        disposalDate,
        disposalProceeds,
        disposalGainLoss: gainLoss,
        currentValue: 0,
        accumulatedDepreciation: disposing.cost,
      });
      setDisposing(null);
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const totalCost = assets.reduce((s, a) => s + a.cost, 0);
  const totalCurrentValue = assets.reduce((s, a) => s + (calcDepreciation(a).currentValue), 0);
  const totalDepreciation = totalCost - totalCurrentValue;

  if (showForm) return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div><h2 className="text-base font-bold text-slate-900">{editing ? "Edit Asset" : "Add Fixed Asset"}</h2><p className="text-xs text-slate-500">Record a capital asset with depreciation schedule</p></div>
        <button onClick={() => { setShowForm(false); resetForm(); }}><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Asset Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dell Laptop i7" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Category</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Purchase Date</label><input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Cost (₹) *</label><input type="number" min={0} value={cost} onChange={e => setCost(parseFloat(e.target.value)||0)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Salvage Value (₹)</label><input type="number" min={0} value={salvage} onChange={e => setSalvage(parseFloat(e.target.value)||0)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Depreciation Method</label><select value={depMethod} onChange={e => setDepMethod(e.target.value as any)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"><option value="SLM">SLM (Straight Line)</option><option value="WDV">WDV (Written Down Value)</option></select></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Useful Life (Years)</label><input type="number" min={1} max={40} value={usefulLife} onChange={e => setUsefulLife(parseInt(e.target.value)||5)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase">Invoice Reference</label><select value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"><option value="">— None —</option>{db.bills.map(b=><option key={b.id} value={b.id}>{b.billNumber} — {b.vendorName}</option>)}</select></div>
        <div className="col-span-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <input type="checkbox" id="cwip-toggle" checked={isCwip} onChange={e => setIsCwip(e.target.checked)} className="accent-amber-600" />
          <label htmlFor="cwip-toggle" className="text-xs text-amber-800">
            <span className="font-bold">Capital Work in Progress (CWIP)</span> — asset is still under construction/installation, not yet ready for use. No depreciation is charged until it's capitalized.
          </label>
        </div>
      </div>
      {cost > 0 && !isCwip && <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1"><div className="font-bold text-blue-800">Depreciation Preview</div><div className="text-blue-700">Annual Depreciation: ₹{((cost - salvage) / usefulLife).toLocaleString("en-IN", {maximumFractionDigits:2})} ({depMethod})</div><div className="text-blue-700">Book Value after 1 year: ₹{(cost - (cost - salvage) / usefulLife).toLocaleString("en-IN", {maximumFractionDigits:2})}</div></div>}
      <div className="flex gap-2 justify-end border-t border-slate-200 pt-3">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">{isSaving ? "Saving..." : (editing ? "Update Asset" : "Add Asset")}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-bold text-slate-900">Fixed Assets Register</h2><p className="text-xs text-slate-500">Track capital assets, depreciation and current book value</p></div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!onRunDepreciation) return;
              setIsRunningDep(true);
              try {
                const result = await onRunDepreciation();
                const count = result?.posted?.length || 0;
                alert(count > 0 ? `Posted depreciation for ${count} asset(s) to the ledger.` : "Depreciation is already up to date — nothing to post.");
              } catch (e: any) { alert(e.message); }
              finally { setIsRunningDep(false); }
            }}
            disabled={isRunningDep}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-60"
          ><TrendingDown className="w-3.5 h-3.5" />{isRunningDep ? "Posting..." : "Run Depreciation"}</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg"><Plus className="w-3.5 h-3.5" />Add Asset</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{label:"Total Assets",value:assets.length,mono:false},{label:"Gross Block",value:`₹${totalCost.toLocaleString("en-IN",{maximumFractionDigits:0})}`,mono:true},{label:"Net Block (WDV)",value:`₹${totalCurrentValue.toLocaleString("en-IN",{maximumFractionDigits:0})}`,mono:true}].map(s=>(
          <div key={s.label} className="card-lift bg-white border border-slate-200 rounded-xl p-4"><div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{s.label}</div><div className={`text-xl font-bold mt-1 text-slate-800 ${s.mono?"font-mono":""}`}>{s.value}</div></div>
        ))}
      </div>
      <div className="card-lift bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Asset Name","Category","Purchase Date","Cost (₹)","Method","Acc. Dep. (₹)","Net Book Value (₹)","Status","Actions"].map(h=><th key={h} className="py-3 px-3 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-slate-400"><TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-40" /><div className="font-medium">No fixed assets recorded</div></td></tr>
            : assets.map(a => {
              const dep = calcDepreciation(a);
              return (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-semibold text-slate-800">{a.name}</td>
                  <td className="py-3 px-3 text-slate-500">{a.category}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{a.purchaseDate}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">₹{a.cost.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                  <td className="py-3 px-3"><span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{a.depreciationMethod}</span></td>
                  <td className="py-3 px-3 text-right font-mono text-red-600">₹{dep.accumulated.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">₹{dep.currentValue.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      a.status === "Active" ? "bg-emerald-100 text-emerald-700"
                      : a.status === "CWIP" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                    }`}>{a.status}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1">
                      <button onClick={()=>handleEdit(a)} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit className="w-3 h-3"/></button>
                      {a.status === "CWIP" && <button onClick={()=>handleCapitalize(a)} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded">Capitalize</button>}
                      {a.status === "Active" && <button onClick={()=>openDisposeModal(a)} className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded">Dispose</button>}
                      {a.status === "Disposed" && a.disposalGainLoss !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.disposalGainLoss >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
                          {a.disposalGainLoss >= 0 ? "Gain" : "Loss"} ₹{Math.abs(a.disposalGainLoss).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {disposing && (
        <div className="fixed inset-0 bg-slate-700/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Dispose Asset: {disposing.name}</h3>
              <button onClick={()=>setDisposing(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Disposal Date</label>
              <input type="date" value={disposalDate} onChange={e=>setDisposalDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Sale Proceeds (₹)</label>
              <input type="number" min={0} value={disposalProceeds} onChange={e=>setDisposalProceeds(parseFloat(e.target.value)||0)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" placeholder="0 if scrapped with no proceeds" />
            </div>
            {(() => {
              const dep = calcDepreciation(disposing);
              const gainLoss = disposalProceeds - dep.currentValue;
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Net Book Value at disposal:</span><span className="font-mono font-bold">₹{dep.currentValue.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sale Proceeds:</span><span className="font-mono font-bold">₹{disposalProceeds.toLocaleString("en-IN")}</span></div>
                  <div className={`flex justify-between pt-1 border-t border-slate-200 ${gainLoss>=0?"text-emerald-700":"text-rose-600"}`}>
                    <span className="font-bold">{gainLoss>=0?"Gain":"Loss"} on Disposal:</span><span className="font-mono font-bold">₹{Math.abs(gainLoss).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })()}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setDisposing(null)} className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleConfirmDispose} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-60">{isSaving?"Processing...":"Confirm Disposal"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
