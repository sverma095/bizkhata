import React, { useState, useEffect } from 'react';
import { 
  Users, Sliders, Shield, Key, History, PlusCircle, CreditCard,
  UserPlus, Edit3, Trash2, ShieldAlert, CheckCircle2, Lock,
  Lock as ResetIcon, UserX, UserCheck, LogOut, ArrowUpRight, CheckCircle, ArrowLeft
} from 'lucide-react';
import { User, Organization, SeatRequest, AuditLog, CustomRole, ALL_PERMISSIONS } from '../types.js';

interface AdminDashboardProps {
  token: string;
  activeUser: User;
  onLogout: () => void;
  onBackToDashboard?: () => void;
}

export default function AdminDashboard(props: AdminDashboardProps) {
  const { token, activeUser, onLogout, onBackToDashboard } = props;

  // Tenant State
  const [company, setCompany] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // UI state filters
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'seats' | 'audit'>('users');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [userQuery, setUserQuery] = useState('');

  // Teammate Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('Viewer');
  const [assignedPerms, setAssignedPerms] = useState<string[]>([]);

  // Seat Ticket Form State (Section 3)
  const [seatsRequestedValue, setSeatsRequestedValue] = useState<number>(5);
  const [seatRequestReason, setSeatRequestReason] = useState('');

  // Custom Role Form State (Section 10 PBAC)
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [customRolePerms, setCustomRolePerms] = useState<string[]>([]);

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Get me details first (contains up to date organization metrics)
      const meRes = await fetch('/api/auth/me', { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        setCompany(meData.organization);
      }

      // Parallel reads other tenant tables (isolated on server by activeUser context!)
      const [uRes, sRes, crRes, lRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/seat-requests', { headers }),
        fetch('/api/custom-roles', { headers }),
        fetch('/api/audit-logs', { headers })
      ]);

      if (uRes.ok && sRes.ok && crRes.ok && lRes.ok) {
        const [uList, sList, crList, lList] = await Promise.all([
          uRes.json(), sRes.json(), crRes.json(), lRes.json()
        ]);
        setUsers(uList);
        setSeatRequests(sList);
        setCustomRoles(crList);
        setAuditLogs(lList);
      }
    } catch (err) {
      console.error("Failed to fetch tenant metadata parameters", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
    const interval = setInterval(fetchTenantData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const triggerFeedback = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 5000);
  };

  // Helper sync to permission sets on preset role changes (Viewer, Manager etc)
  const handleRolePresetSelect = (presetRole: string) => {
    setRole(presetRole);
    if (presetRole === 'Manager') {
      setAssignedPerms(['view_invoices', 'create_invoices', 'edit_invoices', 'view_reports', 'manage_customers']);
    } else if (presetRole === 'Accountant') {
      setAssignedPerms(['view_invoices', 'approve_payments', 'view_reports', 'manage_vendors']);
    } else if (presetRole === 'Viewer') {
      setAssignedPerms(['view_invoices', 'view_reports']);
    } else if (presetRole === 'Data Entry Operator') {
      setAssignedPerms(['view_invoices', 'create_invoices']);
    } else {
      // Custom Roles lookups
      const foundCustom = customRoles.find(cr => cr.name === presetRole);
      setAssignedPerms(foundCustom?.permissions || []);
    }
  };

  // User management updates (Create User)
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    if (company.usedSeats >= company.allocatedSeats) {
       triggerFeedback(`Unable to add employee. You have used all available licensing seats (${company.usedSeats}/${company.allocatedSeats}). Please request more seats first.`, true);
       return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName,
          email,
          mobileNumber,
          department,
          designation,
          role,
          permissions: assignedPerms
        })
      });

      const data = await res.json();
      if (!res.ok) {
         throw new Error(data.error || 'Failed to create user record.');
      }

      triggerFeedback(`Successfully added teammate "${fullName}"! A custom welcome email and temporary credentials have been generated and sent.`);
      setShowAddUser(false);
      resetUserForm();
      fetchTenantData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName,
          mobileNumber,
          department,
          designation,
          role,
          permissions: assignedPerms
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update employee details.');
      }

      triggerFeedback(`Successfully updated teammate details for "${fullName}".`);
      setEditingUser(null);
      resetUserForm();
      fetchTenantData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const toggleUserStatus = async (userRecord: User) => {
    const targetStatus = userRecord.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const res = await fetch(`/api/users/${userRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Could not change status settings.');
      }

      triggerFeedback(`Successfully marked profile of '${userRecord.fullName}' as '${targetStatus}'.`);
      fetchTenantData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const triggerDirectReset = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
         throw new Error(data.error || 'Internal resetting sequence declined.');
      }

      triggerFeedback(`Successfully force-reset password credentials for ${name}! New Password: ${data.tempPassword}. Dispatched welcome ticket to Live Gateway.`);
      fetchTenantData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  // Seat Application (Section 3)
  const submitSeatTicket = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const res = await fetch('/api/seat-requests', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({
           additionalSeatsRequested: Number(seatsRequestedValue),
           reason: seatRequestReason
         })
       });

       const data = await res.json();
       if (!res.ok) {
          throw new Error(data.error || 'Submission of license ticket failed.');
       }

       triggerFeedback(`Your ticket requesting +${seatsRequestedValue} seats has been submitted to Super Admin! Check updates periodically.`);
       setSeatRequestReason('');
       fetchTenantData();
     } catch (err: any) {
       triggerFeedback(err.message, true);
     }
  };

  // Define Custom PBAC Roles (Section 10)
  const submitCustomRoleDef = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/custom-roles', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({
           name: customRoleName,
           description: customRoleDesc,
           permissions: customRolePerms
         })
      });

      const data = await res.json();
      if (!res.ok) {
         throw new Error(data.error || 'Creation of custom authorization set rejected.');
      }

      triggerFeedback(`New custom enterprise role "${customRoleName}" added successfully with high permissions mapping!`);
      setCustomRoleName('');
      setCustomRoleDesc('');
      setCustomRolePerms([]);
      fetchTenantData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleTogglePermGroup = (permId: string) => {
    if (assignedPerms.includes(permId)) {
      setAssignedPerms(assignedPerms.filter(p => p !== permId));
    } else {
      setAssignedPerms([...assignedPerms, permId]);
    }
  };

  const handleToggleCustomRolePerm = (permId: string) => {
    if (customRolePerms.includes(permId)) {
      setCustomRolePerms(customRolePerms.filter(p => p !== permId));
    } else {
      setCustomRolePerms([...customRolePerms, permId]);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setMobileNumber(user.mobileNumber);
    setDepartment(user.department || '');
    setDesignation(user.designation || '');
    setRole(user.role);
    setAssignedPerms(user.permissions || []);
    setShowAddUser(false);
  };

  const resetUserForm = () => {
    setFullName('');
    setEmail('');
    setMobileNumber('');
    setDepartment('');
    setDesignation('');
    setRole('Viewer');
    setAssignedPerms(['view_invoices', 'view_reports']);
  };

  if (!company) {
     return (
       <div className="flex flex-col items-center justify-center py-20">
         <span className="text-sm font-semibold text-slate-500 animate-pulse">Initializing Corporate Database Node...</span>
       </div>
     );
  }

  const seatsUsed = users.filter(u => u.status !== 'Disabled').length;
  const seatsAvailable = Math.max(0, company.allocatedSeats - seatsUsed);
  const seatsExhausted = seatsAvailable <= 0;

  return (
    <div id="admin-dashboard" className="min-h-screen bg-slate-55 text-slate-850 font-sans flex flex-col md:flex-row">
      
      {/* Sleek LEFT SIDEBAR - Sticky on Desktop, stacks on Mobile */}
      <aside className="w-full md:w-64 bg-[#F3F4F7] text-slate-700 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-200 justify-between md:h-screen md:sticky md:top-0 shadow-sm">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-xs">
                BK
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">BizKhata</span>
                <span className="block text-[9px] text-blue-600 font-mono font-bold tracking-widest uppercase mt-0.5">TENANT CONSOLE</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="px-2 py-0.5 rounded text-[9px] bg-white text-slate-600 font-mono font-bold uppercase tracking-wider border border-slate-200 inline-block font-sans">
                {company.name}
              </span>
            </div>
          </div>

          {/* Navigation Items mapped from Tab Selection state */}
          <nav className="p-4 space-y-1">
            <button
              id="tab-admin-users"
              onClick={() => { setActiveTab('users'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'users'
                  ? 'bg-[#E2EAFC] text-blue-700 border-r-4 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Teammates</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {users.length}
              </span>
            </button>

            <button
              id="tab-admin-roles"
              onClick={() => { setActiveTab('roles'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'roles'
                  ? 'bg-[#E2EAFC] text-blue-700 border-r-4 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>PBAC Roles</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {customRoles.length}
              </span>
            </button>

            <button
              id="tab-admin-seats"
              onClick={() => { setActiveTab('seats'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'seats'
                  ? 'bg-[#E2EAFC] text-blue-700 border-r-4 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Seats Upgrade</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {seatRequests.length}
              </span>
            </button>

            <button
              id="tab-admin-audit"
              onClick={() => { setActiveTab('audit'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer text-left ${
                activeTab === 'audit'
                  ? 'bg-[#E2EAFC] text-blue-700 border-r-4 border-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-amber-600" />
                <span>Isolated Audit</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
                {auditLogs.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Back to normal dashboard — exits console without logging out */}
        {onBackToDashboard && (
          <div className="px-4 pb-2">
            <button
              id="admin-btn-back-to-dashboard"
              onClick={onBackToDashboard}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition duration-150 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Normal Dashboard
            </button>
          </div>
        )}

        {/* User profile footer inside side layout */}
        <div className="p-4 border-t border-slate-200 bg-[#F3F4F7] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-sans font-bold text-blue-600 flex items-center justify-center text-xs">
                {activeUser.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate leading-none">{activeUser.fullName}</div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">Tenant Admin</div>
              </div>
            </div>
            <button
              id="admin-btn-logout"
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
        <header className="bg-white border-b border-slate-205 px-8 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-950 tracking-tight font-sans">
              {activeTab === 'users' && "Staff Teammates Directory"}
              {activeTab === 'roles' && "Custom Roles PBAC Matrices"}
              {activeTab === 'seats' && "Subscription Seats Licensing"}
              {activeTab === 'audit' && "Organizational Operation Audits"}
            </h1>
            <p className="text-xs text-slate-505 font-medium mt-0.5">
              Authorized Tenant Node: GSTIN <span className="font-mono font-bold uppercase text-slate-700">{company.gstNumber}</span>
            </p>
            {(company as any).approvedAt && (
              <div className="flex items-center gap-4 mt-1">
                <span className="text-[10px] text-slate-400">
                  Registered: <span className="font-mono text-slate-600">{new Date((company as any).createdAt || (company as any).approvedAt).toLocaleDateString('en-IN')}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Approved: <span className="font-mono text-emerald-600">{new Date((company as any).approvedAt).toLocaleDateString('en-IN')}</span>
                </span>
                {(company as any).subscriptionExpiresAt && (() => {
                  const expiry = new Date((company as any).subscriptionExpiresAt);
                  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft <= 0;
                  const isSoon = daysLeft > 0 && daysLeft <= 30;
                  return (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isExpired ? 'bg-rose-100 text-rose-700' : isSoon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {isExpired ? '⚠ Subscription Expired' : `✓ Valid until ${expiry.toLocaleDateString('en-IN')} (${daysLeft}d)`}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              id="admin-btn-refresh"
              onClick={fetchTenantData}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 text-slate-700 transition duration-150 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              Sync Active State
            </button>
          </div>
        </header>

        {/* Workspace body padding */}
        <div className="p-8 space-y-8 flex-1">
          
          {/* Alerts / Success / Failure Flash */}
          {message && (
            <div className={`p-4 rounded-xl border text-xs shadow-xs flex items-center gap-3 animate-fade-in ${
              message.isError 
                ? 'bg-rose-50 border-rose-200 text-rose-850 font-medium' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-850 font-medium'
            }`}>
              <span id="admin-dashboard-flash-text" className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Seat Utilization meters row */}
          <div className="card-lift bg-white p-5 rounded-xl border border-slate-200 shadow-xs" id="admin-seats-panel">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-500" />
                    Subscription Seat Licenses Used
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700">
                    {seatsUsed} Seats Occupied / {company.allocatedSeats} Capacity
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex" id="licensing-seats-meter">
                  <div 
                    className={`h-full transition-all duration-300 ${seatsExhausted ? 'bg-rose-500' : 'bg-sky-505'}`} 
                    style={{ width: `${Math.min(100, (seatsUsed / company.allocatedSeats) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Available slots: <span className="font-extrabold text-slate-800" id="available-seats-total">{seatsAvailable} Licenses</span>
                </span>
                <button
                  id="admin-btn-expand-tab"
                  onClick={() => setActiveTab('seats')}
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  Request Seats Increase <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            {seatsExhausted && (
              <div className="mt-3 text-[10px] text-rose-700 font-bold bg-rose-50 p-2 rounded-lg flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Licenses exhausted. Access seats panel to request upgrading.
              </div>
            )}
          </div>

          <div className="card-lift bg-white rounded-xl border border-slate-200 p-6 shadow-xs" id="admin-view-container">
          
          {/* TAB 1: USER MANAGEMENT GRID */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              <div className="flex sm:justify-between sm:items-center gap-4 flex-wrap">
                <div className="relative max-w-xs w-full mr-2">
                  <input
                    type="text"
                    id="admin-search-user"
                    placeholder="Search staff teammate..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-205 focus:outline-hidden rounded-lg"
                  />
                  <Users className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="admin-btn-add-user"
                    disabled={seatsExhausted}
                    onClick={() => {
                      setEditingUser(null);
                      resetUserForm();
                      setShowAddUser(!showAddUser);
                    }}
                    className="py-1.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-2xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Initialize Teammate
                  </button>
                </div>
              </div>

              {/* Add / Edit Teammate Form Block (Section 4 & 5 User Creation Form) */}
              {(showAddUser || editingUser) && (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4" id="admin-teammate-form-block">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {editingUser ? `Configure employee: ${editingUser.fullName}` : 'Initialize Teammate Profile'}
                  </h4>
                  <form onSubmit={editingUser ? handleEditUserSubmit : handleCreateUserSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Full Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Arpit Shah"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">Teammate Email Address</label>
                        <input
                          type="email"
                          required
                          disabled={!!editingUser} // No email transfers
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="arpit@company.com"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded disabled:opacity-60 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mobile Contact No</label>
                        <input
                          type="text"
                          required
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="+919911991199"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operational Department</label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Engineering / Sales"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation Title</label>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="Staff Auditor"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role Assignment (RBAC)</label>
                        <select
                          value={role}
                          onChange={(e) => handleRolePresetSelect(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded font-bold"
                        >
                          <option value="Manager">Manager Preset</option>
                          <option value="Accountant">Accountant Preset</option>
                          <option value="Data Entry Operator">Data Entry Operator</option>
                          <option value="Viewer">Viewer Preset</option>
                          {customRoles.map((cr) => (
                            <option key={cr.id} value={cr.name}>Custom: {cr.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Section 10 Permission Selection Matrix config */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fine-tune Permission Matrix Map (Granular PBAC Authorization)</span>
                      <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">Customize individual workspace clearances. Pre-selected by role profile.</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {ALL_PERMISSIONS.map((perm) => (
                          <label 
                            key={perm.id} 
                            className={`flex items-center space-x-2 p-2 rounded border text-[11px] cursor-pointer transition ${
                              assignedPerms.includes(perm.id) 
                                ? 'bg-sky-50/40 border-sky-200 text-sky-700 font-bold' 
                                : 'bg-slate-50/30 border-slate-200 text-slate-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={assignedPerms.includes(perm.id)}
                              onChange={() => handleTogglePermGroup(perm.id)}
                              className="accent-sky-500"
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setShowAddUser(false); setEditingUser(null); }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="btn-admin-teammate-submit"
                        className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded transition"
                      >
                        {editingUser ? 'Save Teammate details' : 'Deploy Employee Portal'}
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* Users list grid table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">Department & Title</th>
                      <th className="p-3 font-mono">Role Segment</th>
                      <th className="p-3">Perms count</th>
                      <th className="p-3">Portal status</th>
                      <th className="p-3 text-right">Operational settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter(u => u.fullName.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()))
                      .map((member) => (
                        <tr key={member.id} id={`row-employee-${member.id}`} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-850 text-sm">{member.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono select-all shrink-0 max-w-[160px] truncate">{member.email}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-700">{member.department || 'General'}</span>
                            <div className="text-[10px] text-slate-400 italic">{member.designation || 'Specialist'}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border border-slate-200" id={`member-role-${member.id}`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800">{member.permissions.length} clearances</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              member.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : member.status === 'Pending Activation'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                            }`} id={`member-status-${member.id}`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {member.role !== 'Admin' && (
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  id={`btn-member-reset-${member.id}`}
                                  onClick={() => triggerDirectReset(member.id, member.fullName)}
                                  className="p-1 px-1.5 text-[10px] font-bold bg-slate-50 hover:bg-slate-105 border border-slate-205 rounded font-sans transition flex items-center gap-1"
                                  title="Force Reset Password"
                                >
                                  <ResetIcon className="w-3 h-3 text-amber-500" /> Reset Password
                                </button>
                                <button 
                                  id={`btn-member-toggle-${member.id}`}
                                  onClick={() => toggleUserStatus(member)}
                                  className={`p-1 px-1.5 text-[10px] font-bold rounded font-sans border transition ${
                                    member.status === 'Active' 
                                      ? 'border-rose-100 bg-rose-50/50 text-rose-605 hover:bg-rose-950/35' 
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50'
                                  }`}
                                >
                                  {member.status === 'Active' ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  id={`btn-member-edit-${member.id}`}
                                  onClick={() => startEditUser(member)}
                                  className="p-1 px-2 text-[10px] font-bold bg-slate-50 border border-slate-250 text-sky-600 rounded transition"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: DEFINE CUSTOM WORKSPACE ROLES (Section 10 PBAC) */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Enterprise Role Definitions</h3>
                <p className="text-xs text-slate-400 font-medium font-sans">
                  Define custom roles and associate them with specific granular permission profiles. Designed to be scalable and ready for extensive feature permissions.
                </p>
              </div>

              {/* Add Custom Role form block */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3" id="admin-custom-role-form">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <Shield className="w-4 h-4 text-sky-500" /> Create Custom Security Role
                </h4>
                <form onSubmit={submitCustomRoleDef} className="space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">Unique Role Title / name</label>
                      <input
                        type="text"
                        required
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        placeholder="Tax Auditor / Field Sales Officer"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1 font-sans">Role Summary Description</label>
                      <input
                        type="text"
                        required
                        value={customRoleDesc}
                        onChange={(e) => setCustomRoleDesc(e.target.value)}
                        placeholder="Authorized to review company logs, view receipts, and print statements."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Assign Role Permissions Matrix</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {ALL_PERMISSIONS.map((perm) => (
                        <label 
                          key={perm.id} 
                          className={`flex items-center space-x-2 p-2 rounded border text-[11px] cursor-pointer transition ${
                            customRolePerms.includes(perm.id) 
                              ? 'bg-sky-50/40 border-sky-200 text-sky-700 font-bold' 
                              : 'bg-slate-50/30 border-slate-200 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={customRolePerms.includes(perm.id)}
                            onChange={() => handleToggleCustomRolePerm(perm.id)}
                            className="accent-sky-500"
                          />
                          <span>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      id="btn-admin-add-role"
                      disabled={!customRoleName || customRolePerms.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white font-bold text-xs uppercase tracking-wider rounded-lg transition disabled:opacity-40"
                    >
                      Commit Security Role Matrix
                    </button>
                  </div>

                </form>
              </div>

              {/* Roles matrix review */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Custom Profiles Listing</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customRoles.map((cr) => (
                    <div key={cr.id} className="p-4 bg-slate-50/50 border border-slate-150 rounded-xl">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-extrabold text-slate-800 font-sans uppercase tracking-wider">{cr.name}</span>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-500">{cr.permissions.length} Clearances</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 leading-normal">{cr.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {cr.permissions.map((p) => {
                          const label = ALL_PERMISSIONS.find(ap => ap.id === p)?.label || p;
                          return (
                            <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 font-semibold border border-sky-100">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: UPGRADE LICENSING HISTORY (Section 3) */}
          {activeTab === 'seats' && (
            <div className="space-y-6">
              
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Request Subscription Seats Increase</h4>
                <p className="text-xs text-slate-400 leading-normal font-sans">
                  Need to add more accounts? Submit an official corporate seat increase request detailing your headcount expansion context. Super Admins will evaluate and authorize seat increases immediately.
                </p>

                <form onSubmit={submitSeatTicket} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Additional seats matrix Requested</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded font-bold font-mono"
                      value={seatsRequestedValue}
                      onChange={(e) => setSeatsRequestedValue(Number(e.target.value))}
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Business Purpose justification</label>
                    <input
                      type="text"
                      required
                      placeholder="Onboarding five regional billing agents for national accounts expansion..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-205 rounded font-sans"
                      value={seatRequestReason}
                      onChange={(e) => setSeatRequestReason(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      id="btn-admin-submit-seats"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow text-white font-bold text-xs uppercase tracking-wider rounded transition shadow-2xs"
                    >
                      Submit Ticket
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-405 uppercase tracking-widest">Active License Ticket Applications</span>
                <div className="space-y-2">
                  {seatRequests.map((req) => (
                    <div key={req.id} id={`history-seat-req-${req.id}`} className="p-3.5 bg-white border border-slate-150 rounded-lg shadow-3xs flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 font-mono">Request +{req.additionalSeatsRequested} seats</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] font-mono text-slate-400">Created: {new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-500 italic max-w-xl">"Reason: {req.reason}"</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono rounded-full ${
                        req.status === 'Approved' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : req.status === 'Pending' 
                            ? 'bg-amber-50 text-amber-700 animate-pulse'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: TENANT AUDIT TRAILS (Section 4 & 11) */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tenant Audit Trial Registers</h3>
                <p className="text-xs text-slate-400 font-medium font-sans">
                  Strictly isolated corporate operations register. This audit log strictly captures team member logins, password updates, permission changes, and account actions under {company.name}.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-150 sticky top-0 md:bg-white">
                      <tr>
                        <th className="p-3">Event Date</th>
                        <th className="p-3 font-semibold">User Context</th>
                        <th className="p-3">Operation Details</th>
                        <th className="p-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{log.userName}</div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold">{log.role}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-sky-600 uppercase block text-[9px] mb-0.5">{log.actionPerformed}</span>
                            <span className="font-sans text-slate-600 leading-relaxed block">{log.details || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-slate-500">{log.ipAddress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </main>

  </div>
  );
}
