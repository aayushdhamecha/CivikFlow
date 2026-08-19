import { CheckCircle2, CircleDotDashed, Clock3, type LucideIcon, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, { label: string; className: string; Icon: LucideIcon }> = {
  SUBMITTED: { label: "Submitted", className: "bg-sky-50 text-sky-800 border-sky-200", Icon: Clock3 },
  UNDER_REVIEW: { label: "Under review", className: "bg-amber-50 text-amber-800 border-amber-200", Icon: CircleDotDashed },
  VERIFIED: { label: "Verified", className: "bg-indigo-50 text-indigo-800 border-indigo-200", Icon: CheckCircle2 },
  ASSIGNED: { label: "Assigned", className: "bg-violet-50 text-violet-800 border-violet-200", Icon: CircleDotDashed },
  IN_PROGRESS: { label: "In progress", className: "bg-blue-50 text-blue-800 border-blue-200", Icon: CircleDotDashed },
  NEEDS_INFORMATION: { label: "Needs information", className: "bg-orange-50 text-orange-800 border-orange-200", Icon: Clock3 },
  DUPLICATE: { label: "Possible duplicate", className: "bg-stone-100 text-stone-700 border-stone-200", Icon: CircleDotDashed },
  REJECTED: { label: "Rejected", className: "bg-rose-50 text-rose-800 border-rose-200", Icon: XCircle },
  RESOLVED: { label: "Resolved", className: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  CLOSED: { label: "Closed", className: "bg-slate-100 text-slate-700 border-slate-200", Icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusStyle[status] ?? { label: status, className: "bg-slate-100 text-slate-700 border-slate-200", Icon: CircleDotDashed };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", config.className, className)}>
      <config.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function statusText(status: string) {
  return statusStyle[status]?.label ?? status.replaceAll("_", " ");
}
