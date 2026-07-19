import React from "react";
import { CheckCircle, FileText, TrendingUp, Shield, Users, Zap, ArrowRight, Star, Check, X, Store, Briefcase, Factory, Truck, Lock, ShieldCheck, Database, KeyRound } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onNavigate?: (path: string) => void;
}

const FEATURES = [
  { icon: FileText, title: "GST Invoicing", desc: "Create professional GST-compliant invoices with CGST/SGST/IGST auto-calculation, PDF export, and beta e-invoicing (IRN) support." },
  { icon: TrendingUp, title: "Financial Reports", desc: "P&L, Balance Sheet, Cash Flow, Trial Balance, GSTR-1/3B/9 — all auto-generated from your transactions." },
  { icon: Shield, title: "TDS & Compliance", desc: "Auto TDS deduction, RCM entries, HSN/SAC codes, and MSME tracking. Stay audit-ready." },
  { icon: Users, title: "Multi-User", desc: "Invite your accountant, staff, and CA. Role-based permissions keep everyone in their lane." },
  { icon: Zap, title: "30+ Advanced Modules", desc: "Budget tracking, projects, bank reconciliation, workflow automation, and much more." },
  { icon: Star, title: "AI Copilot", desc: "Ask your accounts anything. AI explains journal entries, suggests categories, and spots anomalies." },
];

const INDUSTRIES = [
  { icon: Store, title: "Retail & Trading", desc: "Fast billing, inventory-aware invoicing, and GST-ready reports for shops and distributors." },
  { icon: Briefcase, title: "Services & Consulting", desc: "Recurring invoices, project-based billing, and expense tracking for agencies and consultants." },
  { icon: Factory, title: "Manufacturing", desc: "HSN-coded billing, purchase tracking, and TDS handling across your supply chain." },
  { icon: Truck, title: "Freelancers & Contractors", desc: "Simple GST invoicing and expense tracking without needing a full accounting team." },
];

const STEPS = [
  { step: "1", title: "Create your account", desc: "Sign up free, verify your email, and set up your organization in under 2 minutes." },
  { step: "2", title: "Add your business details", desc: "GSTIN, company info, and opening balances — or skip and add them later." },
  { step: "3", title: "Start invoicing", desc: "Create your first GST invoice, add your team, and you're live." },
];

const FAQS = [
  { q: "Is my data secure?", a: "Yes. Your data lives in an isolated, encrypted database with row-level security, all traffic is HTTPS-only, passwords are hashed with scrypt (not stored in plain text), and sessions use HMAC-signed tokens." },
  { q: "Can I switch from Tally, Zoho, or Vyapar?", a: "Yes — you can add opening balances manually to start fresh, or export your ledger and import your chart of accounts. A dedicated migration wizard isn't built yet; reach out and we'll help you move over." },
  { q: "Is e-Invoicing (IRN) fully live?", a: "It's currently in beta — the workflow is in place, but real IRP portal integration via a licensed GSP is still being finalized. See the compliance badges above for what's fully live today." },
  { q: "What happens if I exceed my plan's seats?", a: "You'll be prompted to upgrade before adding more users past your plan's seat limit — no surprise charges." },
  { q: "Do you offer a free plan?", a: "Yes — the Free plan supports 1 user with invoicing, basic reports, and GST calculation, forever, no credit card required." },
];

const PLANS = [
  { name: "Free", price: "₹0", period: "forever", seats: 1, features: ["1 user", "Invoicing", "Basic reports", "GST calculation"], cta: "Get Started", highlight: false },
  { name: "Starter", price: "₹999", period: "/month", seats: 3, features: ["3 users", "All Free features", "Expense & Bills", "GSTR reports", "Bank reconciliation"], cta: "Start Free Trial", highlight: false },
  { name: "Professional", price: "₹2,499", period: "/month", seats: 10, features: ["10 users", "All Starter features", "TDS management", "Workflow automation", "Advanced reports"], cta: "Start Free Trial", highlight: true },
  { name: "Enterprise", price: "₹4,999", period: "/month", seats: 50, features: ["50 users", "All Pro features", "Priority support", "Custom domain", "API access", "Dedicated CA support"], cta: "Contact Sales", highlight: false },
];

const COMPARE_ROWS = [
  { feature: "Deployment", ledgerio: "Cloud (any device)", zoho: "Cloud", vyapar: "Desktop/Mobile app", tally: "Desktop only" },
  { feature: "Starting price", ledgerio: "₹999/mo", zoho: "₹749/mo", vyapar: "₹3,421/yr", tally: "₹27,000+" },
  { feature: "Multi-user roles", ledgerio: true, zoho: true, vyapar: false, tally: true },
  { feature: "GSTR-1/3B/9 reports", ledgerio: true, zoho: true, vyapar: true, tally: true },
  { feature: "e-Invoicing (IRN)", ledgerio: "Beta", zoho: true, vyapar: true, tally: true },
  { feature: "AI accounting copilot", ledgerio: true, zoho: false, vyapar: false, tally: false },
  { feature: "No installation needed", ledgerio: true, zoho: true, vyapar: false, tally: false },
];

function CompareCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-slate-600 mx-auto" />;
  return <span className="text-xs text-slate-300">{value}</span>;
}

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="font-medium text-white text-sm">{q}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">{a}</div>}
    </div>
  );
};

export default function LandingPage({ onGetStarted, onLogin, onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
            <span className="font-bold text-white text-lg">Ledgerio</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#industries" className="hover:text-white transition">Industries</a>
            <a href="#compare" className="hover:text-white transition">Compare</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#security" className="hover:text-white transition">Security</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <a href="#about" className="hover:text-white transition">About</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-sm text-slate-300 hover:text-white font-medium px-3 py-1.5">Sign in</button>
            <button onClick={onGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold px-4 py-2 rounded-lg transition">
              Try free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #10b981 0%, transparent 45%), radial-gradient(circle at 80% 10%, #3b82f6 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-emerald-400 font-semibold mb-6">
            🇮🇳 BUILT FOR INDIAN BUSINESSES · EARLY ACCESS
          </div>
          <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-5">
            Cloud GST Accounting<br />
            <span className="text-emerald-400">Built for India</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Invoicing, GST compliance, expense tracking, and reports — accessible from any device, always in sync. No installation, no local backups to manage.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={onGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 py-3 rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              Start for free <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onLogin} className="border border-white/15 hover:bg-white/5 text-white font-semibold px-7 py-3 rounded-xl text-sm transition">
              Sign in to your account
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">Free plan available · No credit card required · Setup in 2 minutes</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white/[0.03] py-16 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-2">Everything you need to run your business accounts</h2>
          <p className="text-slate-400 text-center text-sm mb-10">30+ modules covering every aspect of Indian business accounting</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-5 hover:bg-white/[0.06] transition">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GST Compliance badge row */}
      <section className="py-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
            {["✅ GSTR-1 / 3B / 9", "🔶 e-Invoicing (Beta)", "🔶 e-Way Bills (Coming soon)", "✅ TDS / TCS", "✅ RCM (Reverse Charge)", "✅ MSME tracking", "✅ HSN / SAC codes"].map(tag => (
              <span key={tag} className={`border px-3 py-1 rounded-full ${tag.startsWith("🔶") ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-center mb-2">Built for every kind of business</h2>
        <p className="text-slate-400 text-center text-sm mb-10">Wherever you're invoicing, tracking expenses, or filing GST — Ledgerio fits the workflow.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {INDUSTRIES.map(ind => {
            const Icon = ind.icon;
            return (
              <div key={ind.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-5">
                <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{ind.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{ind.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Get started in three steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-semibold text-white mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section id="compare" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-center mb-2">Ledgerio vs the field</h2>
        <p className="text-slate-400 text-center text-sm mb-10">An honest look — we're newer and still building out some features.</p>
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

      {/* Security */}
      <section id="security" className="py-16 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-2">Security, by design</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Your books are sensitive data. Here's exactly how they're protected.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Lock, title: "HTTPS everywhere", desc: "All traffic between your browser and our servers is encrypted in transit." },
              { icon: KeyRound, title: "Hashed passwords", desc: "Passwords are hashed with scrypt — never stored in plain text." },
              { icon: ShieldCheck, title: "Signed sessions", desc: "Login sessions use HMAC-signed tokens that can't be forged or tampered with." },
              { icon: Database, title: "Isolated per organization", desc: "Your organization's data is kept separate from every other organization's." },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-white/[0.04] rounded-xl border border-white/10 p-5">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1.5">{s.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Why we built Ledgerio</h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          Ledgerio is a cloud accounting platform built for Indian small and medium businesses — invoicing,
          GST compliance, expense tracking, and financial reporting in one place. Your books are accessible
          from any device, always in sync, with nothing to install or back up yourself.
        </p>
        <p className="text-slate-400 leading-relaxed mb-4">
          Built by Verma Consultancy Services, Ledgerio focuses on workflows Indian businesses actually
          need — GSTR-ready reports, TDS handling, multi-user access for your team and CA, and compliance
          tools designed around Indian tax law from day one.
        </p>
        <p className="text-slate-500 text-sm">
          We're an early-stage product improving quickly. Some advanced compliance features (like e-Invoicing
          and e-Way Bills) are currently in beta — see the badges above for what's fully live today.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-2">Simple, transparent pricing</h2>
          <p className="text-slate-400 text-center text-sm mb-10">All plans include GST compliance. Upgrade or downgrade anytime.</p>
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
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={onGetStarted} className={`w-full py-2 rounded-lg text-sm font-semibold transition ${p.highlight ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'border border-white/15 hover:bg-white/5 text-white'}`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to move your books to the cloud?</h2>
          <p className="text-slate-400 mb-6">Start free — no credit card, no installation, set up in 2 minutes.</p>
          <button onClick={onGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3 rounded-xl text-sm transition inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20">
            Start for free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => onNavigate?.('/features')} className="hover:text-white transition">Features</button></li>
                <li><button onClick={() => onNavigate?.('/compare')} className="hover:text-white transition">Compare</button></li>
                <li><button onClick={() => onNavigate?.('/pricing')} className="hover:text-white transition">Pricing</button></li>
                <li><button onClick={() => onNavigate?.('/security')} className="hover:text-white transition">Security</button></li>
                <li><button onClick={() => onNavigate?.('/ai')} className="hover:text-white transition">AI Features</button></li>
                <li><button onClick={() => onNavigate?.('/industries')} className="hover:text-white transition">Industries</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#about" className="hover:text-white transition">About</a></li>
                <li><button onClick={() => onNavigate?.('/careers')} className="hover:text-white transition">Careers</button></li>
                <li><button onClick={() => onNavigate?.('/contact')} className="hover:text-white transition">Contact</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Resources</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => onNavigate?.('/docs')} className="hover:text-white transition">Documentation</button></li>
                <li><button onClick={() => onNavigate?.('/blog')} className="hover:text-white transition">Blog</button></li>
                <li><button onClick={() => onNavigate?.('/resources')} className="hover:text-white transition">Resource Hub</button></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => onNavigate?.('/terms')} className="hover:text-white transition">Terms of Service</button></li>
                <li><button onClick={() => onNavigate?.('/privacy')} className="hover:text-white transition">Privacy Policy</button></li>
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
    </div>
  );
}
