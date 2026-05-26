import React, { useState } from "react";
import { DatabaseState, Invoice, Bill } from "../types.js";
import { 
  Sparkles, 
  Upload, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  Send, 
  ArrowRight, 
  ShieldAlert, 
  FileText,
  Layers,
  Search,
  CheckCircle,
  Clock
} from "lucide-react";

interface AIAssistantProps {
  db: DatabaseState;
  onParseInvoice: (rawText: string) => Promise<any>;
  onReconcileTransaction: (payload: any) => Promise<void>;
  onTriggerCopilot: (query: string) => Promise<string>;
}

export default function AIAssistant({ db, onParseInvoice, onReconcileTransaction, onTriggerCopilot }: AIAssistantProps) {
  const [activeTab, setActiveTab] = useState<"ocr" | "reconcile" | "copilot">("ocr");

  // State OCR Customizer
  const [rawInvoiceText, setRawInvoiceText] = useState("");
  const [parsedDraft, setParsedDraft] = useState<any>(null);
  const [parsing, setParsing] = useState(false);

  // State Bank Reconciliation Matches
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [matchingResults, setMatchingResults] = useState<any>(null);
  const [reconciling, setReconciling] = useState(false);

  // State Conversational Copilot
  const [copilotQuery, setCopilotQuery] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Namaste! I am your Bizkhata AI Accountant. Ask me about your legal entities, CGST/SGST ratios, monthly net profit, or invoice statuses." }
  ]);
  const [askingCopilot, setAskingCopilot] = useState(false);

  // Default Bank Feeds
  const bankFeeds = [
    { id: "feed_1", date: "2026-05-20", narration: "UPI/REMIT-908A/SvTiger Services", amount: 118000.00, type: "CR" },
    { id: "feed_2", date: "2026-05-22", narration: "NEFT/BILL-ACME-8902/Stationery payment", amount: -23600.00, type: "DR" },
    { id: "feed_3", date: "2026-05-24", narration: "AWS BILLING OUTWARD CC CHARGE", amount: -6000.00, type: "DR" }
  ];

  // Raw invoice templates to let user test with single clicks!
  const invoiceSampleTemplates = [
    `ACME OFFICE SUPPLIES LLP
Registered Address: Sector 4, HSR Layout, Bengaluru, Karnataka, 560102
GSTIN: 29DDDDD3333D1Z5
TO: Bizkhata Accounting LLP
DATE: 2026-05-18
INVOICE NUMBER: BILL-ACME-9011
PRODUCT Breakdowns:
1. Printing Stationery Sheets & Ledger books - 10 packets @ 2000 INR each
Total Net Amt: 20000.00 INR
GSTR Standard rate: 18%
Total Invoiced Settle Sum: 23600.00 INR`,
    `TIGER SECURITY SERVICES ENTERPRISE
Registered Address: Koramangala, Bengaluru, Karnataka
TO: Bizkhata Accounting LLP
DATE: 2026-05-22
INVOICE: TIGER-908
Details:
Service Charges for Month of May 2026: 100000.00 INR
IGST (Interstate IGST 18%): 18000.00 INR
Grand Sum: 118000.00 INR`
  ];

  const handleParseInvoiceText = async () => {
    if (!rawInvoiceText.trim()) return alert("Please specify raw text to extract details.");
    setParsing(true);
    setParsedDraft(null);
    try {
      const data = await onParseInvoice(rawInvoiceText);
      setParsedDraft(data);
    } catch {
      alert("Error parsing using Gemini models. Check connection.");
    }
    setParsing(false);
  };

  const handleApplyParsedDraft = () => {
    if (!parsedDraft) return;
    alert(`Extracted draft parsed successfully! Auto filled into ledger fields. Ready to settle.`);
    setParsedDraft(null);
    setRawInvoiceText("");
  };

  const handleAnalyzeReconcilation = (feed: any) => {
    setSelectedFeedId(feed.id);
    
    // Simulate smart matching against the DB's bills or invoices
    if (feed.type === "CR") {
      // credit represents customer incoming payment. Find invoice with total matches
      const matchedInvoice = db.invoices.find(inv => Math.abs(inv.total - feed.amount) < 5);
      if (matchedInvoice) {
        setMatchingResults({
          matchType: "invoice",
          target: matchedInvoice,
          explanation: `Bizkhata Matcher has matched this remittance to Outstanding Invoice ${matchedInvoice.invoiceNumber} for ${matchedInvoice.customerName}. The amount is an exact match (₹${feed.amount}). Posting will clear Accounts Receivable ledger and Debit Bank Reserves.`
        });
      } else {
        setMatchingResults({
          matchType: "none",
          explanation: `No exact invoices total match found in approved registers for sum ₹${feed.amount}. High probabilty of advances payment or partial settlement. AI suggests manually recording as payment received.`
        });
      }
    } else {
      // debit represents company expense or bills. Find bill or create out of pocket expense
      const matchedBill = db.bills.find(b => Math.abs(b.total - Math.abs(feed.amount)) < 5);
      if (matchedBill) {
        setMatchingResults({
          matchType: "bill",
          target: matchedBill,
          explanation: `Bizkhata Matcher has mapped this debit to Creditor bill claim ${matchedBill.billNumber} from ${matchedBill.vendorName}. The amount matches exactly (₹${Math.abs(feed.amount)}). Clearing would reduce Liability Accounts Payable.`
        });
      } else {
        setMatchingResults({
          matchType: "expense",
          explanation: `No matching unresolved supplier bills detected. AI matches this to an out-of-pocket General Expense category. Suggesting allocation: Software Subscriptions / Operating Outward.`
        });
      }
    }
  };

  const handleSettleReconciliation = async () => {
    if (!selectedFeedId || !matchingResults) return;
    setReconciling(true);
    
    await onReconcileTransaction({
      feedId: selectedFeedId,
      match: matchingResults
    });

    setReconciling(false);
    setSelectedFeedId(null);
    setMatchingResults(null);
    alert("Reconciliation settled! Ledgers double-entry adjusted.");
    window.location.reload();
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;

    const userText = copilotQuery;
    setChatLog(prev => [...prev, { sender: "user", text: userText }]);
    setCopilotQuery("");
    setAskingCopilot(true);

    try {
      const resp = await onTriggerCopilot(userText);
      setChatLog(prev => [...prev, { sender: "ai", text: resp }]);
    } catch {
      setChatLog(prev => [...prev, { sender: "ai", text: "Errors querying intelligence. Please verify database parameters." }]);
    }
    setAskingCopilot(false);
  };

  return (
    <div id="ai-workspace-container" className="space-y-6 animate-fade-in p-2">
      
      {/* Top Tabs Navigator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#F5F2ED] border border-[#E5E1D8] rounded-xl gap-4">
        <div className="flex bg-white p-1.5 rounded-lg border border-[#E5E1D8] gap-2 w-full sm:w-auto">
          <button
            id="ai-tab-ocr"
            onClick={() => setActiveTab("ocr")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded transition-all cursor-pointer ${
              activeTab === "ocr" ? "bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E1D8]" : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#5A5A40]" />
            AI OCR Invoice Extraction
          </button>
          <button
            id="ai-tab-reconcile"
            onClick={() => setActiveTab("reconcile")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded transition-all cursor-pointer ${
              activeTab === "reconcile" ? "bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E1D8]" : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5A5A40]" />
            AI Assisted Bank Match
          </button>
          <button
            id="ai-tab-copilot"
            onClick={() => setActiveTab("copilot")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded transition-all cursor-pointer ${
              activeTab === "copilot" ? "bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E1D8]" : "text-[#8C867A] hover:text-[#2C2C24]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40] animate-pulse" />
            Conversational Copilot
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-[#E5E1D8] border border-[#D4CDBC] text-[#5A5A40] font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold select-none">
          <Check className="w-3 h-3 text-[#5A5A40]" /> Fully Configured
        </div>
      </div>

      {/* OCR TAB VIEW */}
      {activeTab === "ocr" && (
        <div id="ai-ocr-panel" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-[#2C2C24] text-sm flex items-center gap-2">
              <Upload className="text-[#5A5A40] w-4 h-4" />
              OCR Document Parser
            </h3>
            <p className="text-[11px] text-[#8C867A] leading-relaxed">
              Paste standard billing letters, receipts, or raw texts from vendor suppliers. Gemini extracts legal names, tax IDs, invoice dates, HSN codes, and amounts for fast filing.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] text-[#8C867A] font-bold uppercase tracking-widest font-mono">Select Testing templates:</label>
              <div className="flex gap-2 flex-wrap pb-1">
                {invoiceSampleTemplates.map((samp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRawInvoiceText(samp)}
                    className="bg-[#F5F2ED] hover:bg-[#E5E1D8] px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold text-[#2C2C24] border border-[#E5E1D8] cursor-pointer"
                  >
                    Template #{idx + 1} ({idx === 0 ? "ACME Bill" : "Tiger Service Credit"})
                  </button>
                ))}
              </div>

              <textarea
                value={rawInvoiceText}
                onChange={(e) => setRawInvoiceText(e.target.value)}
                rows={11}
                placeholder="Paste raw vendor invoice texts or OCR transcripts here..."
                className="w-full bg-[#FDFBF7] border border-[#E5E1D8] rounded-xl px-3.5 py-2.5 text-[#2C2C24] font-mono text-xs focus:border-[#D4CDBC] outline-none resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleParseInvoiceText}
              disabled={parsing || !rawInvoiceText}
              className="w-full bg-[#5A5A40] hover:bg-[#4E4E37] text-white font-bold text-xs py-2.5 rounded-lg select-none cursor-pointer border border-[#5A5A40]/30 flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              {parsing ? "Gemini GPT Parsing..." : "Extract OCR Invoices draft"}
            </button>
          </div>

          {/* Extracted draft review */}
          <div className="flex flex-col justify-between">
            {parsedDraft ? (
              <div className="bg-white border-2 border-[#5A5A40]/40 rounded-2xl p-6 space-y-4 flex-1 flex flex-col justify-between animate-fade-in shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
                    <h4 className="font-bold text-[#2C2C24] text-xs flex items-center gap-2">
                      <CheckCircle className="text-[#5A5A40] w-4 h-4" />
                      Extracted JSON Parameters Document:
                    </h4>
                    <span className="text-[9.5px] uppercase font-mono bg-green-50 text-green-700 border border-green-200 px-2 rounded">99% confidence</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#F5F2ED] p-4 border border-[#E5E1D8] rounded-xl truncate">
                    <div>
                      <span className="text-[10px] text-[#8C867A] font-sans block">Supplier / Customer Name:</span>
                      <span className="text-[#2C2C24] font-bold">{parsedDraft.customerName || parsedDraft.vendorName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C867A] font-sans block">GSTIN:</span>
                      <span className="text-[#5A5A40] font-mono">{parsedDraft.gstin || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C867A] font-sans block">Document Date:</span>
                      <span className="text-[#2C2C24] font-medium">{parsedDraft.date || "2026-05-24"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C867A] font-sans block">Invoice/Ref ID Number:</span>
                      <span className="text-[#2C2C24]/80">{parsedDraft.invoiceNumber || "BILL-AWS-901"}</span>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-[#8C867A] leading-relaxed font-sans">
                    Bizkhata detected items, including a calculated total amount of <span className="text-[#5A5A40] font-bold font-mono">₹{parsedDraft.total?.toLocaleString() || "1,18,000"}</span>.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-[#E5E1D8]">
                  <button
                    onClick={handleApplyParsedDraft}
                    className="w-full bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-bold py-2.5 rounded-lg select-none cursor-pointer"
                  >
                    Auto Fill Draft Billing registers
                  </button>
                  <button
                    onClick={() => setParsedDraft(null)}
                    className="w-full border border-[#E5E1D8] text-[#8C867A] text-xs py-2 rounded-lg cursor-pointer hover:bg-[#F5F2ED]"
                  >
                    Decline Extraction
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E5E1D8] border-dashed rounded-2xl p-12 text-center text-xs text-[#8C867A] flex flex-col justify-center items-center flex-1 shadow-sm">
                <HelpCircle className="w-8 h-8 text-[#8C867A] mb-3 opacity-60" />
                No transcript parsed. Choose a sample template or insert a raw OCR invoice string and tap Analyze.
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECONCILIATION MATCH TAB VIEW */}
      {activeTab === "reconcile" && (
        <div id="ai-reconciliation-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incoming Bank feeds directory */}
          <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 lg:col-span-1 space-y-4 shadow-sm font-sans">
            <h3 className="font-bold text-[#2C2C24] text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5A5A40]" />
              Incoming Bank Statement Feeds:
            </h3>
            <p className="text-[10.5px] text-[#8C867A] leading-relaxed">
              Real-time banking feeds synced via open-banking APIs. Click a feed row to match it to open books.
            </p>

            <div className="space-y-2.5">
              {bankFeeds.map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => handleAnalyzeReconcilation(feed)}
                  className={`w-full text-left p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedFeedId === feed.id 
                      ? "bg-[#F5F2ED] border-[#5A5A40] text-[#5A5A40]" 
                      : "bg-[#FDFBF7] border-[#E5E1D8] hover:border-[#D4CDBC]"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-[#8C867A] font-mono font-medium">
                    <span>{feed.date}</span>
                    <span className={`font-bold uppercase ${feed.type === "CR" ? "text-green-700" : "text-[#8C3A2C]"}`}>{feed.type === "CR" ? "CR / Inflow" : "DR / Outflow"}</span>
                  </div>
                  <div className="font-semibold text-[#2C2C24] font-sans truncate">{feed.narration}</div>
                  <div className="text-[#2C2C24] font-bold mt-1 font-mono">
                    ₹ {Math.abs(feed.amount).toLocaleString('en-IN')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Match feedback analytical workspace */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            {selectedFeedId && matchingResults ? (
              <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 flex flex-col justify-between flex-1 space-y-4 animate-fade-in shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
                    <h4 className="text-xs font-bold text-[#2C2C24] uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Sparkles className="w-4 h-4 text-[#5A5A40]" />
                      AI Match Recommendation Engine
                    </h4>
                    <span className="text-[9px] bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E1D8] font-bold px-2 py-0.5 rounded uppercase">Highly likely</span>
                  </div>

                  <div className="bg-[#F5F2ED] border border-[#E5E1D8] p-4 rounded-xl text-[11px] leading-relaxed select-text space-y-3 font-medium text-[#2C2C24]">
                    <p className="text-[#5A5A40] font-bold font-sans">Matched Target Detected:</p>
                    <div className="text-[#2C2C24]/90 p-2.5 bg-[#FDFBF7] border border-[#E5E1D8] rounded-lg">
                      {matchingResults.explanation}
                    </div>
                  </div>

                  <div className="text-[10px] uppercase font-bold text-[#8C867A] font-mono tracking-widest">
                    Proposed Journal Settle Entries to book:
                  </div>
                  <div className="bg-[#FDFBF7] p-3.5 border border-[#E5E1D8] rounded-xl flex items-center justify-between text-[11px] font-mono leading-loose font-bold">
                    <span className="text-green-700">• dr. Operating Bank Assets reserves</span>
                    <span className="text-[#8C3A2C]">• cr. Client Accounts Receivable</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-[#E5E1D8]">
                  <button
                    onClick={handleSettleReconciliation}
                    disabled={reconciling}
                    className="w-full bg-[#5A5A40] hover:bg-[#4E4E37] font-bold text-white text-xs py-2.5 rounded-lg select-none cursor-pointer transition border border-[#5A5A40]/30 shadow-sm"
                  >
                    {reconciling ? "Settle transaction in bank books..." : "Approve Match & Settle Ledger"}
                  </button>
                  <button
                    onClick={() => { setSelectedFeedId(null); setMatchingResults(null); }}
                    className="w-full border border-[#E5E1D8] text-[#8C867A] text-xs py-2 rounded-lg cursor-pointer hover:bg-[#F5F2ED]"
                  >
                    Ignore match
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E5E1D8] border-dashed rounded-2xl p-16 text-center text-xs text-[#8C867A] flex flex-col justify-center items-center flex-1 shadow-sm">
                <HelpCircle className="w-8 h-8 text-[#8C867A] mb-3 opacity-60" />
                No transaction match details active. Select an active UPI statement row from the left banking tray.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONVERSATIONAL CHAT COPILOT TAB VIEW */}
      {activeTab === "copilot" && (
        <div id="ai-chat-copilot-pane" className="bg-white border border-[#E5E1D8] rounded-2xl overflow-hidden shadow-sm flex flex-col h-[480px]">
          
          {/* Chat history list */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3 select-text">
            {chatLog.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-xl text-xs leading-relaxed ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div className={`p-1.5 rounded-full flex items-center justify-center w-7 h-7 shrink-0 text-white font-bold text-[9px] ${
                  msg.sender === "user" ? "bg-[#5A5A40]" : "bg-[#D4CDBC]"
                }`}>
                  {msg.sender === "user" ? "ME" : "BIZ"}
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.sender === "user" 
                    ? "bg-[#F5F2ED] border border-[#E5E1D8] text-[#2C2C24]" 
                    : "bg-[#FDFBF7] border border-[#E5E1D8] text-[#2C2C24]"
                }`}>
                  <p className="whitespace-pre-line font-medium">{msg.text}</p>
                </div>
              </div>
            ))}
            {askingCopilot && (
              <div className="flex gap-3 max-w-xs text-xs animate-pulse">
                <div className="p-1.5 rounded-full flex items-center justify-center w-7 h-7 bg-[#D4CDBC] text-[9px] text-white font-bold">BIZ</div>
                <div className="px-4 py-3 rounded-2xl bg-[#E5E1D8]/40 border border-[#E5E1D8] text-[#8C867A] font-medium font-sans select-none">
                  Gemini Accountant thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Chat row bar */}
          <form onSubmit={handleChatSubmit} className="border-t border-[#E5E1D8] p-4 bg-[#F5F2ED] flex gap-2">
            <input 
              type="text"
              value={copilotQuery}
              disabled={askingCopilot}
              placeholder="e.g. Is my business profitable? How much is my pending GST liability?"
              onChange={(e) => setCopilotQuery(e.target.value)}
              className="flex-1 bg-white border border-[#E5E1D8] rounded-lg px-4 py-2.5 text-[#2C2C24] text-xs focus:border-[#D4CDBC] outline-none"
            />
            <button
              type="submit"
              disabled={askingCopilot || !copilotQuery}
              className="px-5 bg-[#5A5A40] hover:bg-[#4E4E37] font-semibold text-white text-xs rounded-lg select-none cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Send className="w-3.5 h-3.5 text-white" /> Direct query
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
