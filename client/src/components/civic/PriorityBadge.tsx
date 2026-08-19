import { AlertTriangle, Flag, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const style: Record<string, { className: string; label: string; Icon: typeof Flag }> = {
  LOW: { label: "Low", className: "bg-slate-100 text-slate-700", Icon: Flag },
  MEDIUM: { label: "Medium", className: "bg-amber-50 text-amber-800", Icon: Flag },
  HIGH: { label: "High", className: "bg-orange-50 text-orange-800", Icon: AlertTriangle },
  CRITICAL: { label: "Critical", className: "bg-rose-50 text-rose-800", Icon: ShieldAlert },
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const config = style[priority] ?? style.MEDIUM;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", config.className, className)}>
      <config.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
