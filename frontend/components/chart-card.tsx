import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  loading?: boolean;
}

export function ChartCard({ title, subtitle, children, className, actions, loading }: ChartCardProps) {
  return (
    <div className={cn("bg-card border rounded-lg overflow-hidden", className)}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={cn("p-4", loading && "opacity-50 pointer-events-none")}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : children}
      </div>
    </div>
  );
}
