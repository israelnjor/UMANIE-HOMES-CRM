// components/ui/Badge.tsx
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default:  "bg-border text-ink",
  primary:  "bg-primary-50 text-primary-700 border border-primary-200",
  accent:   "bg-accent-50 text-accent-700 border border-accent-200",
  success:  "bg-success-bg text-success-text border border-success-border",
  warning:  "bg-warning-bg text-warning-text border border-warning-border",
  danger:   "bg-danger-bg text-danger-text border border-danger-border",
  info:     "bg-info-bg text-info-text border border-info-border",
  outline:  "bg-transparent border border-border text-ink-muted",
};

const dotColors: Record<BadgeVariant, string> = {
  default:  "bg-ink-muted",
  primary:  "bg-primary",
  accent:   "bg-accent",
  success:  "bg-success",
  warning:  "bg-warning",
  danger:   "bg-danger",
  info:     "bg-info",
  outline:  "bg-ink-muted",
};

export default function Badge({
  variant = "default",
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}