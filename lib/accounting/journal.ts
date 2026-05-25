export type JournalLine = { account: string; debit?: number; credit?: number };
export function isBalanced(lines: JournalLine[]) {
  const debit = lines.reduce((s,l)=>s+Number(l.debit||0),0);
  const credit = lines.reduce((s,l)=>s+Number(l.credit||0),0);
  return Math.abs(debit-credit) < 0.01;
}
export function invoiceJournal(total: number, taxable: number, gst: number): JournalLine[] {
  return [{account:"Accounts Receivable",debit:total},{account:"Sales Income",credit:taxable},{account:"GST Payable",credit:gst}];
}
export function paymentWithTdsJournal(totalInvoice: number, bankReceived: number, tds: number): JournalLine[] {
  return [{account:"Bank Account",debit:bankReceived},{account:"TDS Receivable",debit:tds},{account:"Accounts Receivable",credit:totalInvoice}];
}
