import React from "react";
import {
  FileText, TrendingUp, Shield, Users, Zap, Star, Check, X,
  Store, Briefcase, Factory, Truck, Lock, ShieldCheck, Database, KeyRound,
  Mail, MessageCircle, BookOpen, Sparkles, Calculator
} from "lucide-react";

interface NavProps { onGetStarted: () => void; onLogin: () => void; onNavigate: (path: string) => void; }

export function MarketingNav({ onGetStarted, onLogin, onNavigate }: NavProps) {
  return (
    <nav className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
          <span className="font-bold text-white text-lg">Ledgerio</span>
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <button onClick={() => onNavigate('/features')} className="hover:text-white transition">Features</button>
          <button onClick={() => onNavigate('/industries')} className="hover:text-white transition">Industries</button>
          <button onClick={() => onNavigate('/compare')} className="hover:text-white transition">Compare</button>
          <button onClick={() => onNavigate('/ai')} className="hover:text-white transition">AI</button>
          <button onClick={() => onNavigate('/pricing')} className="hover:text-white transition">Pricing</button>
          <button onClick={() => onNavigate('/resources')} className="hover:text-white transition">Resources</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onLogin} className="text-sm text-slate-300 hover:text-white font-medium px-3 py-1.5">Sign in</button>
          <button onClick={onGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold px-4 py-2 rounded-lg transition">Try free</button>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10 text-sm">
          <div>
            <h4 className="font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => onNavigate('/features')} className="hover:text-white transition">Features</button></li>
              <li><button onClick={() => onNavigate('/compare')} className="hover:text-white transition">Compare</button></li>
              <li><button onClick={() => onNavigate('/pricing')} className="hover:text-white transition">Pricing</button></li>
              <li><button onClick={() => onNavigate('/security')} className="hover:text-white transition">Security</button></li>
              <li><button onClick={() => onNavigate('/ai')} className="hover:text-white transition">AI Features</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Company</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => onNavigate('/')} className="hover:text-white transition">About</button></li>
              <li><button onClick={() => onNavigate('/careers')} className="hover:text-white transition">Careers</button></li>
              <li><button onClick={() => onNavigate('/contact')} className="hover:text-white transition">Contact</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Resources</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => onNavigate('/docs')} className="hover:text-white transition">Documentation</button></li>
              <li><button onClick={() => onNavigate('/blog')} className="hover:text-white transition">Blog</button></li>
              <li><button onClick={() => onNavigate('/resources')} className="hover:text-white transition">Resource Hub</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="/api/legal/tos" target="_blank" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="/api/legal/privacy" target="_blank" className="hover:text-white transition">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-bold text-[10px]">L</div>
            <span>© 2026 Ledgerio · Verma Consultancy Services · Varanasi, UP</span>
          </div>
          <a href="mailto:support@bizkhata.app" className="hover:text-slate-300">support@bizkhata.app</a>
        </div>
      </div>
    </footer>
  );
}

function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
      <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-emerald-400 font-semibold mb-5">{eyebrow}</div>
      <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">{title}</h1>
      <p className="text-slate-400 text-lg max-w-2xl mx-auto">{subtitle}</p>
    </section>
  );
}

interface PageShellProps extends NavProps { children: React.ReactNode; }
function PageShell({ onGetStarted, onLogin, onNavigate, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <MarketingNav onGetStarted={onGetStarted} onLogin={onLogin} onNavigate={onNavigate} />
      {children}
      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
}

// ───────────────────────────── FEATURES PAGE ─────────────────────────────
const FEATURE_GROUPS = [
  { icon: FileText, title: "Invoicing & Billing", items: ["GST-compliant invoices with auto CGST/SGST/IGST split", "Bills and expense tracking", "Recurring and one-off billing", "Custom document numbering series", "PDF export with branded templates"] },
  { icon: TrendingUp, title: "Reports & Compliance", items: ["P&L, Balance Sheet, Cash Flow, Trial Balance", "GSTR-1 / 3B / 9 ready reports", "TDS/TCS auto-deduction and RCM entries", "HSN/SAC code tracking", "MSME vendor tracking"] },
  { icon: Users, title: "Team & Access", items: ["Role-based permissions per user", "Invite your accountant or CA", "Seat-based plans that scale with your team", "Full audit trail of every change"] },
  { icon: Zap, title: "Automation", items: ["Workflow rules that fire on real events (invoice created, bill received, overdue)", "Automatic email/notification actions", "Bank reconciliation", "30+ configurable advanced modules"] },
  { icon: Sparkles, title: "AI Copilot", items: ["Ask questions about your own books in plain language", "Explains journal entries and suggests categories", "Flags anomalies before they become problems"] },
  { icon: Shield, title: "Security", items: ["HTTPS everywhere", "Scrypt password hashing", "HMAC-signed sessions", "Per-organization data isolation"] },
];

export function FeaturesPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="FEATURES" title="Everything your books need, in one place" subtitle="A full breakdown of what Ledgerio does today — not a wishlist, what's actually built and working." />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {FEATURE_GROUPS.map(g => {
          const Icon = g.icon;
          return (
            <div key={g.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-emerald-400" /></div>
                <h3 className="font-bold text-white">{g.title}</h3>
              </div>
              <ul className="space-y-2">
                {g.items.map(i => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{i}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </PageShell>
  );
}

// ───────────────────────────── INDUSTRIES PAGE ─────────────────────────────
const INDUSTRIES_DETAIL = [
  { icon: Store, title: "Retail & Trading", desc: "Fast billing at the counter, GST-ready invoices, and reports built for high transaction volume.", points: ["Quick invoice creation", "HSN-coded billing", "GSTR-1/3B reports ready for filing"] },
  { icon: Briefcase, title: "Services & Consulting", desc: "Recurring invoices, project-based billing, and expense tracking for agencies and consultants.", points: ["Recurring invoice automation", "Multi-user access for your team", "TDS handling on professional fees"] },
  { icon: Factory, title: "Manufacturing", desc: "HSN-coded billing, purchase tracking, and TDS handling across your supply chain.", points: ["Bill and purchase order tracking", "RCM (reverse charge) entries", "Vendor MSME tracking"] },
  { icon: Truck, title: "Freelancers & Contractors", desc: "Simple GST invoicing and expense tracking without needing a full accounting team.", points: ["Free plan covers solo use", "Simple expense capture", "GST calculation without a CA on retainer"] },
];

export function IndustriesPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="INDUSTRIES" title="Built for how Indian businesses actually work" subtitle="Whatever you sell or bill for, Ledgerio's core workflow — invoice, track, comply — fits." />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 space-y-6">
        {INDUSTRIES_DETAIL.map(ind => {
          const Icon = ind.icon;
          return (
            <div key={ind.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-6 flex flex-col sm:flex-row gap-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0"><Icon className="w-6 h-6 text-blue-400" /></div>
              <div>
                <h3 className="font-bold text-white text-lg mb-1">{ind.title}</h3>
                <p className="text-sm text-slate-400 mb-3">{ind.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {ind.points.map(p => <span key={p} className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full">{p}</span>)}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </PageShell>
  );
}

// ───────────────────────────── COMPARE PAGE ─────────────────────────────
const COMPARE_ROWS = [
  { feature: "Deployment", ledgerio: "Cloud (any device)", zoho: "Cloud", vyapar: "Desktop/Mobile app", tally: "Desktop only" },
  { feature: "Starting price", ledgerio: "₹999/mo", zoho: "₹749/mo", vyapar: "₹3,421/yr", tally: "₹27,000+" },
  { feature: "Free plan", ledgerio: true, zoho: false, vyapar: false, tally: false },
  { feature: "Multi-user roles", ledgerio: true, zoho: true, vyapar: false, tally: true },
  { feature: "GSTR-1/3B/9 reports", ledgerio: true, zoho: true, vyapar: true, tally: true },
  { feature: "e-Invoicing (IRN)", ledgerio: "Beta", zoho: true, vyapar: true, tally: true },
  { feature: "TDS management", ledgerio: true, zoho: true, vyapar: false, tally: true },
  { feature: "Workflow automation", ledgerio: true, zoho: true, vyapar: false, tally: false },
  { feature: "AI accounting copilot", ledgerio: true, zoho: false, vyapar: false, tally: false },
  { feature: "No installation needed", ledgerio: true, zoho: true, vyapar: false, tally: false },
];
function CompareCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-slate-600 mx-auto" />;
  return <span className="text-xs text-slate-300">{value}</span>;
}

export function ComparePage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="COMPARE" title="Ledgerio vs the field" subtitle="An honest look — we're newer than these players and still building out some features." />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th className="p-3 font-semibold text-slate-300">Feature</th>
                <th className="p-3 font-semibold text-emerald-400 text-center bg-emerald-500/10">Ledgerio</th>
                <th className="p-3 font-semibold text-slate-300 text-center">Zoho Books</th>
                <th className="p-3 font-semibold text-slate-300 text-center">Vyapar</th>
                <th className="p-3 font-semibold text-slate-300 text-center">TallyPrime</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                  <td className="p-3 text-slate-300">{row.feature}</td>
                  <td className="p-3 text-center bg-emerald-500/5"><CompareCell value={row.ledgerio} /></td>
                  <td className="p-3 text-center"><CompareCell value={row.zoho} /></td>
                  <td className="p-3 text-center"><CompareCell value={row.vyapar} /></td>
                  <td className="p-3 text-center"><CompareCell value={row.tally} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 text-center mt-4">Competitor pricing/features as publicly listed at time of writing — verify current details on their sites.</p>
      </section>
    </PageShell>
  );
}

// ───────────────────────────── AI PAGE ─────────────────────────────
export function AIPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="AI" title="An AI copilot for your books" subtitle="Ask questions in plain language, get explanations, and let automation handle repetitive follow-ups." />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[
          { icon: Sparkles, title: "AI Copilot Chat", desc: "Ask questions about your own data — \"what's my outstanding receivables?\" or \"explain this journal entry\" — and get a plain-language answer grounded in your actual books." },
          { icon: Zap, title: "Workflow Automation", desc: "Set rules that fire on real events — Invoice Created, Invoice Approved, Bill Received, Payment Overdue — and trigger real actions: send an email, post an in-app notification, or require approval." },
          { icon: Calculator, title: "Anomaly Awareness", desc: "The copilot can help you spot entries that look inconsistent with your usual patterns, so mistakes get caught before they turn into a reconciliation headache." },
          { icon: BookOpen, title: "Plain-language explanations", desc: "New to double-entry accounting? Ask the copilot to explain any entry or report in everyday terms instead of accounting jargon." },
        ].map(f => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-6">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-emerald-400" /></div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 text-center">
        <p className="text-xs text-slate-500 bg-white/[0.03] border border-white/10 rounded-xl p-4">
          Honesty note: the AI copilot answers based on your real data and general accounting knowledge — it isn't a substitute for professional tax or legal advice, and workflow automation currently covers a defined set of triggers (see Features), not a fully open-ended rules engine.
        </p>
      </section>
    </PageShell>
  );
}

// ───────────────────────────── RESOURCES HUB ─────────────────────────────
export function ResourcesPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="RESOURCES" title="Resource Hub" subtitle="Guides, documentation, and answers to common questions." />
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: BookOpen, title: "Documentation", desc: "Getting-started guides for setting up your organization, inviting your team, and creating your first invoice.", path: "/docs" },
          { icon: MessageCircle, title: "Blog", desc: "Notes on GST compliance, accounting practices, and product updates.", path: "/blog" },
          { icon: Mail, title: "Contact & Support", desc: "Reach us directly — real humans, no ticket queue.", path: "/contact" },
        ].map(r => {
          const Icon = r.icon;
          return (
            <button key={r.title} onClick={() => props.onNavigate(r.path)} className="text-left bg-white/[0.04] rounded-xl border border-white/10 p-6 hover:bg-white/[0.06] transition">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-emerald-400" /></div>
              <h3 className="font-bold text-white mb-2">{r.title}</h3>
              <p className="text-sm text-slate-400">{r.desc}</p>
            </button>
          );
        })}
      </section>
    </PageShell>
  );
}

// ───────────────────────────── DOCS PAGE ─────────────────────────────
const DOCS_SECTIONS = [
  { title: "Getting Started", items: [
    { q: "Creating your organization", a: "Sign up, verify your email with the OTP sent to you, choose a plan, and set your company name. GSTIN is optional and can be added later from Settings > Profile." },
    { q: "Inviting your team", a: "Go to Settings > Users, and invite teammates by email. Each plan has a seat limit — you'll be prompted to upgrade if you try to exceed it." },
    { q: "Creating your first invoice", a: "From the Sales tab, click New Invoice, add your customer and line items — GST is calculated automatically based on the HSN/SAC code and place of supply." },
  ]},
  { title: "GST & Compliance", items: [
    { q: "How GST calculation works", a: "CGST/SGST is applied for intra-state transactions, IGST for inter-state, based on your company's registered state versus the customer's billing state." },
    { q: "e-Invoicing (IRN) status", a: "e-Invoicing is currently in beta — the workflow exists in the app, but real IRP portal integration via a licensed GSP is still being finalized. Don't rely on the generated IRN for actual GST filing yet." },
    { q: "TDS on bills and expenses", a: "TDS fields are available on Professional and Enterprise plans. When enabled, the correct TDS amount is deducted and reflected in your journal automatically." },
  ]},
  { title: "Automation", items: [
    { q: "Setting up Workflow Rules", a: "In Settings > Workflow Rules, create a rule with a trigger (Invoice Created, Invoice Approved, Bill Received, Payment Overdue) and an action (Send Email, Send Notification, Require Approval)." },
    { q: "How Payment Overdue detection works", a: "Since there's no background scheduler, overdue invoices are checked whenever the app loads your data — each invoice is only flagged once, not repeatedly." },
  ]},
];

export function DocsPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="DOCUMENTATION" title="Docs" subtitle="Real, working guides for what's actually built — not aspirational feature documentation." />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-10">
        {DOCS_SECTIONS.map(sec => (
          <div key={sec.title}>
            <h2 className="text-lg font-bold text-white mb-4">{sec.title}</h2>
            <div className="space-y-4">
              {sec.items.map(item => (
                <div key={item.q} className="bg-white/[0.04] rounded-xl border border-white/10 p-5">
                  <h3 className="font-semibold text-white text-sm mb-1.5">{item.q}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </PageShell>
  );
}

// ───────────────────────────── BLOG PAGE ─────────────────────────────
const BLOG_POSTS = [
  { title: "GSTR-1 vs GSTR-3B: what's actually different", excerpt: "Both are monthly GST returns, but they serve different purposes — one reports outward supplies, the other is a summary return with tax payment. Here's what each actually requires." },
  { title: "TDS on professional fees: a plain-language guide", excerpt: "Section 194J covers TDS on professional and technical fees — but the rate and threshold depend on specifics most guides skip over. A breakdown of what actually applies." },
  { title: "Moving off Tally: what to actually check before switching", excerpt: "Cloud accounting tools promise easy migration — but chart of accounts structure, opening balances, and historical data are where most switches go wrong. Here's what to verify first." },
];

export function BlogPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="BLOG" title="Notes on GST, accounting, and the product" subtitle="We're a small team — this is a young blog, not a decade of archives." />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-5">
        {BLOG_POSTS.map(p => (
          <div key={p.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-6">
            <h3 className="font-bold text-white text-lg mb-2">{p.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{p.excerpt}</p>
          </div>
        ))}
        <p className="text-xs text-slate-500 text-center pt-4">More posts coming as we write them — no fixed schedule yet.</p>
      </section>
    </PageShell>
  );
}

// ───────────────────────────── PRICING PAGE ─────────────────────────────
const PLANS = [
  { name: "Free", price: "₹0", period: "forever", seats: 1, features: ["1 user", "Invoicing", "Basic reports", "GST calculation"], cta: "Get Started", highlight: false },
  { name: "Starter", price: "₹999", period: "/month", seats: 3, features: ["3 users", "All Free features", "Expense & Bills", "GSTR reports", "Bank reconciliation"], cta: "Start Free Trial", highlight: false },
  { name: "Professional", price: "₹2,499", period: "/month", seats: 10, features: ["10 users", "All Starter features", "TDS management", "Workflow automation", "Advanced reports"], cta: "Start Free Trial", highlight: true },
  { name: "Enterprise", price: "₹4,999", period: "/month", seats: 50, features: ["50 users", "All Pro features", "Priority support", "Custom domain", "API access", "Dedicated CA support"], cta: "Contact Sales", highlight: false },
];

export function PricingPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="PRICING" title="Simple, transparent pricing" subtitle="All plans include GST compliance. Upgrade or downgrade anytime." />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-xl border p-5 flex flex-col ${p.highlight ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 relative bg-emerald-500/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-bold px-3 py-0.5 rounded-full">MOST POPULAR</div>}
              <div className="mb-4">
                <h3 className="font-bold text-white">{p.name}</h3>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{p.price}</span>
                  <span className="text-slate-500 text-sm mb-0.5">{p.period}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Up to {p.seats} user{p.seats > 1 ? 's' : ''}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={props.onGetStarted} className={`w-full py-2 rounded-lg text-sm font-semibold transition ${p.highlight ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'border border-white/15 hover:bg-white/5 text-white'}`}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

// ───────────────────────────── SECURITY PAGE ─────────────────────────────
export function SecurityPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="SECURITY" title="Security, by design" subtitle="Your books are sensitive data. Here's exactly how they're protected — no vague marketing claims." />
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 space-y-4">
        {[
          { icon: Lock, title: "Encryption in transit", desc: "All traffic between your browser and our servers travels over HTTPS." },
          { icon: KeyRound, title: "Password hashing", desc: "Passwords are hashed with scrypt before storage — we never store or can see your plain-text password." },
          { icon: ShieldCheck, title: "Signed sessions", desc: "Login sessions use HMAC-signed tokens, which can't be forged or tampered with client-side." },
          { icon: Database, title: "Per-organization isolation", desc: "Your organization's data is kept separate from every other organization's — one company's data never leaks into another's view." },
          { icon: Shield, title: "Account lockout protection", desc: "Repeated failed login attempts trigger a temporary lockout to slow down brute-force attempts." },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-emerald-400" /></div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            </div>
          );
        })}
        <p className="text-xs text-slate-500 text-center pt-4">
          We're an early-stage product — a formal SOC 2 or ISO 27001 certification isn't in place yet. If security compliance is a hard requirement for your business, reach out before signing up.
        </p>
      </section>
    </PageShell>
  );
}

// ───────────────────────────── CONTACT PAGE ─────────────────────────────
export function ContactPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="CONTACT" title="Get in touch" subtitle="We're a small team — you'll reach an actual person, not a support queue." />
      <section className="max-w-lg mx-auto px-4 sm:px-6 pb-20 text-center space-y-4">
        <a href="mailto:support@bizkhata.app" className="block bg-white/[0.04] rounded-xl border border-white/10 p-6 hover:bg-white/[0.06] transition">
          <Mail className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-white">support@bizkhata.app</p>
          <p className="text-xs text-slate-500 mt-1">For product questions, billing, or support</p>
        </a>
        <p className="text-sm text-slate-500">Verma Consultancy Services · Varanasi, Uttar Pradesh, India</p>
      </section>
    </PageShell>
  );
}

// ───────────────────────────── CAREERS PAGE ─────────────────────────────
export function CareersPage(props: NavProps) {
  return (
    <PageShell {...props}>
      <PageHero eyebrow="CAREERS" title="Careers" subtitle="Honest update: we're a small, early-stage team." />
      <section className="max-w-lg mx-auto px-4 sm:px-6 pb-20 text-center">
        <div className="bg-white/[0.04] rounded-xl border border-white/10 p-8">
          <Briefcase className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-3">
            Ledgerio is currently built and run by a small team at Verma Consultancy Services. We don't have
            open roles listed right now, but if you're interested in what we're building, reach out — we'll
            keep your note on file as we grow.
          </p>
          <a href="mailto:careers@bizkhata.app" className="inline-block mt-3 text-emerald-400 hover:underline text-sm font-semibold">careers@bizkhata.app</a>
        </div>
      </section>
    </PageShell>
  );
}
