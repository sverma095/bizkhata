import React, { useState } from "react";
import { DatabaseState, Payment } from "../types.js";
import { 
  Plus, 
  Save, 
  Eye, 
  Printer, 
  X, 
  Check, 
  Building, 
  Calculator, 
  Calendar,
  Layers
} from "lucide-react";

interface PaymentsProps {
  db: DatabaseState;
  onRecordPayment: (paymentPayload: any) => Promise<void>;
}

export default function Payments({ db, onRecordPayment }: PaymentsProps) {
  const [showForm, setShowForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState<Payment | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountReceived, setAmountReceived] = useState(0);
  const [tdsDeducted, setTdsDeducted] = useState(0);
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("bank_account");
  const [invoiceId, setInvoiceId] = useState("");

  const outstandingInvoices = db.invoices.filter(i => i.customerId === customerId && i.status !== "Paid" && !i.isProforma);

  const resetForm = () => {
    setCustomerId("");
    setDate(new Date().toISOString().split('T')[0]);
    setAmountReceived(0);
    setTdsDeducted(0);
    setPaymentMode("NEFT");
    setReferenceNumber("");
    setBankAccount("bank_account");
    setInvoiceId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert("Please select a customer.");
    if (!invoiceId) return alert("Please allocate this payment to an invoice.");
    if (!amountReceived || amountReceived <= 0) return alert("Please enter a valid payment amount.");

    const cust = db.customers.find(c => c.id === customerId);
    if (!cust) return;

    const paymentPayload = {
      customerId,
      customerName: cust.name,
      date,
      amountReceived: Number(amountReceived),
      tdsDeducted: Number(tdsDeducted),
      paymentMode,
      referenceNumber,
      bankAccount,
      allocations: [
        // invoice.total is already net of TDS (TDS Receivable was booked separately
        // at invoice time), so only the actual cash received settles it here.
        { invoiceId, amount: Number(amountReceived) }
      ]
    };

    await onRecordPayment(paymentPayload);
    setShowForm(false);
    resetForm();
  };

  return (
    <div id="payments-engine-container" className="space-y-6 animate-fade-in p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F2ED] p-4 rounded-xl border border-[#E5E1D8]">
        <div>
          <h3 id="lbl-pay-title" className="text-sm font-bold text-[#2C2C24]">Customer Payments Ingress</h3>
          <p id="lbl-pay-desc" className="text-[11px] text-[#8C867A]">Record payments received, allocate invoice values, track TDS and auto post to assets.</p>
        </div>
        {!showForm && (
          <button
            id="btn-trigger-payment-form"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-medium text-xs px-4 py-2 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment Received
          </button>
        )}
      </div>

      {/* RECORD PAYMENT RECEIVED FORM */}
      {showForm && (
        <div id="payment-received-form" className="card-lift bg-white border border-[#E5E1D8] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3 mb-4">
            <h4 className="text-sm font-bold text-[#2C2C24] flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Capture Payment Remittance
            </h4>
            <button onClick={() => setShowForm(false)} className="text-[#8C867A] hover:text-[#2C2C24]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#2C2C24]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 font-sans">
                <label className="text-[#8C867A]">Customer Entity</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => { setCustomerId(e.target.value); setInvoiceId(""); }}
                  className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#2C2C24] focus:border-[#5A5A40] outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {db.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {customerId && (
                <div className="space-y-1.5">
                  <label className="text-[#8C867A]">Outstanding Invoice Allocation</label>
                  <select
                    required
                    value={invoiceId}
                    onChange={(e) => {
                      setInvoiceId(e.target.value);
                      const inv = outstandingInvoices.find(i => i.id === e.target.value);
                      if (inv) {
                        const remaining = inv.total - (inv.paymentReceived || 0);
                        // default values
                        setAmountReceived(remaining);
                        setTdsDeducted(0);
                      }
                    }}
                    className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#2C2C24] focus:border-[#5A5A40] outline-none font-semibold text-[#5A5A40]"
                  >
                    <option value="">-- Choose Outstanding Invoice --</option>
                    {outstandingInvoices.map(inv => {
                      const remain = inv.total - (inv.paymentReceived || 0);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} (DUE: ₹{remain.toLocaleString('en-IN')})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[#8C867A]">Settlement Date</label>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#2C2C24] focus:border-[#5A5A40] outline-none font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[#8C867A] font-bold">Sum Received (Bank Remitted) (₹)</label>
                <input 
                  type="number"
                  required
                  min={1}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#5A5A40] font-mono font-black text-xs focus:border-[#5A5A40] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#8C867A] font-medium">TDS Deducted (Capturing Asset) (₹)</label>
                <input 
                  type="number"
                  min={0}
                  value={tdsDeducted}
                  onChange={(e) => setTdsDeducted(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#2C2C24] font-mono text-xs focus:border-[#5A5A40] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#8C867A]">Payment Instrument / Mode</label>
                <select
                  required
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#2C2C24] focus:border-[#5A5A40] outline-none"
                >
                  <option value="NEFT">NEFT Transfer</option>
                  <option value="IMPS">IMPS Immediate Transfer</option>
                  <option value="RTGS">RTGS High-Value Transfer</option>
                  <option value="UPI">UPI Remittance</option>
                  <option value="Cheque">Bank Clearing Cheque</option>
                  <option value="Cash">Physical Cash</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#8C867A]">Utr / Reference Number</label>
                <input 
                  type="text"
                  required
                  value={referenceNumber}
                  placeholder="e.g. UTR6782392AA"
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-white border border-[#E5E1D8] rounded px-3 py-2 text-[#2C2C24] focus:border-[#5A5A40] outline-none"
                />
              </div>
            </div>

            {/* Accounting dynamic ledger double entry effect display */}
            <div className="bg-[#F5F2ED] p-4 border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] text-[#8C867A] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
                Dual Ledgers Double-Entry Projection:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono py-1">
                <div className="bg-white border border-[#E5E1D8] p-2 rounded">
                  <div className="text-[9px] text-[#8C867A] uppercase">Debit Bank Asset Account:</div>
                  <div className="text-emerald-800 font-bold mt-1">₹ {amountReceived.toLocaleString('en-IN')}</div>
                </div>
                {tdsDeducted > 0 && (
                  <div className="bg-white border border-[#E5E1D8] p-2 rounded">
                    <div className="text-[9px] text-[#8C867A] uppercase">Debit TDS Receivable Asset:</div>
                    <div className="text-blue-800 font-bold mt-1">₹ {tdsDeducted.toLocaleString('en-IN')}</div>
                  </div>
                )}
                <div className="bg-white border border-[#E5E1D8] p-2 rounded">
                  <div className="text-[9px] text-[#8C867A] uppercase">Credit Customer Receivable:</div>
                  <div className="text-rose-800 font-bold mt-1">₹ {(amountReceived + tdsDeducted).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E1D8]">
              <button type="button" onClick={() => setShowForm(false)} className="border border-[#E5E1D8] px-4 py-2 rounded text-[#8C867A] font-medium cursor-pointer">Cancel</button>
              <button type="submit" className="bg-[#5A5A40] hover:bg-[#4E4E37] px-5 py-2 rounded text-white font-bold select-none cursor-pointer">Settle Remittance</button>
            </div>
          </form>
        </div>
      )}

      {/* PAYMENTS HISTORY LIST */}
      {!showForm && (
        <div id="payments-history-panel" className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden p-6 shadow-sm">
          <h3 id="lbl-payments-history" className="text-sm font-bold text-[#2C2C24] mb-4 border-b border-[#E5E1D8] pb-3">Received Settled Bank Inflow Log</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                  <th className="py-3 px-3">Receipt Code</th>
                  <th className="py-3 px-3">Customer Client</th>
                  <th className="py-3 px-3">Clearing Date</th>
                  <th className="py-3 px-3">Reference / Mode</th>
                  <th className="py-3 px-3 text-right">Tds Deducted</th>
                  <th className="py-3 px-3 text-right">Remittance Received</th>
                  <th className="py-3 px-3 text-center">Receipt PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]/40">
                {db.payments.length > 0 ? (
                  db.payments.map(pay => (
                    <tr key={pay.id} id={`row-pay-${pay.id}`} className="hover:bg-[#F5F2ED]/40 text-[#2C2C24] transition-all">
                      <td className="py-3 px-3 font-mono font-bold text-[#5A5A40] text-xs">{pay.receiptNumber}</td>
                      <td className="py-3 px-3 font-semibold text-[#2C2C24]">{pay.customerName}</td>
                      <td className="py-3 px-3 text-[#8C867A]">{pay.date}</td>
                      <td className="py-3 px-3 text-[#8C867A]">
                        <span className="font-bold text-[#2C2C24]">{pay.paymentMode}</span> (Ref: {pay.referenceNumber || "-"})
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#8C867A]">₹{pay.tdsDeducted.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">₹{pay.amountReceived.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          id={`btn-view-payment-${pay.id}`}
                          onClick={() => setShowReceipt(pay)}
                          className="p-1 px-2 border border-[#E5E1D8] bg-[#FDFBF7] hover:bg-[#F5F2ED] text-[10px] text-[#5A5A40] font-semibold rounded transition flex items-center gap-1 mx-auto cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3 h-3" /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#8C867A]">No bank payment clearances tracked yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT SHEET MODAL */}
      {showReceipt && (
        <div id="payment-receipt-sheet" className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-900 text-white rounded-t-2xl">
              <span className="text-xs font-bold tracking-widest uppercase">MOCK REMITTANCE RECEIPT</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-semibold px-3 py-1 rounded flex items-center gap-1 transition-all"
                >
                  <Printer className="w-3 h-3" /> Print
                </button>
                <button onClick={() => setShowReceipt(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-xs text-slate-700 leading-relaxed">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Payment Acknowledgement</h3>
                  <p className="text-slate-500">Issued by: <span className="font-semibold text-slate-800">{db.company.name}</span></p>
                </div>
                <div className="text-right font-mono font-black text-slate-900">
                  {showReceipt.receiptNumber}
                </div>
              </div>

              <div className="border border-indigo-100 bg-indigo-50/20 rounded-xl p-4 text-center space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Amount Received</div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  ₹ {showReceipt.amountReceived.toLocaleString('en-IN')}
                </div>
                {showReceipt.tdsDeducted > 0 && (
                  <div className="text-[10px] text-slate-500">
                    Plus TDS Deducted at Source: <span className="font-bold text-slate-700 font-mono">₹{showReceipt.tdsDeducted.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 select-text border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Name:</span>
                  <span className="font-bold text-slate-800">{showReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cleared Date:</span>
                  <span className="font-medium text-slate-800 font-mono">{showReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Instrument Status:</span>
                  <span className="font-bold text-emerald-600 uppercase font-sans tracking-wider">Settle ({showReceipt.paymentMode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Instrument Reference:</span>
                  <span className="font-semibold text-slate-800 font-mono">{showReceipt.referenceNumber || "-"}</span>
                </div>
                {showReceipt.allocations && showReceipt.allocations[0] && (
                  <div className="flex justify-between border-t border-dashed pt-2 text-slate-500 text-[10px]">
                    <span>Allocated Settle:</span>
                    <span className="font-bold text-slate-800">INV: {showReceipt.allocations[0].invoiceId.substring(4, 9).toUpperCase()} (₹{showReceipt.allocations[0].amount.toLocaleString('en-IN')})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-500 font-mono rounded-b-2xl">
              Double-entry audit hash: dr. Liquid Assets bank | cr. Accounts Receivable
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
