import Link from "next/link";
const links = ["dashboard","company","customers","vendors","items","proforma","invoices","payments","expenses","bills","banking","reports","settings","users"];
export function Sidebar(){return <aside className="hidden md:flex w-64 flex-col gap-2 border-r bg-white p-4 min-h-screen"><div className="mb-4"><p className="text-2xl font-bold">Bizkhata</p><p className="text-xs text-slate-500">Smart Accounting for Growing Businesses</p></div>{links.map(l=><Link key={l} className="rounded-xl px-3 py-2 capitalize hover:bg-slate-100" href={`/${l}`}>{l}</Link>)}</aside>}
