export function calculateGST(amount: number, rate: number, companyState?: string, partyState?: string) {
  const taxable = Number(amount || 0);
  const gst = +(taxable * Number(rate || 0) / 100).toFixed(2);
  const intra = !!companyState && !!partyState && companyState.trim().toLowerCase() === partyState.trim().toLowerCase();
  return { taxable, gst, cgst: intra ? +(gst / 2).toFixed(2) : 0, sgst: intra ? +(gst / 2).toFixed(2) : 0, igst: intra ? 0 : gst, total: +(taxable + gst).toFixed(2) };
}
