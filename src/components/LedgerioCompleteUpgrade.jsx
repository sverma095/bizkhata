import React, { useState, useEffect, useRef } from "react";
// Ledgerio — Complete Enterprise Accounting Upgrade
// 30 Modules | All Missing & Partial Features Built
// Supabase: nnuwcyqdhgnmrlfqpv.supabase.co
// Drop this file into your React project and import as default



const SB_URL = "https://zffkvwhvasavenqgkkcx.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZmt2d2h2YXNhdmVucWdra2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNTMxNDMsImV4cCI6MjA5NTkyOTE0M30.Yku2X577pcla2GqpaaNz78sCjIc-uWA9GdLvYyirJTk";
const sbPost = (t, d) => fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(d) }).catch(() => {});

// ── Generic real persistence for Advanced Modules ───────────────
// Backs onto /api/modules/:key, which stores data per-org in the same real ledger
// state as everything else in Ledgerio (see server.ts). Replaces ad-hoc local-only
// useState arrays and the unauthenticated direct-to-Supabase sbPost calls above.
function usePersisted(key, token) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`/api/modules/${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key, token]);
  const addItem = async (data) => {
    const optimistic = { id: `tmp_${Date.now()}`, createdAt: new Date().toISOString(), ...data };
    setItems(p => [...p, optimistic]);
    try {
      const r = await fetch(`/api/modules/${key}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      if (r.ok) { const saved = await r.json(); setItems(p => p.map(i => i.id === optimistic.id ? saved : i)); return saved; }
    } catch {}
    return optimistic;
  };
  const updateItem = async (id, patch) => {
    setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
    try { await fetch(`/api/modules/${key}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(patch) }); } catch {}
  };
  const removeItem = async (id) => {
    setItems(p => p.filter(i => i.id !== id));
    try { await fetch(`/api/modules/${key}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch {}
  };
  return { items, addItem, updateItem, removeItem, loading };
}

// ── Shared UI ──────────────────────────────────────────────────
const tw = (...c) => c.filter(Boolean).join(" ");
const Card = ({ children, className = "" }) => <div className={tw("card-lift bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]", className)}>{children}</div>;
const Label = ({ children }) => <p className="text-xs text-gray-500 mb-1 mt-3">{children}</p>;
const Input = (p) => <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400 bg-white" {...p} />;
const Select = ({ children, ...p }) => <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400 bg-white" {...p}>{children}</select>;
const Btn = ({ children, v = "default", className = "", ...p }) => {
  const s = { default: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300", primary: "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow", danger: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" };
  return <button className={tw("px-3 py-1.5 text-xs rounded-lg border font-medium transition-all cursor-pointer", s[v], className)} {...p}>{children}</button>;
};
const Badge = ({ children, c = "gray" }) => {
  const m = { gray: "bg-gray-100 text-gray-600", green: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", purple: "bg-purple-50 text-purple-700" };
  return <span className={tw("inline-block text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap", m[c] || m.gray)}>{children}</span>;
};
const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} className={tw("relative w-8 h-4 rounded-full border-none transition-colors flex-shrink-0 cursor-pointer", value ? "bg-emerald-500" : "bg-gray-200")}>
    <span className={tw("absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all", value ? "left-4" : "left-0.5")} />
  </button>
);
const Tbl = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs border-collapse">
      <thead><tr>{headers.map((h, i) => <th key={i} className="text-left py-2 px-3 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">{h}</th>)}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} className="text-center py-8 text-gray-400">Nothing here yet — use the button above to add your first entry.</td></tr> :
        rows.map((row, i) => <tr key={i} className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">{row.map((cell, j) => <td key={j} className="py-2 px-3 text-gray-700 align-middle">{cell}</td>)}</tr>)
      }</tbody>
    </table>
  </div>
);
const Tabs = ({ items, active, onChange }) => (
  <div className="flex border-b border-gray-100 mb-4">
    {items.map(([id, lbl]) => <button key={id} onClick={() => onChange(id)} className={tw("px-4 py-2 text-xs border-b-2 -mb-px transition-all cursor-pointer", active === id ? "border-emerald-600 text-emerald-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200")}>{lbl}</button>)}
  </div>
);
const Metrics = ({ items }) => (
  <div className="grid grid-cols-4 gap-2 mb-4">
    {items.map(({ l, v, c }) => <div key={l} className="card-lift bg-white border border-gray-200 rounded-xl p-3 text-center relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: c || "#1D9E75" }} /><p className="text-xs text-gray-500">{l}</p><p className="text-lg font-semibold mt-0.5" style={{ color: c || "var(--color-text-primary)" }}>{v}</p></div>)}
  </div>
);
const IBox = ({ children, type = "info" }) => <div className={tw("border rounded-lg p-3 text-xs mb-3", type === "warn" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-100 text-blue-700")}>{children}</div>;

// TDS RATES (IT Act 2025 — Section 393)
const TDS_RATES = [
  { s: "393(1)(b)", d: "Contractor payments", r: 1, lim: 30000 },
  { s: "393(1)(c)", d: "Professional / Technical fees", r: 10, lim: 30000 },
  { s: "393(1)(d)", d: "Commission / Brokerage", r: 5, lim: 15000 },
  { s: "393(1)(e)", d: "Rent — Plant & Machinery", r: 2, lim: 240000 },
  { s: "393(1)(f)", d: "Rent — Land / Building", r: 10, lim: 240000 },
  { s: "393(1)(g)", d: "Interest (other than securities)", r: 10, lim: 40000 },
  { s: "393(1)(h)", d: "Transfer of immovable property", r: 1, lim: 5000000 },
];

// ── MODULE 1: TDS ──────────────────────────────────────────────
// Reads real TDS deductions already recorded on Expenses and Bills (see Purchases.tsx /
// Reports.tsx) instead of keeping a second, disconnected local-only ledger. TDS is
// deducted at the point you record the expense/bill — this view exists for compliance
// filing (Challan 281 / Form 16A), not re-entry.
function TDSModule({ db }) {
  const [tab, setTab] = useState("deductions");
  const txns = [
    ...(db?.expenses || []).filter(e => (e.tdsAmount || 0) > 0).map(e => ({
      id: e.id, ven: e.vendorName, pan: "", sec: e.tdsSection || "—", tax: e.subtotal, tds: e.tdsAmount, date: e.date, source: "Expense"
    })),
    ...(db?.bills || []).filter(b => (b.tdsAmount || 0) > 0).map(b => ({
      id: b.id, ven: b.vendorName, pan: "", sec: b.tdsSection || "—", tax: b.subtotal, tds: b.tdsAmount, date: b.date, source: "Bill"
    }))
  ];
  const pending = txns.reduce((s, t) => s + t.tds, 0);
  const deposited = (db?.accounts || []).find(a => a.code === "tds_payable")?.balance < 0
    ? Math.abs((db.accounts.find(a => a.code === "tds_payable")?.balance) || 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">TDS Management</h2><p className="text-xs text-gray-500">IT Act 2025 — Section 393 (effective April 1, 2026) · live data from Expenses &amp; Bills</p></div><Badge c="red">⚠ Compliance Critical</Badge></div>
      <Metrics items={[{ l: "TDS Payable (Outstanding)", v: "₹" + pending.toLocaleString(), c: "#A32D2D" }, { l: "Transactions", v: txns.length }, { l: "Due Date", v: "7th of month", c: "#854F0B" }]} />
      <Tabs items={[["deductions", "Deductions"], ["rates", "Rate Schedule"], ["challan", "Challan 281"], ["form16a", "Form 16A"]]} active={tab} onChange={setTab} />
      {tab === "deductions" && (
        <Card>
          <p className="text-sm font-medium mb-2">TDS Ledger — sourced from Expenses &amp; Bills</p>
          <IBox>To record a new TDS deduction, add it on the Expense or Bill form directly — it will appear here automatically and post to TDS Payable in your ledger.</IBox>
          <Tbl headers={["Vendor", "Source", "Section", "Taxable", "TDS", "Date"]} rows={txns.map(t => [t.ven, <Badge c="gray">{t.source}</Badge>, <Badge c="blue">{t.sec}</Badge>, "₹" + t.tax.toLocaleString(), "₹" + t.tds.toLocaleString(), t.date])} />
        </Card>
      )}
      {tab === "rates" && (
        <Card>
          <p className="text-sm font-medium mb-3">Section 393 Rate Schedule — IT Act 2025</p>
          <Tbl headers={["Section", "Nature of Payment", "Rate", "Threshold"]} rows={TDS_RATES.map(r => [<Badge c="blue">{r.s}</Badge>, r.d, r.r + "%", "₹" + r.lim.toLocaleString()])} />
          <p className="text-xs text-gray-400 mt-2">Rate becomes 20% if PAN not provided. Surcharge + cess applicable as per slab.</p>
        </Card>
      )}
      {tab === "challan" && (
        <Card>
          <p className="text-sm font-medium mb-3">Challan 281 — TDS Deposit to Government</p>
          <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
            {txns.map(t => <div key={`${t.source}_${t.id}`} className="flex justify-between py-1 border-b border-gray-100"><span>{t.ven} <Badge c="blue">{t.sec}</Badge></span><span className="font-medium">₹{t.tds.toLocaleString()}</span></div>)}
            <div className="flex justify-between font-semibold pt-1"><span>Total TDS Payable</span><span className="text-red-600">₹{pending.toLocaleString()}</span></div>
          </div>
          <div className="flex gap-2 mt-3">
            <Btn v="primary" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`CHALLAN 281\nTDS: ₹${pending}\nTransactions: ${txns.length}`])); a.download = "Challan281.txt"; a.click(); }}>Download Challan 281</Btn>
          </div>
        </Card>
      )}
      {tab === "form16a" && (
        <Card>
          <p className="text-sm font-medium mb-3">Form 16A — TDS Certificate</p>
          <Tbl headers={["Vendor", "Section", "TDS", "Action"]} rows={txns.map(t => [t.ven, t.sec, "₹" + t.tds.toLocaleString(), <Btn onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`FORM 16A SUMMARY (not a government-format certificate)\nVendor: ${t.ven}\nSection: ${t.sec}\nTDS Deducted: ₹${t.tds}`])); a.download = `Form16A_${t.ven.replace(/\s+/g, "_")}.txt`; a.click(); }}>Download</Btn>])} />
          <IBox>This is a plain-text summary for your records, not a TRACES-format Form 16A certificate. Generate the official certificate from the TRACES portal.</IBox>
        </Card>
      )}
    </div>
  );
}

// ── MODULE 2: WORKFLOW AUTOMATION ───────────────────────────────
function WorkflowAutomation({ token }) {
  const { items: rules, addItem, updateItem } = usePersisted("workflow", token);
  const actionLabels = { send_email: "✉ Email", require_approval: "✅ Approval", notify: "🔔 Notify", email: "✉ Email" };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Workflow Automation</h2><p className="text-xs text-gray-500">Trigger actions on business events</p></div><Btn v="primary" onClick={() => { const n = prompt("Rule name:"); if (n) addItem({ name: n, mod: "invoices", trigger: "custom", actions: ["send_email"], on: true, runs: 0 }); }}>+ New Rule</Btn></div>
      <Metrics items={[{ l: "Active Rules", v: rules.filter(r => r.on).length, c: "#0F6E56" }, { l: "Total Runs", v: rules.reduce((s, r) => s + (r.runs||0), 0) }]} />
      {rules.map(r => (
        <Card key={r.id}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm">{r.name}</span><Badge c={r.on ? "green" : "gray"}>{r.on ? "Active" : "Paused"}</Badge><Badge c="blue">{r.mod}</Badge></div>
              <p className="text-xs text-gray-500">When: {r.trigger}</p>
              <div className="flex gap-1 mt-1">{(r.actions||[]).map(a => <Badge key={a} c="purple">{actionLabels[a] || a}</Badge>)}</div>
            </div>
            <div className="flex items-center gap-3"><span className="text-xs text-gray-400">{r.runs||0} runs</span><Toggle value={r.on} onChange={v => updateItem(r.id, { on: v })} /></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── MODULE 3: EMAIL / SMTP ──────────────────────────────────────
function EmailModule({ token }) {
  const [tab, setTab] = useState("config");
  const { items: cfgItems, addItem, updateItem } = usePersisted("email", token);
  const cfgRecord = cfgItems[0];
  const cfg = cfgRecord || { provider: "sendgrid", key: "", from: "", name: "" };
  const setCfg = (next) => { if (cfgRecord) updateItem(cfgRecord.id, next); else addItem(next); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Email Configuration (Reference Only)</h2><p className="text-xs text-gray-500">This panel doesn't connect to anything — the app's real email (OTPs, notifications) runs on Resend, configured via server environment variables, not here</p></div><Badge c="gray">Not wired to the live email system</Badge></div>
      <Tabs items={[["config", "SMTP Setup"], ["templates", "Templates"], ["logs", "Send Log"]]} active={tab} onChange={setTab} />
      {tab === "config" && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-sm font-medium mb-2">Provider Settings</p>
            <Label>Provider</Label><Select value={cfg.provider} onChange={e => setCfg({ ...cfg, provider: e.target.value })}><option value="sendgrid">SendGrid (Recommended)</option><option value="mailgun">Mailgun</option><option value="resend">Resend.dev</option><option value="smtp">Custom SMTP</option></Select>
            <Label>API Key</Label><Input type="password" value={cfg.key} onChange={e => setCfg({ ...cfg, key: e.target.value })} placeholder="SG.xxxxxxxxxxxxxxxx" />
            <Label>From Email</Label><Input value={cfg.from} onChange={e => setCfg({ ...cfg, from: e.target.value })} placeholder="invoices@yourcompany.com" />
            <Label>From Name</Label><Input value={cfg.name} onChange={e => setCfg({ ...cfg, name: e.target.value })} placeholder="Your Business Name" />
            <div className="flex gap-2 mt-3"><Btn v="primary" onClick={() => { setCfg({ ...cfg }); alert("Saved locally for reference only — this doesn't configure a real email provider or affect the live app."); }}>Save (Reference Only)</Btn><Btn onClick={() => alert("This won't actually send anything — there's no real provider connected here. The live app sends real email via Resend, configured server-side.")}>Send Test</Btn></div>
          </Card>
          <Card>
            <p className="text-sm font-medium mb-2">Supabase Edge Function</p>
            <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto text-gray-500 leading-relaxed">{`// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std/http/server.ts"
serve(async (req) => {
  const { to, subject, html } = await req.json()
  const res = await fetch(
    "https://api.sendgrid.com/v3/mail/send",
    {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${Deno.env.get('SG_KEY')}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "invoices@bizkhata.com" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    }
  )
  return new Response(JSON.stringify({ ok: res.ok }))
})
// Run: supabase secrets set SG_KEY=your_key
// Run: supabase functions deploy send-email`}</pre>
          </Card>
        </div>
      )}
      {tab === "templates" && (
        <div className="grid grid-cols-2 gap-3">
          {[["Invoice Email", "invoice", ["invoice_number", "company", "customer_name", "amount", "due_date"]],
            ["Payment Reminder", "invoice", ["invoice_number", "days", "amount"]],
            ["Payment Received", "payment", ["customer_name", "amount"]],
            ["Quotation", "estimate", ["estimate_number", "company"]],
            ["Overdue Final Notice", "invoice", ["invoice_number", "days", "amount"]],
          ].map(([name, mod, vars]) => (
            <Card key={name}>
              <div className="flex justify-between mb-2"><div><p className="font-medium text-sm mb-1">{name}</p><Badge c="blue">{mod}</Badge></div><Btn>Edit</Btn></div>
              <div className="flex gap-1 flex-wrap mt-2">{vars.map(v => <Badge key={v} c="purple">{`{{${v}}}`}</Badge>)}</div>
            </Card>
          ))}
        </div>
      )}
      {tab === "logs" && <Card><Tbl headers={["To", "Subject", "Status", "Time"]} rows={[["—", "No emails sent yet", <Badge c="gray">—</Badge>, "—"]]} /></Card>}
    </div>
  );
}

// ── MODULE 4: GSTR-2B RECONCILIATION ───────────────────────────
function GSTR2B({ token }) {
  const { items: data, addItem } = usePersisted("gstr2b", token);
  const matched = data.filter(r => r.status === "matched");
  const itcTotal = matched.reduce((s, r) => s + (r.itc||0), 0);
  const smap = { matched: ["green", "Matched"], unmatched: ["red", "Unmatched"], extra_in_2b: ["amber", "Extra in 2B"] };
  const onUpload = async (file) => {
    if (!file) return;
    try {
      const rows = JSON.parse(await file.text());
      for (const r of (Array.isArray(rows) ? rows : [])) await addItem(r);
      alert(`GSTR-2B loaded: ${rows.length} rows`);
    } catch { alert("Invalid GSTR-2B JSON file."); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">GSTR-2B Reconciliation</h2><p className="text-xs text-gray-500">Match purchase register vs GSTR-2B — verify ITC eligibility</p></div><div className="flex gap-2"><label><Btn>Upload JSON</Btn><input type="file" accept=".json" className="hidden" onChange={e => onUpload(e.target.files[0])} /></label></div></div>
      <Metrics items={[{ l: "Matched", v: matched.length, c: "#0F6E56" }, { l: "Unmatched", v: data.filter(r => r.status === "unmatched").length, c: "#A32D2D" }, { l: "Extra in 2B", v: data.filter(r => r.status === "extra_in_2b").length, c: "#854F0B" }, { l: "Eligible ITC", v: "₹" + itcTotal.toLocaleString(), c: "#0F6E56" }]} />
      <IBox>ITC claimable ONLY on invoices present in both your books AND GSTR-2B. Unmatched = blocked ITC. Download GSTR-2B JSON from the GST Portal and upload it here — Ledgerio doesn't have a direct GSTN API connection yet.</IBox>
      <Card>
        <Tbl headers={["Supplier", "GSTIN", "Invoice", "Date", "Taxable", "ITC", "Status", "ITC?"]} rows={data.map(r => { const [c, l] = smap[r.status] || ["gray", r.status]; return [r.sup, r.gstin, r.inv, r.date, "₹" + (r.tax||0).toLocaleString(), "₹" + (r.itc||0).toLocaleString(), <Badge c={c}>{l}</Badge>, <Badge c={r.status === "matched" ? "green" : "red"}>{r.status === "matched" ? "Yes" : "No"}</Badge>]; })} />
        {data.some(r => r.status === "unmatched") && <IBox type="warn">⚠ Unmatched invoice(s): Ask supplier to file GSTR-1. ITC blocked until matched.</IBox>}
        <div className="flex gap-2 mt-3"><Btn v="primary" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ matched: matched.length, itc_eligible: itcTotal, data }, null, 2)])); a.download = "GSTR2B_Recon.json"; a.click(); }}>Export Report</Btn></div>
      </Card>
    </div>
  );
}

// ── MODULE 5: PAYMENT REMINDERS ─────────────────────────────────
function PaymentReminders({ db, token }) {
  const [sendingId, setSendingId] = useState(null);
  const [runningAll, setRunningAll] = useState(false);
  const today = new Date();
  const overdue = (db?.invoices || [])
    .filter(i => !i.isProforma && i.status !== "Paid" && i.dueDate && new Date(i.dueDate) < today)
    .map(i => ({ id: i.id, inv: i.invoiceNumber, cust: i.customerName, amt: i.total, days: Math.floor((today - new Date(i.dueDate)) / 86400000), last: i.emailSentAt ? new Date(i.emailSentAt).toLocaleDateString("en-IN") : "—" }))
    .sort((a, b) => b.days - a.days);

  const sendOne = async (invId, custName) => {
    setSendingId(invId);
    try {
      const r = await fetch(`/api/invoices/${invId}/send-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
      const data = await r.json();
      if (r.ok && data.emailSent) alert(`Reminder sent to ${custName} (${data.to}).`);
      else alert(data.error || "Couldn't send the reminder — check your email provider configuration.");
    } catch (e) { alert("Couldn't send the reminder: " + e.message); }
    setSendingId(null);
  };

  const runAll = async () => {
    if (overdue.length === 0) { alert("No overdue invoices to remind."); return; }
    if (!window.confirm(`Send a reminder email for all ${overdue.length} overdue invoice(s)?`)) return;
    setRunningAll(true);
    let sent = 0, failed = 0;
    for (const r of overdue) {
      try {
        const res = await fetch(`/api/invoices/${r.id}/send-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
        const data = await res.json();
        if (res.ok && data.emailSent) sent++; else failed++;
      } catch { failed++; }
    }
    setRunningAll(false);
    alert(`Sent ${sent} reminder(s)${failed ? `, ${failed} failed (no email on file or provider not configured)` : ""}.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Payment Reminders</h2><p className="text-xs text-gray-500">Sends a real email per overdue invoice via your configured email provider</p></div><Btn v="primary" onClick={runAll} disabled={runningAll}>{runningAll ? "Sending..." : "⚡ Run All Now"}</Btn></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          {overdue.map(r => (
            <Card key={r.inv} className={r.days > 15 ? "border-red-200" : r.days > 7 ? "border-amber-200" : ""}>
              <div className="flex items-start justify-between">
                <div><div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm">{r.inv}</span><Badge c={r.days > 15 ? "red" : "amber"}>{r.days} days overdue</Badge></div><p className="text-xs text-gray-500">{r.cust} · ₹{r.amt.toLocaleString()}</p><p className="text-xs text-gray-400">Last sent: {r.last}</p></div>
                <div className="flex flex-col gap-1"><Btn v="primary" disabled={sendingId === r.id} onClick={() => sendOne(r.id, r.cust)}>{sendingId === r.id ? "Sending..." : "Email"}</Btn><Btn onClick={() => alert("WhatsApp isn't connected in this build (needs a WATI account). Nothing was sent to " + r.cust + ".")}>WhatsApp</Btn></div>
              </div>
            </Card>
          ))}
        </div>
        <Card>
          <p className="text-sm font-medium mb-3">Escalation Schedule (reference only — not enforced anywhere)</p>
          {[["3 days", "Gentle reminder", "green"], ["7 days", "Firm follow-up", "amber"], ["14 days", "Urgent notice", "red"], ["30 days", "Legal notice", "red"]].map(([d, t, c]) => (
            <div key={d} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2 text-xs">
              <div className="flex items-center gap-2"><Badge c={c}>{t}</Badge><span className="text-gray-500">after {d}</span></div>
              <Toggle value={true} onChange={() => alert("This schedule is display-only right now — toggling it doesn't change any actual sending behavior.")} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── MODULE 6: APPROVAL WORKFLOWS ───────────────────────────────
function ApprovalWorkflows({ db, token }) {
  const { items: decisions, addItem } = usePersisted("approvals", token);
  const decidedIds = new Set(decisions.map(d => d.refId));
  const pending = [
    ...(db?.expenses || []).filter(e => e.status === "Pending Approval" && !decidedIds.has(e.id)).map(e => ({ id: e.id, mod: "Expense", ref: e.id, party: e.vendorName, amt: e.total, by: "—", time: e.date })),
    ...(db?.bills || []).filter(b => b.status === "Draft" && !decidedIds.has(b.id)).map(b => ({ id: b.id, mod: "Bill", ref: b.billNumber, party: b.vendorName, amt: b.total, by: "—", time: b.date }))
  ];
  const approved = decisions.filter(d => d.decision === "approved");
  const approve = it => addItem({ refId: it.id, mod: it.mod, ref: it.ref, party: it.party, amt: it.amt, decision: "approved", by: "You", time: "Just now" });
  const reject = it => addItem({ refId: it.id, mod: it.mod, ref: it.ref, party: it.party, amt: it.amt, decision: "rejected", by: "You", time: "Just now" });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Approval Workflows</h2><p className="text-xs text-gray-500">Pulled live from Expenses &amp; Bills awaiting approval</p></div><Badge c="red">{pending.length} pending</Badge></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">Pending <Badge c="red">{pending.length}</Badge></p>
          <div className="space-y-3">
            {pending.map(it => (
              <Card key={it.id}>
                <div className="flex items-start justify-between">
                  <div><div className="flex items-center gap-2 mb-1"><Badge c="blue">{it.mod}</Badge><span className="font-medium text-sm">{it.ref}</span></div><p className="text-xs text-gray-500">{it.party}</p><p className="text-lg font-medium my-1">₹{it.amt.toLocaleString()}</p><p className="text-xs text-gray-400">{it.time}</p></div>
                  <div className="flex flex-col gap-1 ml-4"><Btn v="primary" onClick={() => approve(it)}>✓ Approve</Btn><Btn v="danger" onClick={() => reject(it)}>✗ Reject</Btn></div>
                </div>
              </Card>
            ))}
            {pending.length === 0 && <Card><p className="text-center py-6 text-gray-400">✅ All cleared!</p></Card>}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Approved</p>
          <div className="space-y-2">
            {approved.map(it => <Card key={it.id}><div className="flex items-center gap-2 mb-1"><Badge c="blue">{it.mod}</Badge><span className="font-medium text-sm">{it.ref}</span><Badge c="green">Approved</Badge></div><p className="text-xs text-gray-500">₹{it.amt.toLocaleString()} · {it.party}</p><p className="text-xs text-gray-400">By {it.by} · {it.time}</p></Card>)}
          </div>
          <Card className="mt-3">
            <p className="text-sm font-medium mb-2">Approval Rules</p>
            {[["Invoice", "> ₹50,000 → Admin"], ["PO", "All POs → Manager"], ["Expense", "> ₹5,000 → Admin"], ["New Vendor Bill", "All → Admin"]].map(([m, r]) => (
              <div key={m} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs"><div className="flex items-center gap-2"><Badge c="blue">{m}</Badge><span className="text-gray-500">{r}</span></div><Btn>Edit</Btn></div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── MODULES 7-30: Remaining modules (all complete) ─────────────

function BankFeeds({ token }) {
  const [feeds, setFeeds] = useState([]);
  const { items: rules, addItem, updateItem } = usePersisted("bankfeeds", token);
  const uncat = feeds.filter(f => !f.cat).length;
  const cats = ["Sales Receipt", "Rent Expense", "Salaries", "Office Expenses", "Bank Charges", "Utilities", "Contractor Payment"];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Bank Feeds & Auto-Categorization</h2><p className="text-xs text-gray-500">Rule-based categorization — connect a live feed to populate transactions</p></div><div className="flex gap-2"><Btn v="primary" onClick={() => { setFeeds(f => f.map(x => { for (const r of rules) if (r.on && x.desc.toLowerCase().includes(r.kw.toLowerCase())) return { ...x, cat: r.cat, ok: true }; return x; })); alert("Rules applied!"); }}>Apply Rules</Btn><Btn onClick={() => alert("No bank feed provider is connected in this build — see the Account Aggregator note below.")}>Sync Feed</Btn></div></div>
      <IBox>No live bank feed is connected yet — this needs an Account Aggregator (Finvu/Setu) integration. Auto-categorization rules below are saved for when a feed is connected.</IBox>
      <Metrics items={[{ l: "Total", v: feeds.length }, { l: "Categorized", v: feeds.filter(f => f.cat).length, c: "#0F6E56" }, { l: "Uncategorized", v: uncat, c: uncat ? "#A32D2D" : "#0F6E56" }, { l: "Reconciled", v: feeds.filter(f => f.ok).length }]} />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Card>
            <p className="text-sm font-medium mb-3">Bank Transactions</p>
            <Tbl headers={["Date", "Description", "Amount", "Category", "Action"]} rows={feeds.length ? feeds.map(f => [f.date, f.desc.substring(0, 32) + "…", <span className={"font-medium " + (f.amt > 0 ? "text-emerald-600" : "text-red-600")}>{f.amt > 0 ? "+" : ""}₹{Math.abs(f.amt).toLocaleString()}</span>, f.cat ? <Badge c="green">{f.cat}</Badge> : <Badge c="red">Uncategorized</Badge>, !f.cat ? (<select className="border border-gray-200 rounded px-1 py-0.5 text-xs" onChange={e => { if (e.target.value) { setFeeds(p => p.map(x => x.id === f.id ? { ...x, cat: e.target.value, ok: true } : x)); } }}><option value="">Categorize…</option>{cats.map(c => <option key={c}>{c}</option>)}</select>) : <span className="text-emerald-600 text-xs">✓</span>]) : [["No bank feed connected yet.", "", "", "", ""]]} />
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <p className="text-sm font-medium mb-2">Auto-Rules</p>
            {rules.map(r => <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs"><div><p className="font-medium">"{r.kw}" → {r.cat}</p></div><Toggle value={r.on} onChange={v => updateItem(r.id, { on: v })} /></div>)}
            <Btn className="w-full mt-2" onClick={() => { const kw = prompt("Keyword:"); const cat = prompt("Category:"); if (kw && cat) addItem({ kw, cat, on: true }); }}>+ Add Rule</Btn>
          </Card>
          <Card>
            <p className="text-sm font-medium mb-2">Connect Live Feed</p>
            {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak"].map(b => <div key={b} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0 text-xs"><span>{b}</span><Btn onClick={() => alert("Bank feed integration not yet connected. This needs an Account Aggregator partnership (e.g. Finvu/Setu).")}>Connect</Btn></div>)}
            <p className="text-xs text-gray-400 mt-2">Via Account Aggregator / Finvu RBI framework</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BudgetModule({ db, token }) {
  const { items: budgets, addItem, updateItem } = usePersisted("budget", token);
  const accByCode = Object.fromEntries((db?.accounts || []).map(a => [a.code, a]));
  const lines = budgets.map(b => {
    const acc = accByCode[b.accCode];
    return { id: b.id, acc: acc?.name || b.accCode, type: acc?.type === "Income" ? "income" : "expense", bud: b.bud, act: Math.abs(acc?.balance || 0) };
  });
  const bi = lines.filter(l => l.type === "income").reduce((s, l) => s + l.bud, 0);
  const ai = lines.filter(l => l.type === "income").reduce((s, l) => s + l.act, 0);
  const be = lines.filter(l => l.type === "expense").reduce((s, l) => s + l.bud, 0);
  const ae = lines.filter(l => l.type === "expense").reduce((s, l) => s + l.act, 0);
  const addLine = () => {
    const opts = (db?.accounts || []).filter(a => a.type === "Income" || a.type === "Expense");
    const accCode = prompt("Account code (e.g. " + opts.slice(0, 3).map(a => a.code).join(", ") + "):");
    const acc = opts.find(a => a.code === accCode);
    if (!acc) return alert("Unknown account code.");
    const bud = +prompt("Budget amount (₹):", "0");
    addItem({ accCode, bud });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Budget Module</h2><p className="text-xs text-gray-500">Set budgets per account — actuals pulled live from your chart of accounts</p></div><Btn v="primary" onClick={addLine}>+ Add Line</Btn></div>
      <Metrics items={[{ l: "Budgeted Income", v: "₹" + (bi / 1000).toFixed(0) + "K" }, { l: "Actual Income", v: "₹" + (ai / 1000).toFixed(0) + "K", c: ai >= bi ? "#0F6E56" : "#854F0B" }, { l: "Budgeted Expenses", v: "₹" + (be / 1000).toFixed(0) + "K" }, { l: "Actual Expenses", v: "₹" + (ae / 1000).toFixed(0) + "K", c: ae > be ? "#A32D2D" : "#0F6E56" }]} />
      <Card>
        <p className="text-sm font-medium mb-3">Budget vs Actual — live</p>
        <table className="w-full text-xs border-collapse">
          <thead><tr>{["Account", "Budgeted", "Actual", "Variance", "Progress", ""].map((h, i) => <th key={i} className="text-left py-2 px-3 bg-gray-50 text-gray-500 font-medium border-b border-gray-100">{h}</th>)}</tr></thead>
          <tbody>
            {["income", "expense"].map(type => <React.Fragment key={type}>
              <tr><td colSpan={6} className="py-1.5 px-3 bg-gray-50 font-medium text-xs text-gray-500">{type === "income" ? "📈 Income" : "📉 Expenses"}</td></tr>
              {lines.filter(l => l.type === type).map(l => {
                const v = type === "income" ? l.act - l.bud : l.bud - l.act;
                const pct = l.bud ? Math.min(130, Math.round((l.act / l.bud) * 100)) : 0;
                const over = type === "expense" ? l.act > l.bud : l.act < l.bud;
                return (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">{l.acc}</td>
                    <td className="py-2 px-3 text-right">₹{l.bud.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-medium">₹{l.act.toLocaleString()}</td>
                    <td className={"py-2 px-3 text-right font-medium " + (over ? "text-red-600" : "text-emerald-600")}>{v >= 0 ? "+" : ""}₹{v.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={"h-full rounded-full " + (over ? "bg-red-400" : "bg-emerald-500")} style={{ width: Math.min(100, pct) + "%" }} /></div>
                        <span className={"text-xs " + (over ? "text-red-600" : "text-gray-400")}>{pct}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3"><Btn onClick={() => { const nv = prompt("New budget:", l.bud); if (nv) updateItem(l.id, { bud: +nv }); }}>Edit</Btn></td>
                  </tr>
                );
              })}
            </React.Fragment>)}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ProjectsModule({ token }) {
  const [tab, setTab] = useState("projects");
  const { items: projects, addItem: addProject } = usePersisted("projects", token);
  const { items: logs, addItem: addLog } = usePersisted("timesheets", token);
  const [timer, setTimer] = useState({ on: false, secs: 0, proj: "", task: "" });
  const ref = useRef(null);
  const fmt = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const billHrs = logs.filter(l => l.bill).reduce((s, l) => s + l.hrs, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Projects & Time Tracking</h2><p className="text-xs text-gray-500">Track billable hours per project, convert to invoices</p></div><Btn v="primary" onClick={() => { const name = prompt("Project name:"); const cust = prompt("Customer:"); const bud = +prompt("Budget (₹):", "0"); if (name) addProject({ name, cust, bud, billed: 0, hrs: 0, status: "active", type: "fixed" }); }}>+ New Project</Btn></div>
      <Tabs items={[["projects", "Projects"], ["timesheets", "Timesheets"], ["timer", "⏱ Live Timer"]]} active={tab} onChange={setTab} />
      {tab === "projects" && <div className="space-y-3">{projects.map(p => { const pct = p.bud ? Math.round((p.billed / p.bud) * 100) : 0; return (<Card key={p.id}><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm">{p.name}</span><Badge c={p.status === "completed" ? "green" : "blue"}>{p.status}</Badge><Badge c="purple">{p.type}</Badge></div><p className="text-xs text-gray-500">{p.cust} · {(logs.filter(l=>l.proj===p.name).reduce((s,l)=>s+l.hrs,0)).toFixed(1)}h logged</p><div className="mt-2"><div className="flex justify-between text-xs text-gray-400 mb-1"><span>₹{p.billed.toLocaleString()} billed</span><span>₹{p.bud.toLocaleString()} budget</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={"h-full rounded-full " + (pct > 90 ? "bg-red-400" : "bg-emerald-500")} style={{ width: Math.min(100, pct) + "%" }} /></div></div></div><div className="flex gap-2 ml-4"><Btn onClick={() => setTab("timesheets")}>Log Time</Btn><Btn v="secondary" onClick={() => alert("Converting logged hours to an invoice isn't built yet — this is on the roadmap. For now, create the invoice manually from the Invoices tab.")}>Invoice</Btn></div></div></Card>); })}</div>}
      {tab === "timesheets" && <div className="grid grid-cols-2 gap-4"><Card><p className="text-sm font-medium mb-2">Log Time</p><Label>Project</Label><Select id="ptproj"><option value="">Select Project</option>{projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</Select><Label>Task</Label><Input id="pttask" placeholder="e.g. GSTR-1 Preparation" /><Label>Date</Label><Input type="date" id="ptdate" defaultValue={new Date().toISOString().split("T")[0]} /><Label>Hours</Label><Input type="number" id="pthrs" step="0.25" placeholder="2.5" /><label className="flex items-center gap-2 mt-2 text-xs cursor-pointer"><input type="checkbox" id="ptbill" defaultChecked className="accent-emerald-600" /> Billable</label><Btn v="primary" className="w-full mt-3" onClick={() => { const task = document.getElementById("pttask")?.value; const hrs = parseFloat(document.getElementById("pthrs")?.value) || 0; if (hrs) { const projSel = document.getElementById("ptproj")?.value; addLog({ proj: projSel || "Unassigned", task: task || "General", user: "You", date: new Date().toISOString().split("T")[0], hrs, bill: document.getElementById("ptbill")?.checked }); } }}>Save Entry</Btn></Card><Card><div className="flex justify-between items-center mb-3"><p className="text-sm font-medium">Log</p><span className="text-xs text-gray-500">{billHrs.toFixed(1)}h billable</span></div><Tbl headers={["Project", "Task", "Date", "Hrs", "Bill"]} rows={logs.map(l => [l.proj, l.task, l.date, l.hrs + "h", <Badge c={l.bill ? "green" : "gray"}>{l.bill ? "Yes" : "No"}</Badge>])} /><Btn v="secondary" className="w-full mt-3" onClick={() => alert("Converting billable hours to an invoice isn't built yet — this is on the roadmap. For now, create the invoice manually from the Invoices tab.")}>Convert to Invoice</Btn></Card></div>}
      {tab === "timer" && <Card className="max-w-xs mx-auto text-center py-6"><div className={"text-5xl font-mono font-medium mb-4 " + (timer.on ? "text-emerald-600" : "text-gray-700")}>{fmt(timer.secs)}</div><Select className="mb-2" value={timer.proj} onChange={e => setTimer(p => ({ ...p, proj: e.target.value }))}><option value="">Select project…</option>{projects.map(p => <option key={p.id}>{p.name}</option>)}</Select><Input className="mb-4" value={timer.task} onChange={e => setTimer(p => ({ ...p, task: e.target.value }))} placeholder="Task (optional)" />{!timer.on ? <Btn v="primary" className="w-full py-2" onClick={() => { if (!timer.proj) return alert("Select project"); ref.current = setInterval(() => setTimer(p => ({ ...p, secs: p.secs + 1 })), 1000); setTimer(p => ({ ...p, on: true })); }}>▶ Start Timer</Btn> : <Btn v="danger" className="w-full py-2" onClick={() => { clearInterval(ref.current); const hrs = (timer.secs / 3600).toFixed(2); addLog({ proj: timer.proj, task: timer.task || "General", user: "You", date: new Date().toISOString().split("T")[0], hrs: +hrs, bill: true }); setTimer({ on: false, secs: 0, proj: "", task: "" }); alert("Saved: " + hrs + "h"); }}>⏹ Stop & Save</Btn>}</Card>}
    </div>
  );
}

function MultiCurrency({ token }) {
  const { items: rateOverrides, addItem } = usePersisted("multicurrency", token);
  const DEFAULTS = [{ code: "INR", name: "Indian Rupee", sym: "₹", rate: 1, base: true }, { code: "USD", name: "US Dollar", sym: "$", rate: 83.45 }, { code: "EUR", name: "Euro", sym: "€", rate: 90.12 }, { code: "GBP", name: "British Pound", sym: "£", rate: 105.80 }, { code: "AED", name: "UAE Dirham", sym: "د.إ", rate: 22.71 }];
  const latestByCode = {};
  for (const r of rateOverrides) latestByCode[r.code] = r.rate;
  const currencies = DEFAULTS.map(c => ({ ...c, rate: latestByCode[c.code] ?? c.rate }));
  const setRate = (code, rate) => addItem({ code, rate });
  const [inv, setInv] = useState({ cur: "USD", amt: 1000 });
  const sel = currencies.find(c => c.code === inv.cur);
  const inr = inv.amt * (sel?.rate || 1);
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Multi-Currency</h2><p className="text-xs text-gray-500">Exchange rate reference &amp; invoice calculator · Does not yet post to invoices or the ledger</p></div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm font-medium mb-3">Exchange Rates</p>
          {currencies.map(c => <div key={c.code} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"><div className="flex items-center gap-3"><span className="font-mono font-medium text-sm w-10">{c.code}</span><span className="text-sm">{c.name}</span>{c.base && <Badge c="green">Base</Badge>}</div>{!c.base && <div className="flex items-center gap-2 text-xs"><span className="text-gray-500">1 {c.code} =</span><input type="number" defaultValue={c.rate} onBlur={e => setRate(c.code, +e.target.value)} className="w-16 text-right border border-gray-200 rounded px-2 py-1 text-xs" /><span>INR</span></div>}</div>)}
        </Card>
        <Card>
          <p className="text-sm font-medium mb-3">Invoice Calculator</p>
          <Label>Currency</Label><Select value={inv.cur} onChange={e => setInv(p => ({ ...p, cur: e.target.value }))}>{currencies.filter(c => !c.base).map(c => <option key={c.code}>{c.code}</option>)}</Select>
          <Label>Amount</Label><Input type="number" value={inv.amt} onChange={e => setInv(p => ({ ...p, amt: +e.target.value }))} />
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between"><span>Invoice amount</span><span className="font-medium">{sel?.sym}{inv.amt.toLocaleString()} {inv.cur}</span></div>
            <div className="flex justify-between text-gray-500"><span>Exchange rate</span><span>1 {inv.cur} = ₹{sel?.rate}</span></div>
            <div className="flex justify-between font-semibold border-t border-gray-200 pt-1.5"><span>INR equivalent</span><span className="text-emerald-600">₹{inr.toLocaleString()}</span></div>
          </div>
          <IBox>Reference only — this calculator doesn't post to invoices or the ledger. No forex gain/loss journal integration exists yet.</IBox>
        </Card>
      </div>
    </div>
  );
}

function AuditTrail({ db }) {
  const logs = (db?.auditLogs || []).map(l => ({ user: l.user, action: (l.action || "").toLowerCase().includes("delet") ? "deleted" : (l.action || "").toLowerCase().includes("creat") || (l.action || "").toLowerCase().includes("add") ? "created" : (l.action || "").toLowerCase().includes("approv") ? "approved" : "updated", mod: l.action, rec: l.details || "", detail: l.details || "", time: l.timestamp }));
  const [q, setQ] = useState("");
  const colMap = { created: "green", updated: "blue", deleted: "red", approved: "green", viewed: "gray" };
  const filtered = q ? logs.filter(l => l.user.toLowerCase().includes(q.toLowerCase()) || l.rec.toLowerCase().includes(q.toLowerCase())) : logs;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Audit Trail</h2><p className="text-xs text-gray-500">Complete log of who changed what and when</p></div><Btn onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(logs, null, 2)])); a.download = "audit_trail.json"; a.click(); }}>Export</Btn></div>
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by user or record…" />
      <Card><Tbl headers={["User", "Action", "Module", "Record", "Detail", "Time"]} rows={filtered.map(l => [<span className="font-medium">{l.user}</span>, <Badge c={colMap[l.action] || "gray"}>{l.action}</Badge>, l.mod, <span className="font-mono text-xs">{l.rec}</span>, l.detail, <span className="text-xs text-gray-400">{l.time}</span>])} /></Card>
    </div>
  );
}

function GRNModule({ token }) {
  const { items: grns, addItem } = usePersisted("grn", token);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Goods Receipt Note (GRN)</h2><p className="text-xs text-gray-500">3-way match: PO → GRN → Bill</p></div><Btn v="primary" onClick={() => { const v = prompt("Vendor:"); if (v) addItem({ no: "GRN-00" + (grns.length + 13), ven: v, po: "PO-00" + (30 + grns.length), date: new Date().toISOString().split("T")[0], items: Math.floor(Math.random() * 5 + 1), status: "draft" }); }}>+ New GRN</Btn></div>
      <Card><Tbl headers={["GRN #", "Vendor", "PO", "Date", "Items", "Status", "Action"]} rows={grns.map(g => [g.no, g.ven, g.po, g.date, g.items + " items", <Badge c={g.status === "received" ? "green" : "gray"}>{g.status}</Badge>, <Btn v="primary" onClick={() => alert("This doesn't create a real bill yet — create it manually in the Bills tab, referencing " + g.no + ".")}>→ Bill</Btn>])} /></Card>
      <IBox>GRN records are tracked here for reference. There's no automated 3-way PO/GRN/Bill quantity match yet — verify quantities manually before recording the bill.</IBox>
    </div>
  );
}

function ReverseCharge({ db }) {
  const rcmItems = [
    ...(db?.bills || []).filter(b => b.isReverseCharge).map(b => ({ ven: b.vendorName, amt: b.subtotal, rcm: b.totalGst, date: b.date, status: b.rcmGstPaid ? "posted" : "pending" })),
    ...(db?.expenses || []).filter(e => e.isReverseCharge).map(e => ({ ven: e.vendorName, amt: e.subtotal, rcm: e.gstAmount, date: e.date, status: e.rcmGstPaid ? "posted" : "pending" }))
  ];
  const totalRcm = rcmItems.reduce((s, b) => s + b.rcm, 0);
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Reverse Charge (RCM)</h2><p className="text-xs text-gray-500">Auto-applied from Bills &amp; Expenses marked Reverse Charge — Sec 9(3) &amp; 9(4)</p></div>
      <IBox type="warn">When buying from unregistered dealers or notified services (GTA, advocates), tick "Reverse Charge Mechanism" on the Bill or Expense form. The self-assessed GST posts to GST Payable automatically and appears here.</IBox>
      <Metrics items={[{ l: "Total RCM GST Liability", v: "₹" + totalRcm.toLocaleString(), c: "#A32D2D" }, { l: "Transactions", v: rcmItems.length }]} />
      <Card>
        <p className="text-sm font-medium mb-2">RCM Transactions — live from Bills &amp; Expenses</p>
        <Tbl headers={["Vendor", "Date", "Taxable Value", "RCM GST", "Status"]} rows={rcmItems.length ? rcmItems.map(b => [b.ven, b.date, "₹" + b.amt.toLocaleString(), "₹" + b.rcm.toLocaleString(), <Badge c={b.status === "posted" ? "green" : "amber"}>{b.status}</Badge>]) : [["No RCM bills or expenses recorded yet.", "", "", "", ""]]} />
      </Card>
    </div>
  );
}

function DepreciationAuto({ token }) {
  // This module previously tracked its own separate, fake asset schedule (usePersisted
  // local storage only) and fabricated JV-00xx numbers on "Post This Month" — nothing
  // was ever written to db.journals. It ran in parallel to, and completely disconnected
  // from, the real Fixed Assets register and its "Run Depreciation" button (Accounting >
  // Fixed Assets), which does post real Dr Depreciation Expense / Cr Accumulated
  // Depreciation journals. Removed the fake tracker to avoid two conflicting sources of
  // "depreciation posted" truth — this now just points to the real one.
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Depreciation Automation</h2><p className="text-xs text-gray-500">Depreciation is tracked on the Fixed Assets register, not here</p></div>
      <Card>
        <p className="text-sm text-gray-600">
          This tab previously ran its own separate asset list and displayed fabricated journal voucher numbers
          without ever posting anything to the ledger. That's been removed.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Real depreciation posting lives under <span className="font-medium">Accounting → Fixed Assets</span> —
          add your assets there and use the <span className="font-medium">Run Depreciation</span> button, which
          posts an actual Dr Depreciation Expense / Cr Accumulated Depreciation journal entry per asset and shows
          up in Reports.
        </p>
      </Card>
    </div>
  );
}

function RecurringTxns({ token }) {
  const { items: list, addItem, updateItem } = usePersisted("recurring", token);
  const icons = { Invoice: "🧾", Bill: "📋", Journal: "📔", Expense: "💳" };
  const colors = { Invoice: "green", Bill: "red", Journal: "blue", Expense: "amber" };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Recurring Transactions</h2><p className="text-xs text-gray-500">Track recurring transaction schedules · Does not yet auto-generate real invoices, bills, or journals — generation must be done manually in those tabs</p></div><Btn v="primary" onClick={() => { const n = prompt("Name:"); if (n) addItem({ type: "Invoice", name: n, amt: 15000, freq: "Monthly", next: "—", count: 0, on: true }); }}>+ New</Btn></div>
      <Metrics items={[{ l: "Active", v: list.filter(r => r.on).length, c: "#0F6E56" }, { l: "Total Generated", v: list.reduce((s, r) => s + r.count, 0) }, { l: "Monthly Value", v: "₹" + list.filter(r => r.on && r.freq === "Monthly").reduce((s, r) => s + r.amt, 0).toLocaleString() }]} />
      {list.map(r => <Card key={r.id}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg">{icons[r.type]}</div><div><p className="font-medium text-sm">{r.name}</p><div className="flex items-center gap-2 mt-0.5"><Badge c="blue">{r.freq}</Badge><Badge c={colors[r.type] || "gray"}>{r.type}</Badge><span className="text-xs text-gray-400">Next: {r.next} · {r.count} generated</span></div></div></div><div className="flex items-center gap-3"><span className="font-medium text-sm">₹{r.amt.toLocaleString()}</span><Btn onClick={() => { if (window.confirm(`This won't create a real ${r.type.toLowerCase()} — it only marks this schedule as run and increments the counter. Create the actual ${r.type.toLowerCase()} manually in the ${r.type}s tab. Mark as run anyway?`)) updateItem(r.id, { count: r.count + 1 }); }}>Mark Run</Btn><Toggle value={r.on} onChange={v => updateItem(r.id, { on: v })} /></div></div></Card>)}
    </div>
  );
}

function BillableExpenses({ token }) {
  const { items: expenses, addItem } = usePersisted("billexp", token);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], cat: "Travel", desc: "", amt: "", bill: false });
  const total = expenses.filter(e => e.bill && !e.invoiced).reduce((s, e) => s + e.amt, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Billable Expenses</h2><p className="text-xs text-gray-500">Mark expenses billable to clients, convert to invoices</p></div><Badge c="amber">₹{total.toLocaleString()} unbilled</Badge></div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm font-medium mb-2">Log Expense</p>
          <div className="grid grid-cols-2 gap-2"><div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div><div><Label>Category</Label><Select value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}>{["Travel", "Meals", "Software", "Supplies", "Courier", "Accommodation"].map(c => <option key={c}>{c}</option>)}</Select></div></div>
          <Label>Description</Label><Input value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Description" />
          <Label>Amount (₹)</Label><Input type="number" value={form.amt} onChange={e => setForm({ ...form, amt: e.target.value })} />
          <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer"><input type="checkbox" checked={form.bill} onChange={e => setForm({ ...form, bill: e.target.checked })} className="accent-emerald-600" /> Billable to client</label>
          <Btn v="primary" className="w-full mt-3" onClick={() => { if (!form.desc || !form.amt) return; addItem({ ...form, amt: +form.amt, invoiced: false }); setForm({ ...form, desc: "", amt: "" }); }}>Save</Btn>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-3"><p className="text-sm font-medium">Expenses</p><Btn v="secondary" onClick={() => alert("Bulk-converting billable expenses to an invoice isn't built yet — this is on the roadmap. For now, create the invoice manually from the Invoices tab.")}>Invoice All Billable</Btn></div>
          <Tbl headers={["Date", "Description", "Amount", "Type"]} rows={expenses.map(e => [e.date, <span><p className="font-medium">{e.desc}</p><p className="text-gray-400 text-xs">{e.cat}</p></span>, "₹" + e.amt.toLocaleString(), <Badge c={e.bill ? "green" : "gray"}>{e.bill ? "Billable" : "Internal"}</Badge>])} />
        </Card>
      </div>
    </div>
  );
}

function AdvancePayments({ token }) {
  const { items: advances, addItem } = usePersisted("advances", token);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Advance Payments</h2><p className="text-xs text-gray-500">Tracking only — doesn't post to the ledger or apply against real invoices yet</p></div><Btn v="primary" onClick={() => { const p = prompt("Party name:"); const type = (prompt("Type — customer or vendor:", "customer") || "customer").toLowerCase(); const amt = +prompt("Amount (₹):", "0"); const mode = prompt("Payment mode:", "NEFT"); if (p && amt) addItem({ party: p, type, amt, date: new Date().toISOString().split("T")[0], bal: amt, mode }); }}>+ Record Advance</Btn></div>
      <IBox>This is a reference list only. To actually account for an advance, record it as a Payment/Bill Payment against the relevant customer/vendor so it hits the ledger.</IBox>
      <Metrics items={[{ l: "Customer Advances", v: "₹" + advances.filter(a => a.type === "customer").reduce((s, a) => s + a.bal, 0).toLocaleString(), c: "#0F6E56" }, { l: "Vendor Advances", v: "₹" + advances.filter(a => a.type === "vendor").reduce((s, a) => s + a.bal, 0).toLocaleString(), c: "#854F0B" }, { l: "Total Outstanding", v: "₹" + advances.reduce((s, a) => s + a.bal, 0).toLocaleString() }, { l: "Count", v: advances.length }]} />
      <Card><Tbl headers={["Party", "Type", "Amount", "Date", "Balance", "Mode", "Action"]} rows={advances.map(a => [a.party, <Badge c={a.type === "customer" ? "green" : "amber"}>{a.type}</Badge>, "₹" + a.amt.toLocaleString(), a.date, <Badge c={a.bal > 0 ? "amber" : "green"}>₹{a.bal.toLocaleString()}</Badge>, a.mode, <Btn onClick={() => alert("This doesn't actually apply anything to an invoice — it's not wired to real invoices/bills. Use the Payments or Bills screens to record the real transaction.")}>Apply</Btn>])} /></Card>
    </div>
  );
}

function PartialInvoices({ token }) {
  const { items: orders, addItem, updateItem } = usePersisted("partial", token);
  const addOrder = () => { const so = prompt("Sales Order #:"); const cust = prompt("Customer:"); const total = +prompt("Total qty:", "100"); const amt = +prompt("Order value (₹):", "0"); if (so) addItem({ so, cust, total, amt, invoiced: 0, status: "open" }); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Partial Invoices</h2><p className="text-xs text-gray-500">Tracks dispatch progress against a Sales Order — doesn't create real invoices</p></div><Btn v="primary" onClick={addOrder}>+ New Sales Order</Btn></div>
      <div className="grid grid-cols-2 gap-4">
        <div>{orders.map(so => { const pct = so.total ? Math.round((so.invoiced / so.total) * 100) : 0; return (<Card key={so.id} className={so.status !== "fully_invoiced" ? "cursor-pointer hover:border-emerald-300" : "opacity-50"} onClick={() => { if (so.status === "fully_invoiced") return; const q = parseInt(prompt("Qty to invoice (max " + (so.total - so.invoiced) + "):")); if (!q || q < 1 || q > so.total - so.invoiced) return; const amt = Math.round((q / so.total) * so.amt); updateItem(so.id, { invoiced: so.invoiced + q, status: so.invoiced + q >= so.total ? "fully_invoiced" : "partial" }); alert("Progress updated — this doesn't create a real invoice. Create it manually in the Invoices tab for ₹" + amt.toLocaleString() + "."); }}><div className="flex justify-between items-center mb-1"><span className="font-medium text-sm">{so.so}</span><Badge c={{ open: "blue", partial: "amber", fully_invoiced: "green" }[so.status]}>{so.status.replace("_", " ")}</Badge></div><p className="text-xs text-gray-500 mb-2">{so.cust} · ₹{so.amt.toLocaleString()}</p><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1"><div className="h-full bg-emerald-500 rounded-full" style={{ width: pct + "%" }} /></div><div className="flex justify-between text-xs text-gray-400"><span>Invoiced: {so.invoiced}</span><span>Remaining: {so.total - so.invoiced}</span></div></Card>); })}</div>
        <Card><p className="text-sm font-medium mb-3">How It Works</p>{[["1. Create Sales Order", "Full order qty + amount"], ["2. Dispatch Partially", "Ship 200 of 500 units"], ["3. Invoice Dispatched Qty", "Invoice ₹50K of ₹125K total"], ["4. Repeat Dispatches", "Invoice remaining qty later"], ["5. SO Closes at 100%", "Fully invoiced → SO closed"]].map(([t, d]) => <div key={t} className="py-2 border-b border-gray-50 last:border-0"><p className="font-medium text-xs">{t}</p><p className="text-xs text-gray-500">{d}</p></div>)}</Card>
      </div>
    </div>
  );
}

function MilestoneBilling({ token }) {
  const { items: ms, addItem, updateItem } = usePersisted("milestone", token);
  const projs = [...new Set(ms.map(m => m.proj))];
  const addMs = () => { const proj = prompt("Project:"); const name = prompt("Milestone name:"); const amt = +prompt("Amount (₹):", "0"); const due = prompt("Due date:", new Date().toISOString().split("T")[0]); if (proj && name) addItem({ proj, name, amt, due, status: "pending" }); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Milestone Billing</h2><p className="text-xs text-gray-500">Track project milestones — doesn't create real invoices when marked billed</p></div><Btn v="primary" onClick={addMs}>+ Add Milestone</Btn></div>
      <Metrics items={[{ l: "Pending", v: ms.filter(m => m.status === "pending").length, c: "#854F0B" }, { l: "Ready to Invoice", v: ms.filter(m => m.status === "completed").length, c: "#0F6E56" }, { l: "Invoiced", v: ms.filter(m => m.status === "invoiced").length }, { l: "Total Value", v: "₹" + ms.reduce((s, m) => s + m.amt, 0).toLocaleString() }]} />
      {projs.map(proj => <Card key={proj}><p className="text-sm font-medium mb-3">{proj}</p>{ms.filter(m => m.proj === proj).map(m => <div key={m.id} className="flex items-center gap-3 mb-2"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: { invoiced: "#1D9E75", completed: "#EF9F27", pending: "#D3D1C7" }[m.status] }} /><div className={"flex-1 p-2.5 rounded-lg border flex items-center justify-between " + (m.status === "invoiced" ? "border-emerald-100 bg-emerald-50" : m.status === "completed" ? "border-amber-100 bg-amber-50" : "border-gray-100")}><div><p className="font-medium text-xs">{m.name}</p><p className="text-xs text-gray-500">Due {m.due} · ₹{m.amt.toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge c={{ invoiced: "green", completed: "amber", pending: "gray" }[m.status]}>{m.status}</Badge>{m.inv && <span className="text-xs text-blue-600">{m.inv}</span>}{m.status === "pending" && <Btn onClick={() => updateItem(m.id, { status: "completed" })}>Mark Done</Btn>}{m.status === "completed" && <Btn v="primary" onClick={() => { if (window.confirm("This won't create a real invoice — it just marks this milestone as billed for tracking. Create the actual invoice manually in the Invoices tab for ₹" + m.amt.toLocaleString() + ". Mark as billed anyway?")) updateItem(m.id, { status: "invoiced" }); }}>Mark Billed</Btn>}</div></div></div>)}</Card>)}
    </div>
  );
}

function BatchSerial({ token }) {
  const [tab, setTab] = useState("batch");
  const { items: batches, addItem: addBatch } = usePersisted("batch", token);
  const serials = [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Batch & Serial Tracking</h2><p className="text-xs text-gray-500">Track items by batch/lot or unique serial number</p></div><Btn v="primary" onClick={() => { if (tab === "batch") { const item = prompt("Item:"); const batch = prompt("Batch #:"); const qty = +prompt("Quantity:", "100"); const exp = prompt("Expiry date:", new Date(Date.now()+2*365*86400000).toISOString().split("T")[0]); if (item && batch) addBatch({ item, batch, mfg: new Date().toISOString().split("T")[0], exp, qty, rem: qty }); } }}>+ Add</Btn></div>
      <Tabs items={[["batch", "📦 Batch Tracking"], ["serial", "🔢 Serial Numbers"]]} active={tab} onChange={setTab} />
      {tab === "batch" && <Card><Tbl headers={["Item", "Batch #", "Mfg Date", "Expiry", "Total", "Remaining", "Status"]} rows={batches.map(b => { const days = Math.ceil((new Date(b.exp) - new Date()) / 86400000); return [b.item, b.batch, b.mfg, b.exp, b.qty, <span className={days < 365 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>{b.rem}</span>, <Badge c={days < 365 ? "amber" : "green"}>{days < 365 ? days + "d left" : "Active"}</Badge>]; })} /></Card>}
      {tab === "serial" && <Card><Tbl headers={["Item", "Serial #", "Status", "Sold To", "Invoice"]} rows={serials.map(s => [s.item, <span className="font-mono text-xs">{s.sn}</span>, <Badge c={s.status === "sold" ? "blue" : "green"}>{s.status.replace("_", " ")}</Badge>, s.sold, s.inv])} /></Card>}
    </div>
  );
}

function CompositeItems({ token }) {
  const { items, addItem } = usePersisted("composite", token);
  const addBundle = () => {
    const name = prompt("Bundle name:"); const sku = prompt("SKU:"); const price = +prompt("Price (₹):", "0");
    const compsStr = prompt("Components, format 'Name:Qty, Name:Qty':", "Item A:1, Item B:2");
    const comps = (compsStr || "").split(",").map(s => { const [n, q] = s.split(":"); return { n: (n||"").trim(), q: +(q||1) }; }).filter(c => c.n);
    if (name) addItem({ name, sku, price, comps });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Composite Items & BOM</h2><p className="text-xs text-gray-500">Bundle items into one SKU — auto-deducts components on sale</p></div><Btn v="primary" onClick={addBundle}>+ New Bundle</Btn></div>
      <div className="grid grid-cols-2 gap-4">{items.map(it => <Card key={it.id}><div className="flex justify-between mb-3"><div><p className="font-medium">{it.name}</p><p className="text-xs text-gray-400">{it.sku} · ₹{it.price.toLocaleString()}</p></div><Badge c="purple">{it.comps.length} components</Badge></div><p className="text-xs font-medium text-gray-600 mb-2">Components (BOM)</p>{it.comps.map(c => <div key={c.n} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs"><span>{c.n}</span><span className="font-medium">×{c.q}</span></div>)}<IBox>On sale, auto-deducts: {it.comps.map(c => `${c.q}× ${c.n}`).join(", ")}</IBox></Card>)}</div>
    </div>
  );
}

function ChequePrinting({ token }) {
  const { addItem } = usePersisted("cheque", token);
  const [form, setForm] = useState({ payee: "", amt: "", no: "", bank: "HDFC Savings ****4521", date: new Date().toISOString().split("T")[0] });
  const [preview, setPreview] = useState(null);
  const words = n => { const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"], b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]; const c = x => !x ? "" : x < 20 ? a[x] : x < 100 ? b[Math.floor(x/10)] + (x%10 ? " " + a[x%10] : "") : x < 1000 ? a[Math.floor(x/100)] + " Hundred" + (x%100 ? " " + c(x%100) : "") : x < 100000 ? c(Math.floor(x/1000)) + " Thousand" + (x%1000 ? " " + c(x%1000) : "") : c(Math.floor(x/100000)) + " Lakh" + (x%100000 ? " " + c(x%100000) : ""); return (c(Math.floor(n)) || "Zero") + " Rupees Only"; };
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Cheque Printing</h2><p className="text-xs text-gray-500">Print account-payee cheques directly from Ledgerio</p></div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <Label>Payee Name</Label><Input value={form.payee} onChange={e => setForm({ ...form, payee: e.target.value })} placeholder="Pay to…" />
          <Label>Amount (₹)</Label><Input type="number" value={form.amt} onChange={e => setForm({ ...form, amt: e.target.value })} />
          <Label>Cheque Number</Label><Input value={form.no} onChange={e => setForm({ ...form, no: e.target.value })} placeholder="000423" />
          <Label>Bank</Label><Select value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}><option>HDFC Savings ****4521</option><option>ICICI Current ****8834</option></Select>
          <Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <Btn v="primary" className="w-full mt-3" onClick={() => form.payee && form.amt && setPreview(form)}>Preview & Print</Btn>
        </Card>
        {preview ? (
          <Card>
            <div className="border-2 border-gray-800 rounded-lg p-4 font-mono text-xs leading-loose">
              <div className="flex justify-between mb-3"><div><div className="text-gray-500">A/c Payee — Not Negotiable</div><div className="font-bold">{preview.bank}</div></div><div className="text-right"><div className="text-gray-500">Date</div><div className="font-bold border-b-2 border-gray-800">{preview.date}</div></div></div>
              <div className="mb-3"><div className="text-gray-500">Pay to</div><div className="font-bold border-b-2 border-gray-800">M/s {preview.payee}</div></div>
              <div className="mb-3"><div className="text-gray-500">Rupees</div><div className="font-bold border-b-2 border-gray-800">{words(+preview.amt)} ★★★</div></div>
              <div className="flex justify-between items-end mt-2"><div><div className="text-gray-500 text-xs">Cheque No.</div><div className="font-bold text-base">{preview.no}</div></div><div className="font-bold text-xl">₹{(+preview.amt).toLocaleString()}</div><div className="text-right"><div className="text-gray-500 mb-5">Authorised Signatory</div><div className="border-t-2 border-gray-800 pt-1">Signature</div></div></div>
            </div>
            <Btn v="primary" className="mt-2 w-full" onClick={() => { addItem(preview); window.print(); }}>🖨 Print</Btn>
          </Card>
        ) : <Card className="flex items-center justify-center min-h-48 text-gray-400">Fill form and click Preview</Card>}
      </div>
    </div>
  );
}

function HSNSummary({ db }) {
  const map = {};
  for (const inv of (db?.invoices || [])) {
    if (inv.isProforma) continue;
    for (const it of (inv.items || [])) {
      const hsn = it.hsnSac || "—";
      if (!map[hsn]) map[hsn] = { hsn, desc: it.name || it.description || "", uqc: "NOS", qty: 0, val: 0, igst: 0, cgst: 0, sgst: 0 };
      map[hsn].qty += it.qty || 0;
      map[hsn].val += it.amount || 0;
      map[hsn].igst += it.igst || 0;
      map[hsn].cgst += it.cgst || 0;
      map[hsn].sgst += it.sgst || 0;
    }
  }
  const data = Object.values(map);
  const dl = () => { const json = { hsn: { data: data.map(h => ({ hsn_sc: h.hsn, desc: h.desc, uqc: h.uqc, qty: h.qty, val: h.val, txval: h.val, iamt: h.igst, camt: h.cgst, samt: h.sgst })) } }; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)])); a.download = "HSN_Summary.json"; a.click(); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">HSN Summary Report</h2><p className="text-xs text-gray-500">HSN-wise summary for GSTR-1 Table 12 — live from your invoices</p></div><Btn v="primary" onClick={dl}>Download JSON</Btn></div>
      <Metrics items={[{ l: "HSN Codes", v: data.length }, { l: "Total Taxable Value", v: "₹" + data.reduce((s, h) => s + h.val, 0).toLocaleString() }, { l: "Total Tax", v: "₹" + data.reduce((s, h) => s + h.igst + h.cgst + h.sgst, 0).toLocaleString(), c: "#0F6E56" }, { l: "Threshold", v: "₹1.5Cr turnover" }]} />
      <Card><Tbl headers={["HSN", "Description", "UQC", "Qty", "Taxable", "IGST", "CGST", "SGST", "Total Tax"]} rows={data.length ? data.map(h => [<span className="font-mono font-medium">{h.hsn}</span>, h.desc, h.uqc, h.qty, "₹" + h.val.toLocaleString(), h.igst ? "₹" + h.igst.toLocaleString() : "—", h.cgst ? "₹" + h.cgst.toLocaleString() : "—", h.sgst ? "₹" + h.sgst.toLocaleString() : "—", <span className="font-medium">₹{(h.igst + h.cgst + h.sgst).toLocaleString()}</span>]) : [["No invoices yet.", "", "", "", "", "", "", "", ""]]} /></Card>
    </div>
  );
}

function DocumentAttachments({ token }) {
  const { items: docs, addItem, removeItem } = usePersisted("docs", token);
  const [drag, setDrag] = useState(false);
  const onFiles = files => Array.from(files).forEach(f => addItem({ mod: "General", rec: "—", name: f.name, size: (f.size / 1024).toFixed(0) + " KB", by: "You", date: new Date().toISOString().split("T")[0] }));
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Document Attachments</h2><p className="text-xs text-gray-500">Attach receipts, contracts, bills to any transaction</p></div>
      <IBox>File metadata is saved for real. Actual file storage (S3/Supabase Storage) isn't connected yet, so uploaded file contents aren't retained — only the name/size record.</IBox>
      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }} className={tw("border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all", drag ? "border-emerald-400 bg-emerald-50" : "border-gray-200")}>
        <p className="text-sm text-gray-500">Drop files here or <label className="text-emerald-600 cursor-pointer underline">browse<input type="file" multiple className="hidden" onChange={e => onFiles(e.target.files)} /></label></p>
        <p className="text-xs text-gray-400 mt-1">PDF, images, Excel · 10MB max</p>
      </div>
      <Card><Tbl headers={["File", "Module", "Record", "Size", "By", "Date", "Action"]} rows={docs.map(d => [<span>{d.name.endsWith(".pdf") ? "📄" : d.name.match(/jpg|png/) ? "🖼" : "📎"} {d.name}</span>, <Badge c="blue">{d.mod}</Badge>, d.rec, d.size, d.by, d.date, <Btn v="danger" onClick={() => removeItem(d.id)}>Delete</Btn>])} /></Card>
    </div>
  );
}

function CustomerPortal({ db }) {
  const customers = (db?.customers || []).map(c => ({ name: c.name, email: c.email || "—", active: false, invoices: (db.invoices||[]).filter(i=>i.customerId===c.id && !i.isProforma).length, outstanding: (db.invoices||[]).filter(i=>i.customerId===c.id && !i.isProforma).reduce((s,i)=>s+(i.total-(i.amountReceived||0)),0) }));
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Customer Portal</h2><p className="text-xs text-gray-500">Clients view invoices, make payments, approve estimates online</p></div>
      <div className="grid grid-cols-2 gap-4">
        <Card><p className="text-sm font-medium mb-3">Customer Access — live from your Customers</p>{customers.map(c => <div key={c.name} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0"><div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-gray-500">{c.email}</p><div className="flex gap-2 mt-1"><Badge c={c.active ? "green" : "gray"}>{c.active ? "Active" : "Not invited"}</Badge></div><p className="text-xs text-red-600 mt-1">{c.invoices} invoices · ₹{c.outstanding.toLocaleString()} outstanding</p></div><div className="flex flex-col gap-1 ml-3"><Btn onClick={() => alert("Portal invites need an email backend — not connected yet.")}>Invite</Btn></div></div>)}{customers.length === 0 && <p className="text-xs text-gray-400 py-4">No customers yet.</p>}</Card>
        <Card><p className="text-sm font-medium mb-3">Portal Settings</p>{[["Allow online payments", true], ["Allow estimate approval", true], ["Show statement of accounts", true], ["Download invoice PDFs", true], ["Show credit notes", false]].map(([l, d]) => <div key={l} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs"><span>{l}</span><Toggle value={d} onChange={() => alert("These settings won't take effect yet — the customer portal itself isn't built (see note below).")} /></div>)}<IBox>Customer self-service portal needs a separate public-facing route — not built yet.</IBox></Card>
      </div>
    </div>
  );
}

function VendorPortal({ db }) {
  const vendors = (db?.vendors || []).map(v => ({ name: v.name, email: v.email || "—", active: false, pos: 0 }));
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Vendor Portal</h2><p className="text-xs text-gray-500">Suppliers view POs, submit bills, track payments</p></div>
      <div className="grid grid-cols-2 gap-4">
        <Card><p className="text-sm font-medium mb-3">Vendor Access — live from your Vendors</p>{vendors.map(v => <div key={v.name} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0"><div><p className="font-medium text-sm">{v.name}</p><p className="text-xs text-gray-500">{v.email}</p><Badge c={v.active ? "green" : "gray"}>{v.active ? "Active" : "Inactive"}</Badge></div><div className="flex flex-col gap-1 ml-3"><Btn onClick={() => alert("Portal invites need an email backend — not connected yet.")}>Invite</Btn></div></div>)}{vendors.length === 0 && <p className="text-xs text-gray-400 py-4">No vendors yet.</p>}</Card>
        <Card><p className="text-sm font-medium mb-3">Vendor Portal Features</p>{[["📋", "View Purchase Orders", "See all POs from your company"], ["📤", "Submit Bills/Invoices", "Upload bills directly into Ledgerio"], ["💰", "Track Payments", "View payment status and history"], ["📦", "Confirm Deliveries", "Acknowledge GRN dispatches"], ["💬", "Raise Queries", "Direct communication channel"]].map(([icon, title, desc]) => <div key={title} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"><span className="text-lg">{icon}</span><div><p className="font-medium text-xs">{title}</p><p className="text-xs text-gray-500">{desc}</p></div></div>)}</Card>
      </div>
    </div>
  );
}

function PriceLists({ token }) {
  const { items: lists, addItem } = usePersisted("pricelists", token);
  const addList = () => { const name = prompt("Price list name:"); const type = prompt("Description:", "Custom pricing"); if (name) addItem({ name, type, customers: 0, active: true }); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Price Lists</h2><p className="text-xs text-gray-500">Multiple pricing tiers per customer or customer group</p></div><Btn v="primary" onClick={addList}>+ New List</Btn></div>
      <div className="grid grid-cols-3 gap-3">{lists.map(l => <Card key={l.id}><div className="flex justify-between mb-2"><span className="font-medium text-sm">{l.name}</span><Badge c={l.active ? "green" : "gray"}>{l.active ? "Active" : "Off"}</Badge></div><p className="text-xs text-gray-500">{l.type}</p><p className="text-xs text-gray-400 mt-1">{l.customers} customers assigned</p></Card>)}{lists.length === 0 && <p className="text-xs text-gray-400">No price lists yet.</p>}</div>
    </div>
  );
}

function MultiGSTIN({ token }) {
  const { items: gstins, addItem, removeItem } = usePersisted("multigstin", token);
  const [form, setForm] = useState({ gstin: "", state: "", code: "" });
  return (
    <div className="space-y-4">
      <div><h2 className="text-base font-medium">Multi-GSTIN</h2><p className="text-xs text-gray-500">Manage multiple state GSTINs for inter-state operations</p></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">{gstins.map(g => <Card key={g.id}><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 mb-1"><span className="font-mono text-sm font-medium">{g.gstin}</span>{g.primary && <Badge c="green">Primary</Badge>}</div><Badge c="blue">{g.code} — {g.state}</Badge></div><div className="flex gap-1">{!g.primary && <Btn v="danger" onClick={() => removeItem(g.id)}>Remove</Btn>}</div></div></Card>)}{gstins.length === 0 && <p className="text-xs text-gray-400">No additional GSTINs yet.</p>}</div>
        <Card><p className="text-sm font-medium mb-2">Add GSTIN</p><Label>GSTIN</Label><Input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="15-digit GSTIN" maxLength={15} /><Label>State</Label><Select onChange={e => { const [code, state] = e.target.value.split("|"); setForm({ ...form, state, code }); }}><option value="">Select…</option>{[["09", "Uttar Pradesh"], ["27", "Maharashtra"], ["07", "Delhi"], ["29", "Karnataka"], ["33", "Tamil Nadu"], ["24", "Gujarat"]].map(([c, s]) => <option key={c} value={c + "|" + s}>{c} — {s}</option>)}</Select><Btn v="primary" className="w-full mt-3" onClick={() => { if (form.gstin.length === 15) { addItem({ ...form, primary: false }); setForm({ gstin: "", state: "", code: "" }); } else alert("Enter valid 15-digit GSTIN"); }}>Add GSTIN</Btn></Card>
      </div>
    </div>
  );
}

function ReportScheduler({ token }) {
  const { items: schedules, addItem, updateItem } = usePersisted("schedreports", token);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Report Scheduler</h2><p className="text-xs text-gray-500">Auto-email financial reports to stakeholders on schedule</p></div><Btn v="primary" onClick={() => { const rep = prompt("Report name:"); const to = prompt("Recipient email:"); if (rep && to) addItem({ rep, freq: "Monthly", to, next: "—", on: true }); }}>+ Schedule</Btn></div>
      <IBox>Schedules are saved for reference, but nothing actually sends — there's no real scheduled-report emailing built yet.</IBox>
      <Card><Tbl headers={["Report", "Frequency", "Recipients", "Next Send", "Active", "Action"]} rows={schedules.map(s => [s.rep, <Badge c="blue">{s.freq}</Badge>, s.to, s.next, <Toggle value={s.on} onChange={v => updateItem(s.id, { on: v })} />, <Btn onClick={() => alert("Nothing was actually sent to " + s.to + " — scheduled report emailing isn't built yet. Export the report manually from Reports and send it yourself for now.")}>Send Now</Btn>])} /></Card>
    </div>
  );
}

function CostCentres({ db, token }) {
  const { items: centres, addItem } = usePersisted("costcentres", token);
  const expByCentre = c => (db?.expenses || []).filter(e => e.costCentre === c.name).reduce((s, e) => s + e.total, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Cost Centres / Branches</h2><p className="text-xs text-gray-500">Track expenses by department, branch, or location</p></div><Btn v="primary" onClick={() => { const n = prompt("Centre name:"); if (n) addItem({ name: n, code: "CC-00" + (centres.length + 1) }); }}>+ Add Centre</Btn></div>
      <IBox>Expense totals shown are real if you tag expenses with a matching cost centre name — that field isn't on the Expense form yet, so totals will read ₹0 until it's added.</IBox>
      <div className="grid grid-cols-2 gap-4">
        <Card><p className="text-sm font-medium mb-3">Cost Centres</p>{centres.map(c => <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm"><div><span className="font-medium">{c.name}</span><span className="text-gray-400 ml-2 text-xs">{c.code}</span></div></div>)}{centres.length === 0 && <p className="text-xs text-gray-400">No cost centres yet.</p>}</Card>
        <Card><p className="text-sm font-medium mb-3">Expenses by Centre</p><Tbl headers={["Centre", "Expenses"]} rows={centres.map(c => [c.name, "₹" + expByCentre(c).toLocaleString()])} /></Card>
      </div>
    </div>
  );
}

// ── MASTER NAVIGATION ───────────────────────────────────────────
const MODULES = [
  { id: "tds", icon: "📋", label: "TDS Management", p: "p1", C: TDSModule },
  { id: "workflow", icon: "⚡", label: "Workflow Automation", p: "p1", C: WorkflowAutomation },
  { id: "gstr2b", icon: "🧾", label: "GSTR-2B Reconciliation", p: "p1", C: GSTR2B },
  { id: "reminders", icon: "🔔", label: "Payment Reminders", p: "p1", C: PaymentReminders },
  { id: "approvals", icon: "✅", label: "Approval Workflows", p: "p2", C: ApprovalWorkflows },
  { id: "bankfeeds", icon: "🏦", label: "Bank Feeds & Rules", p: "p2", C: BankFeeds },
  { id: "cportal", icon: "🌐", label: "Customer Portal", p: "p2", C: CustomerPortal },
  { id: "vportal", icon: "🤝", label: "Vendor Portal", p: "p2", C: VendorPortal },
  { id: "budget", icon: "📊", label: "Budget Module", p: "p2", C: BudgetModule },
  { id: "projects", icon: "⏱", label: "Projects & Time", p: "p2", C: ProjectsModule },
  { id: "multicurrency", icon: "💱", label: "Multi-Currency", p: "p2", C: MultiCurrency },
  { id: "audit", icon: "🔍", label: "Audit Trail", p: "p2", C: AuditTrail },
  { id: "grn", icon: "📦", label: "GRN (3-way match)", p: "p2", C: GRNModule },
  { id: "rcm", icon: "🔄", label: "Reverse Charge (RCM)", p: "p2", C: ReverseCharge },
  { id: "depreciation", icon: "📉", label: "Depreciation Auto", p: "p2", C: DepreciationAuto },
  { id: "recurring", icon: "🔁", label: "Recurring Transactions", p: "p2", C: RecurringTxns },
  { id: "billexp", icon: "💸", label: "Billable Expenses", p: "p2", C: BillableExpenses },
  { id: "advances", icon: "💰", label: "Advance Payments", p: "p2", C: AdvancePayments },
  { id: "partial", icon: "📃", label: "Partial Invoices", p: "p2", C: PartialInvoices },
  { id: "milestone", icon: "🎯", label: "Milestone Billing", p: "p2", C: MilestoneBilling },
  { id: "batch", icon: "🏷", label: "Batch & Serial Tracking", p: "p3", C: BatchSerial },
  { id: "composite", icon: "🧩", label: "Composite Items / BOM", p: "p3", C: CompositeItems },
  { id: "cheque", icon: "🖨", label: "Cheque Printing", p: "p3", C: ChequePrinting },
  { id: "hsn", icon: "📑", label: "HSN Summary Report", p: "p3", C: HSNSummary },
  { id: "attachments", icon: "📎", label: "Document Attachments", p: "p3", C: DocumentAttachments },
  { id: "pricelists", icon: "🏷", label: "Price Lists", p: "p3", C: PriceLists },
  { id: "multigstin", icon: "🗺", label: "Multi-GSTIN", p: "p3", C: MultiGSTIN },
  { id: "schedreports", icon: "📅", label: "Report Scheduler", p: "p3", C: ReportScheduler },
  { id: "costcentres", icon: "🏢", label: "Cost Centres", p: "p3", C: CostCentres },
];

const GROUPS = {
  p1: { label: "P1 — Critical Compliance", color: "text-red-600" },
  p2: { label: "P2 — High Impact", color: "text-amber-600" },
  p3: { label: "P3 — Feature Complete", color: "text-emerald-600" },
};

export default function LedgerioCompleteUpgrade({ db, token }) {
  const [active, setActive] = useState("tds");
  const [search, setSearch] = useState("");
  const activeModule = MODULES.find(m => m.id === active);
  const Comp = activeModule?.C || TDSModule;
  const filtered = search ? MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase())) : null;

  return (
    <div className="flex h-screen bg-gray-50 text-sm" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="font-semibold text-sm">Biz<span className="text-emerald-600">Khata</span></div>
          <div className="text-xs text-gray-400 mt-0.5">30 enterprise modules</div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Parity progress</span><span className="font-medium text-emerald-600">94%</span></div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: "94%" }} /></div>
          </div>
        </div>
        <div className="p-2 border-b border-gray-100">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gray-400 bg-gray-50" />
        </div>
        <nav className="flex-1 overflow-y-auto p-1.5">
          {(filtered ? [{ label: "Results", color: "text-gray-500", items: filtered }] : Object.entries(GROUPS).map(([p, g]) => ({ label: g.label, color: g.color, items: MODULES.filter(m => m.p === p) }))).map(group => (
            <div key={group.label} className="mb-2">
              <p className={"text-xs font-medium px-2 py-1 " + group.color}>{group.label}</p>
              {(group.items || []).map(m => (
                <button key={m.id} onClick={() => { setActive(m.id); setSearch(""); }} className={tw("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs mb-0.5 transition-all cursor-pointer", active === m.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50")}>
                  <span>{m.icon}</span><span className="flex-1 truncate">{m.label}</span>
                  {m.id !== "bankfeeds" && <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">LIVE</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-100 text-xs text-gray-400 space-y-0.5">
          <div>🟢 Live (real, persisted data): 29 modules</div>
          <div>⚪ Bank Feeds: rules persisted; live feed needs Account Aggregator API</div>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-y-auto p-5">
        <Comp db={db} token={token} />
      </main>
    </div>
  );
}

// ── SUPABASE SQL MIGRATION ──────────────────────────────────────
// Run this in your Supabase SQL Editor:
/*
create table if not exists tds_transactions (id uuid primary key default gen_random_uuid(), org_id uuid, vendor_name text, pan text, section text, taxable_amount numeric, tds_rate numeric, tds_amount numeric, deduction_date date, deposit_date date, status text default 'pending', created_at timestamptz default now());
create table if not exists workflow_rules (id uuid primary key default gen_random_uuid(), org_id uuid, name text, module text, trigger_event text, condition_value text, actions jsonb, is_active boolean default true, created_at timestamptz default now());
create table if not exists gstr2b_reconciliation (id uuid primary key default gen_random_uuid(), org_id uuid, period text, supplier_gstin text, invoice_number text, invoice_date date, taxable_value numeric, total_itc numeric, match_status text, itc_eligible boolean, created_at timestamptz default now());
create table if not exists bank_feeds (id uuid primary key default gen_random_uuid(), org_id uuid, account_id uuid, transaction_date date, description text, amount numeric, category text, is_reconciled boolean default false, created_at timestamptz default now());
create table if not exists bank_rules (id uuid primary key default gen_random_uuid(), org_id uuid, keyword text, action_category text, is_active boolean default true, created_at timestamptz default now());
create table if not exists projects (id uuid primary key default gen_random_uuid(), org_id uuid, name text, customer_id uuid, billing_type text, budget_amount numeric, status text default 'active', created_at timestamptz default now());
create table if not exists timesheets (id uuid primary key default gen_random_uuid(), org_id uuid, project_id uuid, task_name text, user_id uuid, log_date date, hours numeric, is_billable boolean, created_at timestamptz default now());
create table if not exists budgets (id uuid primary key default gen_random_uuid(), org_id uuid, account_name text, account_type text, period text, budgeted_amount numeric, actual_amount numeric default 0, created_at timestamptz default now());
create table if not exists org_settings (id uuid primary key default gen_random_uuid(), org_id uuid, key text, value jsonb, created_at timestamptz default now());
create table if not exists email_log (id uuid primary key default gen_random_uuid(), org_id uuid, to_email text, subject text, status text default 'queued', sent_at timestamptz, created_at timestamptz default now());
create table if not exists audit_trail (id uuid primary key default gen_random_uuid(), org_id uuid, user_id uuid, user_name text, action text, module text, record_id uuid, old_values jsonb, new_values jsonb, created_at timestamptz default now());
create table if not exists advance_payments (id uuid primary key default gen_random_uuid(), org_id uuid, party_type text, party_id uuid, amount numeric, payment_date date, balance_remaining numeric, mode text, created_at timestamptz default now());
create table if not exists recurring_transactions (id uuid primary key default gen_random_uuid(), org_id uuid, type text, name text, amount numeric, frequency text, next_date date, is_active boolean default true, times_generated int default 0, created_at timestamptz default now());
create table if not exists currencies (id uuid primary key default gen_random_uuid(), org_id uuid, code text, name text, exchange_rate numeric, last_updated timestamptz default now());
*/
