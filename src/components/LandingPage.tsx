import React from "react";
import { CheckCircle, FileText, TrendingUp, Shield, Users, Zap, ArrowRight, Star, Check, X } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const FEATURES = [
  { icon: FileText, title: "GST Invoicing", desc: "Create professional GST-compliant invoices with CGST/SGST/IGST auto-calculation, PDF export, and beta e-invoicing (IRN) support." },
  { icon: TrendingUp, title: "Financial Reports", desc: "P&L, Balance Sheet, Cash Flow, Trial Balance, GSTR-1/3B/9 — all auto-generated from your transactions." },
  { icon: Shield, title: "TDS & Compliance", desc: "Auto TDS deduction, RCM entries, HSN/SAC codes, and MSME tracking. Stay audit-ready." },
  { icon: Users, title: "Multi-User", desc: "Invite your accountant, staff, and CA. Role-based permissions keep everyone in their lane." },
  { icon: Zap, title: "30+ Advanced Modules", desc: "Budget tracking, projects, bank reconciliation, multi-currency, and much more." },
  { icon: Star, title: "AI Copilot", desc: "Ask your accounts anything. AI explains journal entries, suggests categories, and spots anomalies." },
];

const PLANS = [
  { name: "Free", price: "₹0", period: "forever", seats: 1, features: ["1 user", "Invoicing", "Basic reports", "GST calculation"], cta: "Get Started", highlight: false },
  { name: "Starter", price: "₹999", period: "/month", seats: 3, features: ["3 users", "All Free features", "Expense & Bills", "GSTR reports", "Bank reconciliation"], cta: "Start Free Trial", highlight: false },
  { name: "Professional", price: "₹2,499", period: "/month", seats: 10, features: ["10 users", "All Starter features", "TDS management", "Multi-currency", "Projects & timesheets", "Advanced reports"], cta: "Start Free Trial", highlight: true },
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

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
            <span className="font-bold text-white text-lg">Ledgerio</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#compare" className="hover:text-white transition">Compare</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
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

      {/* About */}
      <section id="about" className="py-16 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
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
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
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
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-bold text-[10px]">L</div>
            <span>© 2026 Ledgerio · Verma Consultancy Services · Varanasi, UP</span>
          </div>
          <div className="flex gap-4">
            <a href="/api/legal/tos" target="_blank" className="hover:text-slate-300">Terms</a>
            <a href="/api/legal/privacy" target="_blank" className="hover:text-slate-300">Privacy</a>
            <a href="mailto:support@bizkhata.app" className="hover:text-slate-300">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
