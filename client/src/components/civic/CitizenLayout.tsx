import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Bell, ClipboardList, Home, LogOut, MapPinned, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/citizen", label: "Home", icon: Home },
  { href: "/report", label: "Report", icon: MapPinned },
  { href: "/complaints", label: "My reports", icon: ClipboardList },
  { href: "/notifications", label: "Updates", icon: Bell },
];

export function CitizenLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="min-h-screen bg-[#f7f9f8] grid place-items-center text-slate-500">Loading CIVICFLOW…</div>;
  if (!user) {
    return <main className="min-h-screen grid place-items-center bg-[#f7f9f8] p-6"><section className="max-w-md text-center"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-700 text-white"><ShieldCheck /></div><h1 className="text-3xl font-bold text-slate-950">Sign in to continue</h1><p className="mt-3 text-slate-600">Use your CIVICFLOW account to report an issue and follow every update.</p><Button className="mt-7 bg-emerald-700 hover:bg-emerald-800" onClick={() => startLogin()}>Sign in securely</Button></section></main>;
  }
  if (user.role !== "citizen") {
    return <main className="min-h-screen grid place-items-center bg-[#f7f9f8] p-6"><section className="max-w-md text-center"><ShieldCheck className="mx-auto h-12 w-12 text-emerald-700" /><h1 className="mt-5 text-2xl font-bold">Authority account detected</h1><p className="mt-2 text-slate-600">This account has access to the civic operations workspace.</p><Link href="/authority"><Button className="mt-6 bg-slate-950 hover:bg-slate-800">Open authority workspace</Button></Link></section></main>;
  }

  return <div className="min-h-screen bg-[#f7f9f8] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/citizen" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-700 text-white"><ShieldCheck className="h-5 w-5" /></span><span className="text-lg font-extrabold tracking-tight">CIVIC<span className="text-emerald-700">FLOW</span></span></Link>
        <nav className="hidden items-center gap-1 md:flex">{items.map(item => { const Icon = item.icon; const active = location === item.href || (item.href === "/complaints" && location.startsWith("/complaints/")); return <Link key={item.href} href={item.href} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{item.label}</Link>})}</nav>
        <div className="hidden items-center gap-2 md:flex"><span className="max-w-28 truncate text-sm text-slate-600">{user.name || "Citizen"}</span><Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button></div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Open navigation">{open ? <X /> : <Menu />}</Button>
      </div>
      {open && <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">{items.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-emerald-50"><Icon className="h-4 w-4" />{item.label}</Link>})}<button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-rose-700"><LogOut className="h-4 w-4" />Sign out</button></nav>}
    </header>
    {children}
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"><div className="mx-auto flex max-w-md justify-around">{items.map(item => { const Icon = item.icon; const active = location === item.href || (item.href === "/complaints" && location.startsWith("/complaints/")); return <Link key={item.href} href={item.href} className={`flex min-w-16 flex-col items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${active ? "text-emerald-700" : "text-slate-500"}`}><Icon className="h-5 w-5" />{item.label}</Link>})}</div></nav>
  </div>;
}
