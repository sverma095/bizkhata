import React, { useState, useEffect } from 'react';
import { Mail, Lock, Building2, Eye, EyeOff, AlertTriangle, CheckCircle2, ArrowLeft, Phone, User, Hash } from 'lucide-react';
import { SessionInfo } from '../types.js';

interface LoginScreenProps {
  onLoginSuccess: (session: SessionInfo) => void;
  initialView?: string;
  initialEmail?: string;
  initialCode?: string;
}

export default function LoginScreen({ onLoginSuccess, initialView = 'login', initialEmail = '', initialCode = '' }: LoginScreenProps) {
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialView === 'reset' ? 'reset' : 'login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Login fields
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');

  // Register fields
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [adminName, setAdminName] = useState('');
  const [mobile, setMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [seats, setSeats] = useState(5);
  const [showRegPwd, setShowRegPwd] = useState(false);

  // Forgot / Reset fields
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [resetCode, setResetCode] = useState(initialCode);
  const [newPwd, setNewPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  useEffect(() => {
    if (initialEmail) { setEmail(initialEmail); setForgotEmail(initialEmail); }
    if (initialCode) setResetCode(initialCode);
  }, [initialEmail, initialCode]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      onLoginSuccess(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/register-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, gstNumber, adminName, email: regEmail, mobileNumber: mobile, password: regPassword, numberOfRequiredSeats: seats }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      setSuccess('Registration submitted! You will receive credentials once approved by the administrator.');
      setView('login');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail }) });
      setSuccess('If that email exists, a reset code has been sent. Check your inbox or the notification simulator.');
      setView('reset');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword: newPwd }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed.');
      setSuccess('Password updated successfully! You can now log in.');
      setEmail(forgotEmail); setView('login');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-white text-lg">B</div>
            <div>
              <div className="text-white font-black text-xl tracking-tight">BizKhata</div>
              <div className="text-emerald-400 text-xs font-semibold tracking-wider">ENTERPRISE ACCOUNTING</div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            India's Most Complete<br />
            <span className="text-emerald-400">GST Accounting</span><br />
            Platform
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Full-stack accounting with GST compliance, e-invoicing (IRN), multi-user management, real-time Supabase sync, and Zoho Books-level features — built for Indian businesses.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'GST Invoicing', desc: 'CGST/SGST/IGST auto-calculation' },
            { label: 'E-Invoice (IRN)', desc: 'IRP portal integration' },
            { label: 'Multi-User', desc: 'Role-based access control' },
            { label: 'Real-time Sync', desc: 'Supabase PostgreSQL cloud' },
          ].map(f => (
            <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="text-emerald-400 text-xs font-bold">{f.label}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-white">B</div>
            <span className="font-black text-slate-900 text-lg">BizKhata</span>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN */}
          {view === 'login' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Welcome back</h2>
                <p className="text-slate-500 text-sm mt-1">Sign in to your BizKhata account</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Password</label>
                    <button type="button" onClick={() => { clearMessages(); setView('forgot'); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition shadow-sm">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <div className="text-center text-sm text-slate-500">
                New company?{' '}
                <button onClick={() => { clearMessages(); setView('signup'); }} className="text-emerald-600 font-bold hover:underline">Register your organization</button>
              </div>
              {/* Quick credentials hint */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-600 text-xs mb-1">Default Credentials</div>
                <div>Super Admin: <span className="font-mono">svtiger543939@gmail.com</span> / <span className="font-mono">Admin@123</span></div>
                <div>Admin: <span className="font-mono">aman@bizkhata.com</span> / <span className="font-mono">Admin@123</span></div>
              </div>
            </div>
          )}

          {/* REGISTER */}
          {view === 'signup' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { clearMessages(); setView('login'); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Register Organization</h2>
                  <p className="text-slate-500 text-xs">Submit request for admin approval</p>
                </div>
              </div>
              <form onSubmit={handleRegister} className="space-y-3">
                {[
                  { icon: Building2, label: 'Company Name', val: companyName, set: setCompanyName, ph: 'Acme Private Limited', type: 'text' },
                  { icon: Hash, label: 'GSTIN', val: gstNumber, set: setGstNumber, ph: '29AAAAA0000A1Z1', type: 'text' },
                  { icon: User, label: 'Admin Name', val: adminName, set: setAdminName, ph: 'Full name', type: 'text' },
                  { icon: Mail, label: 'Email', val: regEmail, set: setRegEmail, ph: 'admin@company.com', type: 'email' },
                  { icon: Phone, label: 'Mobile', val: mobile, set: setMobile, ph: '+91 98XXXXXXXX', type: 'tel' },
                ].map(({ icon: Icon, label, val, set, ph, type }) => (
                  <div key={label} className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type={type} required value={val} onChange={e => set(e.target.value)} placeholder={ph}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                  </div>
                ))}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type={showRegPwd ? 'text' : 'password'} required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Password (8+ chars, upper, lower, number, special)"
                    className="w-full pl-8 pr-9 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                  <button type="button" onClick={() => setShowRegPwd(!showRegPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showRegPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-600 font-semibold whitespace-nowrap">Seats needed:</label>
                  <input type="number" min={1} max={100} value={seats} onChange={e => setSeats(parseInt(e.target.value))}
                    className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition">
                  {loading ? 'Submitting...' : 'Submit Registration Request'}
                </button>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {view === 'forgot' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => { clearMessages(); setView('login'); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Reset Password</h2>
                  <p className="text-slate-500 text-xs">We'll send a reset code to your email</p>
                </div>
              </div>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="your@email.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition">
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
                <button type="button" onClick={() => { clearMessages(); setView('reset'); }} className="w-full text-xs text-emerald-600 hover:underline text-center">
                  Already have a code? Enter it here
                </button>
              </form>
            </div>
          )}

          {/* RESET PASSWORD */}
          {view === 'reset' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => { clearMessages(); setView('forgot'); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Enter Reset Code</h2>
                  <p className="text-slate-500 text-xs">Check your inbox or the notification simulator</p>
                </div>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="your@email.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" required value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="Reset code from email"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showNewPwd ? 'text' : 'password'} required value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
