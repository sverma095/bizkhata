export interface CompanyInfo {
  name: string;
  legalName: string;
  gstin: string;
  pan: string;
  address: string;
  state: string;
  currency: string;
  financialYear: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  eInvoicePortal?: {
    username: string;
    password: string;
    configured: boolean;
  };
}

export enum UserRole {
  Owner = "Owner",
  Admin = "Admin",
  Accountant = "Accountant",
  BillingUser = "Billing User",
  Approver = "Approver",
  Viewer = "Viewer",
  Auditor = "Auditor",
  User = "User"
}

export interface Customer {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  billingAddress: string;
  state: string;
  paymentTerms: string;
  openingBalance: number;
}

export interface Vendor {
  id: string;
  name: string;
  gstin: string;
  pan: string;
  msmeStatus: string;
  email: string;
  phone: string;
  address: string;
  openingBalance: number;
}

export interface Item {
  id: string;
  name: string;
  hsnSac: string;
  gstRate: number; // e.g., 18 (representing 18%)
  unit: string;
  salesRate: number;
  purchaseRate: number;
  incomeAccount: string; // Chart of Account code, e.g. "sales_income"
  expenseAccount: string; // Chart of Account code, e.g. "contractor_expense"
}

export interface Account {
  code: string; // e.g. "bank_account"
  name: string;
  type: 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';
  balance: number;
}

export interface InvoiceItem {
  id: string;
  itemId: string;
  name: string;
  hsnSac: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Paid' | 'Cancelled' | 'E-Invoiced' | 'Digitally Signed' | 'Converted';
  isProforma: boolean; // True if it's a proforma invoice
  paymentReceived: number;
  convertedToTax?: boolean;
  convertedInvoiceNumber?: string;
  irn?: string;           // E-Invoice Reference Number from IRP
  ackNo?: string;         // Acknowledgement Number
  ackDate?: string;       // Acknowledgement Date
  ewbNo?: string;         // E-Way Bill Number
  notes?: string;         // Internal notes
  termsAndConditions?: string;
}

export interface CreditNoteItem {
  itemId: string;
  name: string;
  qty: number;
  rate: number;
  amount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  reason: string;
  items: CreditNoteItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  total: number;
}

export interface PaymentAlloc {
  invoiceId: string;
  amount: number;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amountReceived: number;
  tdsDeducted: number;
  paymentMode: string;
  referenceNumber: string;
  bankAccount: string; // code of asset bank/cash
  allocations: PaymentAlloc[];
}

export interface Expense {
  id: string;
  date: string;
  vendorId?: string;
  vendorName: string; // custom or vendor's name
  category: string; // Expense Account code like salary_expense, rent, etc.
  subtotal: number;
  gstAmount: number;
  tdsAmount: number;
  paymentMode: string;
  total: number; // subtotal + gstAmount - tdsAmount
  attachmentUrl?: string;
  attachmentName?: string;
  status?: 'Draft' | 'Pending Approval' | 'Approved';
}

export interface BillItem {
  itemId: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Bill {
  id: string;
  billNumber: string; // vendor bill number
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate: string;
  items: BillItem[];
  subtotal: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  total: number;
  status: 'Draft' | 'Approved' | 'Paid' | 'Cancelled';
  paymentPaid: number;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string; // e.g. "Invoice INV-001", "Payment PAY-010"
  description: string;
  lines: JournalLine[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  password?: string;
  isOwner?: boolean;
}

export interface MailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  passwordSent?: string;
  timestamp: string;
}

export interface OrgPurchase {
  id: string;
  name: string;
  legalName: string;
  pan: string;
  gstin: string;
  purchasedSeats: number;
  packageType: 'Standard' | 'Professional' | 'Enterprise' | 'SME Bundle';
  pricingMonthly: number;
  purchaseStatus: 'Active' | 'Suspended' | 'Trial' | 'Overdue';
  registeredEmail: string;
}

export interface DatabaseState {
  company: CompanyInfo;
  role: UserRole;
  customers: Customer[];
  vendors: Vendor[];
  items: Item[];
  accounts: Account[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  payments: Payment[];
  expenses: Expense[];
  bills: Bill[];
  journals: JournalEntry[];
  auditLogs: AuditLog[];
  users?: AppUser[];
  userSeatsLimit?: number;
  mailLogs?: MailLog[];
  organizations?: OrgPurchase[];
  salesOrders?: SalesOrder[];
  purchaseOrders?: PurchaseOrder[];
  deliveryChallans?: DeliveryChallan[];
  vendorCredits?: VendorCredit[];
  priceLists?: PriceList[];
  budgets?: Budget[];
}

export interface EInvoicePortalConfig {
  username: string;
  password: string;
  gstin: string;
  configured: boolean;
}

// ── Sales Order ────────────────────────────────────────────────────────────
export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  deliveryDate: string;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  total: number;
  status: 'Draft' | 'Confirmed' | 'Invoiced' | 'Cancelled';
  notes?: string;
  shippingAddress?: string;
  convertedToInvoice?: boolean;
}

// ── Purchase Order ─────────────────────────────────────────────────────────
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  deliveryDate: string;
  items: BillItem[];
  subtotal: number;
  totalGst: number;
  total: number;
  status: 'Draft' | 'Issued' | 'Received' | 'Billed' | 'Cancelled';
  notes?: string;
  convertedToBill?: boolean;
}

// ── Delivery Challan ───────────────────────────────────────────────────────
export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  invoiceId?: string;
  soId?: string;
  items: InvoiceItem[];
  status: 'Open' | 'Delivered' | 'Cancelled';
  notes?: string;
}

// ── Vendor Credit ──────────────────────────────────────────────────────────
export interface VendorCredit {
  id: string;
  vcNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  billId?: string;
  reason: string;
  items: BillItem[];
  subtotal: number;
  totalGst: number;
  total: number;
  status: 'Open' | 'Applied' | 'Closed';
}

// ── Price List ─────────────────────────────────────────────────────────────
export interface PriceList {
  id: string;
  name: string;
  type: 'Sales' | 'Purchase';
  currency: string;
  discount: number; // percent off standard rate
  items: Array<{ itemId: string; customRate: number }>;
}

// ── Budget ─────────────────────────────────────────────────────────────────
export interface Budget {
  id: string;
  name: string;
  fiscalYear: string;
  accounts: Array<{ accountCode: string; accountName: string; budgetedAmount: number }>;
}
