import React, { useState } from "react";
import { Building2, Users, Settings, CreditCard, ShoppingCart, Package, Zap, FileText, Bell, Tag, Globe, PenTool, RefreshCw, Calculator, Truck, Receipt, BarChart2, ChevronRight } from "lucide-react";
import CompanySetup from "./CompanySetup";

interface OrgSettingsProps {
  db: any;
  onUpdateCompany: (data: any) => Promise<void>;
  onUpdateRole: (role: string) => void;
  onResetDB: () => void;
  currentUserEmail: string;
  onClose?: () => void;
}

type SettingsSection =
  | "profile" | "branding" | "locations" | "ai" | "approvals" | "subscription"
  | "users" | "roles" | "preferences"
  | "taxes" | "direct_taxes" | "eway" | "einvoicing" | "msme"
  | "general" | "currencies" | "payment_terms" | "opening_balances" | "reminders" | "customer_portal" | "vendor_portal"
  | "txn_series" | "pdf_templates" | "email_notif" | "sms_notif" | "reporting_tags" | "web_tabs" | "digital_sig"
  | "workflow_rules" | "workflow_actions" | "workflow_logs" | "schedules"
  | "cust_vendors" | "items" | "accountant" | "projects" | "timesheet"
  | "payment_gateways"
  | "estimates" | "sales_orders" | "delivery_challans" | "invoices" | "recurring_invoices" | "payments_received" | "credit_notes" | "sales_returns"
  | "expenses" | "recurring_expenses" | "purchase_orders" | "bills" | "recurring_bills" | "payments_made" | "debit_notes" | "purchase_returns";

const SECTIONS: Array<{
  group: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  items: Array<{ id: SettingsSection; label: string }>;
}> = [
  {
    group: "Organization",
    icon: Building2,
    iconColor: "text-teal-600",
    items: [
      { id: "profile", label: "Profile" },
      { id: "branding", label: "Branding" },
      { id: "locations", label: "Locations" },
      { id: "ai", label: "AI Integration" },
      { id: "approvals", label: "Approvals" },
      { id: "subscription", label: "Manage Subscription" },
    ],
  },
  {
    group: "Users & Roles",
    icon: Users,
    iconColor: "text-blue-600",
    items: [
      { id: "users", label: "Users" },
      { id: "roles", label: "Roles" },
      { id: "preferences", label: "User Preferences" },
    ],
  },
  {
    group: "Taxes & Compliance",
    icon: FileText,
    iconColor: "text-purple-600",
    items: [
      { id: "taxes", label: "Taxes" },
      { id: "direct_taxes", label: "Direct Taxes" },
      { id: "eway", label: "e-Way Bills" },
      { id: "einvoicing", label: "e-Invoicing" },
      { id: "msme", label: "MSME Settings" },
    ],
  },
  {
    group: "Setup & Configurations",
    icon: Settings,
    iconColor: "text-orange-500",
    items: [
      { id: "general", label: "General" },
      { id: "currencies", label: "Currencies" },
      { id: "payment_terms", label: "Payment Terms" },
      { id: "opening_balances", label: "Opening Balances" },
      { id: "reminders", label: "Reminders" },
      { id: "customer_portal", label: "Customer Portal" },
      { id: "vendor_portal", label: "Vendor Portal" },
    ],
  },
  {
    group: "Customization",
    icon: PenTool,
    iconColor: "text-pink-600",
    items: [
      { id: "txn_series", label: "Transaction Number Series" },
      { id: "pdf_templates", label: "PDF Templates" },
      { id: "email_notif", label: "Email Notifications" },
      { id: "sms_notif", label: "SMS Notifications" },
      { id: "reporting_tags", label: "Reporting Tags" },
      { id: "web_tabs", label: "Web Tabs" },
      { id: "digital_sig", label: "Digital Signature" },
    ],
  },
  {
    group: "Automation",
    icon: Zap,
    iconColor: "text-yellow-600",
    items: [
      { id: "workflow_rules", label: "Workflow Rules" },
      { id: "workflow_actions", label: "Workflow Actions" },
      { id: "workflow_logs", label: "Workflow Logs" },
      { id: "schedules", label: "Schedules" },
    ],
  },
];

const MODULE_SETTINGS: Array<{
  group: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  items: Array<{ id: SettingsSection; label: string }>;
}> = [
  {
    group: "General",
    icon: Settings,
    iconBg: "bg-green-100 text-green-600",
    items: [
      { id: "cust_vendors", label: "Customers and Vendors" },
      { id: "items", label: "Items" },
      { id: "accountant", label: "Accountant" },
      { id: "projects", label: "Projects" },
      { id: "timesheet", label: "Timesheet" },
    ],
  },
  {
    group: "Online Payments",
    icon: CreditCard,
    iconBg: "bg-orange-100 text-orange-600",
    items: [
      { id: "payment_gateways", label: "Payment Gateways" },
    ],
  },
  {
    group: "Sales",
    icon: ShoppingCart,
    iconBg: "bg-blue-100 text-blue-600",
    items: [
      { id: "estimates", label: "Estimates" },
      { id: "sales_orders", label: "Sales Orders" },
      { id: "delivery_challans", label: "Delivery Challans" },
      { id: "invoices", label: "Invoices" },
      { id: "recurring_invoices", label: "Recurring Invoices" },
      { id: "payments_received", label: "Payments Received" },
      { id: "credit_notes", label: "Credit Notes" },
      { id: "sales_returns", label: "Sales Returns" },
    ],
  },
  {
    group: "Purchases",
    icon: Package,
    iconBg: "bg-teal-100 text-teal-600",
    items: [
      { id: "expenses", label: "Expenses" },
      { id: "recurring_expenses", label: "Recurring Expenses" },
      { id: "purchase_orders", label: "Purchase Orders" },
      { id: "bills", label: "Bills" },
      { id: "recurring_bills", label: "Recurring Bills" },
      { id: "payments_made", label: "Payments Made" },
      { id: "debit_notes", label: "Debit Notes" },
      { id: "purchase_returns", label: "Purchase Returns" },
    ],
  },
];

// Sections backed by the generic advancedModules list-CRUD backend (/api/modules/:key).
// Each entry defines the simple field schema for that module's items.
const LIST_MODULE_MAP: Record<string, { key: string; title: string; fields: Array<{ id: string; label: string; type: "text" | "number" | "select"; options?: string[] }> }> = {
  direct_taxes: { key: "tds", title: "Direct Taxes (TDS/TCS Rates)", fields: [
    { id: "section", label: "Section (e.g. 194C, 194J)", type: "text" },
    { id: "description", label: "Description", type: "text" },
    { id: "rate", label: "Rate %", type: "number" },
    { id: "threshold", label: "Threshold Amount (₹)", type: "number" },
  ]},
  payment_terms: { key: "paymentterms", title: "Payment Terms", fields: [
    { id: "name", label: "Term Name (e.g. Net 30)", type: "text" },
    { id: "days", label: "Days", type: "number" },
  ]},
  reminders: { key: "reminders", title: "Payment Reminders", fields: [
    { id: "name", label: "Reminder Name", type: "text" },
    { id: "daysBefore", label: "Days Before/After Due Date", type: "number" },
    { id: "message", label: "Message", type: "text" },
  ]},
  customer_portal: { key: "cportal", title: "Customer Portal Access", fields: [
    { id: "customerEmail", label: "Customer Email", type: "text" },
    { id: "accessLevel", label: "Access Level", type: "select", options: ["View Only", "View & Pay", "Full Access"] },
  ]},
  vendor_portal: { key: "vportal", title: "Vendor Portal Access", fields: [
    { id: "vendorEmail", label: "Vendor Email", type: "text" },
    { id: "accessLevel", label: "Access Level", type: "select", options: ["View Only", "View & Upload Invoices", "Full Access"] },
  ]},
  workflow_rules: { key: "workflow", title: "Workflow Rules", fields: [
    { id: "name", label: "Rule Name", type: "text" },
    { id: "trigger", label: "Trigger Event", type: "select", options: ["Invoice Created", "Invoice Approved", "Bill Received", "Payment Overdue"] },
    { id: "action", label: "Action", type: "select", options: ["Send Email", "Send Notification", "Require Approval"] },
  ]},
  workflow_actions: { key: "workflowactions", title: "Workflow Actions", fields: [
    { id: "name", label: "Action Name", type: "text" },
    { id: "type", label: "Action Type", type: "select", options: ["Send Email", "Send SMS", "Assign Approver", "Call Webhook", "Update Field"] },
    { id: "target", label: "Target (email / URL / field)", type: "text" },
  ]},
  schedules: { key: "schedreports", title: "Scheduled Reports", fields: [
    { id: "reportName", label: "Report Name", type: "select", options: ["P&L Statement", "Balance Sheet", "GSTR-1", "Outstanding Receivables"] },
    { id: "frequency", label: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly"] },
    { id: "recipientEmail", label: "Recipient Email", type: "text" },
  ]},
};

// Simple on/off feature toggles — no data of their own, just enabled/disabled state,
// backed by /api/settings/enabled-modules.
const TOGGLE_LABELS: Record<string, string> = Object.fromEntries(
  MODULE_SETTINGS.flatMap(g => g.items.map(i => [i.id, i.label]))
);

const authedFetch = (url: string, options: any = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bizkhata_session_token') : null;
  return fetch(url, { ...options, headers: { ...(options.headers || {}), 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
};

function ToggleModuleSection({ sectionId }: { sectionId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  React.useEffect(() => {
    let cancelled = false;
    authedFetch('/api/settings/enabled-modules').then(r => r.json()).then(data => {
      if (!cancelled) setEnabled(data[sectionId] !== false); // default ON
    }).catch(() => { if (!cancelled) setEnabled(true); });
    return () => { cancelled = true; };
  }, [sectionId]);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next); setSaving(true);
    try {
      await authedFetch('/api/settings/enabled-modules', { method: 'PUT', body: JSON.stringify({ [sectionId]: next }) });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-1">{TOGGLE_LABELS[sectionId] || sectionId}</h2>
      <p className="text-xs text-gray-500 mb-5">Turn this module on or off in your app's navigation.</p>
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <span className="text-sm font-medium text-gray-700">{enabled === null ? 'Loading...' : enabled ? 'Enabled' : 'Disabled'}</span>
        <button onClick={toggle} disabled={enabled === null || saving}
          className={`relative w-11 h-6 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-gray-300'} disabled:opacity-50`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  );
}

// Common field/validation/button options — a reasonable generic set that applies
// sensibly across document-type modules (Invoices, Estimates, Bills, etc). Persisted
// via composite keys on the same /api/settings/enabled-modules store used for the
// Preferences tab, so no new backend endpoint is needed.
const FIELD_OPTIONS = [
  { id: "gstin", label: "GSTIN / Tax ID field" },
  { id: "po_ref", label: "PO / Reference Number field" },
  { id: "due_date", label: "Due Date field" },
  { id: "notes", label: "Notes field" },
  { id: "terms", label: "Terms & Conditions field" },
];
const VALIDATION_OPTIONS = [
  { id: "require_gstin", label: "Require customer/vendor GSTIN before saving" },
  { id: "require_due_date", label: "Require a due date" },
  { id: "no_negative_amounts", label: "Prevent negative line-item amounts" },
  { id: "require_line_item", label: "Require at least one line item" },
];
const BUTTON_OPTIONS = [
  { id: "send_email", label: "Show 'Send via Email' button" },
  { id: "send_whatsapp", label: "Show 'Send via WhatsApp' button" },
  { id: "convert", label: "Show 'Convert' button" },
  { id: "duplicate", label: "Show 'Duplicate' button" },
];

function MultiToggleSection({ sectionId, category, options, note }: { sectionId: string; category: string; options: Array<{ id: string; label: string }>; note?: string }) {
  const [values, setValues] = useState<Record<string, boolean> | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    authedFetch('/api/settings/enabled-modules').then(r => r.json()).then(data => {
      if (cancelled) return;
      const v: Record<string, boolean> = {};
      options.forEach(o => { v[o.id] = data[`${sectionId}__${category}__${o.id}`] === true; });
      setValues(v);
    });
    return () => { cancelled = true; };
  }, [sectionId, category]);

  const toggle = async (optionId: string) => {
    const next = !(values?.[optionId]);
    setValues(v => ({ ...(v || {}), [optionId]: next }));
    setSavingId(optionId);
    try {
      await authedFetch('/api/settings/enabled-modules', { method: 'PUT', body: JSON.stringify({ [`${sectionId}__${category}__${optionId}`]: next }) });
    } finally { setSavingId(null); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-lg overflow-hidden">
      {note && <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">{note}</div>}
      <div className="divide-y divide-gray-100">
        {options.map(o => {
          const enabled = values?.[o.id] === true;
          return (
            <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-700">{o.label}</span>
              <button onClick={() => toggle(o.id)} disabled={values === null || savingId === o.id}
                className={`relative w-10 h-5.5 rounded-full transition shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'} disabled:opacity-50`}>
                <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RelatedListsSection({ sectionId }: { sectionId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", url: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    authedFetch('/api/modules/relatedlists').then(r => r.json()).then(data => {
      setItems((Array.isArray(data) ? data : []).filter((i: any) => i.section === sectionId));
    }).finally(() => setLoading(false));
  };
  React.useEffect(load, [sectionId]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      await authedFetch('/api/modules/relatedlists', { method: 'POST', body: JSON.stringify({ ...form, section: sectionId }) });
      setForm({ name: "", url: "" });
      load();
    } finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    await authedFetch(`/api/modules/relatedlists/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-2xl">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Related Lists</h2>
        <p className="text-xs text-gray-500 mt-1">Link out to relevant external pages or internal references from this record type.</p>
      </div>
      <div className="p-6 space-y-3 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Link Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shipping Tracker"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">URL</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          {saving ? 'Adding...' : '+ Add'}
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-6 text-sm text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">No related links yet. Add one above.</div>
        ) : items.map(item => (
          <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
            <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{item.name}</a>
            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold shrink-0 ml-4">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListModuleSection({ config }: { config: { key: string; title: string; fields: Array<{ id: string; label: string; type: string; options?: string[] }> } }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    authedFetch(`/api/modules/${config.key}`).then(r => r.json()).then(data => setItems(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  };
  React.useEffect(load, [config.key]);

  const handleAdd = async () => {
    const hasAllRequired = config.fields.every(f => (form[f.id] || '').toString().trim() !== '');
    if (!hasAllRequired) return;
    setSaving(true);
    try {
      await authedFetch(`/api/modules/${config.key}`, { method: 'POST', body: JSON.stringify(form) });
      setForm({});
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await authedFetch(`/api/modules/${config.key}/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-3xl">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">{config.title}</h2>
      </div>
      <div className="p-6 space-y-4 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {config.fields.map(f => (
            <div key={f.id}>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">{f.label}</label>
              {f.type === 'select' ? (
                <select value={form[f.id] || ''} onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select...</option>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} value={form[f.id] || ''} onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              )}
            </div>
          ))}
        </div>
        <button onClick={handleAdd} disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          {saving ? 'Adding...' : '+ Add'}
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-6 text-sm text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">No entries yet. Add one above.</div>
        ) : items.map(item => (
          <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
            <div className="text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
              {config.fields.map(f => item[f.id] ? <span key={f.id}><span className="text-gray-400">{f.label}:</span> {item[f.id]}</span> : null)}
            </div>
            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold shrink-0 ml-4">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowLogsSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  React.useEffect(() => {
    authedFetch('/api/audit-logs').then(r => r.json()).then(data => {
      const filtered = (Array.isArray(data) ? data : []).filter((l: any) =>
        typeof l.actionPerformed === 'string' && (l.actionPerformed.toLowerCase().includes('module') || l.actionPerformed.toLowerCase().includes('workflow'))
      );
      setLogs(filtered);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-3xl">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Workflow Logs</h2>
        <p className="text-xs text-gray-500 mt-1">
          Real activity log — includes both configuration changes (rules/actions created or edited) and
          automatic rule firings. Rules currently fire on: Invoice Created, Invoice Approved, Bill Received,
          and Payment Overdue (checked when the app loads data, since there's no background scheduler yet).
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-6 text-sm text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">No workflow-related activity yet.</div>
        ) : logs.map(log => (
          <div key={log.id} className="px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{log.actionPerformed}</span>
              <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{log.details} · by {log.userName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sections that use CompanySetup for actual editing. Maps this component's section
// ids (left-hand nav) to CompanySetup's internal section ids, since the two were
// built independently with different naming conventions (e.g. "opening_balances"
// here vs "opening-balances" there). Only includes ids CompanySetup actually
// implements — sections without a real implementation fall through to the generic
// placeholder below instead of silently rendering CompanySetup's own full menu.
const COMPANY_SETUP_SECTION_MAP: Record<string, string> = {
  profile: "profile",
  branding: "branding",
  locations: "locations",
  ai: "ai-preferences",
  general: "general-configs",
  opening_balances: "opening-balances",
  taxes: "taxes",
  currencies: "currencies",
  approvals: "approvals",
  txn_series: "seq-series",
  pdf_templates: "pdf-templates",
  email_notif: "email-notifs",
  sms_notif: "sms-notifs",
  reporting_tags: "reporting-tags",
  web_tabs: "web-tabs",
  digital_sig: "dsc",
  eway: "eway",
  einvoicing: "einvoicing",
  msme: "msme",
  preferences: "user-preferences",
  users: "users",
};
const COMPANY_SETUP_SECTIONS: SettingsSection[] = Object.keys(COMPANY_SETUP_SECTION_MAP) as SettingsSection[];

const ROLES_LIST = [
  { name: "Accountant", desc: "This role is ideal for an accountant who takes care of tax filing, compliance and your business finance." },
  { name: "Admin", desc: "Unrestricted access to all modules." },
  { name: "Purchase/Expense", desc: "Access to purchase orders, expenses and bills only." },
  { name: "Staff", desc: "Access to all modules except reports, settings and accountant." },
  { name: "Staff - Assigned Customers Only", desc: "Access to all modules, transactions and data of assigned customers and all vendors except reports, settings and accountant." },
  { name: "TimesheetStaff", desc: "TimesheetStaff Role" },
  { name: "Viewer", desc: "Read-only access to view invoices, reports and transactions." },
];

export default function OrgSettings({ db, onUpdateCompany, onUpdateRole, onResetDB, currentUserEmail, onClose }: OrgSettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"preferences" | "fields" | "validation" | "buttons" | "related">("preferences");
  const isModuleItem = !!TOGGLE_LABELS[activeSection];
  React.useEffect(() => { setActiveTab("preferences"); }, [activeSection]);

  const renderContent = () => {
    // Roles section
    if (activeSection === "roles") {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">Roles</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase w-56">Role Name ↑</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ROLES_LIST.map(r => (
                <tr key={r.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-blue-600 font-medium">{r.name}</td>
                  <td className="px-6 py-4 text-gray-600">{r.desc || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeSection === "subscription") {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-3">Manage Subscription</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-gray-500 text-xs">Organization</p>
              <p className="font-semibold text-gray-800">{db?.company?.name || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-500 text-xs">Subscription Status</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-gray-500 text-xs">Seats Allocated</p>
              <p className="font-semibold text-gray-800">{db?.userSeatsLimit || 5} seats</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-500 text-xs">Seats Used</p>
              <p className="font-semibold text-gray-800">{(db?.users || []).length} seats</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
            To upgrade your plan or increase seat count, contact <a href="mailto:owner@bizkhata.app" className="underline font-semibold">owner@bizkhata.app</a>.
          </div>
        </div>
      );
    }

    if (activeSection === "workflow_actions") {
      const actionTypes = [
        { name: "Send Email", desc: "Notify a specified recipient by email when the trigger event occurs." },
        { name: "Send Notification", desc: "Show an in-app notification to relevant users." },
        { name: "Require Approval", desc: "Route the transaction to an approver before it can proceed." },
      ];
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-2xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">Workflow Actions</h2>
            <p className="text-xs text-gray-500 mt-1">Available actions you can attach to a Workflow Rule.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {actionTypes.map(a => (
              <div key={a.name} className="px-6 py-4">
                <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === "workflow_logs") {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-2xl">
          <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">Workflow Logs</h3>
          <p className="text-sm text-gray-400">No execution logs yet — logs appear here once your Workflow Rules start running against real transactions.</p>
        </div>
      );
    }

    // Placeholder for other sections
    const sectionLabel = [...SECTIONS.flatMap(s => s.items), ...MODULE_SETTINGS.flatMap(s => s.items)]
      .find(i => i.id === activeSection)?.label || activeSection;

    if (COMPANY_SETUP_SECTIONS.includes(activeSection)) {
      return (
        <CompanySetup
          db={db}
          onUpdateCompany={onUpdateCompany}
          onUpdateRole={onUpdateRole as any}
          onResetDB={onResetDB as any}
          currentUserEmail={currentUserEmail}
          initialSection={COMPANY_SETUP_SECTION_MAP[activeSection]}
          hideMenu={true}
        />
      );
    }

    if (LIST_MODULE_MAP[activeSection]) {
      return <ListModuleSection config={LIST_MODULE_MAP[activeSection]} />;
    }

    if (activeSection === "workflow_logs") {
      return <WorkflowLogsSection />;
    }

    if (TOGGLE_LABELS[activeSection]) {
      return <ToggleModuleSection sectionId={activeSection} />;
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">{sectionLabel}</h3>
        <p className="text-sm text-gray-400">Settings for this section will appear here.</p>
      </div>
    );
  };

  if (!db) {
    return (
      <div className="fixed inset-0 z-40 bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading settings...</p>
      </div>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const matchesQuery = (label: string) => !query || label.toLowerCase().includes(query);

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 h-16 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">All Settings</h1>
            <p className="text-xs text-gray-500 leading-tight">{db?.company?.name || "Your Company"}</p>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-auto">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search settings ( / )"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
          />
        </div>
        <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 shrink-0">
          Close Settings <span className="text-gray-400">✕</span>
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto shrink-0 py-4">
          <div className="px-4 mb-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Organization Settings</p>
          </div>
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const items = section.items.filter(i => matchesQuery(i.label));
            if (query && items.length === 0) return null;
            return (
              <div key={section.group} className="mb-4">
                <div className="flex items-center gap-2 px-4 py-1">
                  <Icon className={`w-3.5 h-3.5 ${section.iconColor}`} />
                  <h3 className="text-xs font-semibold text-gray-500">{section.group}</h3>
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`block w-full text-left text-sm pl-9 pr-4 py-1.5 transition ${
                      activeSection === item.id ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                    {item.label === "Payment Terms" && (
                      <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 font-bold px-1 rounded">NEW</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}

          <div className="px-4 mb-2 mt-6 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Module Settings</p>
          </div>
          {MODULE_SETTINGS.map(group => {
            const Icon = group.icon;
            const items = group.items.filter(i => matchesQuery(i.label));
            if (query && items.length === 0) return null;
            return (
              <div key={group.group} className="mb-4">
                <div className="flex items-center gap-2 px-4 py-1">
                  <span className={`p-0.5 rounded ${group.iconBg}`}><Icon className="w-3 h-3" /></span>
                  <h3 className="text-xs font-semibold text-gray-500">{group.group}</h3>
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`block w-full text-left text-sm pl-9 pr-4 py-1.5 transition ${
                      activeSection === item.id ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isModuleItem ? (
            <div>
              <div className="px-8 pt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">{TOGGLE_LABELS[activeSection]}</h2>
                <div className="flex items-center gap-6 border-b border-gray-200 text-sm">
                  {[
                    { id: "preferences", label: "Preferences" },
                    { id: "fields", label: "Fields" },
                    { id: "validation", label: "Validation Rules" },
                    { id: "buttons", label: "Buttons" },
                    { id: "related", label: "Related Lists" },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-2.5 -mb-px border-b-2 font-medium transition ${activeTab === tab.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-8">
                {activeTab === "preferences" && <ToggleModuleSection sectionId={activeSection} />}
                {activeTab === "fields" && (
                  <MultiToggleSection sectionId={activeSection} category="fields" options={FIELD_OPTIONS}
                    note="Turning a field off hides it on the form for this document type — it won't appear when creating or editing." />
                )}
                {activeTab === "validation" && (
                  <MultiToggleSection sectionId={activeSection} category="validation" options={VALIDATION_OPTIONS}
                    note="Enforced on save for Invoices and Bills. Not yet wired into other document types (Estimates, Expenses, etc.)." />
                )}
                {activeTab === "buttons" && (
                  <MultiToggleSection sectionId={activeSection} category="buttons" options={BUTTON_OPTIONS} />
                )}
                {activeTab === "related" && (
                  <RelatedListsSection sectionId={activeSection} />
                )}
              </div>
            </div>
          ) : (
            <div className="p-8">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
