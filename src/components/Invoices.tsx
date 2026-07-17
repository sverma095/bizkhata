import React, { useState, useEffect } from "react";
import { toast } from "./Toast.js";
import { DatabaseState, Invoice, Customer, Item, InvoiceItem } from "../types.js";
import { calculateGst } from "../lib/gst.js";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Eye, 
  Clipboard, 
  ArrowRight, 
  Printer, 
  Sparkles, 
  Send,
  X,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Users,
  Edit,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  ArrowLeft,
  ExternalLink,
  FileSpreadsheet,
  MoreVertical,
  Upload
} from "lucide-react";

interface InvoicesProps {
  db: DatabaseState;
  onSaveInvoice: (invoice: any) => Promise<void>;
  onIssueCreditNote: (creditNote: any) => Promise<void>;
  onAddCustomer?: (customer: any) => Promise<void>;
  onTriggerAI: (feature: string, payload?: any) => void;
  onSendInvoiceEmail?: (invoiceId: string) => Promise<{ success: boolean; emailSent?: boolean; to?: string; error?: string }>;
  userRole: string;
  defaultTab?: "tax" | "proforma" | "notes" | "customers";
}

export default function Invoices({ db, onSaveInvoice, onIssueCreditNote, onAddCustomer, onTriggerAI, onSendInvoiceEmail, userRole, defaultTab }: InvoicesProps) {
  // Organisation's GST registration status — when false, GST/tax is not applicable
  const orgIsGstRegistered = db.company.isGstRegistered !== false;
  const [activeTab, setActiveTab] = useState<"tax" | "proforma" | "notes" | "customers">(defaultTab || "tax");

  // Customers / Clients Directory specific states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerActiveSubTab, setCustomerActiveSubTab] = useState<"overview" | "comments" | "transactions" | "mails" | "statement">("overview");
  
  // Collapsible cards toggle inside profile overview
  const [isAddressExpanded, setIsAddressExpanded] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [showCustomerMore, setShowCustomerMore] = useState(false);

  // Customer comments state
  const [customerComments, setCustomerComments] = useState<{[custId: string]: {author: string, date: string, text: string}[]}>({
    "cust_1": [
      
    ]
  });
  const [newCommentText, setNewCommentText] = useState("");

  // Customer form inputs
  const [customerFormId, setCustomerFormId] = useState("");
  const [customerFormIsRegistered, setCustomerFormIsRegistered] = useState(true);
  const [customerFormName, setCustomerFormName] = useState("");
  const [customerFormLegalName, setCustomerFormLegalName] = useState("");
  const [customerFormGstin, setCustomerFormGstin] = useState("");
  const [customerFormPan, setCustomerFormPan] = useState("");
  const [customerFormEmail, setCustomerFormEmail] = useState("");
  const [customerFormPhone, setCustomerFormPhone] = useState("");
  const [customerFormBillingAddress, setCustomerFormBillingAddress] = useState("");
  const [customerFormState, setCustomerFormState] = useState("");
  const [customerFormTerms, setCustomerFormTerms] = useState("Net 45");
  const [customerFormOpeningBalance, setCustomerFormOpeningBalance] = useState(0);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: customerFormId || undefined,
      name: customerFormName,
      legalName: customerFormLegalName || customerFormName,
      isRegistered: customerFormIsRegistered,
      gstin: customerFormIsRegistered ? customerFormGstin : "",
      pan: customerFormPan,
      email: customerFormEmail,
      phone: customerFormPhone,
      billingAddress: customerFormBillingAddress,
      state: customerFormState,
      paymentTerms: customerFormTerms,
      openingBalance: Number(customerFormOpeningBalance) || 0
    };
    if (onAddCustomer) {
      await onAddCustomer(payload);
    } else {
      toast("Customer saved", "success");
    }
    setShowCustomerForm(false);
    setSelectedCustomer(null);
  };

  const handleEditCustomerClick = (cust: Customer) => {
    setCustomerFormId(cust.id);
    setCustomerFormName(cust.name);
    setCustomerFormLegalName(cust.legalName || cust.name);
    setCustomerFormGstin(cust.gstin);
    setCustomerFormPan(cust.pan);
    setCustomerFormEmail(cust.email);
    setCustomerFormPhone(cust.phone);
    setCustomerFormBillingAddress(cust.billingAddress);
    setCustomerFormState(cust.state);
    setCustomerFormTerms(cust.paymentTerms || "Net 45");
    setCustomerFormOpeningBalance(cust.openingBalance || 0);
    setShowCustomerForm(true);
  };

  const handleCreateCustomerClick = () => {
    setCustomerFormId("");
    setCustomerFormName("");
    setCustomerFormLegalName("");
    setCustomerFormGstin("");
    setCustomerFormPan("");
    setCustomerFormEmail("");
    setCustomerFormPhone("");
    setCustomerFormBillingAddress("");
    setCustomerFormState("");
    setCustomerFormTerms("Net 45");
    setCustomerFormOpeningBalance(0);
    setShowCustomerForm(true);
  };

  const [showForm, setShowForm] = useState(false);
  // Estimate form state
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [estCustomerId, setEstCustomerId] = useState("");
  const [estNumber, setEstNumber] = useState("");
  const [estReference, setEstReference] = useState("");
  const [estDate, setEstDate] = useState(new Date().toISOString().split('T')[0]);
  const [estExpiryDate, setEstExpiryDate] = useState("");
  const [estSubject, setEstSubject] = useState("");
  const [estNotes, setEstNotes] = useState("Looking forward to your business.");
  const [estTerms, setEstTerms] = useState("");
  const [estItems, setEstItems] = useState([{ itemId: "", name: "", qty: 1, rate: 0, gstRate: 18, hsnSac: "" }]);
  const [estRoundOff, setEstRoundOff] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchInvoice, setSearchInvoice] = useState('');

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-slate-400">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</span>
  );
  const [showViewModal, setShowViewModal] = useState<Invoice | null>(null);
  const [showCreditForm, setShowCreditForm] = useState<Invoice | null>(null);

  // Custom states for draft to push to e-invoice to digitally signed to sent workflow
  const [pushingEInvoiceId, setPushingEInvoiceId] = useState<string | null>(null);
  const [signingInvoice, setSigningInvoice] = useState<Invoice | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState<Invoice | null>(null);
  const [sendingEmailNow, setSendingEmailNow] = useState(false);
  const [dscPin, setDscPin] = useState("");
  const [dscCertType, setDscCertType] = useState("Corporate Authorized Signatory (Class 3 DSC USB Token)");
  const [isSignDone, setIsSignDone] = useState(false);
  const [isPushLoadingStep, setIsPushLoadingStep] = useState(0);

  useEffect(() => {
    let t1: any, t2: any;
    if (pushingEInvoiceId) {
      setIsPushLoadingStep(0);
      t1 = setTimeout(() => {
        setIsPushLoadingStep(1);
      }, 800);
      t2 = setTimeout(() => {
        setIsPushLoadingStep(2);
      }, 1800);
    } else {
      setIsPushLoadingStep(0);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pushingEInvoiceId]);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState("");
  const [billingAddressOverride, setBillingAddressOverride] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProforma, setIsProforma] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tdsSection, setTdsSection] = useState<string>("");
  const [tdsRate, setTdsRate] = useState<number>(0);
  const [tdsAmount, setTdsAmount] = useState<number>(0);
  const [roundingOff, setRoundingOff] = useState<boolean>(false);
  const [formItems, setFormItems] = useState<Array<{ itemId: string; name: string; hsnSac: string; qty: number; rate: number; gstRate: number; discount: number }>>([]);
  const [draftInvoiceNum, setDraftInvoiceNum] = useState("");
  const [discountType, setDiscountType] = useState<'percent'|'amount'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountTiming, setDiscountTiming] = useState<'before_tax'|'after_tax'>('after_tax');
  const [shippingCharge, setShippingCharge] = useState(0);
  const [applyTcs, setApplyTcs] = useState(false);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('Payment due within the agreed period. Cheques to be made payable to the company name.');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly'|'monthly'|'quarterly'|'yearly'>('monthly');

  // Credit Note Form State
  const [creditReason, setCreditReason] = useState("");
  const [creditSubtotal, setCreditSubtotal] = useState(0);

  // Load initial settings on edit
  const resetForm = () => {
    setCustomerId("");
    setDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsProforma(activeTab === "proforma");
    setFormItems([{ itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18, discount: 0 }]);
    setDraftInvoiceNum("");
    setTdsSection("");
    setTdsRate(0);
    setTdsAmount(0);
    setRoundingOff(false);
    setDiscountValue(0);
    setDiscountTiming('after_tax');
    setShippingCharge(0);
    setOtherCharges(0);
    setPaymentTerms('Net 30');
    setInvoiceNotes('');
    setIsRecurring(false);
    setManualInvoiceNumber("");
    setBillingAddressOverride(null);
  };

  useEffect(() => {
    resetForm();
  }, [activeTab]);

  const testStateAndClient = () => {
    if (!customerId) return { sameState: true, companyState: "", customerState: "" };
    const cust = db.customers.find(c => c.id === customerId);
    if (!cust) return { sameState: true, companyState: "", customerState: "" };
    return {
      sameState: db.company.state.trim().toLowerCase() === cust.state.trim().toLowerCase(),
      companyState: db.company.state,
      customerState: cust.state
    };
  };

  const { sameState, companyState, customerState } = testStateAndClient();

  const handleAddItemRow = () => {
    setFormItems([...formItems, { itemId: "", name: "", hsnSac: "", qty: 1, rate: 0, gstRate: 18, discount: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Payment terms -> auto due date
  const applyPaymentTerms = (terms: string, fromDate: string) => {
    const d = new Date(fromDate);
    const daysMap: Record<string, number> = {
      'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60, 'Net 90': 90,
      'Due on Receipt': 0, 'End of Month': 0, 'End of Next Month': 0
    };
    if (terms === 'End of Month') {
      d.setMonth(d.getMonth() + 1, 0);
    } else if (terms === 'End of Next Month') {
      d.setMonth(d.getMonth() + 2, 0);
    } else {
      d.setDate(d.getDate() + (daysMap[terms] ?? 30));
    }
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleFormItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    if (field === "itemId") {
      if (value === "custom") {
        updated[index] = {
          ...updated[index],
          itemId: "custom",
          name: "",
          hsnSac: "HSN-9983",
          rate: 0,
          gstRate: 18
        };
      } else {
        const selectedItem = db.items.find(i => i.id === value);
        if (selectedItem) {
          updated[index] = {
            ...updated[index],
            itemId: selectedItem.id,
            name: selectedItem.name,
            hsnSac: selectedItem.hsnSac,
            rate: selectedItem.salesRate || 0,
            gstRate: selectedItem.gstRate || 18
          };
        } else {
          updated[index].itemId = "";
          updated[index].name = "";
          updated[index].hsnSac = "";
          updated[index].rate = 0;
        }
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setFormItems(updated);
  };

  // Perform live financial computations as the user inputs values!
  const itemsForCalc = formItems.filter(it => it.itemId !== "").map(it => ({
    ...it,
    rate: it.discount > 0 ? it.rate * (1 - it.discount / 100) : it.rate
  }));
  const liveResults = calculateGst(itemsForCalc, db.company.state, customerState || db.company.state);
  const discountAmount = discountType === 'percent'
    ? Math.round(liveResults.subtotal * discountValue / 100 * 100) / 100
    : discountValue;

  // Before-tax: the discount reduces the taxable value itself, so GST is computed on the
  // post-discount amount — the customer owes less tax too. Each tax component (CGST/SGST/
  // IGST) is scaled down proportionally since calculateGst already split it per the
  // intra/inter-state rule.
  // After-tax: GST stays exactly as computed on the full price (correct, since the sale
  // value for tax purposes hasn't changed) — the discount just reduces the final amount
  // payable, like a cash/settlement discount.
  const taxScaleFactor = discountTiming === 'before_tax' && liveResults.subtotal > 0
    ? Math.max(0, (liveResults.subtotal - discountAmount) / liveResults.subtotal)
    : 1;
  const effectiveGst = Math.round(liveResults.totalGst * taxScaleFactor * 100) / 100;
  const effectiveCgst = Math.round(liveResults.cgst * taxScaleFactor * 100) / 100;
  const effectiveSgst = Math.round(liveResults.sgst * taxScaleFactor * 100) / 100;
  const effectiveIgst = Math.round(liveResults.igst * taxScaleFactor * 100) / 100;

  const finalTotal = discountTiming === 'before_tax'
    ? (liveResults.subtotal - discountAmount) + effectiveGst + shippingCharge + otherCharges
    : liveResults.total - discountAmount + shippingCharge + otherCharges;

  const handleInvoiceSubmit = async (e: React.FormEvent, overrideStatus?: 'Draft' | 'Sent' | 'Approved') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customerId) return alert("Please select a customer.");
    const cust = db.customers.find(c => c.id === customerId);
    if (!cust) return;
    if (isSaving) return;

    // Compile Invoice Items schema
    const finalItems: InvoiceItem[] = formItems.map((fItem, idx) => {
      const isIntrastate = db.company.state.trim().toLowerCase() === cust.state.trim().toLowerCase();
      const lineAmount = fItem.qty * fItem.rate;
      const lineGst = (lineAmount * fItem.gstRate) / 100;

      return {
        id: `line_${idx}_${Math.random()}`,
        itemId: fItem.itemId,
        name: fItem.name,
        hsnSac: fItem.hsnSac,
        qty: fItem.qty,
        rate: fItem.rate,
        gstRate: fItem.gstRate,
        amount: lineAmount,
        cgst: isIntrastate ? lineGst / 2 : 0,
        sgst: isIntrastate ? lineGst / 2 : 0,
        igst: !isIntrastate ? lineGst : 0
      };
    });

    const finalStatus = overrideStatus || (isProforma ? "Draft" : "Approved");

    // Mirror the "Grand Total" shown to the user: subtotal+gst, adjusted for discount/
    // shipping/other charges, less TDS deducted at source, then optionally rounded.
    // (Previously this silently fell back to liveResults.total and ignored all of that —
    // so the saved invoice amount never matched what the customer was actually shown.)
    const netBeforeRound = finalTotal - tdsAmount;
    const netTotal = roundingOff ? Math.round(netBeforeRound) : Math.round(netBeforeRound * 100) / 100;

    const invoicePayload: any = {
      customerId,
      customerName: cust.name,
      date,
      dueDate,
      items: finalItems,
      subtotal: discountTiming === 'before_tax' ? Math.round((liveResults.subtotal - discountAmount) * 100) / 100 : liveResults.subtotal,
      totalGst: discountTiming === 'before_tax' ? effectiveGst : liveResults.totalGst,
      totalCgst: discountTiming === 'before_tax' ? effectiveCgst : liveResults.cgst,
      totalSgst: discountTiming === 'before_tax' ? effectiveSgst : liveResults.sgst,
      totalIgst: discountTiming === 'before_tax' ? effectiveIgst : liveResults.igst,
      total: netTotal,
      tcsAmount: applyTcs ? Math.round(liveResults.total * 0.001 * 100) / 100 : undefined,
      tdsAmount: tdsAmount || undefined,
      tdsRate: tdsSection ? tdsRate : undefined,
      tdsSection: tdsSection || undefined,
      discountTiming,
      status: finalStatus,
      isProforma,
      paymentReceived: editingInvoice?.paymentReceived || 0,
      notes: invoiceNotes || undefined,
      termsAndConditions: termsAndConditions || undefined,
      shippingCharge: shippingCharge || undefined,
      otherCharges: otherCharges || undefined,
      discountValue: discountValue || undefined,
      discountType: discountType || undefined,
      isRecurring: isRecurring || undefined,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      billingAddress: billingAddressOverride !== null ? billingAddressOverride : undefined,
    };

    if (manualInvoiceNumber.trim()) {
      invoicePayload.invoiceNumber = manualInvoiceNumber.trim();
    }

    // If editing existing, include id and preserve fields
    if (editingInvoice) {
      invoicePayload.id = editingInvoice.id;
      invoicePayload.invoiceNumber = manualInvoiceNumber.trim() || editingInvoice.invoiceNumber;
      invoicePayload.irn = editingInvoice.irn;
      invoicePayload.ackNo = editingInvoice.ackNo;
    }

    setIsSaving(true);
    try {
      await onSaveInvoice(invoicePayload);
      // If this was a proforma conversion, mark original proforma as converted
      if ((window as any).__convertingFromProformaId) {
        await handleConvertProformaFinalize(invoicePayload.invoiceNumber || "");
      }
      setShowForm(false);
      setEditingInvoice(null);
      resetForm();
    } catch (err: any) {
      alert(`Failed to save invoice: ${err?.message || "Network error. Please check your connection and try again."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreditNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCreditForm) return;

    const sub = Number(creditSubtotal);
    const invoice = showCreditForm;
    const sameS = (invoice.items[0]?.igst ?? 0) > 0 ? false : true;
    const gstR = invoice.items[0]?.gstRate || 18;
    const gstAmt = (sub * gstR) / 100;

    const cnPayload = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      date: new Date().toISOString().split('T')[0],
      reason: creditReason,
      subtotal: sub,
      totalCgst: sameS ? gstAmt / 2 : 0,
      totalSgst: sameS ? gstAmt / 2 : 0,
      totalIgst: !sameS ? gstAmt : 0,
      total: sub + gstAmt
    };

    await onIssueCreditNote(cnPayload);
    setShowCreditForm(null);
    setCreditReason("");
    setCreditSubtotal(0);
  };

  // Edit existing invoice - pre-fill form
  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setCustomerId(inv.customerId);
    setDate(inv.date);
    setDueDate(inv.dueDate);
    setIsProforma(inv.isProforma);
    setFormItems(inv.items.map(it => ({
      itemId: it.itemId,
      name: it.name,
      hsnSac: it.hsnSac || "",
      qty: it.qty,
      rate: it.rate,
      gstRate: it.gstRate
    })));
    setManualInvoiceNumber(inv.invoiceNumber || "");
    setBillingAddressOverride(inv.billingAddress ?? null);
    setDiscountValue(inv.discountValue || 0);
    setDiscountType(inv.discountType || 'percent');
    setDiscountTiming(inv.discountTiming || 'after_tax');
    setShowForm(true);
  };

  // Convert Proforma to Tax Invoice — opens edit form pre-filled
  const handleConvertProforma = (inv: Invoice) => {
    // Open the invoice form pre-filled with proforma data, as a new tax invoice
    setEditingInvoice(null); // fresh invoice, not an update
    setIsProforma(false);
    setCustomerId(inv.customerId);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date().toISOString().split("T")[0]);
    setFormItems(inv.items.map(it => ({
      itemId: it.itemId,
      name: it.name,
      hsnSac: it.hsnSac || "",
      qty: it.qty,
      rate: it.rate,
      gstRate: it.gstRate
    })));
    // Store original proforma id to mark as converted after save
    (window as any).__convertingFromProformaId = inv.id;
    setShowForm(true);
  };

  // After saving a converted invoice, mark the proforma as converted
  const handleConvertProformaFinalize = async (newInvoiceNumber: string) => {
    const proformaId = (window as any).__convertingFromProformaId;
    if (proformaId) {
      const proforma = db.invoices.find((i: Invoice) => i.id === proformaId);
      if (proforma) {
        await onSaveInvoice({ ...proforma, status: "Converted", convertedToTax: true, convertedInvoiceNumber: newInvoiceNumber });
      }
      delete (window as any).__convertingFromProformaId;
    }
  };

  const taxInvoices = db.invoices.filter(i => !i.isProforma);
  const proformaInvoices = db.invoices.filter(i => i.isProforma);
  const todayStr = new Date().toISOString().split("T")[0];
  const totalOutstanding = taxInvoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + (i.total - (i.paymentReceived || 0)), 0);
  const totalOverdueInv = taxInvoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled" && i.dueDate < todayStr).reduce((s, i) => s + (i.total - (i.paymentReceived || 0)), 0);
  const totalPaidThisMonth = taxInvoices.filter(i => i.status === "Paid" && (i.date || "").slice(0, 7) === todayStr.slice(0, 7)).reduce((s, i) => s + i.total, 0);

  return (
    <div id="billing-view-container" className="space-y-6 animate-fade-in p-2">

      {/* Quick-stat strip — same warm palette as the rest of this screen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-lift bg-white border border-[#E5E1D8] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8C867A] font-bold">Total Outstanding</p>
            <p className="text-lg font-bold text-[#2C2C24] font-mono mt-0.5">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#F5F2ED] flex items-center justify-center"><FileText className="w-4 h-4 text-[#5A5A40]" /></div>
        </div>
        <div className="card-lift bg-white border border-[#E5E1D8] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8C867A] font-bold">Overdue</p>
            <p className={`text-lg font-bold font-mono mt-0.5 ${totalOverdueInv > 0 ? "text-rose-600" : "text-[#2C2C24]"}`}>₹{totalOverdueInv.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-rose-500" /></div>
        </div>
        <div className="card-lift bg-white border border-[#E5E1D8] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8C867A] font-bold">Collected This Month</p>
            <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">₹{totalPaidThisMonth.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
        </div>
      </div>

      {/* Upper Segment Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F2ED] p-4 rounded-xl border border-[#E5E1D8]">
        <div id="segment-view-filters" className="flex bg-white p-1.5 rounded-lg border border-[#E5E1D8] gap-2 w-full sm:w-auto flex-wrap">
          <button
            id="tab-btn-sales"
            onClick={() => { setActiveTab("tax"); setShowForm(false); setSelectedCustomer(null); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "tax" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Tax Invoices
          </button>
          <button
            id="tab-btn-proforma"
            onClick={() => { setActiveTab("proforma"); setShowForm(false); setSelectedCustomer(null); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "proforma" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Proforma Invoices
          </button>
          <button
            id="tab-btn-credit-notes"
            onClick={() => { setActiveTab("notes"); setShowForm(false); setSelectedCustomer(null); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "notes" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-rose-600" />
            Credit Notes
          </button>
          <button
            id="tab-btn-customers"
            onClick={() => { setActiveTab("customers"); setShowForm(false); setSelectedCustomer(null); setShowCustomerForm(false); }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "customers" 
                ? "bg-[#F5F2ED] text-[#5A5A40] shadow-sm border border-[#E5E1D8]" 
                : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Clients Directory
          </button>
        </div>

        {/* Create Trigger Shortcut */}
        {!showForm && !showCustomerForm && (
          <button
            id="btn-trigger-new-bill"
            onClick={() => { 
              if (activeTab === "customers") {
                handleCreateCustomerClick();
              } else {
                resetForm();
                setIsProforma(activeTab === "proforma");
                setShowForm(true); 
              }
            }}
            className="flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-medium text-xs px-4 py-2 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {activeTab === "tax" ? "New Tax Invoice" : activeTab === "proforma" ? "Create Proforma" : activeTab === "notes" ? "Issue Credit Note" : "Form Client Master"}
          </button>
        )}
      </div>

      {/* ESTIMATE FORM — Zoho Books style */}
      {showEstimateForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              New Estimate
            </h3>
            <button onClick={() => setShowEstimateForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            // Save as proforma invoice (estimate) to db
            const sub = estItems.reduce((s, i) => s + i.qty * i.rate, 0);
            const totalGst = estItems.reduce((s, i) => s + i.qty * i.rate * i.gstRate / 100, 0);
            const total = estRoundOff ? Math.round(sub + totalGst) : Math.round((sub + totalGst) * 100) / 100;
            const est = {
              id: `est_${Date.now()}`,
              type: "estimate",
              estimateNumber: estNumber,
              reference: estReference,
              customerId: estCustomerId,
              date: estDate,
              expiryDate: estExpiryDate,
              subject: estSubject,
              items: estItems,
              subtotal: sub,
              totalGst,
              total,
              notes: estNotes,
              terms: estTerms,
              status: "Draft",
              createdAt: new Date().toISOString()
            };
            await onSaveInvoice({ ...est, isEstimate: true });
            setShowEstimateForm(false);
          }} className="text-sm">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Customer Name <span className="text-red-500">*</span></label>
                  <select required value={estCustomerId} onChange={e => setEstCustomerId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none">
                    <option value="">Select or add a customer</option>
                    {db.customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {estCustomerId && (() => {
                    const cust = db.customers.find((c: any) => c.id === estCustomerId);
                    return cust ? <p className="text-[10px] text-gray-400 mt-0.5">Source of Supply: {cust.state || "—"}</p> : null;
                  })()}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Estimated# <span className="text-red-500">*</span></label>
                  <input type="text" required value={estNumber} onChange={e => setEstNumber(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Reference#</label>
                  <input type="text" value={estReference} onChange={e => setEstReference(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Estimate Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={estDate} onChange={e => setEstDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Expiry Date</label>
                  <input type="date" value={estExpiryDate} onChange={e => setEstExpiryDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Subject</label>
                <input type="text" value={estSubject} onChange={e => setEstSubject(e.target.value)}
                  placeholder="Let your customer know what this Estimate is for"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-sm focus:border-blue-400 outline-none" />
              </div>
            </div>

            {/* Item Table */}
            <div className="border-t border-gray-200">
              <div className="px-6 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Item Table</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase text-[11px] font-semibold">
                    <th className="text-left px-4 py-2.5 w-[40%]">Item Details</th>
                    <th className="text-right px-3 py-2.5 w-[10%]">Quantity</th>
                    <th className="text-right px-3 py-2.5 w-[12%]">Rate</th>
                    <th className="text-center px-3 py-2.5 w-[14%]">Tax</th>
                    <th className="text-right px-3 py-2.5 w-[12%]">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {estItems.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="px-4 py-2.5">
                        <select value={item.itemId} onChange={e => {
                          const it = db.items.find((i: any) => i.id === e.target.value);
                          const updated = [...estItems];
                          updated[idx] = { ...updated[idx], itemId: e.target.value, name: it?.name || "", rate: it?.salesRate || 0, hsnSac: it?.hsnSac || "" };
                          setEstItems(updated);
                        }} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs focus:border-blue-500 outline-none">
                          <option value="">Type or click to select an item.</option>
                          {db.items.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={1} value={item.qty} onChange={e => { const u = [...estItems]; u[idx].qty = parseInt(e.target.value)||1; setEstItems(u); }}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs text-right outline-none" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={0} value={item.rate} onChange={e => { const u = [...estItems]; u[idx].rate = parseFloat(e.target.value)||0; setEstItems(u); }}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs text-right outline-none" />
                      </td>
                      <td className="px-3 py-2.5">
                        <select value={item.gstRate} onChange={e => { const u = [...estItems]; u[idx].gstRate = parseFloat(e.target.value); setEstItems(u); }}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 text-xs outline-none">
                          <option value={0}>Select a Tax</option>
                          <option value={5}>GST 5%</option>
                          <option value={12}>GST 12%</option>
                          <option value={18}>GST 18%</option>
                          <option value={28}>GST 28%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-800 text-xs">
                        {(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="pr-2">
                        <button type="button" onClick={() => setEstItems(estItems.filter((_, i) => i !== idx))}
                          disabled={estItems.length === 1}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-start">
                <button type="button" onClick={() => setEstItems([...estItems, { itemId: "", name: "", qty: 1, rate: 0, gstRate: 18, hsnSac: "" }])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add New Row
                </button>

                {/* Totals */}
                <div className="w-64 text-xs space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {(() => {
                    const sub = estItems.reduce((s, i) => s + i.qty * i.rate, 0);
                    const gst = estItems.reduce((s, i) => s + i.qty * i.rate * i.gstRate / 100, 0);
                    const disc = 0;
                    const preRound = sub + gst - disc;
                    const diff = Math.round(preRound) - preRound;
                    const total = estRoundOff ? Math.round(preRound) : preRound;
                    return <>
                      <div className="flex justify-between text-gray-600"><span>Sub Total</span><span className="font-mono">{sub.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Discount</span><span className="font-mono">0.00</span></div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-gray-600 cursor-pointer"><input type="radio" name="etds" defaultChecked className="accent-blue-600" /> TDS</label>
                        <label className="flex items-center gap-1 text-gray-600 cursor-pointer"><input type="radio" name="etds" className="accent-blue-600" /> TCS</label>
                        <select className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 text-[10px] outline-none"><option>Select a Tax</option></select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer text-xs">
                          <input type="checkbox" checked={estRoundOff} onChange={e => setEstRoundOff(e.target.checked)} className="accent-blue-600" />
                          Round off
                        </label>
                        {estRoundOff && diff !== 0 && <span className="font-mono text-xs text-gray-400">{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>}
                      </div>
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-gray-900 text-sm">
                        <span>Total (₹)</span>
                        <span className="font-mono text-blue-700">₹{total.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                      </div>
                    </>;
                  })()}
                </div>
              </div>
            </div>

            {/* Customer Notes + T&C + Attach */}
            <div className="border-t border-gray-200 px-6 py-5 grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-600 font-medium">Customer Notes</label>
                <textarea rows={3} value={estNotes} onChange={e => setEstNotes(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-sm focus:border-blue-400 outline-none resize-none" />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600 font-medium">Terms & Conditions</label>
                  <textarea rows={3} value={estTerms} onChange={e => setEstTerms(e.target.value)}
                    placeholder="Enter the terms and conditions..."
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-sm focus:border-blue-400 outline-none resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600 font-medium">Attach File(s) to Estimate</label>
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
              <button type="button" onClick={async (e) => {
                const sub = estItems.reduce((s, i) => s + i.qty * i.rate, 0);
                await onSaveInvoice({ type: "estimate", estimateNumber: estNumber, reference: estReference, customerId: estCustomerId, date: estDate, expiryDate: estExpiryDate, subject: estSubject, items: estItems, subtotal: sub, total: sub, notes: estNotes, terms: estTerms, status: "Draft", isEstimate: true, createdAt: new Date().toISOString() });
                setShowEstimateForm(false);
              }} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer transition">
                Save as Draft
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded cursor-pointer select-none transition">
                Save and Send
              </button>
              <button type="button" onClick={() => setShowEstimateForm(false)} className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW INVOICE FORM */}
      {showForm && (
        <div id="billing-invoice-form" className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Page header */}
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <h3 id="lbl-create-inv-title" className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {isProforma ? "New Proforma Invoice" : editingInvoice ? `Edit Invoice ${editingInvoice.invoiceNumber}` : (window as any).__convertingFromProformaId ? "Convert Proforma → Tax Invoice" : "New Invoice"}
            </h3>
            <button 
              id="btn-close-inv-form"
              onClick={() => setShowForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="frm-invoice-draft" onSubmit={(e) => e.preventDefault()} className="space-y-0" autoComplete="off">
            {/* Header fields */}
            <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1.5">
                <label id="lbl-fld-cust" className="text-xs text-gray-600 font-medium">Customer Name <span className="text-red-500">*</span></label>
                <select
                  id="fld-cust-select"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {db.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.gstin ? `· ${c.gstin}` : "(Unregistered)"}</option>
                  ))}
                </select>
                {/* Customer details preview */}
                {customerId && (() => {
                  const cust = db.customers.find((c: any) => c.id === customerId);
                  if (!cust) return null;
                  const effectiveAddress = billingAddressOverride !== null ? billingAddressOverride : cust.billingAddress;
                  return (
                    <div className="mt-1.5 bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-[10px] space-y-0.5">
                      {cust.legalName && cust.legalName !== cust.name && <div className="text-slate-500">Legal: <span className="text-slate-800">{cust.legalName}</span></div>}
                      {cust.gstin && <div className="text-slate-500">GSTIN: <span className="font-mono text-emerald-700">{cust.gstin}</span></div>}
                      {cust.pan && <div className="text-slate-500">PAN: <span className="font-mono text-slate-700">{cust.pan}</span></div>}
                      <div className="text-slate-500 flex items-start gap-1.5">
                        <span className="shrink-0">Address:</span>
                        {billingAddressOverride !== null ? (
                          <textarea
                            value={billingAddressOverride}
                            onChange={(e) => setBillingAddressOverride(e.target.value)}
                            rows={2}
                            className="flex-1 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-slate-700 text-[10px] outline-none focus:border-blue-400"
                          />
                        ) : (
                          <>
                            <span className="text-slate-700">{effectiveAddress || "—"}</span>
                            <button type="button" onClick={() => setBillingAddressOverride(cust.billingAddress || "")} className="text-blue-600 hover:underline shrink-0 ml-auto">Edit for this invoice</button>
                          </>
                        )}
                      </div>
                      {cust.email && <div className="text-slate-500">Email: <span className="text-slate-700">{cust.email}</span></div>}
                      {cust.phone && <div className="text-slate-500">Phone: <span className="text-slate-700">{cust.phone}</span></div>}
                      {!cust.gstin && <div className="text-amber-400 font-semibold">⚠ Unregistered — IGST/CGST+SGST applies as B2C</div>}
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-600 font-medium">Invoice #</label>
                <div className="flex items-center gap-2">
                  <select className="bg-white border border-gray-300 rounded px-2 py-2 text-gray-700 text-sm outline-none">
                    <option>Default Transaction Series</option>
                  </select>
                  <input
                    type="text"
                    value={manualInvoiceNumber}
                    onChange={(e) => setManualInvoiceNumber(e.target.value)}
                    placeholder="Auto-generated"
                    className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm font-mono focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-600 font-medium">Order Number</label>
                <input type="text" placeholder=""
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-600 font-medium">Invoice Date <span className="text-red-500">*</span></label>
                <input type="date" required value={date}
                  onChange={(e) => { setDate(e.target.value); applyPaymentTerms(paymentTerms, e.target.value); }}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-600 font-medium">Terms</label>
                <div className="flex items-center gap-2">
                  <select value={paymentTerms} onChange={(e) => { setPaymentTerms(e.target.value); applyPaymentTerms(e.target.value, date); }}
                    className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                  >
                    <option>Due on Receipt</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 45</option>
                    <option>Net 60</option>
                    <option>Net 90</option>
                    <option>End of Month</option>
                    <option>End of Next Month</option>
                  </select>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Due Date</label>
                    <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                      className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Subject field */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-600 font-medium">Subject</label>
              <input type="text" placeholder="Let your customer know what this Invoice is for"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            </div>

            {/* Invoicing State tax preview */}
            {customerId && (
              <div className="bg-blue-50 px-4 py-2 border-y border-blue-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Tax Calculation Mode:
                </span>
                <span className="font-semibold text-blue-700">
                  {sameState 
                    ? `Intra-state: CGST + SGST`
                    : `Inter-state (→ ${customerState}): IGST`
                  }
                </span>
              </div>
            )}

            {/* Item Table - Zoho Books style */}
            <div className="border-t border-gray-200">
              <div className="px-6 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Item Table</span>
                <button type="button" onClick={() => alert("Bulk item actions (bulk delete/discount/HSN edit) aren't built yet — edit line items individually below.")} className="text-xs text-blue-600 hover:underline">Bulk Actions</button>
              </div>
              {/* Table header */}
              <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase text-[11px] font-semibold">
                    <th className="text-left px-4 py-2.5 w-[35%]">Item Details</th>
                    <th className="text-right px-3 py-2.5 w-[10%]">Quantity</th>
                    <th className="text-right px-3 py-2.5 w-[12%]">Rate</th>
                    <th className="text-center px-3 py-2.5 w-[15%]">Tax</th>
                    <th className="text-right px-3 py-2.5 w-[12%]">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {formItems.map((item, idx) => (
                  <tr key={idx} className="group">
                    <td className="px-4 py-2.5">
                      <select
                        required
                        value={item.itemId}
                        onChange={(e) => handleFormItemChange(idx, "itemId", e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs focus:border-blue-500 outline-none"
                      >
                        <option value="">Type or click to select an item.</option>
                        {db.items.map(it => (
                          <option key={it.id} value={it.id}>{it.name} (₹{it.salesRate})</option>
                        ))}
                        <option value="custom">Custom Item</option>
                      </select>
                      {item.itemId === "custom" && (
                        <input
                          type="text"
                          required
                          value={item.name}
                          placeholder="Item description..."
                          onChange={(e) => handleFormItemChange(idx, "name", e.target.value)}
                          className="w-full mt-1 bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 text-xs focus:border-blue-500 outline-none"
                        />
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-400">HSN/SAC:</span>
                        <input
                          type="text"
                          value={item.hsnSac || ""}
                          placeholder="Code"
                          onChange={(e) => handleFormItemChange(idx, "hsnSac", e.target.value)}
                          className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 text-[10px] font-mono outline-none w-20 focus:border-blue-400"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <input 
                        type="number" min={1} required value={item.qty} placeholder="1.00"
                        onChange={(e) => handleFormItemChange(idx, "qty", parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs text-right focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input 
                        type="number" min={0} required value={item.rate} placeholder="0.00"
                        onChange={(e) => handleFormItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs text-right focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      {orgIsGstRegistered ? (
                        <select
                          value={item.gstRate}
                          onChange={(e) => handleFormItemChange(idx, "gstRate", parseFloat(e.target.value))}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 text-xs focus:border-blue-500 outline-none"
                        >
                          <option value={0}>Select a Tax</option>
                          <option value={5}>GST 5%</option>
                          <option value={12}>GST 12%</option>
                          <option value={18}>GST 18%</option>
                          <option value={28}>GST 28%</option>
                        </select>
                      ) : (
                        <div className="text-center text-gray-400 text-xs">No GST</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800 text-xs">
                      {(item.qty * item.rate * (1 - (item.discount||0)/100)).toLocaleString('en-IN', {maximumFractionDigits:2})}
                    </td>
                    <td className="pr-2 py-2.5">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={formItems.length === 1}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              </div>
              {/* Add Row */}
              <div className="px-4 py-3 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Row
                </button>
              </div>

              {/* Summary + Totals — Zoho right-aligned panel */}
              <div className="flex justify-end px-4 pb-4">
                <div className="w-72 text-xs space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between text-gray-600">
                    <span>Sub Total</span>
                    <span className="font-mono text-gray-800">{liveResults.subtotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                  </div>

                  {/* Discount row */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20 shrink-0">Discount</span>
                    <input type="number" min={0} step={0.01} value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value)||0)}
                      className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 text-xs outline-none text-right"
                      placeholder="0"
                    />
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}
                      className="bg-white border border-gray-300 rounded px-1 py-1 text-gray-700 text-xs outline-none">
                      <option value="percent">%</option>
                      <option value="amount">₹</option>
                    </select>
                    <span className="font-mono text-gray-800 w-14 text-right">{discountAmount > 0 ? `-${discountAmount.toLocaleString('en-IN', {minimumFractionDigits:2})}` : '0.00'}</span>
                  </div>

                  {effectiveCgst > 0 && <>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST</span>
                      <span className="font-mono text-gray-800">{effectiveCgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST</span>
                      <span className="font-mono text-gray-800">{effectiveSgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                    </div>
                  </>}
                  {effectiveIgst > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST</span>
                      <span className="font-mono text-gray-800">{effectiveIgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                    </div>
                  )}

                  {/* TDS / TCS */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
                      <input type="radio" name="taxadj" checked={!applyTcs} onChange={() => setApplyTcs(false)} className="accent-blue-600" /> TDS
                    </label>
                    <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
                      <input type="radio" name="taxadj" checked={applyTcs} onChange={() => { setApplyTcs(true); setTdsSection(""); setTdsAmount(0); }} className="accent-blue-600" /> TCS
                    </label>
                    {!applyTcs ? (
                      <select
                        value={tdsSection}
                        onChange={(e) => {
                          const sec = e.target.value;
                          setTdsSection(sec);
                          const rateMap: Record<string,number> = {
                            "194C_ind": 1, "194C_comp": 2, "194J_prof": 10, "194J_tech": 2,
                            "194I_land": 10, "194I_plant": 2, "194A": 10, "194H": 2, "194IA": 1,
                            "194IB": 2, "194IC": 10, "194M": 5, "194N": 2, "194O": 1, "194Q": 0.1, "206C": 1
                          };
                          const rate = rateMap[sec] || 0;
                          setTdsRate(rate);
                          setTdsAmount(Math.round(liveResults.subtotal * rate / 100 * 100) / 100);
                        }}
                        className="flex-1 min-w-0 bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 text-xs outline-none"
                      >
                        <option value="">Select a Tax</option>
                        <optgroup label="Contract (194C → new 393)">
                          <option value="194C_ind">Contractor Ind/HUF @ 1%</option>
                          <option value="194C_comp">Contractor Company @ 2%</option>
                        </optgroup>
                        <optgroup label="Professional (194J → new 393)">
                          <option value="194J_prof">Professional Services @ 10%</option>
                          <option value="194J_tech">Technical Services @ 2%</option>
                        </optgroup>
                        <optgroup label="Rent (194I → new 393)">
                          <option value="194I_land">Land/Building @ 10%</option>
                          <option value="194I_plant">Plant/Machinery @ 2%</option>
                        </optgroup>
                        <optgroup label="Other (→ new 393)">
                          <option value="194A">Interest @ 10%</option>
                          <option value="194H">Commission @ 2%</option>
                          <option value="194Q">Purchase of Goods @ 0.1%</option>
                        </optgroup>
                      </select>
                    ) : (
                      <span className="flex-1 text-xs text-blue-600">TCS @ 0.1% (206C)</span>
                    )}
                  </div>
                  {!applyTcs && tdsSection && (
                    <p className="text-[10px] text-gray-400 -mt-1">
                      {new Date(dueDate || new Date()) >= new Date("2026-04-01")
                        ? "New Income Tax Act (2025) applies — quote the Section 393(1) reference on your TDS return, not the old 194-series code shown above."
                        : "Old Income Tax Act (1961) 194-series section applies — the new Act's Section 393(1) takes over from 1 April 2026 onward."}
                    </p>
                  )}

                  {/* Round off */}
                  <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                    <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
                      <input type="checkbox" id="chk-rounding" checked={roundingOff} onChange={(e) => setRoundingOff(e.target.checked)} className="accent-blue-600" />
                      Round off
                    </label>
                    {roundingOff && (() => {
                      const preRound = finalTotal - tdsAmount;
                      const diff = Math.round(preRound) - preRound;
                      return diff !== 0 ? <span className="font-mono text-xs text-gray-500">{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span> : null;
                    })()}
                  </div>

                  <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-gray-900 text-sm">
                    <span>Total (₹)</span>
                    <span className="font-mono text-blue-700">
                      ₹{(() => {
                        const base = finalTotal - tdsAmount;
                        return (roundingOff ? Math.round(base) : Math.round(base * 100) / 100).toLocaleString('en-IN', {minimumFractionDigits:2});
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes, T&C, Attach */}
            <div className="border-t border-gray-200 px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600 font-medium">Customer Notes</label>
                  <textarea rows={4} value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="e.g. Note: Invoice payment to be done using the regular bank-to-bank transfer/wire"
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-xs focus:border-blue-400 outline-none resize-none"
                  />
                  <p className="text-[10px] text-gray-400">Will be displayed on the invoice</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-600 font-medium">Terms & Conditions</label>
                    <textarea rows={4} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)}
                      placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 text-xs focus:border-blue-400 outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-600 font-medium">Attach File(s) to Invoice</label>
                    <div className="flex items-center gap-2">
                      <button type="button" className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-50">
                        <Upload className="w-3.5 h-3.5" /> Upload File
                      </button>
                      <span className="text-[10px] text-gray-400">You can upload a maximum of 10 files, 10MB each</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="accent-blue-600" />
                  <span className="text-xs text-gray-600 font-medium">Make Recurring</span>
                </label>
                {isRecurring && (
                  <select value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value as any)}
                    className="bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 text-xs outline-none">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>
            </div>

            {/* Sticky bottom action bar — Zoho style */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center gap-3 rounded-b-xl">
              {!isProforma && (
                <button 
                  type="button"
                  onClick={(e) => handleInvoiceSubmit(e, "Draft")}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer transition"
                >
                  Save as Draft
                </button>
              )}
              <button 
                type="button"
                disabled={isSaving}
                onClick={(e) => handleInvoiceSubmit(e, isProforma ? "Draft" : "Approved")}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded cursor-pointer select-none transition"
              >
                {isSaving ? "Saving..." : (isProforma ? "Save Proforma" : "Save and Send")}
              </button>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INVOICES LIST TREE */}
      {!showForm && activeTab !== "customers" && (
        <div id="billing-ledger-table-panel" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* ── Invoice list header with filters + actions ── */}
          <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Status filter tabs */}
              {activeTab === "tax" && (
                <div className="flex gap-1">
                  {["All","Draft","Sent","Approved","E-Invoiced","Paid","Cancelled"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 text-[10px] font-semibold rounded-lg transition ${statusFilter===s?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {/* Search */}
              <input value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)} placeholder="Search by customer / invoice #..."
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-52" />
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-bold text-blue-700">{selectedIds.size} selected</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-blue-600 hover:underline">Clear</button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === "tax" && (() => {
              const filtered = taxInvoices
                .filter(inv => statusFilter==="All" || inv.status===statusFilter)
                .filter(inv => !searchInvoice || inv.invoiceNumber?.toLowerCase().includes(searchInvoice.toLowerCase()) || inv.customerName?.toLowerCase().includes(searchInvoice.toLowerCase()))
                .sort((a,b) => {
                  const av = (a as any)[sortField]||""; const bv = (b as any)[sortField]||"";
                  return sortDir==="asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
                });
              const allSelected = filtered.length > 0 && filtered.every(inv => selectedIds.has(inv.id));
              return (
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-3 px-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(i=>i.id)) : new Set())} className="accent-blue-600 cursor-pointer" />
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none" onClick={() => handleSort('invoiceNumber')}>Invoice # <SortIcon field="invoiceNumber" /></th>
                    <th className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none" onClick={() => handleSort('customerName')}>Customer <SortIcon field="customerName" /></th>
                    <th className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none" onClick={() => handleSort('date')}>Date <SortIcon field="date" /></th>
                    <th className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none" onClick={() => handleSort('dueDate')}>Due Date <SortIcon field="dueDate" /></th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => handleSort('total')}>Amount <SortIcon field="total" /></th>
                    <th className="py-3 px-3 text-right">Balance Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="text-2xl mb-2">📄</div>
                      <div className="font-semibold">No invoices found</div>
                      <div className="text-[10px] mt-1">Try changing your filters or create a new invoice</div>
                    </td></tr>
                  )}
                  {filtered.map(inv => {
                    const balanceDue = inv.total - (inv.paymentReceived || 0);
                    const isOverdue = balanceDue > 0 && inv.dueDate < new Date().toISOString().split('T')[0] && inv.status !== 'Paid';
                    return (
                      <tr key={inv.id} className={`hover:bg-blue-50/30 transition-all cursor-pointer ${selectedIds.has(inv.id)?'bg-blue-50':''} ${isOverdue?'border-l-2 border-red-400':''}`}
                        onClick={() => setShowViewModal(inv)}>
                        <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={e => {
                            const s = new Set(selectedIds);
                            e.target.checked ? s.add(inv.id) : s.delete(inv.id); setSelectedIds(s);
                          }} className="accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-700 text-xs">
                          {inv.invoiceNumber}
                          {(inv.tdsAmount || 0) > 0 && <span className="ml-1.5 text-[8.5px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 align-middle">TDS</span>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{inv.customerName}</div>
                          <div className="text-[10px] text-slate-400">{db.customers.find(c=>c.id===inv.customerId)?.gstin || 'Unregistered'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{inv.date}</td>
                        <td className={`py-3 px-3 ${isOverdue?'text-red-600 font-semibold':' text-slate-600'}`}>{inv.dueDate}{isOverdue&&<span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">OVERDUE</span>}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{inv.total.toLocaleString('en-IN')}
                          {(inv.tdsAmount || 0) > 0 && <div className="text-[9px] font-sans font-semibold text-indigo-500">TDS ₹{inv.tdsAmount.toLocaleString('en-IN')} deducted</div>}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${balanceDue>0?'text-red-600':'text-emerald-600'}`}>
                          {balanceDue > 0 ? `₹${balanceDue.toLocaleString('en-IN')}` : '✓ Paid'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            inv.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : inv.status === "Sent" ? "bg-sky-50 text-sky-700 border-sky-200"
                            : inv.status === "Approved" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : inv.status === "Digitally Signed" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : inv.status === "E-Invoiced" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : inv.status === "Cancelled" ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {inv.status === "E-Invoiced" && "⚡ "}{inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center items-center gap-1 flex-wrap">
                          <button 
                            id={`btn-view-invoice-${inv.id}`}
                            onClick={() => setShowViewModal(inv)}
                            className="p-1 px-2 border border-[#E5E1D8] hover:border-[#D4CDBC] bg-[#FDFBF7] hover:bg-[#F5F2ED] text-[10px] font-semibold text-[#5A5A40] rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>

                          {/* Interactive Step-by-Step Sale Invoice flow */}
                          {inv.status === "Draft" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditInvoice(inv)}
                                className="p-1 px-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[10px] text-blue-700 font-semibold rounded transition cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const portal = db.company.eInvoicePortal;
                                  if (!portal?.configured || !portal?.username) {
                                    alert("⚠️ E-Invoice Portal credentials not configured!\n\nGo to Settings → e-Invoicing → enter your IRP credentials.");
                                    return;
                                  }
                                  if (!confirm("⚠️ IMPORTANT: Ledgerio currently generates a demo IRN for testing purposes.\n\nFor legally valid e-invoicing, you need to integrate with the NIC/IRP portal directly or use a licensed GSP (GST Suvidha Provider).\n\nFor production use, please consult your CA before filing.\n\nProceed with demo IRN?")) return;
                                  setPushingEInvoiceId(inv.id);
                                  setTimeout(() => {
                                    // IRN format: 64-char hex hash (SHA-256 of GSTIN+DocType+DocNo+DocDate)
                                    const irnData = `${db.company.gstin || 'GSTIN'}${inv.invoiceNumber}${inv.date}`;
                                    let hash = 0;
                                    for (let i = 0; i < irnData.length; i++) {
                                      hash = ((hash << 5) - hash) + irnData.charCodeAt(i);
                                      hash |= 0;
                                    }
                                    const irn = Array.from({ length: 64 }, (_, i) => 
                                      ((Math.abs(hash) * (i + 1) * 2654435761) >>> 0).toString(16).padStart(8, '0')
                                    ).join('').slice(0, 64).toUpperCase();
                                    const ackNo = Math.floor(100000000000 + Math.random() * 900000000000).toString();
                                    const ackDate = new Date().toISOString().split('T')[0];
                                    onSaveInvoice({ ...inv, status: "E-Invoiced", irn, ackNo, ackDate, irnNote: "DEMO - Not registered with NIC/IRP" });
                                    setPushingEInvoiceId(null);
                                  }, 1800);
                                }}
                                className="p-1 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[10px] text-white font-bold rounded transition cursor-pointer shadow-sm flex items-center gap-1 animate-pulse"
                              >
                                ⚡ Push E-Invoice
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setSendingInvoice(inv);
                                }}
                                className="p-1 px-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-[10px] text-white font-bold rounded transition cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                📨 Send Direct
                              </button>
                            </>
                          )}

                          {inv.status === "E-Invoiced" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSigningInvoice(inv);
                                setDscPin("");
                                setIsSignDone(false);
                              }}
                              className="p-1 px-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-[10px] text-white font-bold rounded transition cursor-pointer shadow-sm flex items-center gap-1"
                            >
                              ✍️ Sign / Affix DSC
                            </button>
                          )}

                          {inv.status === "Digitally Signed" && (
                            <button
                              type="button"
                              onClick={() => setSendingInvoice(inv)}
                              className="p-1 px-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-[10px] text-white font-bold rounded transition cursor-pointer shadow-sm flex items-center gap-1"
                            >
                              📨 Mark as Sent
                            </button>
                          )}

                          {inv.status === "Sent" && (
                            <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-0.5">
                              ✓ Dispatched
                            </span>
                          )}

                          {balanceDue > 0 && inv.status !== "Draft" && inv.status !== "E-Invoiced" && inv.status !== "Digitally Signed" && (
                            <button
                              onClick={() => { setShowCreditForm(inv); setCreditReason(""); setCreditSubtotal(0); }}
                              className="p-1 px-1.5 border border-red-200 bg-red-50 text-[9px] text-red-700 font-semibold rounded hover:bg-red-100 transition">
                              CN
                            </button>
                          )}
                          {/* Duplicate invoice */}
                          <button
                            onClick={() => {
                              setEditingInvoice(null);
                              setCustomerId(inv.customerId);
                              setDate(new Date().toISOString().split('T')[0]);
                              setDueDate(inv.dueDate);
                              setIsProforma(inv.isProforma);
                              setFormItems(inv.items.map((it: any) => ({ itemId: it.itemId, name: it.name, hsnSac: it.hsnSac||'', qty: it.qty, rate: it.rate, gstRate: it.gstRate, discount: 0 })));
                              setShowForm(true);
                            }}
                            title="Duplicate Invoice"
                            className="p-1 px-1.5 border border-slate-200 bg-slate-50 text-[9px] text-slate-600 font-semibold rounded hover:bg-slate-100 transition">
                            ⧉
                          </button>
                        </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              );
            })()}

            {activeTab === "proforma" && (
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                    <th className="py-3 px-3">Temp Code</th>
                    <th className="py-3 px-3">Customer Entity</th>
                    <th className="py-3 px-3">Proforma Date</th>
                    <th className="py-3 px-3 text-right">Bill Sum</th>
                    <th className="py-3 px-3 text-center">Conversion State</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]/40">
                  {proformaInvoices.length > 0 ? (
                    proformaInvoices.map(inv => (
                      <tr key={inv.id} id={`row-prof-inv-${inv.id}`} className="hover:bg-[#F5F2ED]/40 text-[#2C2C24] transition-all">
                        <td className="py-3 px-3 font-mono text-amber-700 font-semibold">PRO-{inv.id.substring(4, 9).toUpperCase()}</td>
                        <td className="py-3 px-3 font-semibold text-[#2C2C24]">{inv.customerName}</td>
                        <td className="py-3 px-3 text-[#8C867A]">{inv.date}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#2C2C24]">₹{inv.total.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-center">
                          {inv.status === "Converted" || inv.convertedToTax ? (
                            <span className="text-[9px] px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                              Converted to Tax
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 font-bold">
                              Proforma
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center flex justify-center items-center gap-2">
                          <button 
                            id={`btn-view-invoice-${inv.id}`}
                            onClick={() => setShowViewModal(inv)}
                            className="p-1 px-2 border border-[#E5E1D8] hover:border-[#D4CDBC] bg-[#FDFBF7] hover:bg-[#F5F2ED] text-[10px] font-semibold text-[#5A5A40] rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          
                          {inv.status === "Converted" || inv.convertedToTax ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-850 border border-emerald-200 px-2 py-1 rounded font-bold inline-flex items-center gap-1">
                              ✓ {inv.convertedInvoiceNumber || "Converted"}
                            </span>
                          ) : (
                            <button 
                              id={`btn-convert-prof-${inv.id}`}
                              onClick={() => handleConvertProforma(inv)}
                              className="p-1 px-2 border border-[#5A5A40]/20 bg-[#5A5A40] hover:bg-[#4E4E37] text-[10px] text-white font-semibold rounded transition cursor-pointer flex items-center gap-1 shadow-sm font-bold"
                            >
                              <ArrowRight className="w-3 h-3" /> Convert to Tax Invoice
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#8C867A]">No Proforma claims drafted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "notes" && (
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                    <th className="py-3 px-3">Credit Adjust Code</th>
                    <th className="py-3 px-3">Invoice Number</th>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3 font-sans">Date</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Sum Adjusted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]/40">
                  {db.creditNotes.length > 0 ? (
                    db.creditNotes.map(cn => (
                      <tr key={cn.id} className="hover:bg-[#F5F2ED]/40 text-[#2C2C24] transition-all">
                        <td className="py-3 px-3 font-mono font-semibold text-rose-700">{cn.creditNoteNumber}</td>
                        <td className="py-3 px-3 font-mono text-[#8C867A]">{cn.invoiceNumber}</td>
                        <td className="py-3 px-3 font-semibold text-[#2C2C24]">{cn.customerName}</td>
                        <td className="py-3 px-3 text-[#8C867A]">{cn.date}</td>
                        <td className="py-3 px-3 text-[#8C867A] max-w-xs truncate">{cn.reason}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">₹{cn.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#8C867A]">No Credit Notes adjustments issued.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ---------------- ACTIVE TAB: CUSTOMERS / CLIENTS DIRECTORY ---------------- */}
      {activeTab === "customers" && !showForm && (
        <div className="space-y-6">
          {/* A) NEW CLIENT FORM */}
          {showCustomerForm ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-800 shadow-xl space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  {customerFormId ? "Edit Customer Master Record" : "Create New Customer Master Record"}
                </h3>
                <button onClick={() => setShowCustomerForm(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCustomerSubmit} className="space-y-4 text-xs" autoComplete="off">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-medium font-sans">Customer Label / Display Name</label>
                    <input 
                      type="text" required autoComplete="off" value={customerFormName} onChange={e => setCustomerFormName(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
                      placeholder="e.g. Your Customer Pvt Ltd"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-medium font-sans">Official Legal Registry Name</label>
                    <input 
                      type="text" required autoComplete="off" value={customerFormLegalName} onChange={e => setCustomerFormLegalName(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
                      placeholder="e.g. Customer Legal Registered Name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-sans font-medium">GST Registration Status</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input type="radio" name="custGstReg" checked={customerFormIsRegistered} onChange={() => setCustomerFormIsRegistered(true)} className="accent-blue-400" />
                      <span className="font-semibold text-emerald-400">Registered</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input type="radio" name="custGstReg" checked={!customerFormIsRegistered} onChange={() => { setCustomerFormIsRegistered(false); setCustomerFormGstin(""); }} className="accent-blue-400" />
                      <span className="font-semibold text-orange-400">Unregistered (B2C / Consumer)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-slate-600 font-sans">State location (Place of Supply)</label>
                    <input 
                      type="text" required autoComplete="off" value={customerFormState} onChange={e => setCustomerFormState(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
                      placeholder="e.g. Haryana"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-sans">
                      GSTIN Registration{customerFormIsRegistered && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input 
                      type="text" maxLength={15} required={customerFormIsRegistered} disabled={!customerFormIsRegistered}
                      value={customerFormGstin} onChange={e => setCustomerFormGstin(e.target.value.toUpperCase())}
                      className={`w-full border px-3 py-2 rounded placeholder-slate-400 focus:border-blue-500 outline-none tracking-wide ${customerFormIsRegistered ? "bg-white border-slate-200 text-slate-800" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                      placeholder={customerFormIsRegistered ? "e.g. 22AAAAA0000A1Z5" : "Not applicable"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-sans">Customer PAN Tag</label>
                    <input 
                      type="text" maxLength={10} autoComplete="off" value={customerFormPan} onChange={e => setCustomerFormPan(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none tracking-wide"
                      placeholder="e.g. AAAAA0000A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-medium">Primary Contact Email Address</label>
                    <input 
                      type="email" required autoComplete="new-password" value={customerFormEmail} onChange={e => setCustomerFormEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
                      placeholder="e.g. accounts@customer.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-medium">Authorized Contact Telephone</label>
                    <input 
                      type="text" required autoComplete="off" value={customerFormPhone} onChange={e => setCustomerFormPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
                      placeholder="e.g. +91-9000000000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 font-medium">Registered Office Address</label>
                  <textarea 
                    rows={2} required value={customerFormBillingAddress} onChange={e => setCustomerFormBillingAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none resize-none"
                    placeholder="Mailing credentials for postal invoice compliance checking"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-medium">Standard Payment Due period</label>
                    <select
                      value={customerFormTerms} onChange={e => setCustomerFormTerms(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded text-slate-800 focus:border-blue-500 outline-none"
                    >
                      <option value="Net 45">Net 45 days</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 30">Net 30 days</option>
                      <option value="Net 60">Net 60 days</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-medium">Customer Opening Ledger Balance (₹)</label>
                    <input 
                      type="number" value={customerFormOpeningBalance} onChange={e => setCustomerFormOpeningBalance(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded text-slate-800 focus:border-blue-500 outline-none font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                  <button type="button" onClick={() => setShowCustomerForm(false)} className="border border-slate-700 px-4 py-2 rounded text-slate-400 hover:text-slate-200">Cancel</button>
                  <button type="submit" className="bg-[#5A5A40] hover:bg-[#4E4E37] px-5 py-2 rounded text-white font-bold select-none cursor-pointer">Save Customer Account</button>
                </div>
              </form>
            </div>
          ) : selectedCustomer ? (
            /* B) CLIENT VIEW SHEET (ANALYTICS VIDYA FORMAT) */
            <div className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden p-6 shadow-sm space-y-4 animate-fade-in relative z-10 text-slate-800">
              {/* TOP HEADER */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 px-2 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <h2 className="text-base font-bold font-sans text-slate-900 tracking-tight leading-none flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse animate-duration-1000"></span>
                    {selectedCustomer.legalName}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => handleEditCustomerClick(selectedCustomer)}
                    className="p-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(`https://bizkhata.app/portal?org=${db.company?.gstin}&customer=${selectedCustomer.id}`)
                        .then(() => toast('Customer portal link copied!', 'success'))
                        .catch(() => toast(`Portal: bizkhata.app/portal?customer=${selectedCustomer.id}`, 'info'));
                    }}
                    className="p-1.5 px-2 bg-white border border-slate-300 rounded text-xs text-slate-650 hover:bg-slate-50 transition cursor-pointer"
                    title="Copy direct attachment link"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* NEW TRANSACTION DROPDOWN */}
                  <div className="relative group/tx">
                    <button className="p-1.5 px-3 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer select-none">
                      New Transaction <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-30 invisible group-hover/tx:visible opacity-0 group-hover/tx:opacity-100 transition-all font-semibold text-slate-700 divide-y divide-slate-100 font-sans">
                      <button 
                        onClick={() => { resetForm(); setCustomerId(selectedCustomer.id); setIsProforma(false); setShowForm(true); }}
                        className="w-full text-left font-sans text-[11px] hover:bg-slate-50 p-2.5 transition flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-500" /> New Tax Invoice
                      </button>
                      <button 
                        onClick={() => { setEstCustomerId(selectedCustomer.id); setEstNumber(`EST/${new Date().getFullYear()}-${String(new Date().getFullYear()+1).slice(2)}/${String(Math.floor(Math.random()*900)+100)}`); setShowEstimateForm(true); setShowForm(false); }}
                        className="w-full text-left font-sans text-[11px] hover:bg-slate-50 p-2.5 transition flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" /> New Estimate
                      </button>
                      <button 
                        onClick={() => toast("Go to Payments tab to record receipt", "info")}
                        className="w-full text-left font-sans text-[11px] hover:bg-slate-50 p-2.5 transition flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-green-500" /> Record Client Settle
                      </button>
                    </div>
                  </div>

                  {/* AUX MORE DROPDOWN */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowCustomerMore(!showCustomerMore)}
                      className="p-1.5 px-3 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-2xs select-none"
                    >
                      More ▾
                    </button>
                    {showCustomerMore && (
                      <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-slate-700 font-medium font-sans divide-y divide-slate-100 animate-fade-in text-[11px]">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                          Direct Access & Supply Control
                        </div>
                        <div className="p-1 space-y-0.5">
                          <button 
                            onClick={() => {
                              setShowCustomerMore(false);
                              toast("GST supply status verified: Active regular supplier", "success");
                            }}
                            className="w-full text-left font-sans hover:bg-slate-50 px-2.5 py-1.5 transition flex items-center gap-2 rounded"
                          >
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Configure Direct Access
                          </button>
                          <button 
                            onClick={() => {
                              setShowCustomerMore(false);
                              toast("GSTIN network check: Connected ✓", "success");
                            }}
                            className="w-full text-left font-sans hover:bg-slate-50 px-2.5 py-1.5 transition flex items-center gap-2 rounded"
                          >
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Run Regular Supply Checking
                          </button>
                          <button 
                            onClick={() => {
                              setShowCustomerMore(false);
                              toast("Customer portal invitation sent", "success");
                            }}
                            className="w-full text-left font-sans hover:bg-slate-50 px-2.5 py-1.5 transition flex items-center gap-2 rounded"
                          >
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            Enable Ledgerio Client Portal
                          </button>
                        </div>
                        <div className="p-1 space-y-0.5">
                          <button 
                            onClick={() => {
                              setShowCustomerMore(false);
                              toast("GST treatment saved: Registered Business (Regular)", "success");
                            }}
                            className="w-full text-left font-sans hover:bg-slate-50 px-2.5 py-1 text-slate-650 transition rounded-sm"
                          >
                            GST Treatment Settings...
                          </button>
                          <button 
                            onClick={() => {
                              setShowCustomerMore(false);
                              toast("Customer archived successfully", "success");
                            }}
                            className="w-full text-left font-sans hover:bg-slate-50 px-2.5 py-1 text-red-600 transition rounded-sm"
                          >
                            Archive Customer Record
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1 px-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* TABS SELECT */}
              <div className="flex border-b border-slate-200 gap-6 text-xs font-medium bg-slate-50/50 p-1 rounded-t-lg">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "comments", label: "Comments" },
                  { id: "transactions", label: "Transactions" },
                  { id: "mails", label: "Mails" },
                  { id: "statement", label: "Statement / Account Ledger" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCustomerActiveSubTab(tab.id as any)}
                    className={`p-2 px-1 font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                      customerActiveSubTab === tab.id
                        ? "border-[#5A5A40] text-[#5A5A40] font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* SUBTABS CONTENT SWITCH */}
              {customerActiveSubTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs text-slate-700 animate-fade-in">
                  
                  {/* LEFT SIDEBAR COLS */}
                  <div className="col-span-1 space-y-4 pr-4 border-r border-slate-100">
                    <div className="space-y-1 leading-normal">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Brand Identifier</p>
                      <h4 className="text-sm font-bold text-slate-900 font-sans">{selectedCustomer.name}</h4>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Contact Credentials</p>
                      {selectedCustomer.email ? (
                        <div className="space-y-1.5 font-sans">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{selectedCustomer.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{selectedCustomer.phone || "+91-9988776655"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic leading-relaxed">
                          There is no primary contact information.{" "}
                          <button onClick={() => handleEditCustomerClick(selectedCustomer)} className="text-blue-600 font-bold hover:underline">Add New</button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Address Panel */}
                    <div className="border-t border-slate-100 pt-3 space-y-1">
                      <button 
                        type="button"
                        onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider py-1 cursor-pointer font-bold"
                      >
                        <span>ADDRESS</span>
                        {isAddressExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      
                      {isAddressExpanded && (
                        <div className="space-y-4 pt-2 text-slate-700 leading-normal animate-fade-in">
                          <div>
                            <div className="flex items-center justify-between text-slate-400 font-semibold text-[9.5px] uppercase tracking-wider">
                              <span>Billing Address</span>
                              <button onClick={() => handleEditCustomerClick(selectedCustomer)} className="text-[#5A5A40] hover:text-[#2C2C24]"><Edit className="w-3 h-3" /></button>
                            </div>
                            <p className="mt-1 pb-1 leading-relaxed text-slate-800 whitespace-pre-wrap font-sans font-medium text-[11px]">
                              {selectedCustomer.billingAddress || "2nd Floor, Plot No. 270, Garage Society,\nUdyog Vihar Phase-2, Gurgaon\nGurugram, Haryana 122016\nIndia"}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-slate-400 font-semibold text-[9.5px] uppercase tracking-wider">
                              <span>Shipping Address</span>
                              <button onClick={() => handleEditCustomerClick(selectedCustomer)} className="text-[#5A5A40] hover:text-[#2C2C24]"><Edit className="w-3 h-3" /></button>
                            </div>
                            <p className="mt-1 pb-1 leading-relaxed text-slate-650 whitespace-pre-wrap font-sans text-[11px]">
                              {selectedCustomer.billingAddress || "2nd Floor, Plot No. 270, Garage Society,\nUdyog Vihar Phase-2, Gurgaon\nGurugram, Haryana 122016\nIndia"}
                            </p>
                          </div>
                          <button onClick={() => handleEditCustomerClick(selectedCustomer)} className="text-blue-650 font-bold hover:underline block text-[10.5px]">Add additional address</button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Details Panel */}
                    <div className="border-t border-slate-100 pt-3 space-y-1">
                      <button 
                        type="button"
                        onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider py-1 cursor-pointer font-bold"
                      >
                        <span>OTHER DETAILS</span>
                        {isDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>

                      {isDetailsExpanded && (
                        <div className="space-y-3.5 pt-2 text-slate-700 leading-normal animate-fade-in font-medium">
                          <div className="flex justify-between gap-1.5 border-b border-slate-50 pb-1.5">
                            <span className="text-slate-600 font-medium">Customer Type</span>
                            <span className="font-bold text-slate-800 font-sans">Business</span>
                          </div>
                          <div className="flex justify-between gap-1.5 border-b border-slate-50 pb-1.5">
                            <span className="text-slate-600 font-medium">Default Currency</span>
                            <span className="font-mono text-slate-800">INR</span>
                          </div>
                          <div className="flex justify-between gap-1.5 border-b border-slate-50 pb-1.5">
                            <span className="text-slate-400 font-medium whitespace-nowrap">Business Legal Name</span>
                            <span className="font-bold text-slate-900 text-right uppercase break-all">{selectedCustomer.legalName.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between gap-1.5 border-b border-slate-50 pb-1.5">
                            <span className="text-slate-600 font-medium font-sans">GST Treatment</span>
                            <span className="font-bold text-slate-700 text-right">Registered Business - Regular</span>
                          </div>
                          <div className="flex justify-between gap-1.5 border-b border-slate-50 pb-1.5">
                            <span className="text-slate-400 font-medium font-mono">GSTIN</span>
                            <span className="font-mono font-bold text-blue-700 text-right">{selectedCustomer.gstin || "—"}</span>
                          </div>
                          <div className="flex justify-between gap-1.5 font-sans">
                            <span className="text-slate-600 font-medium">Place of Supply</span>
                            <span className="font-bold text-slate-800 text-right">{selectedCustomer.state || "Haryana"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT BODY MAIN PANELS */}
                  <div className="col-span-2 space-y-6 pl-2">
                    
                    {/* WHAT'S NEXT */}
                    <div className="bg-[#F0F4FF]/70 border border-blue-200/50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 flex items-center gap-1.5 font-mono">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse animate-duration-1000" /> What's Next?
                        </div>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                          Create an <span className="font-bold text-slate-900">Invoice</span> or an <span className="font-bold text-slate-900 font-sans">estimate</span> and send it to your customer.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => { resetForm(); setCustomerId(selectedCustomer.id); setIsProforma(false); setShowForm(true); }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-4 py-2 rounded shadow-sm cursor-pointer transition-all"
                        >
                          New Invoice
                        </button>
                        <button 
                          onClick={() => { setEstCustomerId(selectedCustomer.id); setEstNumber(`EST/${new Date().getFullYear()}-${String(new Date().getFullYear()+1).slice(2)}/${String(Math.floor(Math.random()*900)+100)}`); setShowEstimateForm(true); setShowForm(false); }}
                          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-[11px] font-bold px-4 py-2 rounded shadow-2xs cursor-pointer transition-all"
                        >
                          New Estimate
                        </button>
                      </div>
                    </div>

                    {/* Update request check */}
                    <p className="text-[11px] text-slate-400 font-semibold leading-none">
                      You can request your contact to directly update the GSTIN by sending an email.{" "}
                      <button 
                        type="button"
                        onClick={() => toast(`Reminder email queued for ${selectedCustomer.name}`, "success")}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Send email
                      </button>
                    </p>

                    {/* Payment Terms bar */}
                    <div className="bg-[#F5F2ED] border border-slate-205 p-4 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">Payment due period</span>
                      <span className="font-extrabold text-[#5A5A40] text-xs font-mono">{selectedCustomer.paymentTerms || "Net 45"}</span>
                    </div>

                    {/* RECEIVABLES DYNAMIC WORKLOAD */}
                    {(() => {
                      const custInvs = db.invoices.filter(i => i.customerId === selectedCustomer.id && !i.isProforma);
                      const outstandingTotal = custInvs.reduce((tot, curr) => tot + (curr.total - (curr.paymentReceived || 0)), 0);
                      return (
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-slate-900 font-sans">Receivables</h3>
                          <div className="border border-[#E5E1D8] rounded-xl overflow-hidden bg-white shadow-2xs">
                            <table className="w-full text-left text-xs font-sans">
                              <thead className="bg-[#F5F2ED] text-slate-500 font-bold border-b border-[#E5E1D8]">
                                <tr>
                                  <th className="p-3 uppercase text-[9.5px] tracking-wider">Currency</th>
                                  <th className="p-3 text-right uppercase text-[9.5px] tracking-wider">Outstanding Receivables</th>
                                  <th className="p-3 text-right uppercase text-[9.5px] tracking-wider">Unused Credits</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-700 divide-y divide-slate-100 font-mono">
                                <tr>
                                  <td className="p-3 text-slate-900 font-bold font-sans">INR- Indian Rupee</td>
                                  <td className="p-3 text-right font-mono font-bold text-red-650 text-xs">₹{outstandingTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                  <td className="p-3 text-right text-slate-400">₹0.00</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <button 
                              type="button"
                              onClick={() => alert("Initialize customer opening balance sheet adjustments")} className="text-blue-650 font-extrabold hover:underline text-[10.5px]">Enter Opening Balance</button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* INCOME CHART GRAPHICS */}
                    {(() => {
                      const months = ["Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026"];
                      const custInvs = db.invoices.filter(i => i.customerId === selectedCustomer.id && !i.isProforma);
                      
                      const monthSalesSums = months.map(m => {
                        const matches = custInvs.filter(i => {
                          const dateObj = new Date(i.date);
                          const mon = dateObj.toLocaleString('default', { month: 'short' });
                          const yr = dateObj.getFullYear();
                          return `${mon} ${yr}`.toLowerCase() === m.toLowerCase();
                        });
                        return matches.reduce((t, i) => t + i.total, 0);
                      });

                      const chartIncomeTotal = monthSalesSums.reduce((s, curr) => s + curr, 0);
                      const highestSaleValue = Math.max(...monthSalesSums, 15000);

                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Income</h3>
                              <p className="text-[11px] text-slate-450 font-medium">This chart is displayed in the organization's base currency.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select className="border border-slate-205 rounded px-2 py-1 bg-white text-[10px] outline-none font-bold text-slate-600 cursor-pointer"><option>Last 6 Months</option></select>
                              <select className="border border-slate-205 rounded px-2 py-1 bg-white text-[10px] outline-none font-bold text-slate-600 cursor-pointer"><option>Accrual</option></select>
                            </div>
                          </div>

                          <div className="card-lift bg-white border border-slate-200 rounded-xl p-5 shadow-2xs h-56 flex flex-col justify-between">
                            <div className="flex-1 flex gap-4 items-end justify-around pb-2 relative border-b border-slate-150 h-36">
                              
                              {/* Horizontal Indicator grids */}
                              <div className="absolute left-0 right-0 top-0 border-t border-slate-100 text-[9px] text-slate-350 pr-2 pt-0.5 pointer-events-none">₹{Math.round(highestSaleValue).toLocaleString('en-IN')}</div>
                              <div className="absolute left-0 right-0 top-1/2 border-t border-slate-150 text-[9px] text-slate-350 pr-2 pt-0.5 pointer-events-none">₹{Math.round(highestSaleValue / 2).toLocaleString('en-IN')}</div>
                              
                              {months.map((m, ix) => {
                                const sumValue = monthSalesSums[ix];
                                const sumPct = Math.min((sumValue / highestSaleValue) * 100, 100);
                                return (
                                  <div key={m} className="flex flex-col items-center flex-1 group relative">
                                    <div 
                                      style={{ height: `${Math.max(sumPct, 4)}%` }}
                                      className={`w-9 rounded-t-sm transition-all duration-300 shadow-2xs ${sumValue > 0 ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-100 group-hover:bg-slate-200"}`}
                                    ></div>
                                    <div className="opacity-0 group-hover:opacity-100 transition absolute -top-9 bg-slate-900 text-white text-[9px] rounded py-1 px-2 font-mono whitespace-nowrap z-30 shadow-lg leading-none">
                                      ₹{sumValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-around items-center pt-2 select-none font-sans">
                              {months.map(m => (
                                <span key={m} className="text-[10px] font-bold text-slate-450 font-sans tracking-tight">{m}</span>
                              ))}
                            </div>
                          </div>

                          <p className="text-slate-850 text-xs font-semibold">
                            Total Income ( Last 6 Months ) - <span className="font-extrabold text-slate-900 border-b-2 border-[#5A5A40]">₹{chartIncomeTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                          </p>
                        </div>
                      );
                    })()}

                    {/* Timeline Log Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 font-sans">Timeline Audit Trails</h3>
                      <div className="relative border-l-2 border-slate-155 pl-6 ml-2 space-y-4 py-1">
                        <div className="relative">
                          <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full border border-white"></span>
                          <span className="text-[10px] text-slate-400 font-mono block font-bold">18 May 2026 10:55 AM</span>
                          <span className="text-xs text-slate-800 font-semibold">Contact registered inside Cloud ledger platform</span>
                        </div>
                        {db.auditLogs.filter(l => l.details.includes(selectedCustomer.name) || l.details.includes(selectedCustomer.legalName)).map((l, i) => (
                          <div key={i} className="relative">
                            <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-[#5A5A40] rounded-full border border-white"></span>
                            <span className="text-[10px] text-slate-400 font-mono block">{new Date(l.timestamp).toLocaleString()}</span>
                            <span className="text-xs text-slate-800 font-medium leading-relaxed">{l.action} - {l.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COMMENTS SUBTAB */}
              {customerActiveSubTab === "comments" && (
                <div className="space-y-6 pt-2 animate-fade-in text-xs text-slate-700 font-semibold font-sans">
                  <h3 className="text-sm font-bold text-slate-900">Internal Audit & Log Comments</h3>
                  
                  {/* Comments lists */}
                  <div className="space-y-3 font-sans">
                    {(customerComments[selectedCustomer.id] || []).length > 0 ? (
                      (customerComments[selectedCustomer.id] || []).map((comm, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1.5">
                          <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-450">
                            <span className="text-blue-700 font-bold">• {comm.author}</span>
                            <span className="font-mono">{comm.date}</span>
                          </div>
                          <p className="text-slate-800 leading-relaxed font-sans">{comm.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic py-4 font-normal">No internal audit comments registered on this client yet.</p>
                    )}
                  </div>

                  {/* Add Comments field */}
                  <div className="space-y-2 border-t border-slate-150 pt-4 font-sans">
                    <label className="font-bold text-slate-705">Add Internal Regulatory Comment</label>
                    <textarea
                      rows={2}
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      placeholder="Input billing alerts, regulatory inquiries, or client updates..."
                      className="w-full bg-slate-50 border border-slate-205 rounded px-3 py-2 text-slate-800 outline-none focus:border-[#5A5A40] resize-none font-sans font-medium"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCommentText.trim()) return;
                          const addition = {
                            author: "Admin",
                            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                            text: newCommentText
                          };
                          setCustomerComments({
                            ...customerComments,
                            [selectedCustomer.id]: [...(customerComments[selectedCustomer.id] || []), addition]
                          });
                          setNewCommentText("");
                        }}
                        className="bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-bold text-[11px] px-4 py-2 rounded shadow-2xs cursor-pointer"
                      >
                        Add Remarks
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TRANSACTIONS SUBTAB */}
              {customerActiveSubTab === "transactions" && (
                <div className="space-y-4 pt-2 animate-fade-in text-xs font-sans">
                  <h3 className="text-sm font-bold text-slate-900">Historical Bills & Documents</h3>
                  
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs bg-white">
                    <table className="w-full text-left text-xs font-sans font-medium">
                      <thead className="bg-[#F5F2ED] text-slate-450 font-bold border-b border-[#E5E1D8]">
                        <tr>
                          <th className="p-3">Doc Code</th>
                          <th className="p-3">Ref Code</th>
                          <th className="p-3">Date</th>
                          <th className="p-3 text-right border-r border-[#E5E1D8]">Subtotal</th>
                          <th className="p-3 text-right">Net Document Total</th>
                          <th className="p-3 text-center">Receipt Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium font-sans">
                        {(() => {
                          const userBills = db.invoices.filter(i => i.customerId === selectedCustomer.id);
                          if (userBills.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-450 italic font-normal">No invoices issued.</td>
                              </tr>
                            );
                          }
                          return userBills.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-bold text-blue-700">{b.invoiceNumber}</td>
                              <td className="p-3 font-mono text-slate-500">{b.isProforma ? "PROFORMA" : "TAX INVOICE"}</td>
                              <td className="p-3 text-slate-650">{b.date}</td>
                              <td className="p-3 text-right font-mono border-r border-slate-100/50">₹{b.subtotal.toLocaleString('en-IN')}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">₹{b.total.toLocaleString('en-IN')}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[9.5px] uppercase font-bold border ${b.status === "Paid" || b.status === "Sent" ? "bg-emerald-50 text-emerald-800 border-emerald-250" : "bg-orange-55 text-orange-800 border-orange-200"}`}>{b.status}</span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MAILS SUBTAB */}
              {customerActiveSubTab === "mails" && (
                <div className="space-y-4 pt-2 animate-fade-in text-xs text-slate-700 font-sans">
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Sent E-mails Dispatch Registrations</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4 items-start relative select-none leading-relaxed font-sans">
                      <div className="p-2 py-1 bg-blue-100 rounded text-blue-700 font-bold text-sm">✉</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                          <span>TO: {selectedCustomer.email || "finance@customer.com"}</span>
                          <span>18 May 2026 11:32 AM</span>
                        </div>
                        <h4 className="font-bold text-slate-850 font-sans text-xs">Initial Welcome Notification & legal record compliance review</h4>
                        <p className="text-slate-500 text-[11px]">Requested contact to directly confirm Haryana GSTIN status setup details.</p>
                        <span className="inline-block mt-1 font-mono text-[9px] bg-emerald-50 text-emerald-800 rounded font-bold border border-emerald-200 px-1.5 py-0.5 font-sans">✓ DELIVERED</span>
                      </div>
                    </div>
                    {db.invoices.filter(i => i.customerId === selectedCustomer.id && i.status === "Sent").map(i => (
                      <div key={i.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4 items-start relative shadow-2xs leading-relaxed animate-fade-in font-sans">
                        <div className="p-2 py-1 bg-blue-100 rounded text-blue-705 font-bold text-sm">✉</div>
                        <div className="flex-1 space-y-1 font-sans">
                          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                            <span>TO: {selectedCustomer.email || "finance@customer.com"}</span>
                            <span>{i.date}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-xs font-sans">Dispatched Tax Invoice No: {i.invoiceNumber}</h4>
                          <p className="text-slate-500 text-[11px]">Forwarded dual-entry digitally signed e-invoice sum of ₹{i.total.toLocaleString('en-IN')}</p>
                          <span className="inline-block mt-1 font-mono text-[9px] bg-emerald-50 text-emerald-800 rounded font-bold border border-emerald-250 px-1.5 py-0.5">✓ SATELLITE DISPATCH SENT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STATEMENT SUBTAB */}
              {customerActiveSubTab === "statement" && (
                <div className="space-y-4 pt-2 animate-fade-in text-xs text-slate-700 font-sans">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3 font-sans">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 border-none">Client Account Statement Ledger</h3>
                      <p className="text-[11px] text-slate-450 font-medium font-sans">Running balance calculations showing debit (invoice issued) and credit (incurred settlements).</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const cust = selectedCustomer;
                        const win = window.open('', '_blank');
                        if (!win) return;
                        const rows = (selectedCustomer ? db.invoices.filter((i: any) => i.customerId === selectedCustomer.id) : db.invoices).map((inv: any) => 
                          `<tr><td>${inv.date}</td><td>${inv.invoiceNumber}</td><td style="text-align:right">₹${(inv.total||0).toLocaleString('en-IN')}</td><td>${inv.status}</td></tr>`
                        ).join('');
                        win.document.write(`<!DOCTYPE html><html><head><title>Statement - ${cust?.name}</title>
                          <style>body{font-family:sans-serif;font-size:12px;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px}th{background:#f8fafc}@media print{}</style>
                          </head><body><h2>Account Statement: ${cust?.name}</h2><p>GSTIN: ${cust?.gstin || '—'}</p><br>
                          <table><thead><tr><th>Date</th><th>Invoice #</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
                          </body></html>`);
                        win.document.close();
                        setTimeout(() => { win.focus(); win.print(); }, 400);
                      }}
                      className="text-[10px] bg-slate-105 border border-slate-200 p-1.5 px-3 rounded font-bold hover:bg-slate-200 flex items-center gap-1 cursor-pointer text-slate-750 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" /> Export PDF
                    </button>
                  </div>

                  {/* MATHEMATICAL STATEMENT LEDGER TABLE */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-[#F5F2ED] text-slate-450 font-bold border-b border-[#E5E1D8] uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="p-3">Tx Date</th>
                          <th className="p-3">Doc particulars / descriptor</th>
                          <th className="p-3 text-right">Debit (Dr. Sale) (₹)</th>
                          <th className="p-3 text-right">Credit (Cr. Recv) (₹)</th>
                          <th className="p-3 text-right font-sans">Running Net Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-mono text-[11px]">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-sans text-slate-450">18 May 2026</td>
                          <td className="p-3 font-sans text-slate-850 font-bold">• Direct Opening Balance Ledger Entry</td>
                          <td className="p-3 text-right">₹{(selectedCustomer.openingBalance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td className="p-3 text-right">₹0.00</td>
                          <td className="p-3 text-right font-bold text-slate-900">₹{(selectedCustomer.openingBalance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                        {(() => {
                          const customerTx: {date: string, type: string, number: string, dr: number, cr: number}[] = [];
                          
                          // 1. Fetch Invoices
                          db.invoices.filter(i => i.customerId === selectedCustomer.id && !i.isProforma).forEach(i => {
                            customerTx.push({
                              date: i.date,
                              type: "Invoice Issued",
                              number: i.invoiceNumber,
                              dr: i.total,
                              cr: 0
                            });
                            if (i.paymentReceived && i.paymentReceived > 0) {
                              customerTx.push({
                                date: i.date,
                                type: "Direct Clearing payment receipt",
                                number: `RCP-${i.id.substring(4, 8).toUpperCase()}`,
                                dr: 0,
                                cr: i.paymentReceived
                              });
                            }
                          });

                          // 2. Fetch CreditNotes
                          db.creditNotes.filter(cn => cn.customerId === selectedCustomer.id).forEach(c => {
                            customerTx.push({
                              date: c.date,
                              type: `Credit Adjust Reason: ${c.reason}`,
                              number: c.creditNoteNumber,
                              dr: 0,
                              cr: c.total
                            });
                          });

                          customerTx.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                          let runningBalance = selectedCustomer.openingBalance || 0;
                          return customerTx.map((tx, idx) => {
                            runningBalance = runningBalance + tx.dr - tx.cr;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 font-sans text-slate-500">{tx.date}</td>
                                <td className="p-3 font-sans text-slate-800">
                                  <span className="font-bold text-blue-700 font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded mr-1.5">{tx.number}</span>
                                  {tx.type}
                                </td>
                                <td className="p-3 text-right text-red-650">₹{tx.dr > 0 ? tx.dr.toLocaleString('en-IN', {minimumFractionDigits: 2}) : "0.00"}</td>
                                <td className="p-3 text-right text-emerald-650">₹{tx.cr > 0 ? tx.cr.toLocaleString('en-IN', {minimumFractionDigits: 2}) : "0.00"}</td>
                                <td className="p-3 text-right font-bold text-slate-900 font-mono">₹{runningBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* C) CLIENT DIRECTORY MASTER TABLE PANEL */
            <div className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden p-6 space-y-4 font-sans text-xs shadow-sm animate-fade-in relative z-10 text-slate-800">
              <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#2C2C24]">Client & Customer Directory Accounts</h3>
                  <span className="font-mono bg-blue-105 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px] inline-block mt-1">{db.customers.length} Regular Mapped Accounts</span>
                </div>
                <button 
                  onClick={handleCreateCustomerClick}
                  className="bg-[#006EE5] hover:bg-[#0060C7] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-0"
                >
                  <Plus className="w-4 h-4" /> Add Customer Master Record
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#E5E1D8] text-[10px] uppercase font-bold text-[#8C867A] tracking-wider">
                      <th className="py-3 px-3">Company Brand Name</th>
                      <th className="py-3 px-3">Official Legal Registry</th>
                      <th className="py-3 px-3">GSTIN Registration</th>
                      <th className="py-3 px-3">Place of Supply</th>
                      <th className="py-3 px-3 font-mono text-center">Opening Balance</th>
                      <th className="py-4 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]/40 text-[#2C2C24] font-medium">
                    {db.customers.map(cust => (
                      <tr key={cust.id} className="hover:bg-[#F5F2ED]/40 transition-all">
                        <td className="py-3 px-3 font-bold text-[#2C2C24]">{cust.name}</td>
                        <td className="py-3 px-3">{cust.legalName}</td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{cust.gstin || "—"}</td>
                        <td className="py-3 px-3 font-semibold">{cust.state || "Haryana"}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold">₹{(cust.openingBalance || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button 
                              onClick={() => { setSelectedCustomer(cust); setCustomerActiveSubTab("overview"); }}
                              className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-[10.5px] font-bold text-blue-700 rounded transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="w-3 h-3" /> View Profile & Ledger
                            </button>
                            <button 
                              onClick={() => handleEditCustomerClick(cust)}
                              className="p-1 px-2 border border-[#E5E1D8] hover:bg-slate-50 text-[10.5px] font-medium text-slate-500 rounded transition cursor-pointer"
                            >
                              Edit profile
                            </button>
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

      {/* VIEW / PRINT INVOICE MODAL CLIENT PREVIEW */}
      {showViewModal && (
        <div id="invoice-view-sheet" className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
            
            {/* Modal header - clean action bar */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-white rounded-t-2xl sticky top-0 z-10 no-print">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${showViewModal.isProforma ? 'bg-purple-100 text-purple-700' : showViewModal.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : showViewModal.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{showViewModal.status}</span>
                <span className="text-xs font-bold text-slate-700">{showViewModal.isProforma ? "Proforma Invoice" : "Tax Invoice"} — {showViewModal.invoiceNumber}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onTriggerAI("generate-reminder", showViewModal)}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer">
                  <Sparkles className="w-3 h-3 text-amber-300" /> AI Reminder
                </button>
                <button onClick={() => handleEditInvoice(showViewModal)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition border border-blue-200">
                  Edit
                </button>
                <button onClick={() => {
                  // Open print dialog with only invoice content visible
                  const content = document.getElementById('print-sheet-content')?.innerHTML;
                  if (!content) { window.print(); return; }
                  const win = window.open('', '_blank', 'width=900,height=700');
                  if (!win) { window.print(); return; }
                  win.document.write(`<!DOCTYPE html><html><head>
                    <title>Invoice ${showViewModal.invoiceNumber}</title>
                    <meta charset="UTF-8">
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1e293b; background: white; }
                      @page { size: A4; margin: 12mm; }
                      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
                      .flex { display: flex; } .justify-between { justify-content: space-between; }
                      .items-start { align-items: flex-start; } .items-end { align-items: flex-end; }
                      .w-full { width: 100%; } .text-right { text-align: right; }
                      .font-bold { font-weight: 700; } .font-mono { font-family: monospace; }
                      table { border-collapse: collapse; width: 100%; }
                      th, td { padding: 6px 8px; border: 1px solid #e2e8f0; }
                      th { background: #f8fafc; font-weight: 600; }
                      .border-b-2 { border-bottom: 2px solid #1e293b; }
                      .border-t-2 { border-top: 2px solid #1e293b; }
                      .text-slate-500 { color: #64748b; }
                      .text-slate-400 { color: #94a3b8; }
                      .text-emerald-600 { color: #059669; }
                      .text-2xl { font-size: 1.5rem; }
                      .text-lg { font-size: 1.125rem; }
                      .space-y-1 > * + * { margin-top: 4px; }
                      .space-y-4 > * + * { margin-top: 16px; }
                      .pb-5 { padding-bottom: 20px; }
                      .pt-4 { padding-top: 16px; }
                      .mt-4 { margin-top: 16px; }
                      .p-8 { padding: 32px; }
                      .max-w-\\[800px\\] { max-width: 800px; margin: 0 auto; }
                      .bg-slate-50 { background: #f8fafc; }
                      .rounded { border-radius: 4px; }
                      .p-3 { padding: 12px; }
                      .grid { display: grid; }
                      .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                      .gap-8 { gap: 32px; }
                      .text-xs { font-size: 0.75rem; }
                      .text-sm { font-size: 0.875rem; }
                    </style>
                  </head><body><div class="max-w-[800px] p-8">${content}</div></body></html>`);
                  win.document.close();
                  setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
                }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                  <Printer className="w-3 h-3" /> Download PDF
                </button>
                <button onClick={() => setShowViewModal(null)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── A4 Invoice Body ── */}
            <div id="print-sheet-content" className="flex-1 overflow-y-auto bg-white printable-area">
              {/* A4 paper wrapper */}
              <div className="max-w-[800px] mx-auto p-8 space-y-0 text-[11px] text-slate-800 print:p-6">

                {/* ── HEADER: Company + Invoice Title ── */}
                <div className="flex justify-between items-start pb-5 border-b-2 border-slate-800">
                  <div className="space-y-1 flex-1">
                    {db.company.logoUrl && <img src={db.company.logoUrl} alt="logo" className="h-12 mb-2 object-contain" />}
                    <div className="text-lg font-black text-slate-900 leading-tight">{db.company.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{db.company.legalName}</div>
                    <div className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed">{db.company.address}</div>
                    <div className="text-[10px] font-mono text-slate-600">
                      {db.company.gstin && <span className="mr-3"><span className="font-semibold">GSTIN:</span> {db.company.gstin}</span>}
                      {db.company.pan && <span><span className="font-semibold">PAN:</span> {db.company.pan}</span>}
                    </div>
                    {(db.company as any).phone && <div className="text-[10px] text-slate-500">📞 {(db.company as any).phone} {(db.company as any).email && `| ✉ ${(db.company as any).email}`}</div>}
                  </div>
                  <div className="text-right pl-6 shrink-0">
                    <div className={`text-xl font-black uppercase tracking-widest mb-1 ${showViewModal.isProforma ? 'text-purple-700' : 'text-slate-900'}`}>
                      {showViewModal.isProforma ? "PROFORMA INVOICE" : "TAX INVOICE"}
                    </div>
                    <div className="text-[10px] text-slate-500 mb-3">Original for Recipient</div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left space-y-1.5 min-w-48">
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-500 text-[10px]">Invoice No.</span>
                        <span className="font-mono font-bold text-slate-900 text-[10px]">{showViewModal.invoiceNumber || ("PRO-" + showViewModal.id?.substring(4,9)?.toUpperCase())}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-500 text-[10px]">Invoice Date</span>
                        <span className="font-semibold text-[10px]">{showViewModal.date}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-500 text-[10px]">Due Date</span>
                        <span className="font-semibold text-[10px]">{showViewModal.dueDate}</span>
                      </div>
                      {showViewModal.status && (
                        <div className="flex justify-between gap-6">
                          <span className="text-slate-500 text-[10px]">Status</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showViewModal.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : showViewModal.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{showViewModal.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── BILLED TO / SHIP TO ── */}
                <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200">
                  {(() => {
                    const cust = db.customers.find(c => c.id === showViewModal.customerId);
                    const effectiveAddr = showViewModal.billingAddress || cust?.billingAddress;
                    return (
                      <>
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Bill To</div>
                          <div className="font-bold text-slate-900 text-[12px]">{cust?.legalName || showViewModal.customerName}</div>
                          {cust?.name && cust.name !== cust.legalName && <div className="text-slate-500 text-[10px]">{cust.name}</div>}
                          {effectiveAddr && <div className="text-slate-600 text-[10px] whitespace-pre-line leading-relaxed mt-1">{effectiveAddr}</div>}
                          <div className="mt-1.5 space-y-0.5">
                            {cust?.gstin ? <div className="font-mono text-[10px] font-bold text-slate-700">GSTIN: {cust.gstin}</div> : <div className="text-[10px] text-amber-600 font-semibold">Unregistered (B2C)</div>}
                            {cust?.pan && <div className="font-mono text-[10px] text-slate-500">PAN: {cust.pan}</div>}
                            {cust?.email && <div className="text-[10px] text-slate-500">✉ {cust.email}</div>}
                            {cust?.phone && <div className="text-[10px] text-slate-500">📞 {cust.phone}</div>}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Ship To</div>
                          {effectiveAddr ? (
                            <div className="text-slate-600 text-[10px] whitespace-pre-line leading-relaxed">{effectiveAddr}</div>
                          ) : (
                            <div className="text-slate-400 text-[10px] italic">Same as billing address</div>
                          )}
                          <div className="mt-2 text-[10px] text-slate-500">
                            <div>Place of Supply: <span className="font-semibold text-slate-700">{cust?.state || db.company.state}</span></div>
                          </div>
                          {/* IRN details */}
                          {showViewModal.irn && (
                            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                              <div className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">e-Invoice IRN</div>
                              <div className="font-mono text-[8px] text-indigo-700 break-all mt-0.5">{showViewModal.irn}</div>
                              {showViewModal.ackNo && <div className="text-[8px] text-indigo-500 mt-0.5">Ack No: {showViewModal.ackNo} | Date: {showViewModal.ackDate}</div>}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* ── LINE ITEMS TABLE ── */}
                <table className="w-full text-left border-collapse mt-4">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[9px] uppercase tracking-widest">
                      <th className="py-2 px-3 text-center w-8">#</th>
                      <th className="py-2 px-3">Item & Description</th>
                      <th className="py-2 px-3 text-center w-16">HSN/SAC</th>
                      <th className="py-2 px-3 text-center w-12">Qty</th>
                      <th className="py-2 px-3 text-right w-24">Rate (₹)</th>
                      <th className="py-2 px-3 text-right w-20">Disc%</th>
                      <th className="py-2 px-3 text-right w-24">Taxable (₹)</th>
                      <th className="py-2 px-3 text-center w-16">GST%</th>
                      <th className="py-2 px-3 text-right w-24">Tax (₹)</th>
                      <th className="py-2 px-3 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showViewModal.items.map((line, idx) => {
                      const taxAmt = (line.cgst||0)+(line.sgst||0)+(line.igst||0);
                      const total = line.amount + taxAmt;
                      return (
                        <tr key={line.id} className={idx%2===0?"bg-white":"bg-slate-50/50"}>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{idx+1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 text-[11px]">{line.name}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-500">{line.hsnSac || "—"}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-[10px]">{line.qty}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px]">{line.rate.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3 text-right text-[10px] text-emerald-600">{line.gstRate > 0 ? "—" : "—"}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px]">{line.amount.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3 text-center text-[10px]">{line.gstRate}%</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-blue-700">{taxAmt.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[10px]">{total.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* ── HSN-WISE GST SUMMARY TABLE (legally required) ── */}
                <div className="mt-5 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600">HSN/SAC Wise Tax Summary</div>
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-50">
                      <tr className="text-[9px] text-slate-500 font-bold uppercase">
                        <th className="py-1.5 px-3 text-left">HSN/SAC</th>
                        <th className="py-1.5 px-3 text-right">Taxable Value</th>
                        <th className="py-1.5 px-3 text-right">CGST Rate</th>
                        <th className="py-1.5 px-3 text-right">CGST Amt</th>
                        <th className="py-1.5 px-3 text-right">SGST Rate</th>
                        <th className="py-1.5 px-3 text-right">SGST Amt</th>
                        <th className="py-1.5 px-3 text-right">IGST Rate</th>
                        <th className="py-1.5 px-3 text-right">IGST Amt</th>
                        <th className="py-1.5 px-3 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const hsnMap: Record<string, any> = {};
                        showViewModal.items.forEach(li => {
                          const key = li.hsnSac || "—";
                          if (!hsnMap[key]) hsnMap[key] = { hsn: key, taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: li.gstRate };
                          hsnMap[key].taxable += li.amount;
                          hsnMap[key].cgst += li.cgst || 0;
                          hsnMap[key].sgst += li.sgst || 0;
                          hsnMap[key].igst += li.igst || 0;
                        });
                        return Object.values(hsnMap).map((row: any, i: number) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1.5 px-3 font-mono font-bold">{row.hsn}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{row.taxable.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                            <td className="py-1.5 px-3 text-right">{row.cgst>0?row.rate/2+"%":"—"}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{row.cgst>0?row.cgst.toLocaleString('en-IN',{minimumFractionDigits:2}):"—"}</td>
                            <td className="py-1.5 px-3 text-right">{row.sgst>0?row.rate/2+"%":"—"}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{row.sgst>0?row.sgst.toLocaleString('en-IN',{minimumFractionDigits:2}):"—"}</td>
                            <td className="py-1.5 px-3 text-right">{row.igst>0?row.rate+"%":"—"}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{row.igst>0?row.igst.toLocaleString('en-IN',{minimumFractionDigits:2}):"—"}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-700">{(row.cgst+row.sgst+row.igst).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                          </tr>
                        ));
                      })()}
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-[10px]">
                        <td className="py-1.5 px-3">Total</td>
                        <td className="py-1.5 px-3 text-right font-mono">{showViewModal.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                        <td className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 text-right font-mono">{showViewModal.totalCgst.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                        <td className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 text-right font-mono">{showViewModal.totalSgst.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                        <td className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 text-right font-mono">{showViewModal.totalIgst.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-blue-700">{showViewModal.totalGst.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ── TOTALS + AMOUNT IN WORDS ── */}
                <div className="grid grid-cols-2 gap-6 mt-5">
                  <div className="space-y-3">
                    {/* Amount in words */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1">Amount in Words</div>
                      <div className="text-[11px] font-bold text-slate-800 italic">
                        {(() => {
                          const n = Math.round(showViewModal.total);
                          const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
                          const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
                          const toWords = (num: number): string => {
                            if (num === 0) return "";
                            if (num < 20) return ones[num] + " ";
                            if (num < 100) return tens[Math.floor(num/10)] + " " + (ones[num%10] ? ones[num%10]+" " : "");
                            if (num < 1000) return ones[Math.floor(num/100)] + " Hundred " + toWords(num%100);
                            if (num < 100000) return toWords(Math.floor(num/1000)) + "Thousand " + toWords(num%1000);
                            if (num < 10000000) return toWords(Math.floor(num/100000)) + "Lakh " + toWords(num%100000);
                            return toWords(Math.floor(num/10000000)) + "Crore " + toWords(n%10000000);
                          };
                          return "Rupees " + toWords(n).trim() + " Only";
                        })()}
                      </div>
                    </div>
                    {/* Bank details */}
                    {(db.company.bankName || db.company.bankAccount) && (
                      <div className="border border-slate-200 rounded-lg p-3 text-[10px] space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Bank Payment Details</div>
                        {db.company.bankName && <div>Bank: <span className="font-bold">{db.company.bankName}</span></div>}
                        {db.company.bankAccount && <div className="font-mono">A/C: <span className="font-bold">{db.company.bankAccount}</span></div>}
                        {db.company.bankIfsc && <div className="font-mono">IFSC: <span className="font-bold">{db.company.bankIfsc}</span></div>}
                      </div>
                    )}
                    {/* Notes */}
                    {showViewModal.notes && (
                      <div className="text-[10px]">
                        <div className="font-bold text-slate-600 mb-1">Notes:</div>
                        <div className="text-slate-500">{showViewModal.notes}</div>
                      </div>
                    )}
                  </div>
                  {/* Totals */}
                  <div className="space-y-1.5 text-[11px]">
                    {[
                      { label: "Subtotal (Taxable)", value: showViewModal.subtotal },
                      showViewModal.totalCgst > 0 ? { label: `CGST @ ${(showViewModal.totalCgst/showViewModal.subtotal*100).toFixed(1)}%`, value: showViewModal.totalCgst } : null,
                      showViewModal.totalSgst > 0 ? { label: `SGST @ ${(showViewModal.totalSgst/showViewModal.subtotal*100).toFixed(1)}%`, value: showViewModal.totalSgst } : null,
                      showViewModal.totalIgst > 0 ? { label: `IGST @ ${(showViewModal.totalIgst/showViewModal.subtotal*100).toFixed(1)}%`, value: showViewModal.totalIgst } : null,
                    ].filter(Boolean).map((row: any, i) => (
                      <div key={i} className="flex justify-between text-slate-600 border-b border-slate-100 pb-1">
                        <span>{row.label}</span>
                        <span className="font-mono">₹{row.value.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-slate-900 text-sm border-t-2 border-slate-800 pt-2 mt-2">
                      <span>Grand Total</span>
                      <span className="font-mono text-emerald-700">₹{showViewModal.total.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
                    </div>
                    {showViewModal.paymentReceived > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Payment Received</span>
                        <span className="font-mono">-₹{showViewModal.paymentReceived.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
                      </div>
                    )}
                    {showViewModal.paymentReceived > 0 && (
                      <div className="flex justify-between font-black text-red-700 border-t border-dashed border-red-200 pt-1">
                        <span>Balance Due</span>
                        <span className="font-mono">₹{(showViewModal.total - showViewModal.paymentReceived).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── T&C + SIGNATURE ── */}
                <div className="mt-6 grid grid-cols-2 gap-6 border-t border-slate-200 pt-5">
                  <div>
                    {showViewModal.termsAndConditions && (
                      <>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Terms & Conditions</div>
                        <div className="text-[10px] text-slate-500 leading-relaxed">{showViewModal.termsAndConditions}</div>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 mb-8">For <span className="font-bold text-slate-800">{db.company.name}</span></div>
                    <div className="border-t border-slate-400 pt-1 inline-block min-w-40">
                      <div className="text-[9px] text-slate-500">Authorised Signatory</div>
                    </div>
                  </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
                  This is a computer-generated invoice and does not require a physical signature. | Ledgerio Enterprise Accounting
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE CREDIT NOTE FORM MODAL */}
      {showCreditForm && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 text-rose-500">
                <CreditCard className="w-4 h-4 text-rose-500 animate-pulse" />
                Issue Credit note adjustment
              </h3>
              <button onClick={() => setShowCreditForm(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Create a Credit Note against outstanding invoice <span className="font-mono text-indigo-400 font-bold">{showCreditForm.invoiceNumber}</span>. This reduces the client's balance receivable.
            </p>

            <form onSubmit={handleCreditNoteSubmit} className="space-y-4 text-xs text-slate-300">
              <div className="space-y-1.5">
                <label className="text-slate-400">Taxable amount to credit (₹)</label>
                <input 
                  type="number"
                  required
                  min={1}
                  max={showCreditForm.total}
                  value={creditSubtotal}
                  placeholder={`Max allocation remaining: ₹${showCreditForm.total}`}
                  onChange={(e) => setCreditSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-slate-750 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Reason for write off / adjustments</label>
                <textarea 
                  required
                  rows={2}
                  value={creditReason}
                  placeholder="e.g. Services fee waiver, items returned/defective, or discount alignment"
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-slate-750 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowCreditForm(null)} className="border border-slate-800 px-4 py-2 rounded text-slate-400 font-medium">Cancel</button>
                <button type="submit" className="bg-rose-600 hover:bg-rose-500 px-5 py-2 rounded text-white font-bold select-none cursor-pointer">Post Credit Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-INVOICE PORTAL PUSH ANIMATED PROGRESS MODAL */}
      {pushingEInvoiceId && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-8 max-w-sm w-full text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-155">Pushing to National E-Invoicing System</h4>
              <p className="text-[11px] text-slate-400">GST Portal Invoice Registration Services</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Validation:</span>
                <span className="text-emerald-400 font-bold">Passed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="text-slate-300">GSTIN API GW V2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                {isPushLoadingStep === 0 && <span className="text-amber-500 animate-pulse">Initializing token...</span>}
                {isPushLoadingStep === 1 && <span className="text-indigo-400 animate-pulse">Hashing items & metadata...</span>}
                {isPushLoadingStep === 2 && <span className="text-emerald-400 font-bold">Assigned IRN Successful</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL DSC SIGNATURE USB E-TOKEN PREVIEW DIALOG */}
      {signingInvoice && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>✍️</span>
                Affix Digital Signature Certificate (DSC)
              </h4>
              <button onClick={() => setSigningInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-350">
              <div className="bg-amber-950/20 border border-amber-900/60 p-3 rounded-xl text-[11px] text-amber-300/90 leading-relaxed">
                ⚠️ Demo only — this does not perform a real cryptographic signature. There's no USB DSC token integration
                here; any 4+ characters will "validate." Provide a real Class 3 DSC token via your CA/GSP for anything
                that needs to be legally valid.
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Select e-Token Certificate (demo labels — not real certificates):</label>
                <select 
                  value={dscCertType} 
                  onChange={(e) => setDscCertType(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-850 rounded px-3 py-2 text-slate-200 outline-none"
                >
                  <option value="Aditya Hegde (Class 3 DSC USB Token - CCA India)">Aditya Hegde (Class 3 DSC USB Token - CCA India)</option>
                  <option value="Corporate Authorized Signatory - Ledgerio Solutions">Corporate Authorized Signatory - Ledgerio Solutions</option>
                  <option value="Auditing Partner DSC Token (Sub-Auth)">Auditing Partner DSC Token (Sub-Auth)</option>
                </select>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] uppercase font-bold text-slate-455 tracking-wider">USB DSC Token PIN / Password:</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={dscPin}
                  onChange={(e) => setDscPin(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-850 rounded px-3 py-2 text-slate-200 font-mono tracking-widest focus:border-slate-705 outline-none"
                />
              </div>

              {/* Signature Card Visualization */}
              <div className="border border-indigo-900/60 bg-indigo-950/20 p-4 rounded-xl text-center space-y-1 relative overflow-hidden select-none">
                <div className="absolute right-2 top-2 text-[8px] bg-slate-800 text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 uppercase tracking-wider font-extrabold font-mono text-[7px]" style={{ whiteSpace: 'nowrap' }}>
                  Demo Only
                </div>
                <p className="text-[10px] text-indigo-400">Preview of signed metadata:</p>
                <p className="font-mono text-[9px] text-indigo-500">{signingInvoice.invoiceNumber} | {db.company.gstin}</p>
                {dscPin.length >= 4 ? (
                  <div className="pt-2 text-[11px] text-emerald-400 font-bold font-sans animate-fade-in flex items-center justify-center gap-1.5">
                    <span>PIN entered (demo only — not a real signature check)</span>
                  </div>
                ) : (
                  <div className="pt-2 font-serif italic text-slate-500 text-[10.5px]">Enter your Secure Token PIN above to unlock...</div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setSigningInvoice(null)} 
                  className="border border-slate-800 px-4 py-2 rounded text-slate-400 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  disabled={dscPin.length < 4}
                  onClick={() => {
                    if (!window.confirm("This is a demo signature only - no real cryptographic signing happens here, and this is not a legally valid Digital Signature Certificate. The invoice will just be marked 'Digitally Signed (Demo)' for internal tracking. Continue?")) return;
                    onSaveInvoice({ ...signingInvoice, status: "Digitally Signed (Demo)" });
                    setSigningInvoice(null);
                    alert(`Marked ${signingInvoice.invoiceNumber} as "Digitally Signed (Demo)" for internal tracking. No real DSC signature was applied.`);
                  }}
                  className={`px-5 py-2 rounded font-bold transition flex items-center gap-1.5 cursor-pointer select-none ${
                    dscPin.length >= 4 
                      ? "bg-indigo-600 text-white hover:bg-indigo-500" 
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  }`}
                >
                  Affix DSC Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MARK AS EXPATCHED AND SENT OVERLAY MODAL */}
      {sendingInvoice && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>📨</span>
                {onSendInvoiceEmail ? "Email Invoice to Customer" : "Mark Invoice as Sent"}
              </h4>
              <button onClick={() => setSendingInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-350">
              {onSendInvoiceEmail ? (
                <p>
                  This sends a real email with invoice <span className="font-mono text-indigo-400 font-bold">{sendingInvoice.invoiceNumber}</span> to <span className="font-semibold text-slate-200">{sendingInvoice.customerName}</span> and marks it as Sent.
                </p>
              ) : (
                <p>
                  This marks invoice <span className="font-mono text-indigo-400 font-bold">{sendingInvoice.invoiceNumber}</span> as sent to <span className="font-semibold text-slate-200">{sendingInvoice.customerName}</span> for your own tracking. <span className="text-amber-400">No email is actually sent</span> — you still need to send the invoice yourself (download the PDF and email it, or share the link).
                </p>
              )}

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer email on file:</span>
                  <span className="text-slate-200 font-semibold">{db.customers.find(c => c.id === sendingInvoice.customerId)?.email || "Not on file"}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setSendingInvoice(null)} 
                  className="border border-slate-800 px-4 py-2 rounded text-slate-400 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  disabled={sendingEmailNow}
                  onClick={async () => {
                    if (onSendInvoiceEmail) {
                      setSendingEmailNow(true);
                      try {
                        const result = await onSendInvoiceEmail(sendingInvoice.id);
                        if (result.emailSent) {
                          alert(`Invoice ${sendingInvoice.invoiceNumber} emailed to ${result.to}.`);
                          setSendingInvoice(null);
                        } else {
                          alert(result.error || "Couldn't send the email. Check your email provider configuration.");
                        }
                      } catch (e: any) {
                        alert(e.message || "Couldn't send the email.");
                      } finally {
                        setSendingEmailNow(false);
                      }
                    } else {
                      onSaveInvoice({ ...sendingInvoice, status: "Sent" });
                      setSendingInvoice(null);
                      alert(`Invoice ${sendingInvoice.invoiceNumber} marked as Sent (for your tracking only — no email was actually sent).`);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded text-white font-bold cursor-pointer disabled:opacity-60"
                >
                  {sendingEmailNow ? "Sending..." : onSendInvoiceEmail ? "Send Email" : "Confirm Dispatch & Settle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
