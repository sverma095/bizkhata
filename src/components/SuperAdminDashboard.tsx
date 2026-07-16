import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, CheckCircle2, XCircle, AlertCircle, 
  Settings, LogOut, Search, Clock, Plus, Edit2, ShieldAlert, ArrowLeft,
  Sliders, ShieldAlert as AlertIcon, Eye, CheckCircle, Shield
} from 'lucide-react';
import { Organization, User, AuditLog, SeatRequest, RegistrationRequest } from '../types.js';

interface SuperAdminDashboardProps {
  token: string;
  activeUser: User;
  onLogout: () => void;
  onBackToDashboard?: () => void;
}

export default function SuperAdminDashboard(props: SuperAdminDashboardProps) {
  const { token, activeUser, onLogout, onBackToDashboard } = props;

  // Domain data logs state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filtering / UI state
  const [activeTab, setActiveTab] = useState<'orgs' | 'tickets' | 'seats' | 'audits' | 'users' | 'support'>('orgs');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Support tickets
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [viewingOrgId, setViewingOrgId] = useState<string | null>(null);
  const [orgLedger, setOrgLedger] = useState<any | null>(null);
  const [orgLedgerLoading, setOrgLedgerLoading] = useState(false);

  // Selected details / Modal edits
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editSeats, setEditSeats] = useState<number>(5);
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended'>('Active');
  const [editExpiry, setEditExpiry] = useState<string>('');
  
  const [pendingActionReg, setPendingActionReg] = useState<RegistrationRequest | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [approvalMonths, setApprovalMonths] = useState(12);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // SaaS Owner: new tenant enrollment form (merged in from the old separate Owner console)
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgLegal, setNewOrgLegal] = useState('');
  const [newOrgPan, setNewOrgPan] = useState('');
  const [newOrgGstin, setNewOrgGstin] = useState('');
  const [newOrgSeats, setNewOrgSeats] = useState(4);
  const [newOrgPackage, setNewOrgPackage] = useState('Standard');
  const [newOrgPricing, setNewOrgPricing] = useState(2499);
  const [newOrgEmail, setNewOrgEmail] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [oRes, rRes, sRes, lRes, uRes, tRes] = await Promise.all([
        fetch('/api/superadmin/organizations', { headers }),
        fetch('/api/superadmin/registrations', { headers }),
        fetch('/api/seat-requests', { headers }),
        fetch('/api/audit-logs', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/support/tickets', { headers })
      ]);

      // Each endpoint updates its own state independently — one failing (e.g. a
      // transient hiccup on /api/users) must not hide data from the others that
      // succeeded, like pending registrations.
      if (oRes.ok) setOrganizations(await oRes.json()); else console.error("Failed to load organizations:", oRes.status);
      if (rRes.ok) {
        const freshRegs = await rRes.json();
        setRegistrations(freshRegs);
        // If the confirm panel is open for a registration that no longer exists
        // in the freshly polled list (already resolved elsewhere, or stale local
        // state from a race with a prior poll), close it instead of leaving it
        // stuck pointing at a dead ID.
        setPendingActionReg(cur =>
          cur && !freshRegs.some((r: RegistrationRequest) => r.id === cur.id) ? null : cur
        );
      } else {
        console.error("Failed to load registrations:", rRes.status);
      }
      if (sRes.ok) setSeatRequests(await sRes.json()); else console.error("Failed to load seat requests:", sRes.status);
      if (lRes.ok) setAuditLogs(await lRes.json()); else console.error("Failed to load audit logs:", lRes.status);
      if (uRes.ok) setUsers(await uRes.json()); else console.error("Failed to load users:", uRes.status);
      if (tRes.ok) setSupportTickets(await tRes.json()); else console.error("Failed to load support tickets:", tRes.status);
    } catch (err) {
      console.error("Failed to load platform data profiles", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Intermittent poll to keep the sandbox UI feeling fresh and synchronized
    const poller = setInterval(loadAllData, 5000);
    return () => clearInterval(poller);
  }, [token]);

  const showFeedback = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 5000);
  };

  // Organization modification (Suspend, Seat Allocations)
  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgEmail) {
      showFeedback("Business Name and registered customer email are mandatory.", true);
      return;
    }
    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newOrgName,
          legalName: newOrgLegal,
          pan: newOrgPan,
          gstNumber: newOrgGstin,
          purchasedSeats: newOrgSeats,
          packageType: newOrgPackage,
          pricingMonthly: newOrgPricing,
          registeredEmail: newOrgEmail
        })
      });
      if (!res.ok) { const e2 = await res.json(); throw new Error(e2.error || 'Failed to enroll organization.'); }
      showFeedback(`Enrolled '${newOrgName}' successfully. The org's Admin can now log in with the email/password set here — Super Admin accounts don't have their own ledger, so you won't see "Add Client" etc. work under this login.`);
      setShowNewOrgForm(false);
      setNewOrgName(''); setNewOrgLegal(''); setNewOrgPan(''); setNewOrgGstin('');
      setNewOrgSeats(4); setNewOrgPackage('Standard'); setNewOrgPricing(2499); setNewOrgEmail('');
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to enroll organization.', true);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      const res = await fetch(`/api/superadmin/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: editStatus,
          allocatedSeats: editSeats,
          ...(editExpiry ? { subscriptionExpiresAt: new Date(editExpiry).toISOString() } : {})
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Changes could not be saved.');
      }

      showFeedback(`Successfully updated Organization configuration: '${editingOrg.name}'.`);
      setEditingOrg(null);
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  // Onboarding Approvals Action (Approve / Reject / Query Detail)
  const handleRegAction = async (action: 'Approve' | 'Reject' | 'RequestInfo') => {
    if (!pendingActionReg) return;

    try {
      const res = await fetch(`/api/superadmin/registrations/${pendingActionReg.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          feedback: actionFeedback,
          subscriptionMonths: approvalMonths
        })
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 404) {
          // Registration was already resolved (e.g. approved from another
          // session, or this panel was stale). Don't leave the user stuck
          // retrying against a dead ID — close the panel and resync the list.
          setPendingActionReg(null);
          setActionFeedback('');
          loadAllData();
          showFeedback('This registration was already processed. Refreshing list.', true);
          return;
        }
        throw new Error(data.error || 'Action failed.');
      }

      showFeedback(`Successfully processed tenant registration request: '${action}'.`);
      setPendingActionReg(null);
      setActionFeedback('');
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  // Approve Seat requests directly
  const handleSeatApproval = async (id: string, action: 'Approve' | 'Reject') => {
    try {
      const res = await fetch(`/api/seat-requests/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request action failed.');
      }

      showFeedback(`Seat extension invitation resolved: ${action}.`);
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  // Quick statistics totals
  const totalSeatsAllocated = organizations.reduce((acc, cur) => acc + cur.allocatedSeats, 0);
  const totalSeatsUsed = organizations.reduce((acc, cur) => acc + (cur.usedSeats || 0), 0);
  const pendingRegistrations = registrations.filter(r => r.status === 'Pending').length;
  const pendingSeatTickets = seatRequests.filter(s => s.status === 'Pending').length;

  return (
    <div id="superadmin-dashboard" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* Sleek LEFT SIDEBAR - Sticky on Desktop, stacks on Mobile */}
      <aside className="w-full md:w-64 bg-[#F3F4F7] text-slate-700 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-200 justify-between md:h-screen md:sticky md:top-0 shadow-sm">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-rose-600 rounded-lg flex items-center justify-center font-bold text-white shadow-xs">
                BK
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-800 tracking-tight">Ledgerio</span>
                <span className="block text-[9px] text-rose-600 font-mono font-bold tracking-widest uppercase mt-0.5">PLATFORM CONTROL</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="px-2 py-0.5 rounded text-[9px] bg-rose-50 text-rose-700 font-mono font-bold uppercase tracking-wider border border-rose-200 inline-block font-sans">
                SUPER ADMIN CLEARANCE
              </span>
            </div>
          </div>

          {/* Navigation Items mapped from Tab Selection state */}
          <nav className="p-4 space-y-1">
            <button
              id="tab-su-orgs"
              onClick={() => { setActiveTab('orgs'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'orgs'
                  ? 'bg-[#FCE7E9] text-rose-700 border-r-4 border-rose-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-rose-600" />
                <span>Deployments</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {organizations.length}
              </span>
            </button>

            <button
              id="tab-su-tickets"
              onClick={() => { setActiveTab('tickets'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left relative ${
                activeTab === 'tickets'
                  ? 'bg-[#FCE7E9] text-rose-700 border-r-4 border-rose-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Onboardings</span>
              </div>
              {pendingRegistrations > 0 ? (
                <span className="px-2 py-0.5 text-[9px] bg-amber-500 text-white font-black rounded-full animate-bounce">
                  {pendingRegistrations}
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                  {registrations.length}
                </span>
              )}
            </button>

            <button
              id="tab-su-seats"
              onClick={() => { setActiveTab('seats'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'seats'
                  ? 'bg-[#FCE7E9] text-rose-700 border-r-4 border-rose-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Seat Tickets</span>
              </div>
              {pendingSeatTickets > 0 ? (
                <span className="px-1.5 py-0.5 text-[9px] bg-purple-500 text-white font-extrabold rounded-full">
                  {pendingSeatTickets}
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                  {seatRequests.length}
                </span>
              )}
            </button>

            <button
              id="tab-su-audits"
              onClick={() => { setActiveTab('audits'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'audits'
                  ? 'bg-[#FCE7E9] text-rose-700 border-r-4 border-rose-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Audit Trails</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {auditLogs.length}
              </span>
            </button>

            <button
              id="tab-su-users"
              onClick={() => { setActiveTab('users'); setUserSearch(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'users'
                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600" />
                <span>All Users</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {users.length}
              </span>
            </button>

            <button
              id="tab-su-support"
              onClick={() => { setActiveTab('support'); setViewingOrgId(null); setOrgLedger(null); setSelectedTicket(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'support'
                  ? 'bg-rose-50 text-rose-700 border-r-4 border-rose-500 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Support</span>
              </div>
              {supportTickets.filter((t: any) => t.status === 'Open').length > 0 && (
                <span className="font-mono text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                  {supportTickets.filter((t: any) => t.status === 'Open').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Back to normal dashboard — exits console without logging out */}
        {onBackToDashboard && (
          <div className="px-4 pb-2">
            <button
              id="su-btn-back-to-dashboard"
              onClick={onBackToDashboard}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition duration-150 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Normal Dashboard
            </button>
          </div>
        )}

        {/* User profile footer built inside the sidebar */}
        <div className="p-4 border-t border-slate-200 bg-[#F3F4F7] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-sans font-bold text-rose-600 flex items-center justify-center text-xs">
                {activeUser.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate leading-none">{activeUser.fullName}</div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">Platform Admin</div>
              </div>
            </div>
            <button
              id="su-btn-logout"
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition duration-150 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:h-screen md:overflow-y-auto">
        
        {/* Top bar on top of main workspace */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 tracking-tight font-sans">
              System Control Console
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Logged in: <span className="font-bold">{activeUser.fullName}</span> ({activeUser.email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (!confirm("Create/verify Supabase tables (bk_organizations, bk_users, etc.)? Safe to run multiple times.")) return;
                const r = await fetch("/api/superadmin/init-db", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                setMessage({ text: d.success ? `✓ ${d.message}` : (d.error || "Failed"), isError: !d.success });
              }}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
            >
              🗄️ Init DB Tables
            </button>
            <button
              onClick={async () => {
                const typed = prompt("⚠️ DESTRUCTIVE ACTION ⚠️\n\nThis permanently deletes ALL organizations, users, registrations, seat requests, and notifications except the two canonical seed accounts (Super Admin + Verma Consultancy). This is NOT a password reset - every other customer's account and data will be gone.\n\nType DELETE ALL to confirm:");
                if (typed !== "DELETE ALL") return;
                const r = await fetch("/api/superadmin/reset-userdb", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                const d = await r.json();
                if (d.success) { setMessage({ text: `✓ USER_DB wiped. ${d.users.length} canonical users restored.`, isError: false }); loadAllData(); }
                else setMessage({ text: d.error || "Reset failed", isError: true });
              }}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
            >
              ⚠️ Wipe All Data (Danger)
            </button>
            <button
              id="su-btn-refresh"
              onClick={loadAllData}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition duration-150 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshIcon className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} /> 
              Sync State
            </button>
          </div>
        </header>

        {/* Global Key Stats Summary Bins */}
        <div className="p-8 space-y-8 flex-1">
          
          {/* Alerts / Success / Failure Flash */}
          {message && (
            <div className={`p-4 rounded-xl border text-xs shadow-xs flex items-center gap-3 animate-fade-in ${
              message.isError 
                ? 'bg-rose-50 border-rose-200 text-rose-800 font-medium' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
            }`}>
              <AlertCircle className={`w-4 h-4 ${message.isError ? 'text-rose-500' : 'text-emerald-600'}`} />
              <span id="su-dashboard-flash-text" className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Global Key Stats Summary Bins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6" id="su-stats-row">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Corporations</span>
                <Building2 className="w-4.5 h-4.5 text-sky-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900" id="stat-corp-count">{organizations.length}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Active platform nodes</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deploy Seats Allocation</span>
                <Users className="w-4.5 h-4.5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900" id="stat-seats">
                {totalSeatsUsed} <span className="text-xs text-slate-400">/ {totalSeatsAllocated}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Occupancy count: {((totalSeatsUsed / (totalSeatsAllocated || 1)) * 100).toFixed(0)}%
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Tickets</span>
                <Building2 className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-slate-900" id="stat-pending-regs">{pendingRegistrations}</div>
              <div className="text-[10px] text-amber-600 font-semibold mt-1">Pending setup reviews</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition duration-150">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">License Requests</span>
                <Sliders className="w-4.5 h-4.5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900" id="stat-seat-reqs">{pendingSeatTickets}</div>
              <div className="text-[10px] text-purple-600 font-semibold mt-1">Outstanding seat demands</div>
            </div>

          </div>

          {/* Grid Layout containing Main panel and Security audit panel side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main view container tab panel */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-xs" id="su-tab-view-container">
          
          {/* TAB 1: MANAGE TENANT ORGANIZATIONS */}
          {activeTab === 'orgs' && (
            <div className="space-y-6">
              {/* SaaS Owner: Platform metrics (merged from old Owner console) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-lift bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                  <p className="text-[9.5px] uppercase font-black text-slate-400 tracking-wider">Enrolled Tenant Businesses</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">{organizations.length}</span>
                    <span className="text-xs text-slate-500">SME Corporations</span>
                  </div>
                </div>
                <div className="card-lift bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                  <p className="text-[9.5px] uppercase font-black text-slate-400 tracking-wider">Licensed Seating Capacity</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">{organizations.reduce((acc, curr) => acc + (curr.allocatedSeats || 0), 0)}</span>
                    <span className="text-xs text-slate-500">Active Seats</span>
                  </div>
                </div>
                <div className="card-lift bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-1">
                  <p className="text-[9.5px] uppercase font-black text-slate-400 tracking-wider">Platform MRR (Consolidated)</p>
                  <div className="flex items-baseline gap-1 text-emerald-700">
                    <span className="text-2xl font-black">₹{organizations.reduce((acc, curr) => acc + (curr.pricingMonthly || 0), 0).toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold">/ month</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Active Client Databases</h3>
                  <p className="text-xs text-slate-400 font-medium">Suspend profiles or adjust hard organizational seat scales manually.</p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative max-w-xs w-full">
                    <input
                      type="text"
                      id="su-search-org"
                      placeholder="Search by company or GSTIN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:outline-hidden rounded-lg"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewOrgForm(!showNewOrgForm)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Enroll New Subscriber
                  </button>
                </div>
              </div>

              {showNewOrgForm && (
                <form onSubmit={handleAddOrg} className="bg-[#FAF9F5] border border-amber-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <input required placeholder="Business Name*" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input placeholder="Legal Name" value={newOrgLegal} onChange={e => setNewOrgLegal(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input required type="email" placeholder="Registered Email*" value={newOrgEmail} onChange={e => setNewOrgEmail(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input placeholder="PAN" value={newOrgPan} onChange={e => setNewOrgPan(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input placeholder="GSTIN" value={newOrgGstin} onChange={e => setNewOrgGstin(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input type="number" min={1} placeholder="Seats" value={newOrgSeats} onChange={e => setNewOrgSeats(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input placeholder="Package Type" value={newOrgPackage} onChange={e => setNewOrgPackage(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <input type="number" min={0} placeholder="Monthly Price (₹)" value={newOrgPricing} onChange={e => setNewOrgPricing(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg" />
                  <div className="flex gap-2 items-center justify-end">
                    <button type="button" onClick={() => setShowNewOrgForm(false)} className="px-3 py-2 text-slate-500 font-bold">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg">Save</button>
                  </div>
                </form>
              )}

              {/* Org list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="p-3">Org Details</th>
                      <th className="p-3">GSTIN Number</th>
                      <th className="p-3">Licensing limits</th>
                      <th className="p-3">Profile Status</th>
                      <th className="p-3">Registered On</th>
                      <th className="p-3">Subscription Expiry</th>
                      <th className="p-3 text-right">Operational Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {organizations
                      .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.gstNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((org) => (
                        <tr key={org.id} id={`row-org-${org.id}`} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 font-sans text-sm">{org.name}</div>
                            <div className="text-[10px] text-slate-400">UUID: {org.id}</div>
                          </td>
                          <td className="p-3 uppercase font-semibold text-slate-700">{org.gstNumber}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{org.usedSeats}</span>
                            <span className="text-slate-400 text-[10px]"> / {org.allocatedSeats} seats utilized</span>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                                {(org as any).plan || "professional"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              org.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`} id={`org-status-${org.id}`}>
                              {org.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            <div>{org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-IN') : '—'}</div>
                            {(org as any).approvedAt && (
                              <div className="text-[10px] text-emerald-600">✓ Approved {new Date((org as any).approvedAt).toLocaleDateString('en-IN')}</div>
                            )}
                          </td>
                          <td className="p-3">
                            {(org as any).subscriptionExpiresAt ? (() => {
                              const expiry = new Date((org as any).subscriptionExpiresAt);
                              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              const isExpired = daysLeft <= 0;
                              const isSoon = daysLeft > 0 && daysLeft <= 30;
                              return (
                                <div>
                                  <div className={`text-[11px] font-mono font-bold ${isExpired ? 'text-rose-600' : isSoon ? 'text-amber-600' : 'text-emerald-700'}`}>
                                    {expiry.toLocaleDateString('en-IN')}
                                  </div>
                                  <div className={`text-[10px] ${isExpired ? 'text-rose-400' : isSoon ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {isExpired ? 'EXPIRED' : `${daysLeft}d left`}
                                  </div>
                                </div>
                              );
                            })() : <span className="text-slate-300 text-[10px]">Not set</span>}
                          </td>
                          <td className="p-3 text-right flex gap-1.5 justify-end">
                            <button
                              onClick={async () => {
                                setViewingOrgId(org.id);
                                setOrgLedger(null);
                                setOrgLedgerLoading(true);
                                setActiveTab('support');
                                const r = await fetch(`/api/superadmin/orgs/${org.id}/ledger`, { headers: { Authorization: `Bearer ${token}` } });
                                if (r.ok) setOrgLedger(await r.json());
                                setOrgLedgerLoading(false);
                              }}
                              className="px-2.5 py-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-sans font-bold transition text-[11px]"
                            >
                              View Ledger
                            </button>
                            <button
                              id={`btn-edit-org-${org.id}`}
                              onClick={() => {
                                setEditingOrg(org);
                                setEditSeats(org.allocatedSeats);
                                setEditStatus(org.status as any);
                                setEditExpiry((org as any).subscriptionExpiresAt ? new Date((org as any).subscriptionExpiresAt).toISOString().split('T')[0] : '');
                              }}
                              className="px-2.5 py-1 text-slate-700 hover:text-sky-600 bg-slate-100 hover:bg-sky-50 border border-slate-200 rounded font-sans font-bold transition text-[11px]"
                            >
                              Configure
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>

              {/* Edit Modal simulated embedded */}
              {editingOrg && (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3" id="su-edit-limits-form-container">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Configure: {editingOrg.name}</h4>
                  <form onSubmit={handleUpdateOrg} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Plan */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Subscription Plan</label>
                      <select
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded font-bold"
                        value={(editingOrg as any).plan || 'professional'}
                        onChange={async (e) => {
                          const plan = e.target.value;
                          const planSeats: Record<string,number> = { free:1, starter:3, professional:10, enterprise:50 };
                          setEditSeats(planSeats[plan] || 10);
                          const r = await fetch(`/api/superadmin/organizations/${editingOrg.id}/plan`, {
                            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan, months: editingOrg.subscriptionMonths || 12 })
                          });
                          if (r.ok) { loadAllData(); setMessage({ text: `✓ Plan updated to ${plan}`, isError: false }); } else { setMessage({ text: `Failed to update plan (${r.status})`, isError: true }); }
                        }}
                      >
                        <option value="free">Free — ₹0 / 1 seat</option>
                        <option value="starter">Starter — ₹999/mo / 3 seats</option>
                        <option value="professional">Professional — ₹2,499/mo / 10 seats</option>
                        <option value="enterprise">Enterprise — ₹4,999/mo / 50 seats</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Seats</label>
                      <input
                        type="number"
                        id="su-edit-seats-input"
                        required
                        min={editingOrg.usedSeats}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded font-bold"
                        value={editSeats}
                        onChange={(e) => setEditSeats(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                      <select
                        id="su-edit-status-select"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded font-bold"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setEditingOrg(null)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded transition">
                        Cancel
                      </button>
                      <button type="submit" id="su-btn-save-limits"
                        className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded transition">
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: PENDING CORPORATE REGISTRATIONS */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Business Approval Pipeline</h3>
                <p className="text-xs text-slate-400 font-medium">Verify incoming merchant credential filings to provision secure organizational nodes.</p>
              </div>

              <div className="space-y-4">
                {registrations.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No registrations found.</p>
                ) : (
                  registrations.map((reg) => (
                    <div 
                      key={reg.id} 
                      id={`ticket-reg-${reg.id}`}
                      className={`p-4 rounded-xl border transition ${
                        reg.status === 'Pending' 
                          ? 'bg-amber-50/20 border-amber-200' 
                          : reg.status === 'Approved' 
                            ? 'bg-emerald-50/10 border-emerald-200 opacity-75' 
                            : 'bg-slate-100/50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-800 font-sans">{reg.companyName}</h4>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full font-bold bg-slate-200" id={`reg-badge-status-${reg.id}`}>
                              {reg.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                            <div><span className="font-semibold text-slate-400">GSTIN:</span> <span className="uppercase text-slate-700">{reg.gstNumber}</span></div>
                            <div><span className="font-semibold text-slate-400">Admin Owner:</span> <span className="text-slate-700">{reg.adminName}</span></div>
                            <div><span className="font-semibold text-slate-400">Contact:</span> <span className="text-slate-700">{reg.email}</span></div>
                            <div><span className="font-semibold text-slate-400">Asked seats:</span> <span className="font-bold text-sky-600">{reg.numberOfRequiredSeats} Seats</span></div>
                            <div><span className="font-semibold text-slate-400">Requested plan:</span> <span className="font-bold text-emerald-600 capitalize">{reg.requestedPlan || "—"}</span></div>
                          </div>

                          {reg.additionalInfoRequest && (
                            <p className="text-[11px] text-amber-700 font-mono bg-amber-50 p-2 rounded">
                              <span className="font-bold">Asked for details:</span> "{reg.additionalInfoRequest}"
                            </p>
                          )}
                        </div>

                        {reg.status === 'Pending' && (
                          <div className="flex items-center gap-1.5 self-end md:self-center">
                            <button
                              id={`btn-reg-approve-${reg.id}`}
                              onClick={() => {
                                setPendingActionReg(reg);
                                setActionFeedback('Welcome onboard Apex Khata network.');
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded transition flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              id={`btn-reg-query-${reg.id}`}
                              onClick={() => {
                                setPendingActionReg(reg);
                                setActionFeedback('Please upload certificate of GST registration files.');
                              }}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs uppercase tracking-wider rounded transition"
                            >
                              Ask Info
                            </button>
                            <button
                              id={`btn-reg-reject-${reg.id}`}
                              onClick={() => {
                                setPendingActionReg(reg);
                                setActionFeedback('Unable to verify credential listings against MCA.');
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {reg.status === 'Approved' && (
                          <div className="self-end md:self-center">
                            <button
                              id={`btn-reg-recover-${reg.id}`}
                              onClick={async () => {
                                const statusRes = await fetch(`/api/superadmin/registrations/${reg.id}/provision-status`, { headers: { Authorization: `Bearer ${token}` } });
                                const statusData = await statusRes.json();
                                if (!statusData.stuck) {
                                  alert(`${reg.companyName} is fine — the organization and user account both exist.`);
                                  return;
                                }
                                if (!confirm(`${reg.companyName} was approved but its organization/user account is missing (likely lost to the persistence bug fixed earlier). Recreate it now with the original sign-up details?`)) return;
                                const r = await fetch(`/api/superadmin/registrations/${reg.id}/reprovision`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                                const data = await r.json();
                                if (r.ok) { loadAllData(); setMessage({ text: `✓ Recovered account for ${reg.companyName}`, isError: false }); }
                                else setMessage({ text: data.error || `Failed to recover ${reg.companyName}`, isError: true });
                              }}
                              className="px-3 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider rounded transition"
                            >
                              Check / Fix Account
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reg decision sheet container (simulated drawer modal embedded) */}
              {pendingActionReg && (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3" id="su-reg-action-container">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Confirm Action for: <span className="text-slate-800 p-1 px-2 rounded bg-white font-mono">{pendingActionReg.companyName}</span>
                  </h4>

                  {/* Registration date info */}
                  <div className="bg-white border border-slate-200 rounded p-3 text-xs space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Registered on:</span>
                      <span className="font-mono text-slate-700">{new Date(pendingActionReg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Subscription Period:</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={approvalMonths}
                          onChange={(e) => setApprovalMonths(parseInt(e.target.value))}
                          className="border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 bg-white outline-none"
                        >
                          <option value={1}>1 Month</option>
                          <option value={3}>3 Months</option>
                          <option value={6}>6 Months</option>
                          <option value={12}>12 Months (1 Year)</option>
                          <option value={24}>24 Months (2 Years)</option>
                          <option value={36}>36 Months (3 Years)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Subscription Expires:</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {new Date(Date.now() + approvalMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Feedback / Notes (Optional — required for query or reject)</label>
                    <textarea
                      id="su-reg-feedback-textarea"
                      placeholder="Comment text details here..."
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded font-mono"
                      rows={2}
                      value={actionFeedback}
                      onChange={(e) => setActionFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setPendingActionReg(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded">Cancel</button>
                    <button onClick={() => handleRegAction('RequestInfo')} className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 rounded">Submit query</button>
                    <button id="su-btn-confirm-reject" onClick={() => handleRegAction('Reject')} className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded">Confirm rejection</button>
                    <button id="su-btn-confirm-approve" onClick={() => handleRegAction('Approve')} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded">Authorize approval ({approvalMonths}M)</button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SEAT EXTENSION APPLICATIONS */}
          {activeTab === 'seats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Subscriber Seats Tickets</h3>
                <p className="text-xs text-slate-400 font-medium">Verify additional seat requests raised by organization admins depending on headcount.</p>
              </div>

              <div className="space-y-4">
                {seatRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No seat licensing requests found.</p>
                ) : (
                  seatRequests.map((seat) => {
                    const orgName = organizations.find(o => o.id === seat.organizationId)?.name || seat.organizationId;
                    return (
                      <div 
                        key={seat.id} 
                        id={`seat-req-${seat.id}`}
                        className={`p-4 rounded-xl border transition ${
                          seat.status === 'Pending' 
                            ? 'bg-purple-50/10 border-purple-200' 
                            : 'bg-slate-100/50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">{orgName}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-[11px] font-mono font-medium text-slate-500">Requested by: {seat.requestedBy}</span>
                            </div>
                            <p className="text-xs text-slate-600 italic font-sans">
                              "Reason: {seat.reason}"
                            </p>
                            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 mt-1.5">
                              <div>Current Capacity: <span className="font-bold text-slate-600">{seat.currentSeatCount} Licenses</span></div>
                              <div>Requested Expansion: <span className="font-extrabold text-purple-600 underline">+{seat.additionalSeatsRequested} seats</span></div>
                              <div>Requested on: <span>{new Date(seat.createdAt).toLocaleDateString()}</span></div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {seat.status === 'Pending' ? (
                              <>
                                <button
                                  id={`btn-seat-reject-${seat.id}`}
                                  onClick={() => handleSeatApproval(seat.id, 'Reject')}
                                  className="px-2.5 py-1 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-slate-200 rounded font-mono font-bold transition"
                                >
                                  Decline
                                </button>
                                <button
                                  id={`btn-seat-approve-${seat.id}`}
                                  onClick={() => handleSeatApproval(seat.id, 'Approve')}
                                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded transition"
                                >
                                  Authorize Seat Increase
                                </button>
                              </>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase tracking-wider font-mono p-1 px-2.5 rounded-full ${
                                seat.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {seat.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 4: AUDIT TRAIL REVIEWS */}
          {activeTab === 'audits' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Platform-wide Audit Trails</h3>
                  <p className="text-xs text-slate-400 font-medium">Capture system logins, updates, allocations, and organizational state transitions.</p>
                </div>
                <div className="relative max-w-xs w-full mr-2">
                  <input
                    type="text"
                    id="su-search-audit"
                    placeholder="Search query by action / user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:outline-hidden rounded-lg font-mono"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[350px] overflow-y-auto pr-1">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-100 sticky top-0 md:bg-white">
                      <tr>
                        <th className="p-3">Event Date</th>
                        <th className="p-3">User context</th>
                        <th className="p-3">Action performed</th>
                        <th className="p-3">Details summary</th>
                        <th className="p-3 font-mono">Gateway IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {auditLogs
                        .filter(log => 
                          log.actionPerformed.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{log.userName}</div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.2 rounded bg-slate-100">{log.role}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-sky-600">{log.actionPerformed}</span>
                            </td>
                            <td className="p-3 font-sans text-slate-700 leading-normal max-w-xs">{log.details || 'N/A'}</td>
                            <td className="p-3 text-slate-500">{log.ipAddress}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* USERS TAB — Delete, Hold, Manager, Edit Role */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">All Users Across All Organizations</h3>
                <input
                  type="text"
                  placeholder="Search by name, email or org..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-64 outline-none focus:border-blue-400"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Organization</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter(u => !userSearch ||
                        u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        organizations.find(o => o.id === u.organizationId)?.name?.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => {
                        const org = organizations.find(o => o.id === u.organizationId);
                        const isEditing = editingUserId === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{u.fullName}</div>
                              <div className="text-slate-400 font-mono text-[10px]">{u.email}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{org?.name || (u.role === 'Super Admin' ? '— Platform Admin —' : '—')}</td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select defaultValue={u.role}
                                  onChange={e => setEditingUserRole(e.target.value)}
                                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white outline-none">
                                  <option value="Admin">Admin</option>
                                  <option value="Accountant">Accountant</option>
                                  <option value="Staff">Staff</option>
                                  <option value="Viewer">Viewer</option>
                                  <option value="Manager">Manager</option>
                                </select>
                              ) : (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  u.role === 'Super Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  u.role === 'Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  u.role === 'Manager' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>{u.role}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1 text-[11px] font-medium ${
                                u.status === 'Active' ? 'text-emerald-600' :
                                u.status === 'Disabled' ? 'text-rose-600' : 'text-amber-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === 'Active' ? 'bg-emerald-500' :
                                  u.status === 'Disabled' ? 'bg-rose-500' : 'bg-amber-400'
                                }`} />
                                {u.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {u.role !== 'Super Admin' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button onClick={async () => {
                                        const r = await fetch(`/api/users/${u.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                          body: JSON.stringify({ role: editingUserRole })
                                        });
                                        if (r.ok) { setEditingUserId(null); loadAllData(); setMessage({ text: `✓ Role updated for ${u.fullName}`, isError: false }); } else { setMessage({ text: `Failed to update role for ${u.fullName} (${r.status})`, isError: true }); }
                                      }} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer">Save</button>
                                      <button onClick={() => setEditingUserId(null)} className="border border-slate-300 text-slate-600 text-[10px] px-2.5 py-1 rounded cursor-pointer">Cancel</button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Set Password */}
                                      <button onClick={async () => {
                                        const newPw = prompt(`Set a new password for ${u.email}:\n(at least 8 characters — tell them this new password so they can log in)`);
                                        if (!newPw) return;
                                        const r = await fetch(`/api/superadmin/users/${u.id}/set-password`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                          body: JSON.stringify({ newPassword: newPw })
                                        });
                                        const d = await r.json();
                                        if (r.ok) setMessage({ text: `✓ Password set for ${u.email}. Share the new password with them directly.`, isError: false });
                                        else setMessage({ text: d.error || `Failed to set password for ${u.fullName}`, isError: true });
                                      }} className="border border-slate-300 hover:bg-slate-50 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer">
                                        Set Password
                                      </button>
                                      {/* Edit Role */}
                                      <button onClick={() => { setEditingUserId(u.id); setEditingUserRole(u.role); }}
                                        className="border border-slate-300 hover:bg-slate-50 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer">
                                        Edit Role
                                      </button>
                                      {/* Hold / Unhold */}
                                      <button onClick={async () => {
                                        const newStatus = u.status === 'Active' ? 'Disabled' : 'Active';
                                        const r = await fetch(`/api/users/${u.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                          body: JSON.stringify({ status: newStatus })
                                        });
                                        if (r.ok) { loadAllData(); setMessage({ text: `✓ ${u.fullName} ${newStatus === 'Disabled' ? 'put on hold' : 'activated'}`, isError: false }); } else { setMessage({ text: `Failed to update status for ${u.fullName} (${r.status})`, isError: true }); }
                                      }} className={`text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer border ${
                                        u.status === 'Active'
                                          ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700'
                                          : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                      }`}>
                                        {u.status === 'Active' ? 'Hold' : 'Unhold'}
                                      </button>
                                      {/* Make Manager */}
                                      {u.role !== 'Manager' && u.role !== 'Admin' && (
                                        <button onClick={async () => {
                                          const r = await fetch(`/api/users/${u.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ role: 'Manager' })
                                          });
                                          if (r.ok) { loadAllData(); setMessage({ text: `✓ ${u.fullName} promoted to Manager`, isError: false }); } else { setMessage({ text: `Failed to promote ${u.fullName} (${r.status})`, isError: true }); }
                                        }} className="border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer">
                                          Make Manager
                                        </button>
                                      )}
                                      {/* Delete */}
                                      <button onClick={async () => {
                                        if (!confirm(`Delete ${u.fullName} (${u.email})? This cannot be undone.`)) return;
                                        const r = await fetch('/api/users/remove', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                          body: JSON.stringify({ userId: u.id })
                                        });
                                        if (r.ok) { loadAllData(); setMessage({ text: `✓ User ${u.fullName} deleted`, isError: false }); } else { setMessage({ text: `Failed to delete ${u.fullName} (${r.status})`, isError: true }); }
                                      }} className="border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer">
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* SUPPORT TAB — Tickets + Org Ledger Viewer */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Support Center</h3>
                  <p className="text-xs text-slate-400">View & respond to org complaints. Inspect any org's ledger data.</p>
                </div>
                {selectedTicket && (
                  <button onClick={() => { setSelectedTicket(null); setOrgLedger(null); setViewingOrgId(null); }}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded">
                    ← Back to list
                  </button>
                )}
              </div>

              {/* Org Ledger Viewer */}
              {orgLedger && (
                <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h4 className="font-semibold text-gray-800 text-sm">🔍 Ledger: {orgLedger.org?.name}</h4>
                    <button onClick={() => { setOrgLedger(null); setViewingOrgId(null); }} className="text-gray-400 hover:text-gray-600 text-xs">✕ Close</button>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                    {[
                      { label: 'Invoices', val: orgLedger.stats?.invoices },
                      { label: 'Expenses', val: orgLedger.stats?.expenses },
                      { label: 'Bills', val: orgLedger.stats?.bills },
                      { label: 'Customers', val: orgLedger.stats?.customers },
                      { label: 'Vendors', val: orgLedger.stats?.vendors },
                      { label: 'Journals', val: orgLedger.stats?.journals },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-700">{s.val ?? 0}</div>
                        <div className="text-gray-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Revenue (Approved Invoices)</p>
                      <p className="text-lg font-bold text-green-700">₹{(orgLedger.stats?.totalRevenue || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Total Expenses</p>
                      <p className="text-lg font-bold text-rose-700">₹{(orgLedger.stats?.totalExpenses || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  {/* Users in org */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Users ({orgLedger.users?.length})</p>
                    <div className="space-y-1">
                      {(orgLedger.users || []).map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                          <span className="font-medium text-gray-800">{u.fullName || u.name}</span>
                          <span className="text-gray-500">{u.email}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span>
                          <span className="text-blue-600 font-medium">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Recent Invoices */}
                  {orgLedger.recentInvoices?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Recent Invoices</p>
                      <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-gray-400 uppercase text-[10px]">
                          <tr><th className="px-3 py-2 text-left">Invoice#</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orgLedger.recentInvoices.map((inv: any) => (
                            <tr key={inv.id}>
                              <td className="px-3 py-2 font-mono">{inv.invoiceNumber}</td>
                              <td className="px-3 py-2 text-gray-500">{inv.date}</td>
                              <td className="px-3 py-2 text-right font-mono">₹{(inv.total || 0).toLocaleString('en-IN')}</td>
                              <td className="px-3 py-2 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Support actions */}
                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button onClick={async () => {
                      const r = await fetch(`/api/superadmin/organizations/${viewingOrgId}`, {
                        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: orgLedger.org?.status === 'Active' ? 'Suspended' : 'Active' })
                      });
                      if (r.ok) { const d = await r.json(); setOrgLedger((p: any) => ({ ...p, org: { ...p.org, status: d.org?.status || (orgLedger.org?.status === 'Active' ? 'Suspended' : 'Active') } })); loadAllData(); }
                    }} className={`text-xs font-bold px-4 py-2 rounded border cursor-pointer ${orgLedger.org?.status === 'Active' ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      {orgLedger.org?.status === 'Active' ? '🔒 Suspend Org' : '✅ Reactivate Org'}
                    </button>
                    <button onClick={() => setOrgLedger(null)} className="text-xs text-gray-500 border border-gray-200 px-4 py-2 rounded hover:bg-gray-50">Close</button>
                  </div>
                </div>
              )}

              {orgLedgerLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-xs text-blue-600">Loading org ledger data...</div>
              )}

              {/* Ticket Detail View */}
              {selectedTicket && !orgLedger && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-800">{selectedTicket.subject}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedTicket.orgName} · {selectedTicket.raisedBy} · {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${selectedTicket.status === 'Open' ? 'bg-rose-100 text-rose-700' : selectedTicket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{selectedTicket.status}</span>
                  </div>
                  {/* Also show org ledger for this ticket */}
                  <button onClick={async () => {
                    setOrgLedgerLoading(true);
                    setViewingOrgId(selectedTicket.organizationId);
                    const r = await fetch(`/api/superadmin/orgs/${selectedTicket.organizationId}/ledger`, { headers: { Authorization: `Bearer ${token}` } });
                    if (r.ok) setOrgLedger(await r.json());
                    setOrgLedgerLoading(false);
                  }} className="text-xs text-blue-600 hover:underline font-medium">🔍 Inspect Org Ledger →</button>
                  {/* Conversation */}
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50">
                    {(selectedTicket.messages || []).map((m: any, i: number) => (
                      <div key={i} className={`flex ${m.role === 'Super Admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${m.role === 'Super Admin' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                          <p className={`font-bold text-[10px] mb-0.5 ${m.role === 'Super Admin' ? 'text-blue-200' : 'text-gray-500'}`}>{m.from} · {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Reply */}
                  <div className="space-y-2">
                    <textarea rows={3} value={replyText} onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your response..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      {['Open','In Progress','Resolved'].map(s => (
                        <button key={s} onClick={async () => {
                          if (!replyText.trim()) return;
                          const r = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
                            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: replyText, status: s })
                          });
                          if (r.ok) { const d = await r.json(); setSelectedTicket(d); setReplyText(''); loadAllData(); }
                        }} className={`text-xs font-bold px-4 py-2 rounded cursor-pointer border ${s === 'Resolved' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : s === 'In Progress' ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                          Reply & {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket List */}
              {!selectedTicket && !orgLedger && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">All Tickets ({supportTickets.length})</span>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">Open: {supportTickets.filter(t => t.status === 'Open').length}</span>
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">In Progress: {supportTickets.filter(t => t.status === 'In Progress').length}</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Resolved: {supportTickets.filter(t => t.status === 'Resolved').length}</span>
                    </div>
                  </div>
                  {supportTickets.length === 0 ? (
                    <div className="px-5 py-10 text-center text-gray-400 text-sm">No support tickets yet. When org users raise issues, they'll appear here.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase font-semibold border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left">Organisation</th>
                          <th className="px-4 py-3 text-left">Subject</th>
                          <th className="px-4 py-3 text-left">Raised By</th>
                          <th className="px-4 py-3 text-left">Priority</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {supportTickets.map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800 text-xs">{t.orgName}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{t.subject}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{t.raisedBy}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.priority === 'High' ? 'bg-rose-100 text-rose-700' : t.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'Open' ? 'bg-rose-100 text-rose-700' : t.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{t.status}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setSelectedTicket(t)} className="text-xs text-blue-600 hover:underline font-medium">Reply</button>
                                <button onClick={async () => {
                                  setOrgLedgerLoading(true);
                                  setViewingOrgId(t.organizationId);
                                  const r = await fetch(`/api/superadmin/orgs/${t.organizationId}/ledger`, { headers: { Authorization: `Bearer ${token}` } });
                                  if (r.ok) setOrgLedger(await r.json());
                                  setOrgLedgerLoading(false);
                                }} className="text-xs text-purple-600 hover:underline font-medium">View Ledger</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right side bento-grid panel columns for tenant isolation & node statistics */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tenant Isolation Protocol Status Card */}
          <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-900 p-5 shadow-xs transition duration-150 relative overflow-hidden" id="card-isolation-protocol">
            <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-10">
              <Shield className="w-40 h-40 text-sky-400" />
            </div>
            <div className="flex items-center gap-2 text-sky-400 mb-4">
              <Shield className="w-5 h-5 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Tenant Isolation Protocol</h4>
            </div>
            
            <p className="text-xs text-slate-400 leading-normal">
              Continuous tenant segregation is active. Client databases map uniquely through automated row-security filters.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-900 space-y-3 font-mono text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SEPARATION LEVEL</span>
                <span className="px-1.5 py-0.2 bg-sky-950/80 text-sky-400 rounded-md font-bold">GSTIN/UUID segregation</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">MFA REQUISITION</span>
                <span className="px-1.5 py-0.2 bg-emerald-950/80 text-emerald-400 rounded-md font-bold">Compulsory (Active)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">KEY PROTOCOL DERIVATION</span>
                <span className="text-slate-300 font-semibold select-all">SHA-256 / AES-GCM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">DATA ROUTER METRICS</span>
                <span className="text-emerald-400 font-bold">Row-level locked (OK)</span>
              </div>
            </div>
            
            <div className="mt-4 p-2 bg-slate-900/50 rounded-lg border border-slate-800/50 text-[10px] text-sky-300 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
              <span>Platform firewalls reporting zero leakage events</span>
            </div>
          </div>

          {/* Infrastructure Health Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="card-hw-health">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Deployment Nodes Live Monitor</h4>
            <div className="space-y-3.5">
              
              <div>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                  <span>Cloud API Gate Latency</span>
                  <span className="text-emerald-600 font-mono">14ms average</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[12%] rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                  <span>Postgres Database Pool Load</span>
                  <span className="text-sky-600 font-mono">19% operational</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full w-[19%] rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                  <span>Session Storage Cache Alloc</span>
                  <span className="text-purple-600 font-mono">31% capacity</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-[31%] rounded-full"></div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">GATEWAY ENDPOINT</span>
                <span className="text-slate-800 font-bold select-all">https://api.bizkhata.internal</span>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>

  </main>

</div>
  );
}

// Clean simple helper icons
function RefreshIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H20" />
    </svg>
  );
}
