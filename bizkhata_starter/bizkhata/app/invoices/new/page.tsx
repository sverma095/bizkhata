import { Sidebar } from "@/components/layout/sidebar";
export default function NewInvoice(){return <div className="flex"><Sidebar/><main className="flex-1 p-6"><h1 className="text-3xl font-bold">Create Tax Invoice</h1><div className="card mt-6 p-6"><p>Invoice form will calculate CGST/SGST/IGST and create balanced journal entries.</p></div></main></div>}
