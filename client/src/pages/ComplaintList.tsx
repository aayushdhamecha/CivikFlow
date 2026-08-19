import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal } from "lucide-react";
import { CitizenLayout } from "@/components/civic/CitizenLayout";
import { PriorityBadge } from "@/components/civic/PriorityBadge";
import { StatusBadge } from "@/components/civic/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const statuses = ["ALL", "SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function ComplaintList() {
  const reports = trpc.civic.complaints.mine.useQuery();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => (reports.data ?? []).filter(report => {
    const haystack = `${report.publicId} ${report.title} ${report.address ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === "ALL" || report.status === status);
  }), [reports.data, query, status]);
  return <CitizenLayout><main className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:px-6"><p className="text-sm font-bold uppercase tracking-[.14em] text-emerald-700">Track civic action</p><h1 className="mt-1 text-3xl font-bold tracking-tight">My reports</h1><p className="mt-2 text-slate-600">Search your submitted reports and view updates from the civic team.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} className="h-11 pl-9" placeholder="Search complaint ID, issue, or location" /></div><div className="flex gap-2 overflow-x-auto pb-1">{statuses.map(value => <Button key={value} variant={status === value ? "default" : "outline"} size="sm" onClick={() => setStatus(value)} className={status === value ? "bg-emerald-700 hover:bg-emerald-800" : "shrink-0"}>{value === "ALL" ? "All" : value.replaceAll("_", " ")}</Button>)}</div></div>{reports.isLoading ? <div className="mt-6 grid gap-3"><div className="h-28 animate-pulse rounded-2xl bg-slate-200" /><div className="h-28 animate-pulse rounded-2xl bg-slate-200" /></div> : filtered.length ? <section className="mt-6 grid gap-3">{filtered.map(report => <Link key={report.id} href={`/complaints/${report.publicId}`} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-bold">{report.title}</h2><StatusBadge status={report.status} /></div><p className="mt-2 text-sm text-slate-500">{report.publicId} · {report.address || "Location pending"}</p><p className="mt-1 text-xs text-slate-400">Submitted {new Date(report.createdAt).toLocaleString()}</p></div><PriorityBadge priority={report.priority} /></div></Link>)}</section> : <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><SlidersHorizontal className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-bold">No matching reports</h2><p className="mt-1 text-sm text-slate-600">Try another search or status filter.</p></section>}</main></CitizenLayout>;
}
