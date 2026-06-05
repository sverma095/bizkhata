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
  gstRate: number;
  unit: string;
  salesRate: number;
  purchaseRate: number;
  incomeAccount: string;
  expenseAccount: string;
  // Stock tracking
  trackInventory?: boolean;
  openingStock?: number;
  currentStock?: number;
  reorderLevel?: number;
  reorderQty?: number;
  warehouseLocation?: string;
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
  bankAccounts?: BankAccount[];
  bankTransactions?: BankTransaction[];
  stockMovements?: StockMovement[];
  fixedAssets?: FixedAsset[];
  openingBalanceDate?: string;
  openingBalancesSet?: boolean;
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


// ── Bank Account ──────────────────────────────────────────────────────────────
export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  type: 'Current' | 'Savings' | 'OD' | 'CC';
  openingBalance: number;
  currentBalance: number;
  currency: string;
  isDefault?: boolean;
}

// ── Bank Transaction ─────────────────────────────────────────────────────────
export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'Unreconciled' | 'Reconciled' | 'Excluded';
  matchedId?: string; // matched invoice/bill/journal id
  source: 'import' | 'manual' | 'system';
}

// ── Stock Movement ────────────────────────────────────────────────────────────
export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  type: 'Opening' | 'Purchase' | 'Sale' | 'Adjustment' | 'Transfer';
  qty: number; // positive = in, negative = out
  rate: number;
  value: number;
  referenceId?: string;
  referenceType?: 'invoice' | 'bill' | 'adjustment';
  notes?: string;
}

// ── Fixed Asset ───────────────────────────────────────────────────────────────
export interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  depreciationMethod: 'SLM' | 'WDV';
  usefulLife: number; // years
  salvageValue: number;
  currentValue: number;
  accumulatedDepreciation: number;
  status: 'Active' | 'Disposed' | 'Fully Depreciated';
  invoiceRef?: string;
}

// ── Opening Balance Entry ─────────────────────────────────────────────────────
export interface OpeningBalanceEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

// ── User Management Types ─────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  gstNumber: string;
  status: 'Pending' | 'Active' | 'Suspended' | 'Rejected';
  allocatedSeats: number;
  usedSeats: number;
  createdAt: string;
}

export interface AppUserFull {
  id: string;
  organizationId: string | null;
  fullName: string;
  email: string;
  mobileNumber: string;
  department?: string;
  designation?: string;
  role: string;
  status: 'Active' | 'Pending Activation' | 'Disabled';
  password?: string;
  permissions: string[];
  twoFactorEnabled: boolean;
  twoFactorVerified?: boolean;
  lastLogin?: string;
  deviceDetails?: string;
  ipAddress?: string;
  createdAt: string;
  activationCode?: string;
  resetCode?: string;
}

export interface SeatRequest {
  id: string;
  organizationId: string;
  requestedBy: string;
  currentSeatCount: number;
  additionalSeatsRequested: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface CustomRole {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface RegistrationRequest {
  id: string;
  companyName: string;
  gstNumber: string;
  adminName: string;
  email: string;
  mobileNumber: string;
  numberOfRequiredSeats: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  additionalInfoRequest?: string;
  createdAt: string;
}

export interface SessionInfo {
  token: string;
  user: AppUserFull;
  organization: Organization | null;
}

export const ALL_PERMISSIONS = [
  { id: 'view_invoices', label: 'View Invoices', category: 'Invoices' },
  { id: 'create_invoices', label: 'Create Invoices', category: 'Invoices' },
  { id: 'edit_invoices', label: 'Edit Invoices', category: 'Invoices' },
  { id: 'delete_invoices', label: 'Delete Invoices', category: 'Invoices' },
  { id: 'approve_payments', label: 'Approve Payments', category: 'Finance' },
  { id: 'manage_customers', label: 'Manage Customers', category: 'Contacts' },
  { id: 'manage_vendors', label: 'Manage Vendors', category: 'Contacts' },
  { id: 'view_reports', label: 'View Reports', category: 'Reporting' },
  { id: 'export_data', label: 'Export Data', category: 'Reporting' },
  { id: 'manage_users', label: 'Manage Users', category: 'Admin' },
  { id: 'view_journals', label: 'View Journals', category: 'Accounting' },
  { id: 'create_journals', label: 'Create Journals', category: 'Accounting' },
  { id: 'manage_items', label: 'Manage Items', category: 'Inventory' },
  { id: 'manage_billing', label: 'Manage Bills', category: 'Finance' },
  { id: 'view_banking', label: 'View Banking', category: 'Banking' },
];
