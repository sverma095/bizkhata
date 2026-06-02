import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, CheckCircle2, XCircle, AlertCircle, 
  Settings, LogOut, Search, Clock, Plus, Edit2, ShieldAlert,
  Sliders, ShieldAlert as AlertIcon, Eye, CheckCircle, Shield
} from 'lucide-react';
import { Organization, User, AuditLog, SeatRequest, RegistrationRequest } from '../types.js';

interface SuperAdminDashboardProps {
  token: string;
  activeUser: User;
  onLogout: () => void;
}

export default function SuperAdminDashboard(props: SuperAdminDashboardProps) {
  const { token, activeUser, onLogout } = props;

  // Domain data logs state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filtering / UI state
  const [activeTab, setActiveTab] = useState<'orgs' | 'tickets' | 'seats' | 'audits'>('orgs');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Selected details / Modal edits
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editSeats, setEditSeats] = useState<number>(5);
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended'>('Active');
  
  const [pendingActionReg, setPendingActionReg] = useState<RegistrationRequest | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [oRes, rRes, sRes, lRes, uRes] = await Promise.all([
        fetch('/api/superadmin/organizations', { headers }),
        fetch('/api/superadmin/registrations', { headers }),
        fetch('/api/seat-requests', { headers }),
        fetch('/api/audit-logs', { headers }),
        fetch('/api/users', { headers })
      ]);

      if (oRes.ok && rRes.ok && sRes.ok && lRes.ok && uRes.ok) {
        const [orgs, regs, seats, logs, uList] = await Promise.all([
          oRes.json(), rRes.json(), sRes.json(), lRes.json(), uRes.json()
        ]);
        setOrganizations(orgs);
        setRegistrations(regs);
        setSeatRequests(seats);
        setAuditLogs(logs);
        setUsers(uList);
      }
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
          allocatedSeats: editSeats
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
          feedback: actionFeedback
        })
      });

      if (!res.ok) {
        const data = await res.json();
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
    <div id="superadmin-dashboard" className="min-h-screen bg-slate-55 text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* Sleek LEFT SIDEBAR - Sticky on Desktop, stacks on Mobile */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-100 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-850 justify-between md:h-screen md:sticky md:top-0 shadow-lg">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-white shadow-xs">
                BK
              </div>
              <div>
                <span className="text-base font-extrabold text-white tracking-tight">BizKhata</span>
                <span className="block text-[9px] text-[#38bdf8] font-mono font-bold tracking-widest uppercase mt-0.5">PLATFORM CONTROL</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="px-2 py-0.5 rounded text-[9px] bg-rose-950 text-rose-300 font-mono font-bold uppercase tracking-wider border border-rose-900/60 inline-block font-sans">
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
                  ? 'bg-slate-900 text-sky-400 border-r-4 border-sky-400 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Deployments</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300">
                {organizations.length}
              </span>
            </button>

            <button
              id="tab-su-tickets"
              onClick={() => { setActiveTab('tickets'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left relative ${
                activeTab === 'tickets'
                  ? 'bg-slate-900 text-sky-400 border-r-4 border-sky-400 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Onboardings</span>
              </div>
              {pendingRegistrations > 0 ? (
                <span className="px-2 py-0.5 text-[9px] bg-amber-500 text-slate-950 font-black rounded-full animate-bounce">
                  {pendingRegistrations}
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300">
                  {registrations.length}
                </span>
              )}
            </button>

            <button
              id="tab-su-seats"
              onClick={() => { setActiveTab('seats'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'seats'
                  ? 'bg-slate-900 text-sky-400 border-r-4 border-sky-400 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Seat Tickets</span>
              </div>
              {pendingSeatTickets > 0 ? (
                <span className="px-1.5 py-0.5 text-[9px] bg-purple-500 text-white font-extrabold rounded-full">
                  {pendingSeatTickets}
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300">
                  {seatRequests.length}
                </span>
              )}
            </button>

            <button
              id="tab-su-audits"
              onClick={() => { setActiveTab('audits'); setSearchQuery(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'audits'
                  ? 'bg-slate-900 text-sky-400 border-r-4 border-sky-400 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Audit Trails</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300">
                {auditLogs.length}
              </span>
            </button>
          </nav>
        </div>

        {/* User profile footer built inside the sidebar */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-700 font-sans font-bold text-sky-405 flex items-center justify-center text-xs">
                {activeUser.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate leading-none">{activeUser.fullName}</div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">Platform Admin</div>
              </div>
            </div>
            <button
              id="su-btn-logout"
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-350 transition duration-150 cursor-pointer"
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
              id="su-btn-refresh"
              onClick={loadAllData}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 text-slate-700 transition duration-150 flex items-center gap-2 cursor-pointer shadow-xs"
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
                : 'bg-emerald-50 border-emerald-250 text-emerald-805 font-medium'
            }`}>
              <AlertCircle className={`w-4 h-4 ${message.isError ? 'text-rose-500' : 'text-emerald-555'}`} />
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
              <p className="text-[10px] text-slate-450 mt-1 font-mono">
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
              <div className="text-[10px] text-purple-650 font-semibold mt-1">Outstanding seat demands</div>
            </div>

          </div>

          {/* Grid Layout containing Main panel and Security audit panel side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main view container tab panel */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-xs" id="su-tab-view-container">
          
          {/* TAB 1: MANAGE TENANT ORGANIZATIONS */}
          {activeTab === 'orgs' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Active Client Databases</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Suspend profiles or adjust hard organizational seat scales manually.</p>
                </div>
                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    id="su-search-org"
                    placeholder="Search by company or GSTIN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden rounded-lg"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Org list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Org Details</th>
                      <th className="p-3">GSTIN Number</th>
                      <th className="p-3">Licensing limits</th>
                      <th className="p-3">Profile Status</th>
                      <th className="p-3">Registered On</th>
                      <th className="p-3 text-right">Operational Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono">
                    {organizations
                      .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.gstNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((org) => (
                        <tr key={org.id} id={`row-org-${org.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                          <td className="p-3">
                            <div className="font-bold text-slate-860 dark:text-slate-200 font-sans text-sm">{org.name}</div>
                            <div className="text-[10px] text-slate-400">UUID: {org.id}</div>
                          </td>
                          <td className="p-3 uppercase font-semibold text-slate-700 dark:text-slate-300">{org.gstNumber}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{org.usedSeats}</span>
                            <span className="text-slate-400 text-[10px]"> / {org.allocatedSeats} seats utilized</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              org.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                            }`} id={`org-status-${org.id}`}>
                              {org.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-right">
                            <button
                              id={`btn-edit-org-${org.id}`}
                              onClick={() => {
                                setEditingOrg(org);
                                setEditSeats(org.allocatedSeats);
                                setEditStatus(org.status as any);
                              }}
                              className="px-2.5 py-1 text-slate-700 hover:text-sky-600 bg-slate-100 hover:bg-sky-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded font-sans font-bold transition"
                            >
                              Configure limits
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
                <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3" id="su-edit-limits-form-container">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Configure Client Limits: {editingOrg.name}</h4>
                  <form onSubmit={handleUpdateOrg} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Seat Capacity</label>
                      <input
                        type="number"
                        id="su-edit-seats-input"
                        required
                        min={editingOrg.usedSeats}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-bold"
                        value={editSeats}
                        onChange={(e) => setEditSeats(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Operational setting</label>
                      <select
                        id="su-edit-status-select"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-bold"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                      >
                        <option value="Active">Active Portal</option>
                        <option value="Suspended">Suspended (Locks All Users)</option>
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingOrg(null)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="su-btn-save-limits"
                        className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded transition"
                      >
                        Commit Limits
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
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Business Approval Pipeline</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Verify incoming merchant credential filings to provision secure organizational nodes.</p>
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
                          ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50' 
                          : reg.status === 'Approved' 
                            ? 'bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-200 dark:border-emerald-900/30 opacity-75' 
                            : 'bg-slate-100/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white font-sans">{reg.companyName}</h4>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800" id={`reg-badge-status-${reg.id}`}>
                              {reg.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <div><span className="font-semibold text-slate-400">GSTIN:</span> <span className="uppercase text-slate-700 dark:text-slate-350">{reg.gstNumber}</span></div>
                            <div><span className="font-semibold text-slate-400">Admin Owner:</span> <span className="text-slate-700 dark:text-slate-350">{reg.adminName}</span></div>
                            <div><span className="font-semibold text-slate-400">Contact:</span> <span className="text-slate-750">{reg.email}</span></div>
                            <div><span className="font-semibold text-slate-400">Asked seats:</span> <span className="font-bold text-sky-600">{reg.numberOfRequiredSeats} Seats</span></div>
                          </div>

                          {reg.additionalInfoRequest && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
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
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reg decision sheet container (simulated drawer modal embedded) */}
              {pendingActionReg && (
                <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3" id="su-reg-action-container">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Confirm Action for: <span className="text-slate-850 dark:text-slate-100 p-1 px-2 rounded bg-white dark:bg-slate-950 font-mono">{pendingActionReg.companyName}</span>
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Feedback response notes (Optional / Required to query or reject)</label>
                    <textarea
                      id="su-reg-feedback-textarea"
                      placeholder="Comment text details here..."
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono"
                      rows={2}
                      value={actionFeedback}
                      onChange={(e) => setActionFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setPendingActionReg(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">Cancel</button>
                    <button onClick={() => handleRegAction('RequestInfo')} className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 rounded">Submit query</button>
                    <button id="su-btn-confirm-reject" onClick={() => handleRegAction('Reject')} className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded">Confirm rejection</button>
                    <button id="su-btn-confirm-approve" onClick={() => handleRegAction('Approve')} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded">Authorize approval</button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SEAT EXTENSION APPLICATIONS */}
          {activeTab === 'seats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Subscriber Seats Tickets</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Verify additional seat requests raised by organization admins depending on headcount.</p>
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
                            ? 'bg-purple-50/10 dark:bg-purple-950/10 border-purple-200 dark:border-purple-900/50' 
                            : 'bg-slate-100/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{orgName}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-[11px] font-mono font-medium text-slate-500">Requested by: {seat.requestedBy}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-350 italic font-sans">
                              "Reason: {seat.reason}"
                            </p>
                            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 mt-1.5">
                              <div>Current Capacity: <span className="font-bold text-slate-600 dark:text-slate-300">{seat.currentSeatCount} Licenses</span></div>
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
                                  className="px-2.5 py-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded font-mono font-bold transition"
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
                                seat.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
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
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Platform-wide Audit Trails</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Capture system logins, updates, allocations, and organizational state transitions.</p>
                </div>
                <div className="relative max-w-xs w-full mr-2">
                  <input
                    type="text"
                    id="su-search-audit"
                    placeholder="Search query by action / user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden rounded-lg font-mono"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[350px] overflow-y-auto pr-1">
                  <table className="w-full text-xs text-left text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-150 dark:border-slate-800 sticky top-0 md:bg-white dark:md:bg-slate-950">
                      <tr>
                        <th className="p-3">Event Date</th>
                        <th className="p-3">User context</th>
                        <th className="p-3">Action performed</th>
                        <th className="p-3">Details summary</th>
                        <th className="p-3 font-mono">Gateway IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono text-[11px]">
                      {auditLogs
                        .filter(log => 
                          log.actionPerformed.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                            <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{log.userName}</div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">{log.role}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-sky-600 dark:text-sky-400">{log.actionPerformed}</span>
                            </td>
                            <td className="p-3 font-sans text-slate-700 dark:text-slate-300 leading-normal max-w-xs">{log.details || 'N/A'}</td>
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
            
            <div className="mt-4 p-2 bg-slate-900/50 rounded-lg border border-slate-850/50 text-[10px] text-sky-300 flex items-center gap-2">
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
