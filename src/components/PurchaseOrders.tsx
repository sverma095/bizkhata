import React, { useState, useMemo } from "react";
import { DatabaseState, PurchaseOrder, BillItem } from "../types.js";
import { Plus, FileText, X, Edit, Copy, Package } from "lucide-react";

interface Props {
  db: DatabaseState;
  onSavePO: (po: any) => Promise<void>;
  onConvertToBill: (po: PurchaseOrder) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Issued: "bg-blue-100 text-blue-700",
  Received: "bg-amber-100 text-amber-700",
  Billed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-600",
};

export default function PurchaseOrders({ db, onSavePO, onConvertToBill }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isSaving, setIsSaving] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<Array<{ itemId: string; name: string; hsnSac: string; qty: number; rate: number; gstRate: number }>>([
    { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18 }
  ]);

  const purchaseOrders = db.purchaseOrders || [];

  const liveTotal = useMemo(() => {
    return formItems.filter(i => i.itemId !== "").reduce((sum, i) => {
      const amount = i.qty * i.rate;
      return sum + amount + (amount * i.gstRate / 100);
    }, 0);
  }, [formItems]);

  const liveSubtotal = formItems.filter(i => i.itemId !== "").reduce((s, i) => s + i.qty * i.rate, 0);
  const liveGst = liveTotal - liveSubtotal;

  const resetForm = () => {
    setVendorId(""); setDate(new Date().toISOString().split("T")[0]);
    setDeliveryDate(""); setNotes("");
    setFormItems([{ itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18 }]);
    setEditingPO(null);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po); setVendorId(po.vendorId); setDate(po.date);
    setDeliveryDate(po.deliveryDate); setNotes(po.notes || "");
    setFormItems(po.items.map(i => ({ itemId: i.itemId, name: i.name, hsnSac: i.name, qty: i.qty, rate: i.rate, gstRate: i.gstRate })));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!vendorId) return alert("Please select a vendor.");
    const vendor = db.vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    const finalItems: BillItem[] = formItems.filter(i => i.itemId !== "").map((fi, idx) => {
      const amount = fi.qty * fi.rate;
      const gstAmt = amount * fi.gstRate / 100;
      return { itemId: fi.itemId, name: fi.name, qty: fi.qty, rate: fi.rate, gstRate: fi.gstRate, amount, cgst: gstAmt / 2, sgst: gstAmt / 2, igst: 0 };
    });
    const payload: any = {
      vendorId, vendorName: vendor.name, date, deliveryDate,
      items: finalItems, subtotal: liveSubtotal, totalGst: liveGst, total: liveTotal,
      status: "Draft", notes,
    };
    if (editingPO) { payload.id = editingPO.id; payload.poNumber = editingPO.poNumber; payload.status = editingPO.status; }
    setIsSaving(true);
    try { await onSavePO(payload); setShowForm(false); resetForm(); }
    catch (e: any) { alert("Error: " + e.message); }
    finally { setIsSaving(false); }
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[idx] as any)[field] = value;
    if (field === "itemId" && value) {
      const item = db.items.find(i => i.id === value);
      if (item) { updated[idx].name = item.name; updated[idx].hsnSac = item.hsnSac; updated[idx].rate = item.purchaseRate; updated[idx].gstRate = item.gstRate; }
    }
    setFormItems(updated);
  };

  const filtered = purchaseOrders.filter(po => {
    const ms = po.poNumber.toLowerCase().includes(search.toLowerCase()) || po.vendorName.toLowerCase().includes(search.toLowerCase());
    return ms && (filterStatus === "All" || po.status === filterStatus);
  });

  if (showForm) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{editingPO ? `Edit ${editingPO.poNumber}` : "New Purchase Order"}</h2>
          <p className="text-xs text-slate-500">Issue a PO to your vendor before receiving goods</p>
        </div>
        <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Vendor *</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- Select Vendor --</option>
            {db.vendors.map(v => <option key={v.id} value={v.id}>{v.name} {v.gstin ? `· ${v.gstin}` : ""}</option>)}
          </select>
          {vendorId && (() => { const v = db.vendors.find(x => x.id === vendorId); return v ? (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-[10px] space-y-0.5">
              {v.gstin && <div className="text-amber-700 font-mono">GSTIN: {v.gstin}</div>}
              {v.address && <div className="text-slate-600">{v.address}</div>}
            </div>
          ) : null; })()}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">PO Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Expected Delivery Date</label>
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          <div className="col-span-4">Item</div><div className="col-span-2">Qty</div>
          <div className="col-span-2">Rate (₹)</div><div className="col-span-2">GST%</div>
          <div className="col-span-1 text-right">Amount</div><div className="col-span-1"></div>
        </div>
        {formItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 items-center">
            <div className="col-span-4">
              <select value={item.itemId} onChange={e => updateItem(idx, "itemId", e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none">
                <option value="">-- Item --</option>
                {db.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="col-span-2"><input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, "qty", parseFloat(e.target.value) || 1)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" /></div>
            <div className="col-span-2"><input type="number" min={0} value={item.rate} onChange={e => updateItem(idx, "rate", parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-right font-mono focus:outline-none" /></div>
            <div className="col-span-2">
              <select value={item.gstRate} onChange={e => updateItem(idx, "gstRate", parseFloat(e.target.value))} className="w-full border border-slate-200 rounded px-1 py-1.5 text-xs focus:outline-none">
                {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div className="col-span-1 text-right text-xs font-mono text-slate-700">₹{(item.qty * item.rate * (1 + item.gstRate / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="col-span-1 flex justify-center">
              <button onClick={() => formItems.length > 1 && setFormItems(formItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><X className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => setFormItems([...formItems, { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18 }])} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Line
          </button>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div className="space-y-1.5 w-64">
          <label className="text-xs font-semibold text-slate-600">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Terms, special instructions..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none" />
        </div>
        <div className="w-56 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono">₹{liveSubtotal.toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between text-slate-600"><span>GST</span><span className="font-mono">₹{liveGst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total</span><span className="font-mono text-amber-600">₹{liveTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
        <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2">
          <Package className="w-3.5 h-3.5" />{isSaving ? "Saving..." : (editingPO ? "Update PO" : "Create Purchase Order")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-xs text-slate-500">Issue POs to vendors and convert to bills on receipt</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg">
          <Plus className="w-3.5 h-3.5" /> New Purchase Order
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total POs", value: purchaseOrders.length },
          { label: "Issued", value: purchaseOrders.filter(p => p.status === "Issued").length },
          { label: "Received", value: purchaseOrders.filter(p => p.status === "Received").length },
          { label: "Total Value", value: `₹${purchaseOrders.filter(p => p.status !== "Cancelled").reduce((a, c) => a + c.total, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
        ].map(s => (
          <div key={s.label} className="card-lift bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{s.label}</div>
            <div className="text-xl font-bold mt-1 text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search POs..." className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 w-48" />
        <div className="flex gap-1">
          {["All", "Draft", "Issued", "Received", "Billed", "Cancelled"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterStatus === s ? "bg-amber-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card-lift bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["PO Number", "Vendor", "Date", "Delivery Date", "Amount", "Status", "Actions"].map(h => (
              <th key={h} className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="font-medium">No purchase orders yet</div>
              </td></tr>
            ) : filtered.map(po => (
              <tr key={po.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-amber-700">{po.poNumber}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800">{po.vendorName}</div>
                  <div className="text-[10px] text-slate-500">{db.vendors.find(v => v.id === po.vendorId)?.gstin || "Unregistered"}</div>
                </td>
                <td className="py-3 px-4 text-slate-600">{po.date}</td>
                <td className="py-3 px-4 text-slate-600">{po.deliveryDate || "—"}</td>
                <td className="py-3 px-4 font-mono font-bold text-slate-900">₹{po.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[po.status]}`}>{po.status}</span></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    {po.status === "Draft" && <button onClick={() => onSavePO({ ...po, status: "Issued" })} className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700">Issue</button>}
                    {po.status === "Issued" && <button onClick={() => onSavePO({ ...po, status: "Received" })} className="px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700">Mark Received</button>}
                    {po.status === "Received" && !po.convertedToBill && <button onClick={() => onConvertToBill(po)} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 flex items-center gap-1"><FileText className="w-3 h-3" />Create Bill</button>}
                    <button onClick={() => handleEdit(po)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3 h-3" /></button>
                    {!["Billed", "Cancelled"].includes(po.status) && <button onClick={() => onSavePO({ ...po, status: "Cancelled" })} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-3 h-3" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
