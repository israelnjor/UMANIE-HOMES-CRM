// components/ui/StatCard.tsx
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // percentage, e.g. 12.5
    label?: string; // e.g. "vs last month"
  };
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "danger";
  className?: string;
  loading?: boolean;
}

const variants = {
  default:  { card: "bg-card",                icon: "bg-surface text-ink-muted" },
  primary:  { card: "bg-primary text-white",  icon: "bg-white/10 text-white" },
  accent:   { card: "bg-accent text-primary", icon: "bg-black/10 text-primary" },
  success:  { card: "bg-success-bg",          icon: "bg-success/10 text-success" },
  warning:  { card: "bg-warning-bg",          icon: "bg-warning/10 text-warning" },
  danger:   { card: "bg-danger-bg",           icon: "bg-danger/10 text-danger" },
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
  const v = variants[variant];
  const isColored = variant !== "default";

  const trendColor =
    !trend ? "" :
    trend.value > 0 ? (isColored ? "text-white/80" : "text-success") :
    trend.value < 0 ? (isColored ? "text-white/80" : "text-danger") :
    (isColored ? "text-white/60" : "text-ink-muted");

  const TrendIcon =
    !trend ? null :
    trend.value > 0 ? TrendingUp :
    trend.value < 0 ? TrendingDown :
    Minus;

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-border p-5 shadow-card animate-pulse", v.card, className)}>
        <div className="h-4 w-24 bg-black/10 rounded mb-4" />
        <div className="h-8 w-32 bg-black/10 rounded mb-2" />
        <div className="h-3 w-20 bg-black/10 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-5 shadow-card",
        v.card,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isColored ? "text-white/70" : "text-ink-muted"
          )}>
            {title}
          </p>

          <p className={cn(
            "text-2xl font-bold mt-1 tracking-tight",
            isColored ? "text-white" : "text-ink"
          )}>
            {value}
          </p>

          {subtitle && (
            <p className={cn(
              "text-xs mt-0.5 truncate",
              isColored ? "text-white/60" : "text-ink-muted"
            )}>
              {subtitle}
            </p>
          )}

          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
              <TrendIcon size={13} />
              <span>
                {trend.value > 0 ? "+" : ""}{trend.value}%
                {trend.label && <span className="font-normal ml-1">{trend.label}</span>}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            v.icon
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}