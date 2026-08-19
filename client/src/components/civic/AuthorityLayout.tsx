import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardNavItem } from "@/components/DashboardLayout";
import { BarChart3, ClipboardList, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const authorityNavigation: DashboardNavItem[] = [
  { icon: LayoutDashboard, label: "Operations overview", path: "/authority" },
  { icon: ClipboardList, label: "Complaint queue", path: "/authority/reports" },
];

const adminNavigation: DashboardNavItem[] = [...authorityNavigation, { icon: BarChart3, label: "System analytics", path: "/admin" }];

export function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (!loading && user?.role === "citizen") return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-11 w-11 text-emerald-700" /><h1 className="mt-5 text-2xl font-bold">Authority access required</h1><p className="mt-2 text-slate-600">Your citizen account can report and track civic issues, but it cannot access private operational records.</p><Link href="/citizen" className="mt-6 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Go to citizen home</Link></section></main>;
  return <DashboardLayout navigation={user?.role === "admin" ? adminNavigation : authorityNavigation} title="CIVICFLOW"><div className="min-h-screen bg-slate-50/70">{children}</div></DashboardLayout>;
}
