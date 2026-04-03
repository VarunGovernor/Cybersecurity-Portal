import { cn, severityClass, statusClass, statusLabel } from "@/lib/utils";
import { AlertSeverity, AlertStatus } from "@/types";

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
}

function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return <Badge className={severityClass(severity)}>{severity}</Badge>;
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  return <Badge className={statusClass(status)}>{statusLabel(status)}</Badge>;
}

export function RiskBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cls = {
    high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
    low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  }[level];
  return <Badge className={cls}>{level} risk</Badge>;
}
