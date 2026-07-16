import React, { useState, useMemo } from "react";
import { DatabaseState, SalesOrder, InvoiceItem } from "../types.js";
import { calculateGst } from "../lib/gst.js";
import { Plus, FileText, CheckCircle, Truck, X, Edit, Copy, ChevronDown } from "lucide-react";

interface Props {
  db: DatabaseState;
  onSaveSO: (so: any) => Promise<void>;
  onConvertToInvoice: (so: SalesOrder) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Confirmed: "bg-blue-100 text-blue-700",
  Invoiced: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-600",
};

export default function SalesOrders({ db, onSaveSO, onConvertToInvoice }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [formItems, setFormItems] = useState<Array<{ itemId: string; name: string; hsnSac: string; qty: number; rate: number; gstRate: number; discount: number }>>([
    { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18, discount: 0 }
  ]);

  const salesOrders = db.salesOrders || [];
  const customerState = db.customers.find(c => c.id === customerId)?.state || "";

  const liveResults = useMemo(() => {
    const items = formItems.filter(i => i.itemId !== "").map(i => ({
      ...i, rate: i.rate * (1 - (i.discount || 0) / 100)
    }));
    return calculateGst(items, db.company.state, customerState || db.company.state);
  }, [formItems, customerId, db]);

  const resetForm = () => {
    setCustomerId(""); setDate(new Date().toISOString().split("T")[0]);
    setDeliveryDate(""); setNotes(""); setShippingAddress("");
    setFormItems([{ itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18, discount: 0 }]);
    setEditingSO(null);
  };

  const handleEdit = (so: SalesOrder) => {
    setEditingSO(so);
    setCustomerId(so.customerId); setDate(so.date); setDeliveryDate(so.deliveryDate);
    setNotes(so.notes || ""); setShippingAddress(so.shippingAddress || "");
    setFormItems(so.items.map(i => ({ itemId: i.itemId, name: i.name, hsnSac: i.hsnSac || "", qty: i.qty, rate: i.rate, gstRate: i.gstRate, discount: 0 })));
    setShowForm(true);
  };

  const handleDuplicate = (so: SalesOrder) => {
    handleEdit({ ...so, id: "", soNumber: "" });
  };

  const handleSubmit = async () => {
    if (!customerId) return alert("Please select a customer.");
    const cust = db.customers.find(c => c.id === customerId);
    if (!cust) return;
    const finalItems: InvoiceItem[] = formItems.filter(i => i.itemId !== "").map((fi, idx) => {
      const effectiveRate = fi.rate * (1 - (fi.discount || 0) / 100);
      const amount = fi.qty * effectiveRate;
      const isIgst = (cust.state || "") !== db.company.state;
      const gstAmt = amount * fi.gstRate / 100;
      return { id: `li_${idx}`, itemId: fi.itemId, name: fi.name, hsnSac: fi.hsnSac, qty: fi.qty, rate: effectiveRate, gstRate: fi.gstRate, amount, cgst: isIgst ? 0 : gstAmt / 2, sgst: isIgst ? 0 : gstAmt / 2, igst: isIgst ? gstAmt : 0 };
    });
    const payload: any = {
      customerId, customerName: cust.name, date, deliveryDate,
      items: finalItems, subtotal: liveResults.subtotal,
      totalGst: liveResults.totalGst, totalCgst: liveResults.cgst,
      totalSgst: liveResults.sgst, totalIgst: liveResults.igst,
      total: liveResults.total, status: "Draft", notes, shippingAddress,
    };
    if (editingSO) { payload.id = editingSO.id; payload.soNumber = editingSO.soNumber; payload.status = editingSO.status; }
    setIsSaving(true);
    try { await onSaveSO(payload); setShowForm(false); resetForm(); }
    catch (e: any) { alert("Error: " + e.message); }
    finally { setIsSaving(false); }
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[idx] as any)[field] = value;
    if (field === "itemId" && value) {
      const item = db.items.find(i => i.id === value);
      if (item) { updated[idx].name = item.name; updated[idx].hsnSac = item.hsnSac; updated[idx].rate = item.salesRate; updated[idx].gstRate = item.gstRate; }
    }
    setFormItems(updated);
  };

  const filtered = salesOrders.filter(so => {
    const matchSearch = so.soNumber.toLowerCase().includes(search.toLowerCase()) || so.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || so.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: salesOrders.length,
    confirmed: salesOrders.filter(s => s.status === "Confirmed").length,
    invoiced: salesOrders.filter(s => s.status === "Invoiced").length,
    value: salesOrders.filter(s => s.status !== "Cancelled").reduce((a, c) => a + c.total, 0),
  };

  if (showForm) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{editingSO ? `Edit ${editingSO.soNumber}` : "New Sales Order"}</h2>
          <p className="text-xs text-slate-500">Create a confirmed sales order before invoicing</p>
        </div>
        <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Customer *</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- Select Customer --</option>
            {db.customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.gstin ? `· ${c.gstin}` : ""}</option>)}
          </select>
          {customerId && (() => { const c = db.customers.find(x => x.id === customerId); return c ? (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-[10px] space-y-0.5">
              {c.gstin && <div className="text-blue-700 font-mono">GSTIN: {c.gstin}</div>}
              {c.billingAddress && <div className="text-slate-600">{c.billingAddress}</div>}
            </div>
          ) : null; })()}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Order Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Expected Delivery Date</label>
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {/* Line Items */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          <div className="col-span-3">Item</div><div className="col-span-2">HSN/SAC</div>
          <div className="col-span-1">Qty</div><div className="col-span-2">Rate</div>
          <div className="col-span-1">Disc%</div><div className="col-span-1">GST%</div>
          <div className="col-span-1 text-right">Amount</div><div className="col-span-1"></div>
        </div>
        {formItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 items-center">
            <div className="col-span-3">
              <select value={item.itemId} onChange={e => updateItem(idx, "itemId", e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                <option value="">-- Item --</option>
                {db.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="col-span-2"><input value={item.hsnSac} onChange={e => updateItem(idx, "hsnSac", e.target.value)} placeholder="HSN" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" /></div>
            <div className="col-span-1"><input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, "qty", parseFloat(e.target.value) || 1)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" /></div>
            <div className="col-span-2"><input type="number" min={0} value={item.rate} onChange={e => updateItem(idx, "rate", parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-right font-mono focus:outline-none" /></div>
            <div className="col-span-1"><input type="number" min={0} max={100} value={item.discount} onChange={e => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" /></div>
            <div className="col-span-1">
              <select value={item.gstRate} onChange={e => updateItem(idx, "gstRate", parseFloat(e.target.value))} className="w-full border border-slate-200 rounded px-1 py-1.5 text-xs focus:outline-none">
                {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div className="col-span-1 text-right text-xs font-mono text-slate-700">
              ₹{(item.qty * item.rate * (1 - (item.discount || 0) / 100)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="col-span-1 flex justify-center">
              <button onClick={() => formItems.length > 1 && setFormItems(formItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><X className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => setFormItems([...formItems, { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18, discount: 0 }])} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Line
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono">₹{liveResults.subtotal.toLocaleString("en-IN")}</span></div>
          {liveResults.cgst > 0 && <div className="flex justify-between text-slate-600"><span>CGST</span><span className="font-mono">₹{liveResults.cgst.toLocaleString("en-IN")}</span></div>}
          {liveResults.sgst > 0 && <div className="flex justify-between text-slate-600"><span>SGST</span><span className="font-mono">₹{liveResults.sgst.toLocaleString("en-IN")}</span></div>}
          {liveResults.igst > 0 && <div className="flex justify-between text-slate-600"><span>IGST</span><span className="font-mono">₹{liveResults.igst.toLocaleString("en-IN")}</span></div>}
          <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total</span><span className="font-mono text-emerald-600">₹{liveResults.total.toLocaleString("en-IN")}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Shipping Address</label>
          <textarea rows={2} value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="Delivery address..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Notes / Special Instructions</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Handle with care..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
        <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />{isSaving ? "Saving..." : (editingSO ? "Update Order" : "Create Sales Order")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Sales Orders</h2>
          <p className="text-xs text-slate-500">Manage confirmed orders before invoicing</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg">
          <Plus className="w-3.5 h-3.5" /> New Sales Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: stats.total, color: "text-slate-800" },
          { label: "Confirmed", value: stats.confirmed, color: "text-blue-700" },
          { label: "Invoiced", value: stats.invoiced, color: "text-emerald-700" },
          { label: "Order Value", value: `₹${stats.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "text-slate-800" },
        ].map(s => (
          <div key={s.label} className="card-lift bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{s.label}</div>
            <div className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-48" />
        <div className="flex gap-1">
          {["All", "Draft", "Confirmed", "Invoiced", "Cancelled"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filterStatus === s ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-lift bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["SO Number", "Customer", "Date", "Delivery Date", "Amount", "Status", "Actions"].map(h => (
              <th key={h} className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="font-medium">No sales orders yet</div>
                <div className="text-[10px] mt-1">Create your first sales order to get started</div>
              </td></tr>
            ) : filtered.map(so => (
              <tr key={so.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-blue-700">{so.soNumber}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800">{so.customerName}</div>
                  <div className="text-[10px] text-slate-500">{db.customers.find(c => c.id === so.customerId)?.gstin || "Unregistered"}</div>
                </td>
                <td className="py-3 px-4 text-slate-600">{so.date}</td>
                <td className="py-3 px-4 text-slate-600">{so.deliveryDate || "—"}</td>
                <td className="py-3 px-4 font-mono font-bold text-slate-900">₹{so.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[so.status]}`}>{so.status}</span></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    {so.status === "Draft" && (
                      <button onClick={() => onSaveSO({ ...so, status: "Confirmed" })} className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700">✓ Confirm</button>
                    )}
                    {so.status === "Confirmed" && !so.convertedToInvoice && (
                      <button onClick={() => onConvertToInvoice(so)} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Invoice
                      </button>
                    )}
                    <button onClick={() => handleEdit(so)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3 h-3" /></button>
                    <button onClick={() => handleDuplicate(so)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"><Copy className="w-3 h-3" /></button>
                    {so.status !== "Cancelled" && so.status !== "Invoiced" && (
                      <button onClick={() => onSaveSO({ ...so, status: "Cancelled" })} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-3 h-3" /></button>
                    )}
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
