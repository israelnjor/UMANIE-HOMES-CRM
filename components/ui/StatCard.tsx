// components/ui/StatCard.tsx
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type AccentColor = "default" | "primary" | "accent" | "success" | "warning" | "danger";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: AccentColor;
  className?: string;
  loading?: boolean;
}

const iconAccents: Record<AccentColor, string> = {
  default:  "bg-surface text-ink-muted",
  primary:  "bg-primary/10 text-primary",
  accent:   "bg-accent/15 text-accent-700",
  success:  "bg-success-bg text-success",
  warning:  "bg-warning-bg text-warning",
  danger:   "bg-danger-bg text-danger",
};

const trendColors: Record<"up" | "down" | "flat", string> = {
  up:   "text-success",
  down: "text-danger",
  flat: "text-ink-muted",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
  loading = false,
}: StatCardProps) {
  const trendDir = !trend ? null : trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat";
  const TrendIcon = trendDir === "up" ? TrendingUp : trendDir === "down" ? TrendingDown : Minus;

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card animate-pulse", className)}>
        <div className="h-3 w-20 bg-border rounded mb-4" />
        <div className="h-7 w-28 bg-border rounded mb-2" />
        <div className="h-3 w-16 bg-border rounded" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-ink mt-1.5 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-0.5 truncate">{subtitle}</p>
          )}
          {trend && trendDir && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColors[trendDir])}>
              <TrendIcon size={13} />
              <span>
                {trend.value > 0 ? "+" : ""}{trend.value}%
                {trend.label && <span className="font-normal text-ink-muted ml-1">{trend.label}</span>}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            iconAccents[variant]
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}