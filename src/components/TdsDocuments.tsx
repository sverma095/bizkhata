import React from "react";
import { DatabaseState } from "../types.js";
import { X, Printer } from "lucide-react";

interface Props {
  db: DatabaseState;
  mode: "challan" | "form16a";
  expense?: any; // the specific expense record this document is for
  onClose: () => void;
}

// Old Act (1961) section labels, kept for transactions before the cutover.
const OLD_SECTION_LABELS: Record<string, string> = {
  "194C": "Payment to Contractors",
  "194J": "Fees for Professional or Technical Services",
  "194I": "Rent",
  "194H": "Commission or Brokerage",
  "194A": "Interest other than Interest on Securities",
  "194Q": "Purchase of Goods",
};

// New Act (2025) Section 393(1) table references for the same payment types.
// Per the official Income Tax Dept FAQ: "while filing the TDS return for Q1 of Tax Year
// 2026-27, quote Section 393(1) [Table: Sl. No. 6(i)] and not Section 194C of the old Act."
// Serial numbers below follow the confirmed government example for 194C; the remaining
// mappings are widely reported by tax publications but not yet verified against the full
// statutory Schedule text, so they are shown with that caveat in the document footer.
const NEW_SECTION_LABELS: Record<string, { ref: string; label: string }> = {
  "194C": { ref: "Sec 393(1) [Table: Sl. No. 6(i)]", label: "Payment to Contractors / Sub-contractors" },
  "194J": { ref: "Sec 393(1) [Table: Sl. No. 12]", label: "Fees for Professional or Technical Services" },
  "194I": { ref: "Sec 393(1) [Table: Sl. No. 2]", label: "Rent" },
  "194H": { ref: "Sec 393(1) [Table: Sl. No. 10]", label: "Commission or Brokerage" },
  "194A": { ref: "Sec 393(1) [Table: Sl. No. 4]", label: "Interest other than Interest on Securities" },
  "194Q": { ref: "Sec 393(1) [Table]", label: "Purchase of Goods" },
};

// Cutover date per Income Tax Dept FAQ #4 & #5: TDS obligations are governed by the Act
// applicable on the date of the EARLIER of credit or payment. Sums paid/credited on or
// before 31 March 2026 fall under the old Act; on or after 1 April 2026, the new Act applies.
const NEW_ACT_CUTOVER = new Date("2026-04-01");

function getApplicableAct(expenseDate: string): "old" | "new" {
  return new Date(expenseDate) >= NEW_ACT_CUTOVER ? "new" : "old";
}

function getTaxYearLabel(dateStr: string, actType: "old" | "new"): string {
  const d = new Date(dateStr);
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  if (actType === "old") {
    // Old Act used Assessment Year = year after the financial year
    return `AY ${y + 2}-${String(y + 3).slice(2)}`;
  }
  // New Act uses Tax Year = the financial year itself, no AY offset
  return `Tax Year ${y + 1}-${String(y + 2).slice(2)}`;
}

export default function TdsDocuments({ db, mode, expense, onClose }: Props) {
  if (!expense) return null;
  const vendor = db.vendors.find(v => v.id === expense.vendorId);
  const act = getApplicableAct(expense.date);
  const oldLabel = OLD_SECTION_LABELS[expense.tdsSection || ""] || expense.tdsSection || "—";
  const newRef = NEW_SECTION_LABELS[expense.tdsSection || ""];
  const taxYearLabel = getTaxYearLabel(expense.date, act);

  return (
    <div className="fixed inset-0 bg-slate-700/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 no-print">
          <span className="text-xs font-bold text-slate-700">
            {mode === "challan"
              ? (act === "new" ? "Form 141 — Challan-cum-Statement (Sec 393)" : "TDS Challan 281 — Working Sheet (Old Act)")
              : (act === "new" ? "Form 131 — TDS Certificate (replaces Form 16A)" : "Form 16A — TDS Certificate (Old Act)")}
          </span>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
              <Printer className="w-3 h-3" /> Print / PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {act === "new" && (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-200 text-[10px] text-blue-700 no-print">
            This transaction is dated on or after 1 Apr 2026, so it falls under the <strong>Income Tax Act, 2025</strong>.
            The document below uses the new Act's references; old section numbers (194C/194J/etc.) are shown only for context.
          </div>
        )}
        {act === "old" && (
          <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 no-print">
            This transaction is dated before 1 Apr 2026, so it remains governed by the <strong>Income Tax Act, 1961</strong> (old Act), per the "earlier of credit or payment" rule.
          </div>
        )}

        <div className="overflow-y-auto flex-1 printable-area">
          <div className="max-w-[700px] mx-auto p-8 text-[11px] text-slate-800 space-y-4">

            {mode === "challan" ? (
              <>
                <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Working Sheet — not a substitute for e-payment on the Income Tax e-filing portal</p>
                  <h2 className="text-base font-black uppercase">
                    {act === "new" ? "Form 141 — Challan-cum-Statement" : "Challan No./ITNS 281"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {act === "new"
                      ? "Payment and reporting of tax deducted under Section 393(1) of the Income Tax Act, 2025"
                      : "Payment of TDS/TCS by Company or Non-Company Deductee"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><span className="text-slate-400 text-[10px] block">Deductor (Your Organisation)</span><span className="font-bold">{db.company.legalName || db.company.name}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">TAN</span><span className="font-mono font-bold">{db.company.tan || "Enter TAN in Organisation Settings"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">{act === "new" ? "Tax Year" : "Assessment Year"}</span><span className="font-bold">{taxYearLabel}</span></div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{act === "new" ? "Section / Table Reference" : "Type of Payment"}</span>
                    <span className="font-bold">
                      {act === "new" && newRef ? `${newRef.ref} — ${newRef.label}` : `Section ${expense.tdsSection} — ${oldLabel}`}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                      <th className="text-left py-2 px-3">Particulars</th><th className="text-right py-2 px-3">Amount (₹)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr><td className="py-2 px-3">Tax Deducted ({act === "new" && newRef ? newRef.ref : `Sec ${expense.tdsSection}`})</td><td className="text-right py-2 px-3 font-mono">{expense.tdsAmount.toLocaleString("en-IN")}</td></tr>
                      <tr><td className="py-2 px-3">Surcharge</td><td className="text-right py-2 px-3 font-mono">0</td></tr>
                      <tr><td className="py-2 px-3">Education Cess</td><td className="text-right py-2 px-3 font-mono">0</td></tr>
                      <tr><td className="py-2 px-3">Interest / Penalty (if late)</td><td className="text-right py-2 px-3 font-mono">0</td></tr>
                      <tr className="bg-slate-50 font-bold"><td className="py-2 px-3">Total Payable</td><td className="text-right py-2 px-3 font-mono">{expense.tdsAmount.toLocaleString("en-IN")}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 text-[10px] text-slate-500">
                  <div>Deductee: <span className="font-bold text-slate-700">{vendor?.name || expense.vendorName}</span></div>
                  <div>Deductee PAN: <span className="font-mono font-bold text-slate-700">{vendor?.pan || "Not on file"}</span></div>
                  <div>Transaction Date: <span className="font-bold text-slate-700">{expense.date}</span></div>
                  <div>Payment Mode: <span className="font-bold text-slate-700">{expense.paymentMode}</span></div>
                </div>

                <p className="text-[9.5px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  {act === "new" ? (
                    <>This sheet helps you prepare the figures for Form 141. Actual filing must be done via the e-Pay Tax
                    service on the Income Tax e-filing portal (incometax.gov.in) — select "Income Tax Act, 2025" and the
                    Form 141 tile. Note: the exact Section 393(1) table serial number shown above is based on published
                    guidance and the one example officially confirmed by the Income Tax Department (contractor payments
                    → Table Sl. No. 6(i)); verify the precise serial number for other payment types against the official
                    Schedule before filing, as third-party mappings for some categories are still being finalised.</>
                  ) : (
                    <>This sheet helps you prepare the figures. Actual TDS payment must be made via the e-Pay Tax service on
                    the Income Tax e-filing portal (incometax.gov.in) using Challan 281, generating a CIN (Challan
                    Identification Number).</>
                  )}
                </p>
              </>
            ) : (
              <>
                <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                    Working Draft — for reference; the legally valid certificate is issued by TRACES after the quarterly return is filed
                  </p>
                  <h2 className="text-base font-black uppercase">
                    {act === "new" ? "FORM NO. 131" : "FORM NO. 16A"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {act === "new"
                      ? "TDS Certificate for sums other than salary — Income Tax Act, 2025 (replaces Form 16A)"
                      : "Certificate under Section 203 of the Income-tax Act, 1961 for TDS on income other than salary"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2"><span className="text-slate-400 text-[10px] block">Name &amp; Address of Deductor</span><span className="font-bold">{db.company.legalName || db.company.name}</span><br/><span className="text-slate-500">{db.company.address}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">TAN of Deductor</span><span className="font-mono font-bold">{db.company.tan || "Enter TAN in Organisation Settings"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">PAN of Deductor</span><span className="font-mono font-bold">{db.company.pan}</span></div>
                  <div className="col-span-2 border-t border-slate-200 pt-2"><span className="text-slate-400 text-[10px] block">Name &amp; Address of Deductee</span><span className="font-bold">{vendor?.legalName || vendor?.name || expense.vendorName}</span><br/><span className="text-slate-500">{vendor?.address || vendor?.billingAddress || "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">PAN of Deductee</span><span className="font-mono font-bold">{vendor?.pan || "Not on file"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">{act === "new" ? "Tax Year" : "Assessment Year"}</span><span className="font-bold">{taxYearLabel}</span></div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">{act === "new" ? "Section / Table Ref" : "Section"}</th>
                      <th className="text-right py-2 px-3">Amount Paid (₹)</th><th className="text-right py-2 px-3">TDS Deducted (₹)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2 px-3">{expense.date}</td>
                        <td className="py-2 px-3">
                          {act === "new" && newRef ? `${newRef.ref} — ${newRef.label}` : `${expense.tdsSection} — ${oldLabel}`}
                        </td>
                        <td className="text-right py-2 px-3 font-mono">{expense.total.toLocaleString("en-IN")}</td>
                        <td className="text-right py-2 px-3 font-mono font-bold">{expense.tdsAmount.toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[9.5px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  {act === "new" ? (
                    <>This is a working draft only. The legally valid Form 131 must be downloaded from TRACES
                    (tdscpc.gov.in) after filing the quarterly TDS return (Form 139 for resident non-salary payments) —
                    it carries a unique certificate number that this draft cannot generate.</>
                  ) : (
                    <>This is a working draft only. The legally valid Form 16A must be downloaded from TRACES
                    (tdscpc.gov.in) after filing the quarterly TDS return (Form 26Q) — it carries a unique certificate
                    number that this draft cannot generate.</>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
