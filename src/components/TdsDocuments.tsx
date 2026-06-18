import React from "react";
import { DatabaseState } from "../types.js";
import { X, Printer } from "lucide-react";

interface Props {
  db: DatabaseState;
  mode: "challan" | "form16a";
  expense?: any; // the specific expense record this document is for
  onClose: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  "194C": "Payment to Contractors",
  "194J": "Fees for Professional or Technical Services",
  "194I": "Rent",
  "194H": "Commission or Brokerage",
  "194A": "Interest other than Interest on Securities",
  "194Q": "Purchase of Goods",
};

export default function TdsDocuments({ db, mode, expense, onClose }: Props) {
  if (!expense) return null;
  const vendor = db.vendors.find(v => v.id === expense.vendorId);
  const sectionLabel = SECTION_LABELS[expense.tdsSection || ""] || expense.tdsSection || "—";

  return (
    <div className="fixed inset-0 bg-slate-700/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 no-print">
          <span className="text-xs font-bold text-slate-700">
            {mode === "challan" ? "TDS Challan 281 — Working Sheet" : "Form 16A — TDS Certificate"}
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

        <div className="overflow-y-auto flex-1 printable-area">
          <div className="max-w-[700px] mx-auto p-8 text-[11px] text-slate-800 space-y-4">

            {mode === "challan" ? (
              <>
                <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Working Sheet — not a substitute for e-payment on the Income Tax e-filing portal</p>
                  <h2 className="text-base font-black uppercase">Challan No./ITNS 281</h2>
                  <p className="text-xs text-slate-500">Payment of TDS/TCS by Company or Non-Company Deductee</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><span className="text-slate-400 text-[10px] block">Deductor (Your Organisation)</span><span className="font-bold">{db.company.legalName || db.company.name}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">TAN</span><span className="font-mono font-bold">{db.company.tan || "Enter TAN in Organisation Settings"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Assessment Year</span><span className="font-bold">{(() => { const y = new Date(expense.date).getMonth() >= 3 ? new Date(expense.date).getFullYear() + 1 : new Date(expense.date).getFullYear(); return `${y}-${String(y + 1).slice(2)}`; })()}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Type of Payment</span><span className="font-bold">TDS — {expense.tdsSection} ({sectionLabel})</span></div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                      <th className="text-left py-2 px-3">Particulars</th><th className="text-right py-2 px-3">Amount (₹)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr><td className="py-2 px-3">Tax Deducted (Section {expense.tdsSection})</td><td className="text-right py-2 px-3 font-mono">{expense.tdsAmount.toLocaleString("en-IN")}</td></tr>
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
                  This sheet helps you prepare the figures. Actual TDS payment must be made via the e-Pay Tax service on
                  the Income Tax e-filing portal (incometax.gov.in) using Challan 281, generating a CIN (Challan Identification Number).
                </p>
              </>
            ) : (
              <>
                <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Working Draft — for reference; file the actual TDS return (Form 26Q) via TRACES to generate the system-issued Form 16A</p>
                  <h2 className="text-base font-black uppercase">FORM NO. 16A</h2>
                  <p className="text-xs text-slate-500">Certificate under Section 203 of the Income-tax Act, 1961 for TDS on income other than salary</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2"><span className="text-slate-400 text-[10px] block">Name &amp; Address of Deductor</span><span className="font-bold">{db.company.legalName || db.company.name}</span><br/><span className="text-slate-500">{db.company.address}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">TAN of Deductor</span><span className="font-mono font-bold">{db.company.tan || "Enter TAN in Organisation Settings"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">PAN of Deductor</span><span className="font-mono font-bold">{db.company.pan}</span></div>
                  <div className="col-span-2 border-t border-slate-200 pt-2"><span className="text-slate-400 text-[10px] block">Name &amp; Address of Deductee</span><span className="font-bold">{vendor?.legalName || vendor?.name || expense.vendorName}</span><br/><span className="text-slate-500">{vendor?.address || vendor?.billingAddress || "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">PAN of Deductee</span><span className="font-mono font-bold">{vendor?.pan || "Not on file"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Assessment Year</span><span className="font-bold">{(() => { const y = new Date(expense.date).getMonth() >= 3 ? new Date(expense.date).getFullYear() + 1 : new Date(expense.date).getFullYear(); return `${y}-${String(y + 1).slice(2)}`; })()}</span></div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                      <th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Section</th><th className="text-right py-2 px-3">Amount Paid (₹)</th><th className="text-right py-2 px-3">TDS Deducted (₹)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2 px-3">{expense.date}</td>
                        <td className="py-2 px-3">{expense.tdsSection} — {sectionLabel}</td>
                        <td className="text-right py-2 px-3 font-mono">{expense.total.toLocaleString("en-IN")}</td>
                        <td className="text-right py-2 px-3 font-mono font-bold">{expense.tdsAmount.toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[9.5px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  This is a working draft only. The legally valid Form 16A must be downloaded from TRACES (tdscpc.gov.in)
                  after filing the quarterly TDS return (Form 26Q) — it carries a unique certificate number that this draft cannot generate.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
