import React, { useState, useEffect } from "react";
import { DatabaseState, Vendor, Expense, Bill } from "../types.js";
import { 
  Users, 
  Receipt, 
  FileText, 
  Plus, 
  Save, 
  Upload, 
  Check, 
  Trash2, 
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  X,
  PlusCircle,
  Lock
} from "lucide-react";

interface PurchasesProps {
  db: DatabaseState;
  onAddVendor: (vendor: any) => Promise<void>;
  onAddExpense: (expense: any) => Promise<void>;
  onAddBill: (bill: any) => Promise<void>;
  onPayBill: (billPay: any) => Promise<void>;
  onTriggerAI: (feature: string, payload?: any) => void;
  defaultTab?: "vendors" | "expenses" | "bills";
  userRole?: string;
}

export default function Purchases({ db, onAddVendor, onAddExpense, onAddBill, onPayBill, onTriggerAI, defaultTab, userRole }: PurchasesProps) {
  const [activeTab, setActiveTab] = useState<"vendors" | "expenses" | "bills">(defaultTab || "vendors");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  
  // Forms state overlays
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showPayBillForm, setShowPayBillForm] = useState<Bill | null>(null);

  // Vendor Form State
  const [vendorName, setVendorName] = useState("");
  const [vendorIsRegistered, setVendorIsRegistered] = useState(true);
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorPan, setVendorPan] = useState("");
  const [msmeStatus, setMsmeStatus] = useState("Micro");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  // Expense Form State
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expVendor, setExpVendor] = useState("");
  const [expCategory, setExpCategory] = useState("software_subscription");
  const [expSubtotal, setExpSubtotal] = useState(0);
  const [expGst, setExpGst] = useState(0);
  const [expTds, setExpTds] = useState(0);
  const [expTdsSection, setExpTdsSection] = useState("194C");
  const [expMode, setExpMode] = useState("Corporate Card");
  const [expAttachmentName, setExpAttachmentName] = useState("");

  // Bill Form State
  const [billVendorId, setBillVendorId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billDueDate, setBillDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billSubtotal, setBillSubtotal] = useState(0);
  const [billGstRate, setBillGstRate] = useState(18);
  const [billIsRcm, setBillIsRcm] = useState(false);

  // Bill Pay State
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState("NEFT");
  const [payRef, setPayRef] = useState("");
  const [payAmount, setPayAmount] = useState(0);

  // Submit Handlers
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddVendor({
      name: vendorName,
      isRegistered: vendorIsRegistered,
      gstin: vendorIsRegistered ? vendorGstin : "",
      pan: vendorPan,
      msmeStatus,
      email: vendorEmail,
      phone: vendorPhone,
      address: vendorAddress,
      openingBalance: 0
    });
    setShowVendorForm(false);
    // clean
    setVendorName(""); setVendorGstin(""); setVendorPan(""); setMsmeStatus("Micro"); setVendorEmail(""); setVendorPhone(""); setVendorAddress(""); setVendorIsRegistered(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent, overrideStatus?: 'Draft' | 'Pending Approval' | 'Approved') => {
    if (e && e.preventDefault) e.preventDefault();
    if (expSubtotal <= 0) return alert("Amount must be greater than 0");
    
    const finalStatus = overrideStatus || "Approved";

    await onAddExpense({
      date: expDate,
      vendorName: expVendor,
      category: expCategory,
      subtotal: Number(expSubtotal),
      gstAmount: Number(expGst),
      tdsAmount: Number(expTds),
      tdsSection: expTds > 0 ? expTdsSection : undefined,
      paymentMode: expMode,
      total: Number(expSubtotal) + Number(expGst) - Number(expTds),
      attachmentName: expAttachmentName || undefined,
      status: finalStatus
    });

    setShowExpenseForm(false);
    // clean
    setExpVendor(""); setExpSubtotal(0); setExpGst(0); setExpTds(0); setExpAttachmentName("");
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billVendorId) return alert("Please select a vendor.");
    const vend = db.vendors.find(v => v.id === billVendorId);
    if (!vend) return;

    const sub = Number(billSubtotal);
    const gstPct = Number(billGstRate);
    const gstAmt = (sub * gstPct) / 100;

    const sameState = vend.address.toLowerCase().includes(db.company.state.toLowerCase());

    // Under RCM, the vendor does NOT charge GST on the bill — the buyer self-assesses
    // and pays it directly to the government. The bill total payable to the vendor
    // therefore excludes GST; the GST liability is tracked separately via isReverseCharge.
    const billTotal = billIsRcm ? sub : sub + gstAmt;

    await onAddBill({
      billNumber,
      vendorId: billVendorId,
      vendorName: vend.name,
      date: billDate,
      dueDate: billDueDate,
      items: [
        {
          itemId: "item_2", // stationery default
          name: "Procured Supplies / Raw Materials",
          qty: 1,
          rate: sub,
          gstRate: gstPct,
          amount: sub,
          cgst: sameState ? gstAmt / 2 : 0,
          sgst: sameState ? gstAmt / 2 : 0,
          igst: !sameState ? gstAmt : 0
        }
      ],
      subtotal: sub,
      totalGst: gstAmt,
      totalCgst: sameState ? gstAmt / 2 : 0,
      totalSgst: sameState ? gstAmt / 2 : 0,
      totalIgst: !sameState ? gstAmt : 0,
      total: billTotal,
      status: "Approved",
      paymentPaid: 0,
      isReverseCharge: billIsRcm,
      rcmGstPaid: false
    });

    setShowBillForm(false);
    // clean
    setBillNumber(""); setBillSubtotal(0);
  };

  const handleBillPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayBillForm) return;

    await onPayBill({
      billId: showPayBillForm.id,
      date: payDate,
      paymentMode: payMode,
      referenceNumber: payRef,
      amountPaid: Number(payAmount)
    });

    setShowPayBillForm(null);
    setPayRef(""); setPayAmount(0);
  };

  return (
    <div id="purchases-view-container" className="space-y-6 p-2 animate-fade-in">
      
      {/* Tab Menu Header Segment */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F2ED] p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex bg-white p-1.5 rounded-lg border border-[#E5E1D8] gap-2 w-full sm:w-auto">
          <button
            id="tab-btn-vendors"
            onClick={() => { setActiveTab("vendors"); setShowVendorForm(false); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "vendors" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Vendor Master
          </button>
          <button
            id="tab-btn-expenses"
            onClick={() => { setActiveTab("expenses"); setShowExpenseForm(false); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "expenses" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-rose-600" />
            Quick Expenses
          </button>
          <button
            id="tab-btn-bills"
            onClick={() => { setActiveTab("bills"); setShowBillForm(false); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "bills" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Vendor Invoices
          </button>
        </div>

        {/* Dynamic add button shortcut triggers */}
        <div id="trigger-btn-tray">
          {activeTab === "vendors" && !showVendorForm && (
            <button 
              id="btn-trigger-new-vendor" 
              onClick={() => setShowVendorForm(true)}
              className="flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-medium text-xs px-4 py-2 rounded-lg cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Form Vendor Master
            </button>
          )}
          {activeTab === "expenses" && !showExpenseForm && (
            <button 
              id="btn-trigger-new-exp" 
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer shadow-sm animate-fade-in"
            >
              <Plus className="w-3.5 h-3.5 text-white" /> Record New Expense
            </button>
          )}
          {activeTab === "bills" && !showBillForm && (
            <button 
              id="btn-trigger-new-bill" 
              onClick={() => setShowBillForm(true)}
              className="flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-medium text-xs px-4 py-2 rounded-lg cursor-pointer animate-fade-in shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Record Vendor Invoice
            </button>
          )}
        </div>
      </div>

      {/* VENDOR ADD FORM PANEL OVERLAY */}
      {showVendorForm && (
        <div id="vendor-master-form" className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
            <h4 className="text-sm font-bold text-slate-800">Create Supplier Account Master</h4>
            <button onClick={() => setShowVendorForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleVendorSubmit} className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-medium">Business / Supplier Legal Name</label>
                <input 
                  type="text" required value={vendorName} onChange={(e) => setVendorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                  placeholder="e.g. Acme Office Supplies Ltd"
                />
              </div>
              <div className="space-y-1.5 font-sans">
                <label className="text-slate-600">Supplier PAN Number</label>
                <input 
                  type="text" required maxLength={10} value={vendorPan} onChange={(e) => setVendorPan(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono tracking-wider focus:border-blue-500 outline-none"
                  placeholder="e.g. DDNDD1111A"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 font-medium text-xs">GST Registration Status</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input type="radio" name="vendorGstReg" checked={vendorIsRegistered} onChange={() => setVendorIsRegistered(true)} className="accent-blue-600" />
                  <span className="font-semibold text-emerald-700">Registered Supplier</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input type="radio" name="vendorGstReg" checked={!vendorIsRegistered} onChange={() => { setVendorIsRegistered(false); setVendorGstin(""); }} className="accent-blue-600" />
                  <span className="font-semibold text-orange-600">Unregistered Supplier</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-600">
                  GSTIN{vendorIsRegistered && <span className="text-red-500 ml-1">*</span>}
                  {!vendorIsRegistered && <span className="text-slate-400 ml-1 font-normal text-[10px]">(N/A)</span>}
                </label>
                <input 
                  type="text" maxLength={15} required={vendorIsRegistered} disabled={!vendorIsRegistered}
                  value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                  className={`w-full border rounded px-3 py-2 font-mono tracking-wider focus:border-blue-500 outline-none ${vendorIsRegistered ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                  placeholder={vendorIsRegistered ? "e.g. 29DDDDD3333D1Z5" : "Not applicable"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-600">MSME Classification Status</label>
                <select 
                  value={msmeStatus} onChange={(e) => setMsmeStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="Micro">Micro Enterprise (Govt Settle)</option>
                  <option value="Small">Small Enterprise</option>
                  <option value="Medium">Medium Enterprise</option>
                  <option value="Non-MSME">Non-MSME / Large Supplier</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-600">Supplier Office Telephone</label>
                <input 
                  type="text" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                  placeholder="+91-8888777766"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600">Postal / Mailing Address Details</label>
              <textarea 
                rows={2} required value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none resize-none"
                placeholder="Mailing credentials for postal invoice compliance checking"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowVendorForm(false)} className="border border-slate-300 px-4 py-2 rounded text-slate-600">Cancel</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded text-white font-bold select-none cursor-pointer">Save Supplier</button>
            </div>
          </form>
        </div>
      )}

      {/* RECORD EXPENSE ENTRY FORM */}
      {showExpenseForm && (
        <div id="expense-outflow-form" className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="text-rose-450 w-4.5 h-4.5" />
              Record New Expense
            </h4>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => onTriggerAI("categorize")}
                className="bg-indigo-600 hover:bg-indigo-505 border border-indigo-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
                AI Auto-Categorize Category
              </button>
              <button onClick={() => setShowExpenseForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 font-sans">
                <label className="text-slate-400">Merchant / Creditor Description</label>
                <input 
                  type="text" required value={expVendor} placeholder="e.g. Amazon Web Services Pvt Ltd, Indiranagar Rent"
                  onChange={(e) => setExpVendor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Accounts Ledger Allocation Category</label>
                <select
                  required
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-semibold focus:border-blue-500 outline-none"
                >
                  <option value="salary_expense">Salary & Payroll Expense</option>
                  <option value="contractor_expense">Contractor & Consulting Fee</option>
                  <option value="rent">Rent & Office Leases</option>
                  <option value="software_subscription">Software Subscription & Internet</option>
                  <option value="professional_fees">Legal & Professional Auditing Expense</option>
                  <option value="bank_charges">Bank Fees & Clearing Charges</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Settle Spend Date</label>
                <input 
                  type="date" required value={expDate} onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400">Expense Value Net of GST (₹)</label>
                <input 
                  type="number" required min={1} value={expSubtotal}
                  onChange={(e) => setExpSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono font-bold focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Input-Tax GST Reclaim (₹)</label>
                <input 
                  type="number" min={0} value={expGst}
                  onChange={(e) => setExpGst(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">TDS Withheld (Crediting Tax Liability) (₹)</label>
                <input 
                  type="number" min={0} value={expTds}
                  onChange={(e) => setExpTds(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:border-blue-500 outline-none"
                />
              </div>
              {expTds > 0 && (
                <div className="space-y-1.5">
                  <label className="text-slate-400">TDS Section <span className="text-red-500">*</span></label>
                  <select value={expTdsSection} onChange={e => setExpTdsSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none">
                    <option value="194C">Sec 393(1) Table Sl.6(i) — Contractor Payments (was 194C)</option>
                    <option value="194J">Sec 393(1) Table Sl.12 — Professional / Technical Fees (was 194J)</option>
                    <option value="194I">Sec 393(1) Table Sl.8 — Rent (was 194I)</option>
                    <option value="194H">Sec 393(1) Table Sl.10 — Commission / Brokerage (was 194H)</option>
                    <option value="194A">Sec 393(1) Table Sl.4 — Interest, other than securities (was 194A)</option>
                    <option value="194Q">Sec 393(1) Table — Purchase of Goods (was 194Q)</option>
                  </select>
                  <p className="text-[10px] text-amber-600">Required to generate Challan 281 / Form 16A for this vendor.</p>
                </div>
              )}

              <div className="space-y-1.5 font-sans">
                <label className="text-slate-400">Expense Payment Mode</label>
                <select 
                  value={expMode} onChange={(e) => setExpMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="Corporate Card">Corporate Credit Card</option>
                  <option value="Bank Account">Direct NetBanking Debit</option>
                  <option value="Petty Cash">In-Hand Petty Cash</option>
                </select>
              </div>
            </div>

            {/* Custom file attachments - Drag & Drop or manual select layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                id="dropzone-expense-receipt"
                className="border border-dashed border-slate-300 rounded-lg p-5 bg-slate-50 text-center space-y-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                onClick={() => {
                  const items = ["Aws_Spend_Invoice.pdf", "Internet_Bill_Airtel.jpeg", "Cafe_Meeting_Receipt.pdf"];
                  setExpAttachmentName(items[Math.floor(Math.random() * items.length)]);
                }}
              >
                <Upload className="mx-auto w-6 h-6 text-slate-500" />
                <p className="text-[10px] text-slate-400 font-medium">Click to upload mock receipts and attachment files</p>
                {expAttachmentName ? (
                  <span className="text-[9px] bg-indigo-950 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-900 font-bold">
                    Logged Attachment: {expAttachmentName}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-600 italic">Supports PDF, Image, Word (Drag/Drop Mimic)</span>
                )}
              </div>

              {/* Ledger Preview double entry */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-400" />
                  Expenses Double Entry Effect:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono mt-3 select-none leading-relaxed">
                  <div className="text-slate-500 border-r border-slate-200 pr-2">
                    <p className="text-emerald-400 font-semibold">• dr. Category Expense: ₹{expSubtotal}</p>
                    {expGst > 0 && <p className="text-teal-400 font-semibold">• dr. Input GST: ₹{expGst}</p>}
                  </div>
                  <div className="text-slate-450 pl-2">
                    {expTds > 0 && <p className="text-indigo-450 font-semibold">• cr. TDS Payable: ₹{expTds}</p>}
                    <p className="text-rose-450 font-semibold">• cr. Corporate Bank Account: ₹{expSubtotal + expGst - expTds}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowExpenseForm(false)} className="border border-slate-300 px-4 py-2 rounded text-slate-600">Cancel</button>
              <button 
                type="button" 
                onClick={(e) => handleExpenseSubmit(e, "Draft")}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 font-semibold text-slate-700 px-4 py-2 rounded text-xs transition cursor-pointer"
              >
                Save as Draft
              </button>
              <button 
                type="button" 
                onClick={(e) => handleExpenseSubmit(e, "Pending Approval")}
                className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded text-white font-bold select-none cursor-pointer"
              >
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RECORD SUPPLIER VENDOR BILL FORM */}
      {showBillForm && (
        <div id="supplier-bill-form" className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-455" />
              Record Vendor Invoice
            </h4>
            <button onClick={() => setShowBillForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleBillSubmit} className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 font-sans">
                <label className="text-slate-400">Supplier Vendor Account</label>
                <select
                  required
                  value={billVendorId}
                  onChange={(e) => setBillVendorId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Choose Vendor Supplier --</option>
                  {db.vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} {v.gstin ? `· ${v.gstin}` : "(Unregistered)"}</option>
                  ))}
                </select>
                {/* Vendor details preview */}
                {billVendorId && (() => {
                  const vend = db.vendors.find((v: any) => v.id === billVendorId);
                  if (!vend) return null;
                  return (
                    <div className="mt-1.5 bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-[10px] space-y-0.5">
                      {vend.legalName && vend.legalName !== vend.name && <div className="text-slate-500">Legal: <span className="text-slate-700">{vend.legalName}</span></div>}
                      {vend.gstin && <div className="text-slate-400">GSTIN: <span className="font-mono text-emerald-400">{vend.gstin}</span></div>}
                      {vend.pan && <div className="text-slate-500">PAN: <span className="font-mono text-slate-700">{vend.pan}</span></div>}
                      {vend.billingAddress && <div className="text-slate-400">Address: <span className="text-slate-300">{vend.billingAddress}</span></div>}
                      {vend.email && <div className="text-slate-400">Email: <span className="text-slate-300">{vend.email}</span></div>}
                      {!vend.gstin && <div className="text-amber-400 font-semibold">⚠ Unregistered Vendor</div>}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Vendor Invoice Number</label>
                <input 
                  type="text" required value={billNumber} placeholder="e.g. BILL-ACME-8902"
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-slate-400">Bill Date</label>
                  <input 
                    type="date" required value={billDate} onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3.5 py-2 text-slate-800 focus:border-blue-500 outline-none text-[11px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-450">Due Limit Date</label>
                  <input 
                    type="date" required value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3.5 py-2 text-slate-800 focus:border-blue-500 outline-none text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 font-sans">
                <label className="text-slate-400 font-bold">Bill Subtotal (Taxable Value) (₹)</label>
                <input 
                  type="number" required min={1} value={billSubtotal}
                  onChange={(e) => setBillSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono font-bold focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">GST Input tax claim rate category (%)</label>
                <select 
                  value={billGstRate} onChange={(e) => setBillGstRate(parseInt(e.target.value) || 18)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="5">Standard 5% Rate</option>
                  <option value="12">Standard 12% Rate</option>
                  <option value="18">Standard 18% Rate (Professional/It)</option>
                  <option value="28">Luxury/Tobacco 28% Rate</option>
                </select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <input type="checkbox" checked={billIsRcm} onChange={e => setBillIsRcm(e.target.checked)} className="accent-amber-600" />
                  <span className="text-xs text-amber-800">
                    <span className="font-bold">Reverse Charge Mechanism (RCM)</span> — vendor does not charge GST; you self-assess and pay GST directly to the government (e.g. unregistered vendor, GTA, legal services, import of services).
                  </span>
                </label>
              </div>

              {/* Calculations review */}
              <div className="bg-slate-100 p-3 rounded border border-slate-200 flex justify-between items-center text-xs font-mono select-none">
                <div className="text-slate-500">
                  <p>{billIsRcm ? "Self-Assessed GST (RCM)" : "Incurred GST"}: ₹{(billSubtotal * billGstRate) / 100}</p>
                  {billIsRcm && <p className="text-[10px] text-amber-600 font-sans">Not paid to vendor — pay this directly via GST portal.</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-normal font-sans text-slate-400">{billIsRcm ? "Payable to vendor (excl. GST):" : "Total payable sum:"}</p>
                  <p className="text-indigo-400 font-bold">₹{billIsRcm ? billSubtotal : billSubtotal + (billSubtotal * billGstRate) / 100}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E1D8] font-medium font-bold">
              <button type="button" onClick={() => setShowBillForm(false)} className="border border-[#E5E1D8] px-4 py-2 rounded text-[#8C867A] hover:bg-[#F5F2ED] transition cursor-pointer">Cancel</button>
              <button type="submit" className="bg-[#5A5A40] hover:bg-[#4E4E37] px-5 py-2 rounded text-white font-bold select-none cursor-pointer border border-[#5A5A40]">Settle Payable Invoice</button>
            </div>
          </form>
        </div>
      )}

      {/* SUPPLIER DATA TABLES AND LOG PANELS */}
      {!showVendorForm && !showExpenseForm && !showBillForm && (
        <div id="purchases-data-rendered-panel" className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden p-6 space-y-4 font-sans text-xs shadow-sm">
          
          {activeTab === "vendors" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#2C2C24] border-b border-[#E5E1D8] pb-3">Suppliers Directory Listings</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                      <th className="py-3 px-3">Supplier Name</th>
                      <th className="py-3 px-3">GSTIN ID</th>
                      <th className="py-3 px-3">PAN</th>
                      <th className="py-3 px-3 relative">MSME Bracket</th>
                      <th className="py-3 px-3 font-sans">Email / Tel</th>
                      <th className="py-3 px-3">Registered Office Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]/40 text-[#2C2C24]">
                    {db.vendors.map(v => (
                      <tr key={v.id} className="hover:bg-[#F5F2ED]/40 transition-all text-[#2C2C24]">
                        <td className="py-3 px-3 font-semibold text-[#2C2C24]">{v.name}</td>
                        <td className="py-3 px-3 font-mono text-[#8C867A]">{v.gstin || "Unregistered Supplier"}</td>
                        <td className="py-3 px-3 font-mono text-[#8C867A]">{v.pan}</td>
                        <td className="py-3 px-3 font-semibold">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                            v.msmeStatus === "Micro" 
                              ? "bg-teal-50 text-teal-800 border-teal-200" 
                              : "bg-slate-50 text-[#8C867A] border-[#E5E1D8]"
                          }`}>
                            {v.msmeStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans truncate text-[#8C867A]">
                          <p className="text-[#2C2C24]">{v.email}</p>
                          <p className="text-[10px] text-[#8C867A]">{v.phone}</p>
                        </td>
                        <td className="py-3 px-3 text-[#8C867A] truncate max-w-xs">{v.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#2C2C24] border-b border-[#E5E1D8] pb-3">Expenses History</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                      <th className="py-3 px-3">Cleared Date</th>
                      <th className="py-3 px-3">Merchant Descriptor</th>
                      <th className="py-3 px-3 font-sans">Category Class</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3 text-right">Taxable Subtotal</th>
                      <th className="py-3 px-3 text-right">GST claims</th>
                      <th className="py-3 px-3 text-right">Net spend Out</th>
                      <th className="py-3 px-3 text-center">Receipt File</th>
                      <th className="py-3 px-3 text-center">Approval Status</th>
                      <th className="py-3 px-3 text-center">Workflow Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]/40">
                    {db.expenses.map(e => (
                      <tr key={e.id} className="hover:bg-[#F5F2ED]/40 transition-all text-[#2C2C24]">
                        <td className="py-3 px-3 font-mono text-[#8C867A]">{e.date}</td>
                        <td className="py-3 px-3 font-semibold text-[#2C2C24]">{e.vendorName}</td>
                        <td className="py-3 px-3 font-medium text-[#2C2C24] tracking-wider uppercase text-[10px]">
                          {db.accounts.find(a => a.code === e.category)?.name || e.category}
                        </td>
                        <td className="py-3 px-3 font-sans text-[#8C867A]">{e.paymentMode}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{e.subtotal.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#8C867A]">₹{e.gstAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#2C2C24]">₹{e.total.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-center text-xs">
                          {e.attachmentName ? (
                            <span className="text-[9px] bg-[#FDFBF7] font-mono text-[#5A5A40] border border-[#E5E1D8] px-2 py-0.5 rounded font-bold">
                              {e.attachmentName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8C867A] font-sans">No file</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border font-bold ${
                            e.status === "Approved" 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : e.status === "Pending Approval"
                              ? "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                              : "bg-slate-50 text-slate-700 border-slate-300"
                          }`}>
                            {e.status || "Approved"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {(!e.status || e.status === "Draft") && (
                            <button
                              type="button"
                              onClick={() => {
                                onAddExpense({ ...e, status: "Pending Approval" });
                                alert("Expense successfully submitted for approval!");
                              }}
                              className="p-1 px-2 border border-amber-200 hover:border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-800 rounded transition cursor-pointer"
                            >
                              Submit for Approval
                            </button>
                          )}
                          {e.status === "Pending Approval" && (
                            (userRole === "Admin" || userRole === "Auditor" || userRole === "Owner") ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onAddExpense({ ...e, status: "Approved" });
                                  alert(`Expense approved by authority step! Debited with standard double-entry logs to ${db.accounts.find(a => a.code === e.category)?.name || e.category}`);
                                }}
                                className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded transition cursor-pointer shadow-sm"
                              >
                                Approve (Authority)
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-600" /> Pending review by Auditor/Admin
                              </span>
                            )
                          )}
                          {e.status === "Approved" && (
                            <span className="text-[10px] text-emerald-800 font-bold">
                              ✓ Posted Logged
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "bills" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-[#2C2C24] border-b border-[#E5E1D8] pb-3">Vendor Invoices Ledger</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                      <th className="py-3 px-3">Invoice Number</th>
                      <th className="py-3 px-3">Vendor / supplier</th>
                      <th className="py-3 px-3 font-sans">Invoice Date</th>
                      <th className="py-3 px-3">Due Limit Date</th>
                      <th className="py-3 px-3 text-right">Taxable Subtotal</th>
                      <th className="py-3 px-3 text-right">Gstr Levies</th>
                      <th className="py-3 px-3 text-right">Total Payable</th>
                      <th className="py-3 px-3 text-center">Settle Status</th>
                      <th className="py-3 px-3 text-center">Pay supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]/40">
                    {db.bills.map(b => (
                      <tr key={b.id} className="hover:bg-[#F5F2ED]/40 transition-all text-[#2C2C24]">
                        <td className="py-3 px-3 font-mono font-semibold text-[#5A5A40] text-xs">{b.billNumber}</td>
                        <td className="py-3 px-3 font-semibold text-[#2C2C24]">{b.vendorName}</td>
                        <td className="py-3 px-3 text-[#8C867A]">{b.date}</td>
                        <td className="py-3 px-3 text-[#8C867A]">{b.dueDate}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{b.subtotal.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#8C867A] font-medium">₹{b.totalGst.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#2C2C24]">₹{b.total.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[9.5px] px-2 py-0.5 rounded border font-bold ${
                            b.status === "Paid" 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : "bg-[#FDFBF7] text-[#5A5A40] border-[#E5E1D8]"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center items-center gap-1.5 flex-wrap">
                            {b.status === "Draft" && (
                              <button
                                onClick={() => onAddBill({ ...b, status: "Approved" })}
                                className="p-1 px-2 bg-blue-600 hover:bg-blue-700 text-[10px] text-white font-bold rounded cursor-pointer transition shadow-sm"
                              >
                                ✓ Approve
                              </button>
                            )}
                            {(b.status === "Approved") && (
                              <button
                                id={`btn-pay-bill-${b.id}`}
                                onClick={() => { setShowPayBillForm(b); setPayAmount(b.total - (b.paymentPaid || 0)); }}
                                className="p-1 px-2.5 bg-[#5A5A40] hover:bg-[#4E4E37] text-[10px] text-white font-bold rounded cursor-pointer transition flex items-center gap-1 shadow-sm"
                              >
                                💳 Pay
                              </button>
                            )}
                            {b.status === "Paid" && <span className="text-[10px] text-emerald-800 font-bold">✓ Settled</span>}
                            {b.status !== "Paid" && b.status !== "Cancelled" && (
                              <button
                                onClick={() => onAddBill({ ...b, status: "Cancelled" })}
                                className="p-1 px-2 border border-red-200 bg-red-50 text-[10px] text-red-600 font-semibold rounded cursor-pointer transition"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PAY SUPPLIER BILL MODAL PANEL */}
      {showPayBillForm && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 font-sans text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                Settle supplier claim: {showPayBillForm.billNumber}
              </h4>
              <button onClick={() => setShowPayBillForm(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-[11px] text-slate-400">
              Clear payables due to <span className="font-semibold text-slate-200">{showPayBillForm.vendorName}</span> for total claim <span className="font-bold text-emerald-400 font-mono">₹{showPayBillForm.total}</span>.
            </p>

            <form onSubmit={handleBillPaySubmit} className="space-y-4">
              <div className="space-y-1.5 font-sans">
                <label className="text-slate-450">Remitted clearing Date</label>
                <input 
                  type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 font-sans">
                  <label className="text-slate-450">Payment Instrument / Mode</label>
                  <select 
                    value={payMode} onChange={(e) => setPayMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                  >
                    <option value="NEFT">NEFT Bank</option>
                    <option value="IMPS">IMPS Immediate</option>
                    <option value="UPI">Corporate UPI</option>
                    <option value="UPI">Corporate Cheque</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-450">UTR Clearance ID</label>
                  <input 
                    type="text" required value={payRef} placeholder="UTR ID" onChange={(e) => setPayRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-405">Settled Amount (₹)</label>
                <input 
                  type="number" required max={showPayBillForm.total - (showPayBillForm.paymentPaid || 0)}
                  value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded px-3 py-2 text-emerald-700 text-sm font-bold font-mono focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 font-medium">
                <button type="button" onClick={() => setShowPayBillForm(null)} className="border border-slate-300 px-4 py-2 rounded text-slate-600">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded text-white font-bold cursor-pointer">Post Outflow Journal</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


