import React, { useState } from "react";
import { CompanyInfo, UserRole, DatabaseState } from "../types.js";
import { INDIAN_STATES } from "../lib/gst.js";
import { Save, Shield, Building, Globe, Edit, RefreshCw, Layers } from "lucide-react";

interface CompanySetupProps {
  db: DatabaseState;
  onUpdateCompany: (companyData: CompanyInfo) => Promise<void>;
  onUpdateRole: (role: UserRole) => Promise<void>;
  onResetDB: () => Promise<void>;
  currentUserEmail: string;
}

export default function CompanySetup({ db, onUpdateCompany, onUpdateRole, onResetDB, currentUserEmail }: CompanySetupProps) {
  // State
  const [name, setName] = useState(db.company.name || "");
  const [legalName, setLegalName] = useState(db.company.legalName || "");
  const [gstin, setGstin] = useState(db.company.gstin || "");
  const [pan, setPan] = useState(db.company.pan || "");
  const [address, setAddress] = useState(db.company.address || "");
  const [state, setState] = useState(db.company.state || "Karnataka");
  const [currency, setCurrency] = useState(db.company.currency || "INR");
  const [financialYear, setFinancialYear] = useState(db.company.financialYear || "2026-2027");

  const [savingCompany, setSavingCompany] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>(db.role || UserRole.Owner);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    await onUpdateCompany({
      name,
      legalName,
      gstin,
      pan,
      address,
      state,
      currency,
      financialYear,
      logoUrl: db.company.logoUrl
    });
    setSavingCompany(false);
  };

  const handleRoleSave = async (role: UserRole) => {
    setSavingRole(true);
    setActiveRole(role);
    await onUpdateRole(role);
    setSavingRole(false);
  };

  const handleDbReset = async () => {
    if (confirm("Are you sure you want to reset all business ledger listings, bills, invoices, and journal accounts? This will replace everything with default balanced demo logs!")) {
      setResetting(true);
      await onResetDB();
      setResetting(false);
      window.location.reload();
    }
  };

  return (
    <div id="company-setup-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in p-2">
      {/* Left Column: Core Setup Form */}
      <div id="panel-org-setup" className="bg-white border border-[#E5E1D8] rounded-2xl p-6 lg:col-span-2 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#E5E1D8] pb-4">
          <Building className="text-[#5A5A40] w-5 h-5" />
          <div>
            <h3 id="lbl-org-setup" className="font-semibold text-[#2C2C24]">Organization Parameters</h3>
            <p id="lbl-org-desc" className="text-[11px] text-[#8C867A]">Legal business entity credentials for correct CGST/SGST ledger indexing.</p>
          </div>
        </div>

        <form id="frm-company-config" onSubmit={handleCompanySave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label id="lbl-fld-comp-name" className="text-xs text-[#8C867A] font-medium">Trademark / Brand Name</label>
              <input 
                id="fld-comp-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none"
                placeholder="e.g. Bizkhata Private Limited"
              />
            </div>
            <div className="space-y-1.5">
              <label id="lbl-fld-legal-name" className="text-xs text-[#8C867A] font-medium">Legal Name of Business</label>
              <input 
                id="fld-legal-name"
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none"
                placeholder="e.g. Bizkhata Accounting Solutions LLP"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label id="lbl-fld-gstin" className="text-xs text-[#8C867A] font-medium">GSTIN (Indian Goods & Service Tax Identification)</label>
              <input 
                id="fld-gstin"
                type="text"
                required
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs font-mono tracking-wider focus:border-[#D4CDBC] outline-none"
                placeholder="e.g. 29AAAAA0000A1Z1"
              />
            </div>
            <div className="space-y-1.5">
              <label id="lbl-fld-pan" className="text-xs text-[#8C867A] font-medium">Permanent Account Number (PAN)</label>
              <input 
                id="fld-pan"
                type="text"
                required
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs font-mono tracking-wider focus:border-[#D4CDBC] outline-none"
                placeholder="e.g. AAAAA1111A"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label id="lbl-fld-address" className="text-xs text-[#8C867A] font-medium">Registered Business Address</label>
            <textarea 
              id="fld-address"
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none resize-none"
              placeholder="Full office address details"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label id="lbl-fld-state" className="text-xs text-[#8C867A] font-medium">Operating State</label>
              <select 
                id="fld-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label id="lbl-fld-currency" className="text-xs text-[#8C867A] font-medium font-sans">Currency Symbol</label>
              <select 
                id="fld-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none"
              >
                <option value="INR">INR / Indian Rupee (₹)</option>
                <option value="USD">USD / Dollar ($)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label id="lbl-fld-fy" className="text-xs text-[#8C867A] font-medium">Financial Year Cycle</label>
              <select 
                id="fld-fy"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg px-3.5 py-2 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none"
              >
                <option value="2026-2027">1 April 2026 - 31 March 2027</option>
                <option value="2027-2028">1 April 2027 - 31 March 2028</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button 
              id="btn-save-company-config"
              type="submit"
              disabled={savingCompany}
              className="flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] font-medium text-white text-xs px-5 py-2.5 rounded-lg select-none cursor-pointer transition-all border border-[#5A5A40]/30"
            >
              <Save className="w-3.5 h-3.5" />
              {savingCompany ? "Saving Changes..." : "Save Parameters"}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Active Role & System Auditing Controls */}
      <div id="panel-role-actions" className="space-y-6 lg:col-span-1">
        
        {/* Permission and Role Selector */}
        <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#E5E1D8] pb-4">
            <Shield className="text-[#5A5A40] w-5 h-5" />
            <div>
              <h3 id="lbl-role-selector" className="font-semibold text-[#2C2C24]">Simulate Role Base</h3>
              <p id="lbl-role-desc" className="text-[11px] text-[#8C867A]">Select active role to test dashboard limitations.</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { role: UserRole.Owner, desc: "Root access, financial approvals, settings write." },
              { role: UserRole.Admin, desc: "Administrative operations without master deletions." },
              { role: UserRole.Accountant, desc: "Add journal entries, examine ledger accounts, file GSTRs." },
              { role: UserRole.BillingUser, desc: "Create proformas, draft invoices. No reports visibility." },
              { role: UserRole.Auditor, desc: "Read only audit logs, journals, balance sheet. No billing edits." }
            ].map((r) => (
              <button
                key={r.role}
                id={`btn-select-role-${r.role.toLowerCase().replace(" ", "-")}`}
                onClick={() => handleRoleSave(r.role)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                  activeRole === r.role 
                    ? "bg-[#F5F2ED] border-[#5A5A40] text-[#5A5A40]" 
                    : "bg-[#FDFBF7] border-[#E5E1D8] text-[#2C2C24] hover:border-[#D4CDBC]"
                }`}
              >
                <span className="font-bold flex items-center justify-between">
                  {r.role}
                  {activeRole === r.role && <span className="text-[10px] uppercase font-mono tracking-widest bg-[#E5E1D8] text-[#5A5A40] border border-[#D4CDBC] px-2 py-0.5 rounded font-bold">Active</span>}
                </span>
                <span className="text-[10px] text-[#8C867A] font-normal leading-relaxed">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Database Clean / Restart parameters */}
        <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#E5E1D8] pb-3">
            <Layers className="text-[#8C3A2C] w-5 h-5" />
            <div>
              <h3 id="lbl-danger-zone" className="font-semibold text-[#2C2C24]">Danger Zone</h3>
              <p className="text-[11px] text-[#8C867A]">Reset configurations for developer evaluation.</p>
            </div>
          </div>

          <p className="text-[11px] text-[#8C867A] leading-relaxed">
            Running low on tests or want to wipe current allocations? Clicking this will restore the ledger to clean opening capital values.
          </p>

          <button 
            id="btn-rebuild-ledger"
            onClick={handleDbReset}
            disabled={resetting}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-medium text-xs py-2.5 rounded-lg select-none cursor-pointer transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin text-red-700" : "text-red-700"}`} />
            {resetting ? "Resetting State..." : "Reset Business State"}
          </button>
        </div>
      </div>
    </div>
  );
}
