import React, { useState } from "react";
import { Building2, Users, Settings, CreditCard, ShoppingCart, Package, Zap, FileText, Bell, Tag, Globe, PenTool, RefreshCw, Calculator, Truck, Receipt, BarChart2, ChevronRight } from "lucide-react";
import CompanySetup from "./CompanySetup";

interface OrgSettingsProps {
  db: any;
  onUpdateCompany: (data: any) => Promise<void>;
  onUpdateRole: (role: string) => void;
  onResetDB: () => void;
  currentUserEmail: string;
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

export default function OrgSettings({ db, onUpdateCompany, onUpdateRole, onResetDB, currentUserEmail }: OrgSettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

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
      const org = (db as any).__orgMeta;
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

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Top-level settings groups */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.group} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-1">
                  <Icon className={`w-4 h-4 ${section.iconColor}`} />
                  <h3 className="text-xs font-semibold text-gray-700">{section.group}</h3>
                </div>
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`block w-full text-left text-sm px-1 py-0.5 rounded hover:text-blue-700 transition ${
                      activeSection === item.id ? "text-blue-700 font-semibold" : "text-gray-600"
                    }`}
                  >
                    {item.label}
                    {item.label === "Payment Terms" && (
                      <span className="ml-1 text-[9px] bg-red-100 text-red-600 font-bold px-1 rounded">NEW</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Settings */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Module Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULE_SETTINGS.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.group} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-1">
                  <span className={`p-1 rounded ${group.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-xs font-semibold text-gray-700">{group.group}</h3>
                </div>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`block w-full text-left text-sm px-1 py-0.5 rounded hover:text-blue-700 transition ${
                      activeSection === item.id ? "text-blue-700 font-semibold" : "text-gray-600"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}
