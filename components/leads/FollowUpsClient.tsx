// components/leads/FollowUpsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Mail, Calendar, CheckCircle,
  Clock, AlertCircle, Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, timeAgo } from "@/lib/utils";

interface FollowUp {
  id: string;
  type: string;
  status: string;
  priority: string;
  scheduled_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  leads?: { id: string; full_name: string; email: string; phone: string | null } | null;
  profiles?: { full_name: string } | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  phone_call:  <Phone size={14} />,
  email:       <Mail size={14} />,
  site_visit:  <Calendar size={14} />,
  meeting:     <Calendar size={14} />,
  whatsapp:    <Phone size={14} />,
  other:       <Calendar size={14} />,
};

const priorityVariant = (p: string) => {
  if (p === "urgent") return "danger";
  if (p === "high")   return "warning";
  if (p === "medium") return "info";
  return "default";
};

const STATUS_FILTERS = ["all", "pending", "completed", "overdue"];

export default function FollowUpsClient({
  followUps: initialFollowUps,
  currentUserId,
}: {
  followUps: FollowUp[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const now = new Date();

  const isOverdue = (fu: FollowUp) =>
    fu.status === "pending" && new Date(fu.scheduled_at) < now;

  // ── Stats ────────────────────────────────────────────
  const pending   = followUps.filter((f) => f.status === "pending" && !isOverdue(f)).length;
  const overdue   = followUps.filter(isOverdue).length;
  const completed = followUps.filter((f) => f.status === "completed").length;
  const todayCount = followUps.filter((f) => {
    const d = new Date(f.scheduled_at);
    return d.toDateString() === now.toDateString() && f.status === "pending";
  }).length;

  // ── Filter ───────────────────────────────────────────
  const filtered = followUps.filter((f) => {
    if (statusFilter === "pending")   return f.status === "pending" && !isOverdue(f);
    if (statusFilter === "completed") return f.status === "completed";
    if (statusFilter === "overdue")   return isOverdue(f);
    return true;
  });

  // ── Mark complete ────────────────────────────────────
  const markComplete = async (fuId: string) => {
    const supabase = createClient() as any;
    const completedAt = new Date().toISOString();
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "completed", completed_at: completedAt })
      .eq("id", fuId);
    if (!error) {
      setFollowUps((prev) =>
        prev.map((f) =>
          f.id === fuId
            ? { ...f, status: "completed", completed_at: completedAt }
            : f
        )
      );
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Follow-ups</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Track and manage all scheduled interactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending"
          value={pending}
          subtitle="Scheduled upcoming"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="Overdue"
          value={overdue}
          subtitle="Need immediate action"
          icon={<AlertCircle size={20} />}
          variant={overdue > 0 ? "danger" : "default"}
        />
        <StatCard
          title="Today"
          value={todayCount}
          subtitle="Scheduled for today"
          icon={<Calendar size={20} />}
          variant="primary"
        />
        <StatCard
          title="Completed"
          value={completed}
          subtitle="All time"
          icon={<CheckCircle size={20} />}
          variant="success"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`
              px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${statusFilter === f
                ? "border-primary text-primary"
                : "border-transparent text-ink-muted hover:text-ink"
              }
            `}
          >
            {f}
            {f === "overdue" && overdue > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-danger text-white rounded-full">
                {overdue}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-10">
            <CheckCircle size={36} className="text-success mx-auto mb-3" />
            <p className="text-sm font-medium text-ink">All clear!</p>
            <p className="text-xs text-ink-muted mt-1">
              No follow-ups in this category.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fu) => {
            const overdueFu = isOverdue(fu);
            return (
              <Card
                key={fu.id}
                padding="md"
                className={overdueFu ? "border-danger/40 bg-danger-bg/30" : ""}
              >
                <div className="flex items-start gap-4">

                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${fu.status === "completed"
                      ? "bg-success-bg text-success"
                      : overdueFu
                        ? "bg-danger-bg text-danger"
                        : "bg-primary-50 text-primary"
                    }
                  `}>
                    {fu.status === "completed"
                      ? <CheckCircle size={18} />
                      : (TYPE_ICONS[fu.type] ?? <Calendar size={18} />)
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink capitalize">
                        {fu.type.replace(/_/g, " ")}
                      </span>
                      <Badge variant={priorityVariant(fu.priority) as any}>
                        {fu.priority}
                      </Badge>
                      {fu.status === "completed" && (
                        <Badge variant="success">Completed</Badge>
                      )}
                      {overdueFu && (
                        <Badge variant="danger">Overdue</Badge>
                      )}
                    </div>

                    {/* Lead info */}
                    {fu.leads && (
                      <button
                        onClick={() => router.push(`/leads/${fu.leads!.id}`)}
                        className="text-sm text-primary hover:underline mt-0.5 font-medium"
                      >
                        {fu.leads.full_name}
                      </button>
                    )}

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`
                        flex items-center gap-1 text-xs
                        ${overdueFu ? "text-danger font-medium" : "text-ink-muted"}
                      `}>
                        <Clock size={11} />
                        {formatDateTime(fu.scheduled_at)}
                      </span>
                      {fu.profiles?.full_name && (
                        <span className="text-xs text-ink-muted">
                          · Assigned to {fu.profiles.full_name}
                        </span>
                      )}
                    </div>

                    {fu.notes && (
                      <p className="text-sm text-ink-muted mt-2 leading-relaxed">
                        {fu.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {fu.status !== "completed" && (
                      <Button
                        size="sm"
                        variant={overdueFu ? "danger" : "outline"}
                        icon={<CheckCircle size={13} />}
                        onClick={() => markComplete(fu.id)}
                      >
                        Done
                      </Button>
                    )}
                    {fu.leads && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/leads/${fu.leads!.id}`)}
                      >
                        View Lead
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}