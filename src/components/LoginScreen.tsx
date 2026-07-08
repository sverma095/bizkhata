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
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'twofa' | 'tos' | 'privacy'>(initialView === 'reset' ? 'reset' : 'login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [legalContent, setLegalContent] = useState<{ title: string; content: string } | null>(null);

  // Login fields
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');

  // 2FA fields
  const [otp, setOtp] = useState('');
  const [emailSent, setEmailSent] = useState(true);

  // Register fields
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [adminName, setAdminName] = useState('');
  const [mobile, setMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [seats, setSeats] = useState(3);
  const REG_PLANS = [
    { id: 'free', name: 'Free', price: '₹0', period: 'forever', seats: 1 },
    { id: 'starter', name: 'Starter', price: '₹999', period: '/mo', seats: 3 },
    { id: 'professional', name: 'Professional', price: '₹2,499', period: '/mo', seats: 10 },
    { id: 'enterprise', name: 'Enterprise', price: '₹4,999', period: '/mo', seats: 50 },
  ];
  const [requestedPlan, setRequestedPlan] = useState('starter');
  const [showRegPwd, setShowRegPwd] = useState(false);
  // Email OTP for registration
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);

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

  // Load legal content when needed
  useEffect(() => {
    if (view === 'tos') {
      fetch('/api/legal/tos').then(r => r.json()).then(d => setLegalContent(d)).catch(() => setLegalContent({ title: 'Terms of Service', content: 'Please contact support@bizkhata.app for our Terms of Service.' }));
    } else if (view === 'privacy') {
      fetch('/api/legal/privacy').then(r => r.json()).then(d => setLegalContent(d)).catch(() => setLegalContent({ title: 'Privacy Policy', content: 'Please contact privacy@bizkhata.app for our Privacy Policy.' }));
    }
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      if (data.twoFactorRequired) {
        setEmailSent(data.emailSent !== false);
        setOtp('');
        setView('twofa');
        return;
      }
      onLoginSuccess(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      onLoginSuccess(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResend2fa = async () => {
    clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend code.');
      setEmailSent(data.emailSent !== false);
      setSuccess('A new code has been sent.');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSendRegOtp = async () => {
    if (!regEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) { setError('Enter a valid email address first.'); return; }
    clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/send-reg-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: regEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send OTP.');
      setRegOtpSent(true);
      setSuccess(data.emailSent ? `Verification code sent to ${regEmail}` : `OTP generated (email delivery failed${data.reason ? `: ${data.reason}` : ''}) — SuperAdmin can see it in Notifications.`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    try {
      const res = await fetch('/api/auth/register-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, gstNumber, adminName, email: regEmail, mobileNumber: mobile, password: regPassword, numberOfRequiredSeats: seats, requestedPlan, emailOtp: regOtp }) });
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
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-white text-lg">B</div>
            <div>
              <div className="text-white font-black text-xl tracking-tight">Ledgerio</div>
              <div className="text-emerald-400 text-xs font-semibold tracking-wider">ENTERPRISE ACCOUNTING</div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            India's Most Complete<br />
            <span className="text-emerald-400">GST Accounting</span><br />
            Platform
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Full-stack accounting with GST compliance, invoicing, multi-user management, and real-time cloud sync — built for Indian businesses. (E-invoicing/IRN is currently in beta.)
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'GST Invoicing', desc: 'CGST/SGST/IGST auto-calculation' },
            { label: 'E-Invoice (Beta)', desc: 'IRN generation — demo mode' },
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
      <div className="w-full md:w-1/2 flex flex-col items-center justify-start p-6 py-10 bg-slate-950 overflow-y-auto max-h-screen">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-white">L</div>
              <span className="font-black text-white text-lg">Ledgerio</span>
            </div>
            <a href="/" onClick={(e) => { e.preventDefault(); localStorage.removeItem('bk_show_login'); window.location.href='/'; }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition">← Home</a>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
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
                <p className="text-slate-500 text-sm mt-1">Sign in to your Ledgerio account</p>
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
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow disabled:opacity-60 text-white font-bold text-sm rounded-xl transition shadow-sm">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <div className="text-center text-sm text-slate-500">
                New company?{' '}
                <button onClick={() => { clearMessages(); setView('signup'); }} className="text-emerald-600 font-bold hover:underline">Register your organization</button>
              </div>

            </div>
          )}

          {/* REGISTER */}
          {view === 'signup' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => { clearMessages(); setView('login'); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Register Organization</h2>
                  <p className="text-slate-500 text-xs">Submit request for admin approval</p>
                </div>
              </div>
              <form onSubmit={handleRegister} className="space-y-5">

                {/* Company details */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Company details</p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Company / Business Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Verma Traders Pvt Ltd"
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">GSTIN</label>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Optional — add later</span>
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5"
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                    </div>
                  </div>
                </div>

                {/* Your details */}
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-3">Your details</p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" required value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Your full name"
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" required value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 XXXXXXXXXX"
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                    </div>
                  </div>
                </div>

                {/* Account / verification */}
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-3">Account</p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email Address</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="email" required value={regEmail}
                          onChange={e => { setRegEmail(e.target.value); setRegOtpSent(false); setRegOtp(''); }}
                          placeholder="you@company.com"
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                      </div>
                      <button type="button" onClick={handleSendRegOtp} disabled={loading || !regEmail}
                        className="shrink-0 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition cursor-pointer">
                        {regOtpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                  {regOtpSent && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Verification Code</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                          <input type="text" required value={regOtp}
                            onChange={e => setRegOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                            placeholder="6-digit code" maxLength={6}
                            className="w-full pl-9 pr-4 py-2.5 border border-emerald-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50" />
                        </div>
                        {regOtp.length === 6 && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={showRegPwd ? 'text' : 'password'} required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create a password"
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-slate-50" />
                      <button type="button" onClick={() => setShowRegPwd(!showRegPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">8+ characters, with uppercase, lowercase, a number, and a special character.</p>
                  </div>
                </div>

                {/* Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Choose a plan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REG_PLANS.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setRequestedPlan(p.id); setSeats(p.seats); }}
                        className={`text-left rounded-xl border p-3 transition ${requestedPlan === p.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                        <div className="font-bold text-sm text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.price}{p.period !== 'forever' ? p.period : ' forever'} · {p.seats} seat{p.seats > 1 ? 's' : ''}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">Need more seats later? Upgrade anytime after approval.</p>
                </div>

                <button type="submit" disabled={loading || !regOtpSent || regOtp.length !== 6}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow disabled:opacity-60 text-white font-bold text-sm rounded-xl transition">
                  {loading ? 'Submitting...' : 'Submit Registration Request'}
                </button>
                <p className="text-xs text-center text-slate-400">Email verification required · GSTIN can be added later</p>
                <p className="text-xs text-center text-slate-400">
                  By registering, you agree to our{' '}
                  <button type="button" onClick={() => setView('tos')} className="text-emerald-600 hover:underline font-medium">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setView('privacy')} className="text-emerald-600 hover:underline font-medium">Privacy Policy</button>
                </p>
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
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow disabled:opacity-60 text-white font-bold text-sm rounded-xl transition">
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
                <button type="button" onClick={() => { clearMessages(); setView('reset'); }} className="w-full text-xs text-emerald-600 hover:underline text-center">
                  Already have a code? Enter it here
                </button>
              </form>
            </div>
          )}

          {/* RESET PASSWORD */}
          {view === 'twofa' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => { clearMessages(); setView('login'); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Enter Login Code</h2>
                  <p className="text-slate-500 text-xs">
                    {emailSent ? `A 6-digit code was emailed to ${email}` : `Code generated — check Notifications in-app (email delivery not configured)`}
                  </p>
                </div>
              </div>
              <form onSubmit={handleVerify2fa} className="space-y-4">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" required autoFocus value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" maxLength={6}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                </div>
                {error && <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}</div>}
                {success && <div className="flex items-center gap-2 text-emerald-600 text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-2.5"><CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />{success}</div>}
                <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </button>
                <button type="button" onClick={handleResend2fa} disabled={loading} className="w-full text-emerald-700 text-xs font-semibold hover:underline">
                  Didn't get it? Resend code
                </button>
              </form>
            </div>
          )}

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
                <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow disabled:opacity-60 text-white font-bold text-sm rounded-xl transition">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* LEGAL PAGES */}
          {(view === 'tos' || view === 'privacy') && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { setView('signup'); setLegalContent(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                </button>
                <h2 className="text-lg font-black text-slate-900">{legalContent?.title || 'Loading...'}</h2>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-96 overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {legalContent?.content || 'Loading...'}
              </div>
              <button onClick={() => { setView('signup'); setLegalContent(null); }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition">
                ← Back to Registration
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Footer with legal links */}
        {(view === 'login' || view === 'signup') && (
          <div className="mt-4 text-center text-[10px] text-slate-500 space-x-3">
            <button onClick={() => setView('tos')} className="hover:text-emerald-400 hover:underline">Terms of Service</button>
            <span>·</span>
            <button onClick={() => setView('privacy')} className="hover:text-emerald-400 hover:underline">Privacy Policy</button>
            <span>·</span>
            <span>© 2026 Ledgerio · Verma Consultancy Services</span>
          </div>
        )}
      </div>
    </div>
  );
}
