import { cn, fmtNumber } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  alert?: boolean;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title, value, subtitle, icon: Icon, iconColor = "text-primary",
  iconBg = "bg-primary/10", trend, trendValue, alert, loading, className,
}: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up"
    ? "text-red-600 dark:text-red-400"
    : trend === "down"
    ? "text-green-600 dark:text-green-400"
    : "text-muted-foreground";

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-4 relative overflow-hidden",
        alert && "border-red-200 dark:border-red-900",
        className,
      )}
    >
      {alert && (
        <div className="absolute top-0 right-0 w-1 h-full bg-red-500 rounded-r-lg" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-semibold mt-1 tabular-nums">
              {typeof value === "number" ? fmtNumber(value) : value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      {trend && trendValue && (
        <div className={cn("flex items-center gap-1 mt-3 text-xs font-medium", trendColor)}>
          <TrendIcon size={12} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
