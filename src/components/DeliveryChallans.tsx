import React, { useState } from "react";
import { DatabaseState, DeliveryChallan } from "../types.js";
import { Plus, X, Truck, Edit, FileText } from "lucide-react";

interface Props {
  db: DatabaseState;
  onSaveChallan: (c: any) => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-600",
};

export default function DeliveryChallans({ db, onSaveChallan }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryChallan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceId, setInvoiceId] = useState("");
  const [soId, setSoId] = useState("");
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<Array<{ itemId: string; name: string; hsnSac: string; qty: number; rate: number; gstRate: number }>>([
    { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18 }
  ]);

  const challans = db.deliveryChallans || [];

  const resetForm = () => {
    setCustomerId(""); setDate(new Date().toISOString().split("T")[0]);
    setInvoiceId(""); setSoId(""); setNotes("");
    setFormItems([{ itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18 }]);
    setEditing(null);
  };

  const handleEdit = (c: DeliveryChallan) => {
    setEditing(c); setCustomerId(c.customerId); setDate(c.date);
    setInvoiceId(c.invoiceId || ""); setSoId(c.soId || ""); setNotes(c.notes || "");
    setFormItems(c.items.map(i => ({ itemId: i.itemId, name: i.name, hsnSac: i.hsnSac || "", qty: i.qty, rate: i.rate, gstRate: i.gstRate })));
    setShowForm(true);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const u = [...formItems]; (u[idx] as any)[field] = value;
    if (field === "itemId" && value) {
      const item = db.items.find(i => i.id === value);
      if (item) { u[idx].name = item.name; u[idx].hsnSac = item.hsnSac; u[idx].rate = item.salesRate; u[idx].gstRate = item.gstRate; }
    }
    setFormItems(u);
  };

  const handleSubmit = async () => {
    if (!customerId) return alert("Please select a customer.");
    const cust = db.customers.find(c => c.id === customerId);
    const items = formItems.filter(i => i.itemId).map((fi, idx) => {
      const amount = fi.qty * fi.rate;
      return { id: `cl_${idx}`, itemId: fi.itemId, name: fi.name, hsnSac: fi.hsnSac, qty: fi.qty, rate: fi.rate, gstRate: fi.gstRate, amount, cgst: 0, sgst: 0, igst: 0 };
    });
    const payload: any = { customerId, customerName: cust!.name, date, invoiceId: invoiceId || undefined, soId: soId || undefined, items, status: "Open", notes };
    if (editing) { payload.id = editing.id; payload.challanNumber = editing.challanNumber; payload.status = editing.status; }
    setIsSaving(true);
    try { await onSaveChallan(payload); setShowForm(false); resetForm(); }
    catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const filtered = challans.filter(c => {
    const ms = c.challanNumber?.toLowerCase().includes(search.toLowerCase()) || c.customerName.toLowerCase().includes(search.toLowerCase());
    return ms && (filter === "All" || c.status === filter);
  });

  if (showForm) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{editing ? `Edit ${editing.challanNumber}` : "New Delivery Challan"}</h2>
          <p className="text-xs text-slate-500">Issue a delivery challan for goods dispatched</p>
        </div>
        <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Customer *</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- Select Customer --</option>
            {db.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Challan Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Against Invoice (optional)</label>
          <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- Select Invoice --</option>
            {db.invoices.filter(i => !i.isProforma && i.customerId === customerId).map(i => <option key={i.id} value={i.id}>{i.invoiceNumber}</option>)}
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          <div className="col-span-4">Item</div><div className="col-span-2">HSN/SAC</div>
          <div className="col-span-2">Qty</div><div className="col-span-2">Unit</div>
          <div className="col-span-1 text-right">Rate</div><div className="col-span-1"></div>
        </div>
        {formItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 items-center">
            <div className="col-span-4">
              <select value={item.itemId} onChange={e => updateItem(idx, "itemId", e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none">
                <option value="">-- Item --</option>
                {db.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="col-span-2"><input value={item.hsnSac} onChange={e => updateItem(idx, "hsnSac", e.target.value)} placeholder="HSN" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" /></div>
            <div className="col-span-2"><input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, "qty", parseFloat(e.target.value) || 1)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" /></div>
            <div className="col-span-2"><span className="text-xs text-slate-500">{db.items.find(i => i.id === item.itemId)?.unit || "Nos"}</span></div>
            <div className="col-span-1 text-right font-mono text-xs text-slate-600">₹{item.rate.toLocaleString("en-IN")}</div>
            <div className="col-span-1 flex justify-center">
              <button onClick={() => formItems.length > 1 && setFormItems(formItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => setFormItems([...formItems, { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18 }])} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Line
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600">Notes / Delivery Instructions</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Handle with care, deliver before 5PM..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
        <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5" />{isSaving ? "Saving..." : (editing ? "Update Challan" : "Create Delivery Challan")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Delivery Challans</h2>
          <p className="text-xs text-slate-500">Track goods dispatched to customers</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-lg">
          <Plus className="w-3.5 h-3.5" /> New Delivery Challan
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Challans", value: challans.length },
          { label: "Open", value: challans.filter(c => c.status === "Open").length },
          { label: "Delivered", value: challans.filter(c => c.status === "Delivered").length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{s.label}</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search challans..." className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 w-48" />
        {["All", "Open", "Delivered", "Cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filter === s ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{s}</button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Challan #", "Customer", "Date", "Invoice Ref", "Items", "Status", "Actions"].map(h => (
              <th key={h} className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="font-medium">No delivery challans yet</div>
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-teal-700">{c.challanNumber}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{c.customerName}</td>
                <td className="py-3 px-4 text-slate-600">{c.date}</td>
                <td className="py-3 px-4 font-mono text-slate-500">{c.invoiceId ? db.invoices.find(i => i.id === c.invoiceId)?.invoiceNumber || "—" : "—"}</td>
                <td className="py-3 px-4 text-slate-600">{c.items.length} item(s)</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    {c.status === "Open" && <button onClick={() => onSaveChallan({ ...c, status: "Delivered" })} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700">✓ Delivered</button>}
                    <button onClick={() => handleEdit(c)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3 h-3" /></button>
                    {c.status === "Open" && <button onClick={() => onSaveChallan({ ...c, status: "Cancelled" })} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-3 h-3" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
