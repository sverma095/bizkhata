import React, { useState, useEffect } from 'react';
import { Mail, Lock, ShieldCheck, Building, Key, AlertTriangle, CheckCircle2, User, Phone, HelpCircle } from 'lucide-react';
import { SessionInfo } from '../types.js';

interface LoginScreenProps {
  onLoginSuccess: (session: SessionInfo) => void;
  initialView?: 'login' | 'register' | 'forgot' | 'reset' | 'activate';
  initialEmail?: string;
  initialCode?: string;
}

export default function LoginScreen(props: LoginScreenProps) {
  const { onLoginSuccess, initialView = 'login', initialEmail = '', initialCode = '' } = props;
  const [view, setView] = useState<'login' | 'mfa' | 'signup' | 'forgot' | 'reset' | 'activate'>(initialView as any);
  
  // Generic states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Form Fields
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(initialCode);

  // Signup fields (Section 2 - Step 1 Form)
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [adminName, setAdminName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [requiredSeats, setRequiredSeats] = useState<number>(5);

  // Password Policy Checks (Section 12)
  const [policyChecks, setPolicyChecks] = useState({
    length: false,
    upperLower: false,
    number: false,
    special: false
  });

  // Reset fields (Section 8)
  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [resetCode, setResetCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState('');

  // Effect to handle props routing from email clickers
  useEffect(() => {
    if (initialView) {
      setView(initialView as any);
    }
    if (initialEmail) {
      setEmail(initialEmail);
      setResetEmail(initialEmail);
    }
    if (initialCode) {
      setOtpCode(initialCode);
      setResetCode(initialCode);
    }
    setError(null);
    setSuccess(null);
  }, [initialView, initialEmail, initialCode]);

  // Realtime password strength analysis (Section 12 Password Policy)
  const analyzePassword = (pwd: string) => {
    setPolicyChecks({
      length: pwd.length >= 8,
      upperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[@$!%*?&]/.test(pwd)
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authenication failed.');
      }

      if (data.twoFactorRequired) {
        setView('mfa');
        setSuccess('Authentication code raised! Check simulator dashboard inbox.');
      } else {
        onLoginSuccess(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          gstNumber,
          adminName,
          email,
          mobileNumber,
          password: signupPassword,
          numberOfRequiredSeats: requiredSeats
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed.');
      }

      setSuccess('Your Admin account registration request has been submitted successfully! Status set to PENDING SUPER ADMIN APPROVAL.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed');
      }

      setSuccess('Recovery OTP dispatched! Please check the Live Notification mailbox.');
      setView('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Reset sequence unsuccessful.');
      }

      setSuccess('Security credentials successfully updated! You can now log in.');
      setEmail(resetEmail);
      setView('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper validation status indicator styling
  const checkStyle = (valid: boolean) => valid ? 'text-emerald-600 font-semibold' : 'text-slate-400';

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/40">
      
      {/* Upper Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center px-3 py-1 mb-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-4 h-4 text-sky-600 mr-1.5" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-600 dark:text-slate-300">BIZKHATA CORE SECURITY</span>
        </div>
        <h2 className="text-3xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
          Enterprise Identity Portal
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Strict Multi-Tenant Database Separation & Access Control Module
        </p>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 transition duration-300">
        
        {/* Error Block */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
            <div id="auth-error-msg" className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success Block */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-500 mt-0.5" />
            <div id="auth-success-msg" className="leading-relaxed">{success}</div>
          </div>
        )}

        {/* VIEW 1: SIGN IN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} id="form-login" className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Registered Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  id="login-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@apex.com"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-hidden rounded-xl transition"
                />
                <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                <button 
                  type="button" 
                  id="btn-goto-forgot"
                  onClick={() => setView('forgot')}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  id="login-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-hidden rounded-xl transition"
                />
                <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-medium text-sm rounded-xl cursor-pointer shadow-sm hover:shadow-md transition active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Verifying Session...' : 'Authenticate Account'}
            </button>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-900 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">New organization deployment? </span>
              <button 
                type="button" 
                id="btn-goto-signup"
                onClick={() => setView('signup')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
              >
                Register Admin Portal
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: TWO-FACTOR OTP CHALLENGE (Section 12) */}
        {view === 'mfa' && (
          <form onSubmit={handleMfaSubmit} id="form-mfa" className="space-y-5">
            <div className="text-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-150 dark:border-slate-800 mb-2">
              <ShieldCheck className="w-8 h-8 text-sky-600 mx-auto mb-2 animate-bounce" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Two-Factor Authentication Mandate</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                Enter the security access code pushed to your simulator mailbox dashboard.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">6-Digit Security Token</label>
              <div className="relative">
                <input 
                  type="text" 
                  id="mfa-otp"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full pl-10 pr-4 py-2.5 text-center font-mono text-lg tracking-widest bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-hidden rounded-xl transition"
                />
                <Key className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              id="btn-mfa-submit"
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm rounded-xl shadow-xs transition"
            >
              Verify OTP Settings
            </button>

            <button 
              type="button" 
              onClick={() => setView('login')}
              className="w-full text-xs font-medium text-slate-500 hover:text-slate-700 text-center block mt-2"
            >
              ← Back to login credentials
            </button>
          </form>
        )}

        {/* VIEW 3: ADMIN REGISTRATION REQUEST WORKFLOW (Section 2 - Steps 1) */}
        {view === 'signup' && (
          <form onSubmit={handleSignupSubmit} id="form-signup" className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400 mb-2">Request Business Deployment</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Company legal Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    id="signup-company"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Apex Retail Ltd"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  />
                  <Building className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">GSTIN Number</label>
                <div className="relative">
                  <input 
                    type="text" 
                    id="signup-gst"
                    required
                    maxLength={15}
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="27AAACA1234A1Z1"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden font-mono uppercase"
                  />
                  <Building className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Admin Owner Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  id="signup-admin-name"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Arjun Mehta"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
                <User className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Business Email</label>
                <div className="relative">
                  <input 
                    type="email" 
                    id="signup-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ceo@apex.com"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  />
                  <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Mobile Contact No</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    id="signup-mobile"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+919999988888"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  />
                  <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Required seats count (Seats)
                </label>
                <input 
                  type="number" 
                  id="signup-seats"
                  required
                  min={1}
                  value={requiredSeats}
                  onChange={(e) => setRequiredSeats(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Admin Password</label>
                <div className="relative">
                  <input 
                    type="password" 
                    id="signup-password"
                    required
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      analyzePassword(e.target.value);
                    }}
                    placeholder="Set Secure Password"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  />
                  <Lock className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Password Policy visual ledger (Section 12) */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800 text-[10px] space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-widest block mb-1">Enterprise Password Policies Requirement:</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div id="policy-len" className={checkStyle(policyChecks.length)}>• 8+ Characters</div>
                <div id="policy-case" className={checkStyle(policyChecks.upperLower)}>• Upper + Lower letters</div>
                <div id="policy-num" className={checkStyle(policyChecks.number)}>• At least 1 number</div>
                <div id="policy-spec" className={checkStyle(policyChecks.special)}>• Special char (@$!%*?&)</div>
              </div>
            </div>

            <button
              type="submit"
              id="btn-signup-submit"
              disabled={loading || !Object.values(policyChecks).every(Boolean)}
              className="w-full py-2 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wide rounded-lg cursor-pointer transition disabled:opacity-40"
            >
              {loading ? 'Submitting Application...' : 'Register Secure Tenant'}
            </button>

            <button 
              type="button" 
              onClick={() => setView('login')}
              className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 text-center"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* VIEW 4: FORGOT PASSWORD FORM (Section 8) */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} id="form-forgot" className="space-y-5">
            <div className="text-center">
              <HelpCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <span className="text-xs text-slate-500 block">
                Enter your verified credentials to issue an OTP recovery code.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Registered Email Office</label>
              <div className="relative">
                <input 
                  type="email" 
                  id="forgot-email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@apex.com"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:outline-hidden rounded-xl transition"
                />
                <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              id="btn-forgot-submit"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-xl shadow-xs transition"
            >
              Dispatch Verification Reset OTP
            </button>

            <button 
              type="button" 
              onClick={() => setView('login')}
              className="w-full text-xs text-slate-500 text-center block mt-2"
            >
              ← Back to credentials entry
            </button>
          </form>
        )}

        {/* VIEW 5: RESET PASSWORD FORM (Section 8) */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} id="form-reset" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Verification OTP Code</label>
              <input 
                type="text" 
                id="reset-code"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="Ex. 123456"
                className="w-full px-3 py-1.5 text-xs font-mono tracking-widest text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New Secure Password</label>
              <input 
                type="password" 
                id="reset-new-password"
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  analyzePassword(e.target.value);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800 text-[10px] space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-widest block mb-1">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div className={checkStyle(policyChecks.length)}>• 8+ Characters</div>
                <div className={checkStyle(policyChecks.upperLower)}>• Upper + Lower letters</div>
                <div className={checkStyle(policyChecks.number)}>• At least 1 number</div>
                <div className={checkStyle(policyChecks.special)}>• Special char (@$!%*?&)</div>
              </div>
            </div>

            <button
              type="submit"
              id="btn-reset-submit"
              disabled={!Object.values(policyChecks).every(Boolean)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-wide rounded-lg cursor-pointer transition disabled:opacity-40"
            >
              Reset My Password
            </button>

            <button 
              type="button" 
              onClick={() => setView('login')}
              className="w-full text-xs text-slate-500 text-center block mt-2"
            >
              Cancel & Back to Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
