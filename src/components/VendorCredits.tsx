import React, { useState } from "react";
import { DatabaseState, VendorCredit } from "../types.js";
import { Plus, X, RotateCcw } from "lucide-react";

interface Props { db: DatabaseState; onSaveVC: (vc: any) => Promise<void>; }

export default function VendorCredits({ db, onSaveVC }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [billId, setBillId] = useState("");
  const [formItems, setFormItems] = useState([{ itemId: "", name: "", qty: 1, rate: 0, gstRate: 18 }]);
  const [isSaving, setIsSaving] = useState(false);

  const vendorCredits = db.vendorCredits || [];
  const vendorBills = billId ? db.bills.filter(b => b.vendorId === vendorId) : [];

  const liveSubtotal = formItems.filter(i => i.name).reduce((s, i) => s + i.qty * i.rate, 0);
  const liveGst = formItems.filter(i => i.name).reduce((s, i) => s + i.qty * i.rate * i.gstRate / 100, 0);

  const handleSubmit = async () => {
    if (!vendorId || !reason) return alert("Please select vendor and enter reason.");
    const vendor = db.vendors.find(v => v.id === vendorId);
    const items = formItems.filter(i => i.name).map(fi => {
      const amount = fi.qty * fi.rate;
      const gst = amount * fi.gstRate / 100;
      return { itemId: fi.itemId, name: fi.name, qty: fi.qty, rate: fi.rate, gstRate: fi.gstRate, amount, cgst: gst/2, sgst: gst/2, igst: 0 };
    });
    setIsSaving(true);
    try {
      await onSaveVC({ vendorId, vendorName: vendor!.name, date, reason, billId: billId || undefined, items, subtotal: liveSubtotal, totalGst: liveGst, total: liveSubtotal + liveGst, status: "Open" });
      setShowForm(false); setVendorId(""); setDate(new Date().toISOString().split("T")[0]); setReason(""); setBillId("");
      setFormItems([{ itemId: "", name: "", qty: 1, rate: 0, gstRate: 18 }]);
    } catch(e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  if (showForm) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div><h2 className="text-base font-bold text-slate-900">New Vendor Credit</h2><p className="text-xs text-slate-500">Record a credit received from vendor (debit note)</p></div>
        <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Vendor *</label>
          <select value={vendorId} onChange={e => { setVendorId(e.target.value); setBillId(""); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">-- Select Vendor --</option>
            {db.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Against Bill (optional)</label>
          <select value={billId} onChange={e => setBillId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">-- Select Bill --</option>
            {db.bills.filter(b => b.vendorId === vendorId).map(b => <option key={b.id} value={b.id}>{b.billNumber} — ₹{b.total.toLocaleString("en-IN")}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600">Reason *</label>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Goods returned, overcharge correction..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" />
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-10 gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">
          <div className="col-span-3">Description</div><div className="col-span-2">Qty</div>
          <div className="col-span-2">Rate</div><div className="col-span-2">GST%</div><div className="col-span-1"></div>
        </div>
        {formItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-10 gap-2 px-3 py-2 border-t border-slate-100 items-center">
            <div className="col-span-3"><input value={item.name} onChange={e => { const u=[...formItems]; u[idx].name=e.target.value; setFormItems(u); }} placeholder="Item/service name" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" /></div>
            <div className="col-span-2"><input type="number" min={1} value={item.qty} onChange={e => { const u=[...formItems]; u[idx].qty=parseFloat(e.target.value)||1; setFormItems(u); }} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" /></div>
            <div className="col-span-2"><input type="number" min={0} value={item.rate} onChange={e => { const u=[...formItems]; u[idx].rate=parseFloat(e.target.value)||0; setFormItems(u); }} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-right font-mono focus:outline-none" /></div>
            <div className="col-span-2"><select value={item.gstRate} onChange={e => { const u=[...formItems]; u[idx].gstRate=parseFloat(e.target.value); setFormItems(u); }} className="w-full border border-slate-200 rounded px-1 py-1.5 text-xs focus:outline-none">{[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
            <div className="col-span-1 flex justify-center"><button onClick={() => formItems.length>1 && setFormItems(formItems.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button></div>
          </div>
        ))}
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => setFormItems([...formItems, { itemId:"", name:"", qty:1, rate:0, gstRate:18 }])} className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add Line</button>
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
        <div className="text-xs text-slate-600">Total Credit: <span className="font-mono font-bold text-purple-700">₹{(liveSubtotal+liveGst).toLocaleString("en-IN", {maximumFractionDigits:2})}</span></div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-60">{isSaving ? "Saving..." : "Create Vendor Credit"}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h2 className="text-base font-bold text-slate-900">Vendor Credits</h2><p className="text-xs text-slate-500">Credits received from vendors for returns, overcharges, or adjustments</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg"><Plus className="w-3.5 h-3.5" />New Vendor Credit</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Credits", value: vendorCredits.length },
          { label: "Open", value: vendorCredits.filter(v=>v.status==="Open").length },
          { label: "Credit Value", value: `₹${vendorCredits.reduce((a,c)=>a+c.total,0).toLocaleString("en-IN",{maximumFractionDigits:0})}` },
        ].map(s=>(
          <div key={s.label} className="card-lift bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{s.label}</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card-lift bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Credit #","Vendor","Date","Bill #","Reason","Amount","Status","Action"].map(h=>(
              <th key={h} className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendorCredits.length===0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400"><RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" /><div>No vendor credits yet</div></td></tr>
            ) : vendorCredits.map(vc=>(
              <tr key={vc.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-purple-700">{vc.vcNumber}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{vc.vendorName}</td>
                <td className="py-3 px-4 text-slate-600">{vc.date}</td>
                <td className="py-3 px-4 text-slate-500 font-mono">{vc.billId ? db.bills.find(b=>b.id===vc.billId)?.billNumber || "—" : "—"}</td>
                <td className="py-3 px-4 text-slate-600 max-w-32 truncate">{vc.reason}</td>
                <td className="py-3 px-4 font-mono font-bold text-purple-700">₹{vc.total.toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${vc.status==="Open"?"bg-amber-100 text-amber-700":vc.status==="Applied"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{vc.status}</span></td>
                <td className="py-3 px-4">{vc.status==="Open" && <button onClick={()=>onSaveVC({...vc,status:"Applied"})} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700">Apply</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
