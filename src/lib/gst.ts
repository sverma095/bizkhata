import { Customer, Item, Vendor } from "../types.js";

export interface GstCalculationResult {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  total: number;
}

export function calculateGst(
  items: Array<{ itemId: string; name: string; qty: number; rate: number; gstRate: number }>,
  companyState: string,
  targetState: string
): GstCalculationResult {
  const isIntrastate = companyState.trim().toLowerCase() === targetState.trim().toLowerCase();

  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalGst = 0;

  items.forEach(it => {
    const itemAmount = it.qty * it.rate;
    subtotal += itemAmount;

    // GST amount for this line item
    const lineGst = (itemAmount * it.gstRate) / 100;
    totalGst += lineGst;

    if (isIntrastate) {
      cgst += lineGst / 2;
      sgst += lineGst / 2;
    } else {
      igst += lineGst;
    }
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    total: Math.round((subtotal + totalGst) * 100) / 100
  };
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];
