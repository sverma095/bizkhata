import React, { useState, useEffect } from "react";
import { toast } from "./Toast.js";
import { DatabaseState, Vendor, Expense, Bill } from "../types.js";
import { INDIAN_STATES } from "../lib/gst.js";
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
  Lock,
  Search
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
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
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
  const [expIsRcm, setExpIsRcm] = useState(false);
  const [expTds, setExpTds] = useState(0);
  const [expTdsSection, setExpTdsSection] = useState("194C");
  const [expMode, setExpMode] = useState("Corporate Card");
  const [expAttachmentName, setExpAttachmentName] = useState("");
  // GST Treatment tab
  const [expTab, setExpTab] = useState<"details" | "gst">("details");
  const [expType, setExpType] = useState<"Goods" | "Services">("Services");
  const [expSac, setExpSac] = useState("");
  const [expHsn, setExpHsn] = useState("");
  const [expGstTreatment, setExpGstTreatment] = useState("");
  const [expSourceSupply, setExpSourceSupply] = useState("");
  const [expDestSupply, setExpDestSupply] = useState(db.company?.state || "");
  const [expTaxRate, setExpTaxRate] = useState(18);
  const [expTaxInclusive, setExpTaxInclusive] = useState(false);
  const [expCustomerId, setExpCustomerId] = useState("");

  // Auto-calculate GST from the entered amount + selected rate + inclusive/exclusive toggle,
  // instead of requiring manual GST entry (matches standard Zoho-style expense UX).
  useEffect(() => {
    if (expTaxRate <= 0) { setExpGst(0); return; }
    if (expTaxInclusive) {
      const base = expSubtotal / (1 + expTaxRate / 100);
      setExpGst(Math.round((expSubtotal - base) * 100) / 100);
    } else {
      setExpGst(Math.round(expSubtotal * expTaxRate) / 100);
    }
  }, [expSubtotal, expTaxRate, expTaxInclusive]);

  // Bill Form State
  const [billVendorId, setBillVendorId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billAddressOverride, setBillAddressOverride] = useState<string | null>(null);
  const [billDiscountValue, setBillDiscountValue] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<"percent" | "amount">("percent");
  const [billDiscountTiming, setBillDiscountTiming] = useState<"before_tax" | "after_tax">("after_tax");
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billDueDate, setBillDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billSubtotal, setBillSubtotal] = useState(0);
  const [billGstRate, setBillGstRate] = useState(18);
  const [billTds, setBillTds] = useState(0);
  const [billTdsSection, setBillTdsSection] = useState("194C");
  const [billIsRcm, setBillIsRcm] = useState(false);

  // Bill Pay State
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState("NEFT");
  const [payRef, setPayRef] = useState("");
  const [payAmount, setPayAmount] = useState(0);

  // Submit Handlers
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
    } catch (err: any) {
      toast(err.message || "Could not save vendor", "error");
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent, overrideStatus?: 'Draft' | 'Pending Approval' | 'Approved') => {
    if (e && e.preventDefault) e.preventDefault();
    if (expSubtotal <= 0) return toast("Amount must be greater than 0", "error");
    
    const finalStatus = overrideStatus || "Approved";
    const netSubtotal = expTaxInclusive ? Math.round((expSubtotal - expGst) * 100) / 100 : Number(expSubtotal);

    try {
      await onAddExpense({
        date: expDate,
        vendorName: expVendor,
        category: expCategory,
        subtotal: netSubtotal,
        gstAmount: Number(expGst),
        tdsAmount: Number(expTds),
        tdsSection: expTds > 0 ? expTdsSection : undefined,
        paymentMode: expMode,
        // Under RCM, GST isn't paid to the vendor — it's self-assessed and paid to the
        // government directly, so it's excluded from the cash amount settled here.
        total: (expIsRcm ? netSubtotal : netSubtotal + Number(expGst)) - Number(expTds),
        isReverseCharge: expIsRcm || undefined,
        rcmGstPaid: expIsRcm ? false : undefined,
        attachmentName: expAttachmentName || undefined,
        status: finalStatus,
        expenseType: expType,
        sacCode: expType === "Services" ? (expSac || undefined) : undefined,
        hsnCode: expType === "Goods" ? (expHsn || undefined) : undefined,
        gstTreatment: expGstTreatment || undefined,
        sourceOfSupply: expSourceSupply || undefined,
        destinationOfSupply: expDestSupply || undefined,
        taxRate: expGst > 0 ? expTaxRate : undefined,
        amountIsTaxInclusive: expTaxInclusive || undefined,
        customerId: expCustomerId || undefined
      });

      setShowExpenseForm(false);
      // clean
      setExpVendor(""); setExpSubtotal(0); setExpGst(0); setExpTds(0); setExpIsRcm(false); setExpAttachmentName("");
      setExpSac(""); setExpHsn(""); setExpGstTreatment(""); setExpSourceSupply(""); setExpCustomerId(""); setExpTaxInclusive(false); setExpTab("details");
    } catch (err: any) {
      toast(err.message || "Could not save expense", "error");
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billVendorId) return toast("Please select a vendor", "error");
    const vend = db.vendors.find(v => v.id === billVendorId);
    if (!vend) return;

    const sub = Number(billSubtotal);
    const gstPct = Number(billGstRate);
    const gstAmt = (sub * gstPct) / 100;

    const sameState = vend.address.toLowerCase().includes(db.company.state.toLowerCase());

    const discountAmt = billDiscountType === "percent"
      ? Math.round(sub * billDiscountValue / 100 * 100) / 100
      : Number(billDiscountValue);

    // Before-tax: discount reduces the taxable value, so GST is computed on the
    // discounted amount. After-tax: GST stays computed on full price (cash discount).
    const netSubtotal = billDiscountTiming === "before_tax" ? Math.max(0, sub - discountAmt) : sub;
    const effectiveGstAmt = billDiscountTiming === "before_tax" ? (netSubtotal * gstPct) / 100 : gstAmt;

    // Under RCM, the vendor does NOT charge GST on the bill — the buyer self-assesses
    // and pays it directly to the government. The bill total payable to the vendor
    // therefore excludes GST; the GST liability is tracked separately via isReverseCharge.
    // TDS deducted at source is withheld from the vendor and owed to the government instead,
    // so it also reduces the net amount actually payable to the vendor.
    const billSubtotalAfterDiscount = billDiscountTiming === "before_tax" ? netSubtotal : sub - discountAmt;
    const billTotal = (billIsRcm ? billSubtotalAfterDiscount : billSubtotalAfterDiscount + effectiveGstAmt) - Number(billTds);

    try {
      await onAddBill({
        billNumber,
        vendorId: billVendorId,
        vendorName: vend.name,
        billingAddress: billAddressOverride !== null ? billAddressOverride : undefined,
        date: billDate,
        dueDate: billDueDate,
        items: [
          {
            itemId: "item_2", // stationery default
            name: "Procured Supplies / Raw Materials",
            qty: 1,
            rate: billSubtotalAfterDiscount,
            gstRate: gstPct,
            amount: billSubtotalAfterDiscount,
            cgst: sameState ? effectiveGstAmt / 2 : 0,
            sgst: sameState ? effectiveGstAmt / 2 : 0,
            igst: !sameState ? effectiveGstAmt : 0
          }
        ],
        subtotal: billSubtotalAfterDiscount,
        totalGst: effectiveGstAmt,
        totalCgst: sameState ? effectiveGstAmt / 2 : 0,
        totalSgst: sameState ? effectiveGstAmt / 2 : 0,
        totalIgst: !sameState ? effectiveGstAmt : 0,
        total: billTotal,
        status: "Approved",
        paymentPaid: 0,
        isReverseCharge: billIsRcm,
        rcmGstPaid: false,
        tdsAmount: Number(billTds) || undefined,
        tdsSection: billTds > 0 ? billTdsSection : undefined,
        discountValue: billDiscountValue || undefined,
        discountType: billDiscountValue ? billDiscountType : undefined,
        discountTiming: billDiscountValue ? billDiscountTiming : undefined
      });

      setShowBillForm(false);
      // clean
      setBillNumber(""); setBillSubtotal(0); setBillTds(0); setBillAddressOverride(null);
      setBillDiscountValue(0); setBillDiscountType("percent"); setBillDiscountTiming("after_tax");
    } catch (err: any) {
      toast(err.message || "Could not save bill", "error");
    }
  };

  const handleBillPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayBillForm) return;

    try {
      await onPayBill({
        billId: showPayBillForm.id,
        date: payDate,
        paymentMode: payMode,
        referenceNumber: payRef,
        amountPaid: Number(payAmount)
      });

      setShowPayBillForm(null);
      setPayRef(""); setPayAmount(0);
    } catch (err: any) {
      toast(err.message || "Could not record payment", "error");
    }
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
        <div id="expense-outflow-form" className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Record Expense
            </h4>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => onTriggerAI("categorize")}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Categorize
              </button>
              <button onClick={() => setShowExpenseForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Tabs: Record Expense | Record Mileage */}
          <div className="flex border-b border-gray-200 px-6">
            <button type="button" onClick={() => setExpTab("details")} className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition ${expTab === "details" ? "border-blue-600 text-blue-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Record Expense</button>
            <button type="button" onClick={() => setExpTab("gst")} className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition flex items-center gap-1.5 ${expTab === "gst" ? "border-blue-600 text-blue-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              Record Mileage
              {expGstTreatment && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          </div>

          <form onSubmit={handleExpenseSubmit} className="text-sm">

            {expTab === "details" && (
            <div className="flex gap-0">
              {/* Left: Form fields */}
              <div className="flex-1 px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Location</label>
                    <select className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option>Hyderabad head office</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={expDate} onChange={(e) => setExpDate(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Expense Account <span className="text-red-500">*</span></label>
                    <select required value={expCategory} onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option value="">Select an account</option>
                      <option value="salary_expense">Salary & Payroll</option>
                      <option value="contractor_expense">Contractor & Consulting</option>
                      <option value="rent">Rent & Office Leases</option>
                      <option value="software_subscription">Software & Internet</option>
                      <option value="professional_fees">Professional & Legal Fees</option>
                      <option value="bank_charges">Bank Fees</option>
                    </select>
                    <button type="button" onClick={() => alert("Splitting this expense into multiple line items with different categories isn't built yet — log it as separate expenses for now if needed.")} className="text-xs text-blue-600 hover:underline">Itemize</button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Amount <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-1">
                      <span className="bg-gray-100 border border-gray-300 rounded-l px-2 py-2 text-gray-600 text-sm">INR</span>
                      <input type="number" required min={0} value={expSubtotal}
                        onChange={(e) => setExpSubtotal(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-white border border-gray-300 rounded-r px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Paid Through <span className="text-red-500">*</span></label>
                    <select value={expMode} onChange={(e) => setExpMode(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option value="Bank Account">DBS Bank India Limited</option>
                      <option value="Corporate Card">Corporate Credit Card</option>
                      <option value="Petty Cash">Petty Cash</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Expense Type</label>
                    <div className="flex items-center gap-4 py-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 text-sm"><input type="radio" checked={expType === "Goods"} onChange={() => setExpType("Goods")} className="accent-blue-600" /> Goods</label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 text-sm"><input type="radio" checked={expType === "Services"} onChange={() => setExpType("Services")} className="accent-blue-600" /> Services</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">SAC</label>
                    <input type="text" placeholder=""
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Vendor</label>
                    <div className="flex gap-1">
                      <input type="text" value={expVendor} onChange={(e) => setExpVendor(e.target.value)} placeholder=""
                        className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                      />
                      <button type="button" className="border border-gray-300 bg-white px-2 py-1 rounded text-gray-500 hover:bg-gray-50">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">GST Treatment <span className="text-red-500">*</span></label>
                    <select value={expGstTreatment} onChange={(e) => setExpGstTreatment(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option value="">Select</option>
                      <option value="regular">Registered — Regular</option>
                      <option value="composition">Registered — Composition</option>
                      <option value="unregistered">Unregistered</option>
                      <option value="consumer">Consumer</option>
                      <option value="overseas">Overseas</option>
                      <option value="sez">SEZ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Source of Supply <span className="text-red-500">*</span></label>
                    <select value={expSourceSupply} onChange={(e) => setExpSourceSupply(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option value="">State/Province</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Destination of Supply <span className="text-red-500">*</span></label>
                    <select value={expDestSupply} onChange={(e) => setExpDestSupply(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option value="">State/Province</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 text-sm">
                      <input type="checkbox" checked={expIsRcm} onChange={e => setExpIsRcm(e.target.checked)} className="accent-blue-600" />
                      Reverse Charge
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Tax</label>
                    <select value={expTaxRate} onChange={(e) => setExpTaxRate(parseFloat(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                      <option value={0}>Select a Tax</option>
                      <option value={5}>GST 5%</option>
                      <option value={12}>GST 12%</option>
                      <option value={18}>GST 18%</option>
                      <option value={28}>GST 28%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Amount Is</label>
                    <div className="flex items-center gap-4 py-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 text-sm"><input type="radio" checked={expTaxInclusive} onChange={() => setExpTaxInclusive(true)} className="accent-blue-600" /> Tax Inclusive</label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 text-sm"><input type="radio" checked={!expTaxInclusive} onChange={() => setExpTaxInclusive(false)} className="accent-blue-600" /> Tax Exclusive</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Invoice# <span className="text-red-500">*</span></label>
                    <input type="text" placeholder=""
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-gray-500 font-medium">Notes</label>
                    <textarea rows={3} placeholder="Max. 500 characters"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-sm focus:border-blue-400 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Customer Name</label>
                    <div className="flex gap-1">
                      <select value={expCustomerId} onChange={(e) => setExpCustomerId(e.target.value)}
                        className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                        <option value="">Select or add a customer</option>
                        {(db.customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button type="button" className="border border-gray-300 bg-white px-2 py-1 rounded text-gray-500 hover:bg-gray-50">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Receipt upload panel */}
              <div className="w-52 shrink-0 border-l border-gray-200 p-4 flex flex-col items-center justify-start gap-3 bg-gray-50">
                <div
                  id="dropzone-expense-receipt"
                  className="w-full border border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                  onClick={() => {
                    const items = ["Receipt_Invoice.pdf", "Bill_Airtel.jpeg", "Meeting_Receipt.pdf"];
                    setExpAttachmentName(items[Math.floor(Math.random() * items.length)]);
                  }}
                >
                  <Upload className="mx-auto w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Drag or Drop your Receipts</p>
                  <p className="text-[10px] text-gray-400 mt-1">Maximum file size allowed is 10MB</p>
                  {expAttachmentName && (
                    <p className="text-[10px] text-blue-600 mt-2 font-medium">{expAttachmentName}</p>
                  )}
                </div>
                <button type="button" className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-50 w-full justify-center">
                  <Upload className="w-3.5 h-3.5" /> Upload your Files
                </button>
              </div>
            </div>
            )}

            {expTab === "gst" && (
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">Mileage tracking is not enabled. Please contact support to enable it.</p>
            </div>
            )}

            {/* Bottom action bar */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center gap-3 rounded-b-xl">
              <button type="button" onClick={(e) => handleExpenseSubmit(e, "Draft")}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer transition">
                Save as Draft
              </button>
              <button type="button" onClick={(e) => handleExpenseSubmit(e, "Pending Approval")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded cursor-pointer select-none transition">
                Save and New
              </button>
              <button type="button" onClick={() => setShowExpenseForm(false)}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BILL DETAIL VIEW */}
      {viewingBill && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewingBill(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <p className="text-[10px] text-slate-400">{db.company?.name}</p>
                <h3 className="font-bold text-slate-800">{viewingBill.billNumber}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="text-xs px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50">🖨 Print</button>
                <button onClick={() => setViewingBill(null)} className="text-xs px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50">✕ Close</button>
              </div>
            </div>

            {viewingBill.isReverseCharge && (
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-amber-800 mb-2">Reverse Charge Summary</p>
                <table className="w-full text-xs border border-amber-200 rounded overflow-hidden">
                  <thead><tr className="bg-amber-50 text-amber-800"><th className="text-left py-1.5 px-3 font-semibold">Reverse Charge Rate</th><th className="text-right py-1.5 px-3 font-semibold">Tax Amount</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-amber-100"><td className="py-1.5 px-3">{viewingBill.totalIgst > 0 ? "IGST 18%" : "CGST+SGST 18%"}</td><td className="text-right py-1.5 px-3 font-mono">₹{viewingBill.totalGst.toLocaleString('en-IN')}</td></tr>
                    <tr className="border-t border-amber-200 font-bold bg-amber-50"><td className="py-1.5 px-3">Total</td><td className="text-right py-1.5 px-3 font-mono">₹{viewingBill.totalGst.toLocaleString('en-IN')}</td></tr>
                  </tbody>
                </table>
                <p className="text-[10px] text-amber-600 mt-1.5">Self-assessed — {viewingBill.rcmGstPaid ? "deposited to government." : "not yet deposited to government."}</p>
              </div>
            )}

            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  {db.company?.logoUrl ? <img src={db.company.logoUrl} className="h-10 mb-2" /> : <div className="h-10 w-10 rounded-full bg-[#5A5A40] mb-2" />}
                  <p className="font-bold text-sm">{db.company?.legalName || db.company?.name}</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">{db.company?.address}</p>
                  <p className="text-[10px] text-slate-500">GSTIN: {db.company?.gstin}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-slate-800">BILL</h2>
                  <p className="text-xs text-slate-500">Bill# {viewingBill.billNumber}</p>
                  <p className="text-xs font-bold mt-1">Balance Due: ₹{(viewingBill.total - (viewingBill.paymentPaid||0)).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs mb-4">
                <div><p className="text-slate-400">Bill From</p><p className="font-semibold">{viewingBill.vendorName}</p>{viewingBill.billingAddress && <p className="text-slate-500 text-[10px] whitespace-pre-line mt-0.5">{viewingBill.billingAddress}</p>}</div>
                <div className="text-right"><p className="text-slate-400">Bill Date: <span className="text-slate-700">{viewingBill.date}</span></p><p className="text-slate-400">Due Date: <span className="text-slate-700">{viewingBill.dueDate}</span></p></div>
              </div>
              <table className="w-full text-xs border border-slate-200 rounded overflow-hidden mb-4">
                <thead><tr className="bg-slate-800 text-white"><th className="text-left py-2 px-3">#</th><th className="text-left py-2 px-3">Item & Description</th><th className="text-right py-2 px-3">Qty</th><th className="text-right py-2 px-3">Rate</th><th className="text-right py-2 px-3">Amount</th></tr></thead>
                <tbody>{viewingBill.items.map((it, i) => <tr key={i} className="border-t border-slate-100"><td className="py-2 px-3">{i+1}</td><td className="py-2 px-3">{it.name}</td><td className="text-right py-2 px-3">{it.qty}</td><td className="text-right py-2 px-3">₹{it.rate.toLocaleString('en-IN')}</td><td className="text-right py-2 px-3 font-mono">₹{it.amount.toLocaleString('en-IN')}</td></tr>)}</tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-56 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span className="font-mono">₹{viewingBill.subtotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{viewingBill.isReverseCharge ? "GST (Self-Assessed)" : "GST"}</span><span className="font-mono">₹{viewingBill.totalGst.toLocaleString('en-IN')}</span></div>
                  {(viewingBill.tdsAmount||0) > 0 && <div className="flex justify-between text-indigo-600"><span>TDS ({viewingBill.tdsSection})</span><span className="font-mono">−₹{viewingBill.tdsAmount.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1"><span>Total</span><span className="font-mono">₹{viewingBill.total.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-rose-500"><span>Payments Made</span><span className="font-mono">−₹{(viewingBill.paymentPaid||0).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between font-bold bg-slate-50 px-2 py-1 rounded"><span>Balance Due</span><span className="font-mono">₹{(viewingBill.total - (viewingBill.paymentPaid||0)).toLocaleString('en-IN')}</span></div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <p className="text-xs font-bold text-slate-600 mb-2">Journal</p>
              <table className="w-full text-xs">
                <thead><tr className="text-slate-400 border-b border-slate-100"><th className="text-left py-1.5">Account</th><th className="text-right py-1.5">Debit</th><th className="text-right py-1.5">Credit</th></tr></thead>
                <tbody>
                  <tr className="border-b border-slate-50"><td className="py-1.5">Purchases / Cost of Goods & Services</td><td className="text-right font-mono">₹{viewingBill.subtotal.toLocaleString('en-IN')}</td><td></td></tr>
                  {viewingBill.totalGst > 0 && <tr className="border-b border-slate-50"><td className="py-1.5">Input GST Asset</td><td className="text-right font-mono">₹{viewingBill.totalGst.toLocaleString('en-IN')}</td><td></td></tr>}
                  {viewingBill.isReverseCharge && <tr className="border-b border-slate-50"><td className="py-1.5">GST Payable (Reverse Charge)</td><td></td><td className="text-right font-mono">₹{viewingBill.totalGst.toLocaleString('en-IN')}</td></tr>}
                  {(viewingBill.tdsAmount||0) > 0 && <tr className="border-b border-slate-50"><td className="py-1.5">TDS Payable</td><td></td><td className="text-right font-mono">₹{viewingBill.tdsAmount.toLocaleString('en-IN')}</td></tr>}
                  <tr><td className="py-1.5">Accounts Payable</td><td></td><td className="text-right font-mono">₹{viewingBill.total.toLocaleString('en-IN')}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECORD SUPPLIER VENDOR BILL FORM */}
      {showBillForm && (
        <div id="supplier-bill-form" className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              New Bill
            </h4>
            <button onClick={() => setShowBillForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleBillSubmit} className="text-sm">
            <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Vendor Name <span className="text-red-500">*</span></label>
                <div className="flex gap-1">
                <select
                  required
                  value={billVendorId}
                  onChange={(e) => setBillVendorId(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">Select a Vendor</option>
                  {db.vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} {v.gstin ? `· ${v.gstin}` : "(Unregistered)"}</option>
                  ))}
                </select>
                <button type="button" className="border border-gray-300 bg-white px-2 py-2 rounded text-gray-500 hover:bg-gray-50">
                  <Search className="w-4 h-4" />
                </button>
                </div>
                {billVendorId && (() => {
                  const vend = db.vendors.find((v: any) => v.id === billVendorId);
                  if (!vend) return null;
                  return (
                    <div className="mt-1 bg-blue-50 border border-blue-100 rounded p-2 text-xs space-y-0.5">
                      {vend.gstin && <div className="text-gray-500">GSTIN: <span className="font-mono text-green-700">{vend.gstin}</span></div>}
                      {!vend.gstin && <div className="text-amber-600 font-medium">⚠ Unregistered Vendor</div>}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Location</label>
                <select className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                  <option>Hyderabad head office</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Bill# <span className="text-red-500">*</span></label>
                <input type="text" required value={billNumber} placeholder=""
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Order Number</label>
                <input type="text" placeholder=""
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Account</label>
                <textarea rows={2} placeholder="You can enter a maximum of 36000 characters"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-sm focus:border-blue-400 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Bill Date <span className="text-red-500">*</span></label>
                <input type="date" required value={billDate} onChange={(e) => setBillDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Due Date</label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)}
                    className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                  />
                  <div className="space-y-0.5">
                    <label className="text-xs text-gray-500">Payment Terms</label>
                    <select className="bg-white border border-gray-300 rounded px-2 py-2 text-gray-700 text-sm outline-none">
                      <option>Due on Receipt</option>
                      <option>Net 30</option>
                      <option>Net 45</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 text-sm">
                  <input type="checkbox" checked={billIsRcm} onChange={e => setBillIsRcm(e.target.checked)} className="accent-blue-600" />
                  This transaction is applicable for reverse charge
                </label>
              </div>
            </div>
            </div>

            {/* Item Table */}
            <div className="border-t border-gray-200">
              <div className="px-6 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Item Table</span>
                <button type="button" onClick={() => alert("Bulk item actions (bulk delete/discount/HSN edit) aren't built yet — edit line items individually below.")} className="text-xs text-blue-600 hover:underline">Bulk Actions</button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-[11px] font-semibold bg-gray-50">
                    <th className="text-left px-4 py-2.5 w-[30%]">Item Details</th>
                    <th className="text-left px-3 py-2.5 w-[15%]">Account</th>
                    <th className="text-right px-3 py-2.5 w-[10%]">Quantity</th>
                    <th className="text-right px-3 py-2.5 w-[12%]">Rate</th>
                    <th className="text-center px-3 py-2.5 w-[12%]">Tax</th>
                    <th className="text-center px-3 py-2.5 w-[12%]">Customer Details</th>
                    <th className="text-right px-3 py-2.5 w-[10%]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <input type="text" placeholder="Type or click to select an item."
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 text-xs focus:border-blue-400 outline-none"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 text-xs outline-none">
                        <option value="">Select an account</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input type="number" defaultValue="1.00" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs text-right outline-none" />
                    </td>
                    <td className="px-3 py-3">
                      <input type="number" defaultValue="0.00" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs text-right outline-none" />
                    </td>
                    <td className="px-3 py-3">
                      <select className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 text-xs outline-none">
                        <option>Select a Tax</option>
                        <option>GST 5%</option>
                        <option>GST 12%</option>
                        <option>GST 18%</option>
                        <option>GST 28%</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 text-xs outline-none">
                        <option>Select Customer</option>
                        {(db.customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-gray-800 text-xs">0.00</td>
                  </tr>
                </tbody>
              </table>
              <div className="px-4 py-3 flex gap-3 border-t border-gray-100">
                <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add New Row
                </button>
              </div>

              {/* Totals */}
              <div className="flex justify-end px-4 pb-4">
                {(() => {
                  const sub = Number(billSubtotal);
                  const discountAmt = billDiscountType === "percent" ? Math.round(sub * billDiscountValue / 100 * 100) / 100 : Number(billDiscountValue);
                  const netSub = billDiscountTiming === "before_tax" ? Math.max(0, sub - discountAmt) : sub;
                  const gstAmt = (netSub * billGstRate) / 100;
                  const subAfterDiscount = billDiscountTiming === "before_tax" ? netSub : sub - discountAmt;
                  const total = (billIsRcm ? subAfterDiscount : subAfterDiscount + gstAmt) - billTds;
                  return (
                    <div className="w-64 text-xs space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between text-gray-600">
                        <span>Sub Total</span>
                        <span className="font-mono text-gray-800">0.00</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 shrink-0">Discount</span>
                        <input type="number" min={0} value={billDiscountValue}
                          onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                          className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 text-xs outline-none text-right" placeholder="0"
                        />
                        <select value={billDiscountType} onChange={e => setBillDiscountType(e.target.value as any)}
                          className="bg-white border border-gray-300 rounded px-1 py-1 text-gray-700 text-xs outline-none">
                          <option value="percent">%</option>
                          <option value="amount">₹</option>
                        </select>
                        <span className="w-10 text-right font-mono text-gray-800">{discountAmt > 0 ? `−${discountAmt}` : '0.00'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-gray-600 cursor-pointer"><input type="radio" name="btds" defaultChecked className="accent-blue-600" /> TDS</label>
                        <label className="flex items-center gap-1 text-gray-600 cursor-pointer"><input type="radio" name="btds" className="accent-blue-600" /> TCS</label>
                        <select value={billTdsSection} onChange={e => setBillTdsSection(e.target.value)}
                          className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 text-xs outline-none">
                          <option value="">Select a Tax</option>
                          <option value="194C">Contractor @ 1-2% (old 194C / new Sec 393(1) Sl.6(i))</option>
                          <option value="194J">Professional @ 10% (old 194J / new Sec 393(1) Sl.12)</option>
                          <option value="194I">Rent @ 2-10% (old 194I / new Sec 393(1) Sl.2)</option>
                          <option value="194Q">Goods @ 0.1% (old 194Q / new Sec 393(1))</option>
                        </select>
                      </div>
                      {billTdsSection && (
                        <p className="text-[10px] text-gray-400">
                          {new Date() >= new Date("2026-04-01")
                            ? "This bill falls under the new Income Tax Act (2025) — quote the Section 393(1) reference on your TDS return, not the old 194-series code."
                            : "This bill falls under the old Income Tax Act (1961) 194-series section — the new Act's Section 393(1) applies from 1 April 2026 onward."}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 flex-1">Adjustment</span>
                        <input type="number" min={0} value={billTds} onChange={(e) => setBillTds(parseFloat(e.target.value) || 0)}
                          className="w-24 bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 text-xs outline-none text-right"
                        />
                        <span className="w-10 text-right font-mono text-gray-800">0.00</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-gray-900 text-sm">
                        <span>Total</span>
                        <span className="font-mono text-blue-700">₹{total > 0 ? total.toLocaleString('en-IN', {minimumFractionDigits:2}) : '0.00'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Notes + Attach */}
            <div className="border-t border-gray-200 px-6 py-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600 font-medium">Notes</label>
                  <textarea rows={3} placeholder=""
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-sm focus:border-blue-400 outline-none resize-none"
                  />
                  <p className="text-[10px] text-gray-400">It will not be shown in PDF.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600 font-medium">Attach File(s) to Bill</label>
                  <div className="flex items-center gap-2">
                    <button type="button" className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-50">
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </button>
                    <span className="text-[10px] text-gray-400">Max 5 files, 10MB each</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center gap-3 rounded-b-xl">
              <button type="button" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer transition">
                Save as Draft
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded cursor-pointer select-none transition">
                Save and Submit
              </button>
              <button type="button" onClick={() => setShowBillForm(false)} className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer">
                Cancel
              </button>
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
                                toast("Expense submitted for approval", "success");
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
                                  toast("Expense approved and posted to ledger", "success");
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
                      <React.Fragment key={b.id}>
                      <tr className="hover:bg-[#F5F2ED]/40 transition-all text-[#2C2C24]">
                        <td className="py-3 px-3 font-mono font-semibold text-[#5A5A40] text-xs">
                          <button onClick={() => setViewingBill(b)} className="hover:underline cursor-pointer">{b.billNumber}</button>
                          {b.isReverseCharge && <span className="ml-1.5 text-[8.5px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 align-middle">RCM</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#2C2C24]">{b.vendorName}</td>
                        <td className="py-3 px-3 text-[#8C867A]">{b.date}</td>
                        <td className="py-3 px-3 text-[#8C867A]">{b.dueDate}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{b.subtotal.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#8C867A] font-medium">₹{b.totalGst.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#2C2C24]">
                          ₹{b.total.toLocaleString('en-IN')}
                          {(b.tdsAmount || 0) > 0 && <div className="text-[9px] font-sans font-semibold text-indigo-500 normal-case">less TDS ₹{b.tdsAmount.toLocaleString('en-IN')}</div>}
                        </td>
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
                      {b.isReverseCharge && (
                        <tr>
                          <td colSpan={9} className="px-3 pb-3">
                            <div className="bg-amber-50/60 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-[11px]">
                              <div className="text-amber-800 font-semibold">Reverse Charge Summary</div>
                              <div className="flex items-center gap-6">
                                <span className="text-amber-700">Self-Assessed GST: <span className="font-mono font-bold">₹{b.totalGst.toLocaleString('en-IN')}</span></span>
                                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${b.rcmGstPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {b.rcmGstPaid ? "Deposited to Government" : "Pending Deposit"}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
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
                <label className="text-slate-400">Remitted clearing Date</label>
                <input 
                  type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 font-sans">
                  <label className="text-slate-400">Payment Instrument / Mode</label>
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
                  <label className="text-slate-400">UTR Clearance ID</label>
                  <input 
                    type="text" required value={payRef} placeholder="UTR ID" onChange={(e) => setPayRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Settled Amount (₹)</label>
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


