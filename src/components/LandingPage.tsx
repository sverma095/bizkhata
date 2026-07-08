import React from "react";
import { CheckCircle, FileText, TrendingUp, Shield, Users, Zap, ArrowRight, Star } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const FEATURES = [
  { icon: FileText, title: "GST Invoicing", desc: "Create professional GST-compliant invoices with CGST/SGST/IGST auto-calculation, e-invoicing support, and PDF export." },
  { icon: TrendingUp, title: "Financial Reports", desc: "P&L, Balance Sheet, Cash Flow, Trial Balance, GSTR-1/3B/9 — all auto-generated from your transactions." },
  { icon: Shield, title: "TDS & Compliance", desc: "Auto TDS deduction, RCM entries, HSN/SAC codes, and MSME tracking. Stay audit-ready." },
  { icon: Users, title: "Multi-User", desc: "Invite your accountant, staff, and CA. Role-based permissions keep everyone in their lane." },
  { icon: Zap, title: "30+ Advanced Modules", desc: "Budget tracking, projects, bank reconciliation, e-Way bills, multi-currency, and much more." },
  { icon: Star, title: "AI Copilot", desc: "Ask your accounts anything. AI explains journal entries, suggests categories, and spots anomalies." },
];

const PLANS = [
  { name: "Free", price: "₹0", period: "forever", seats: 1, features: ["1 user", "Invoicing", "Basic reports", "GST calculation"], cta: "Get Started", highlight: false },
  { name: "Starter", price: "₹999", period: "/month", seats: 3, features: ["3 users", "All Free features", "Expense & Bills", "GSTR reports", "Bank reconciliation"], cta: "Start Free Trial", highlight: false },
  { name: "Professional", price: "₹2,499", period: "/month", seats: 10, features: ["10 users", "All Starter features", "TDS management", "Multi-currency", "Projects & timesheets", "Advanced reports"], cta: "Start Free Trial", highlight: true },
  { name: "Enterprise", price: "₹4,999", period: "/month", seats: 50, features: ["50 users", "All Pro features", "Priority support", "Custom domain", "API access", "Dedicated CA support"], cta: "Contact Sales", highlight: false },
];

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
            <span className="font-bold text-gray-900 text-lg">Ledgerio</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5">Sign in</button>
            <button onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              Register free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-xs text-blue-700 font-medium mb-6">
          🇮🇳 Built for Indian businesses · GST-compliant
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4">
          Accounting software that<br />
          <span className="text-blue-600">speaks GST</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          Invoice, expense, GSTR filing, TDS, bank reconciliation — everything a growing Indian business needs. No CA jargon, no complexity.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3 rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-blue-200">
            Start for free <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onLogin} className="border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-7 py-3 rounded-xl text-sm transition">
            Sign in to your account
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Free plan available · No credit card required · Setup in 2 minutes</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Everything you need to run your business accounts</h2>
          <p className="text-gray-500 text-center text-sm mb-10">30+ modules covering every aspect of Indian business accounting</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GST Compliance badge row */}
      <section className="border-y border-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
            {["✅ GSTR-1 / 3B / 9", "✅ e-Invoicing (IRN)", "✅ e-Way Bills", "✅ TDS / TCS", "✅ RCM (Reverse Charge)", "✅ MSME tracking", "✅ HSN / SAC codes"].map(tag => (
              <span key={tag} className="bg-green-50 border border-green-100 text-green-700 px-3 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-14 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Simple, transparent pricing</h2>
        <p className="text-gray-500 text-center text-sm mb-10">All plans include GST compliance. Upgrade or downgrade anytime.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-xl border p-5 flex flex-col ${p.highlight ? 'border-blue-500 shadow-lg shadow-blue-100 relative' : 'border-gray-200'}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">MOST POPULAR</div>}
              <div className="mb-4">
                <h3 className="font-bold text-gray-800">{p.name}</h3>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-2xl font-black text-gray-900">{p.price}</span>
                  <span className="text-gray-400 text-sm mb-0.5">{p.period}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Up to {p.seats} user{p.seats > 1 ? 's' : ''}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className={`w-full py-2 rounded-lg text-sm font-semibold transition ${p.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-[10px]">B</div>
            <span>© 2026 Ledgerio · Verma Consultancy Services · Varanasi, UP</span>
          </div>
          <div className="flex gap-4">
            <a href="/api/legal/tos" target="_blank" className="hover:text-gray-600">Terms</a>
            <a href="/api/legal/privacy" target="_blank" className="hover:text-gray-600">Privacy</a>
            <a href="mailto:support@bizkhata.app" className="hover:text-gray-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
