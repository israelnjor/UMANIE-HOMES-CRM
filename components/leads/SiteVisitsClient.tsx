// components/leads/SiteVisitsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Calendar, CheckCircle, Clock,
  AlertCircle, Plus, Eye,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface SiteVisit {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  feedback: string | null;
  created_at: string;
  leads?: { id: string; full_name: string; email: string; phone: string | null } | null;
  properties?: { id: string; title: string; address: string | null } | null;
  profiles?: { full_name: string } | null;
}

interface Property { id: string; title: string; address: string | null }
interface Lead { id: string; full_name: string }

const visitSchema = z.object({
  lead_id:      z.string().min(1, "Select a lead"),
  property_id:  z.string().min(1, "Select a property"),
  scheduled_at: z.string().min(1, "Select date and time"),
  notes:        z.string().optional(),
});
type VisitForm = z.infer<typeof visitSchema>;

const STATUS_FILTERS = ["all", "scheduled", "completed", "cancelled"];

const statusVariant = (s: string) => {
  if (s === "completed")  return "success";
  if (s === "cancelled")  return "danger";
  if (s === "no_show")    return "warning";
  return "info";
};

export default function SiteVisitsClient({
  visits: initialVisits,
  properties,
  leads,
  currentUserId,
}: {
  visits: SiteVisit[];
  properties: Property[];
  leads: Lead[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [visits, setVisits]   = useState<SiteVisit[]>(initialVisits);
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<VisitForm>({ resolver: zodResolver(visitSchema) });

  const now = new Date();

  // ── Stats ────────────────────────────────────────────
  const scheduled  = visits.filter((v) => v.status === "scheduled").length;
  const completed  = visits.filter((v) => v.status === "completed").length;
  const cancelled  = visits.filter((v) => v.status === "cancelled").length;
  const todayCount = visits.filter((v) => {
    const d = new Date(v.scheduled_at);
    return d.toDateString() === now.toDateString() && v.status === "scheduled";
  }).length;

  // ── Filter ───────────────────────────────────────────
  const filtered = visits.filter((v) => {
    if (statusFilter === "all") return true;
    return v.status === statusFilter;
  });

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: VisitForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("site_visits")
      .insert({
        lead_id:       data.lead_id,
        property_id:   data.property_id,
        scheduled_at:  data.scheduled_at,
        notes:         data.notes ?? null,
        conducted_by:  currentUserId,
        status:        "scheduled",
      })
      .select(`
        id, scheduled_at, status, notes, feedback, created_at,
        leads (id, full_name, email, phone),
        properties (id, title, address),
        profiles!site_visits_conducted_by_fkey (full_name)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setVisits((prev) => [inserted as SiteVisit, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Mark complete ────────────────────────────────────
  const markComplete = async (visitId: string) => {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("site_visits")
      .update({ status: "completed" })
      .eq("id", visitId);
    if (!error) {
      setVisits((prev) =>
        prev.map((v) => v.id === visitId ? { ...v, status: "completed" } : v)
      );
    }
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Site Visits</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Schedule and track property viewings
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          Schedule Visit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Scheduled"
          value={scheduled}
          subtitle="Upcoming visits"
          icon={<Clock size={20} />}
          variant="primary"
        />
        <StatCard
          title="Today"
          value={todayCount}
          subtitle="Visits today"
          icon={<Calendar size={20} />}
          variant={todayCount > 0 ? "accent" : "default"}
        />
        <StatCard
          title="Completed"
          value={completed}
          subtitle="All time"
          icon={<CheckCircle size={20} />}
          variant="success"
        />
        <StatCard
          title="Cancelled"
          value={cancelled}
          subtitle="All time"
          icon={<AlertCircle size={20} />}
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
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-10">
            <MapPin size={36} className="text-ink-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-ink">No site visits here</p>
            <p className="text-xs text-ink-muted mt-1">
              Schedule a property viewing to get started.
            </p>
            <Button
              size="sm" className="mt-4"
              icon={<Plus size={14} />}
              onClick={() => setAddOpen(true)}
            >
              Schedule Visit
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((visit) => (
            <Card key={visit.id} padding="md">
              <div className="flex items-start gap-4">

                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${visit.status === "completed"
                    ? "bg-success-bg text-success"
                    : visit.status === "cancelled"
                      ? "bg-danger-bg text-danger"
                      : "bg-primary-50 text-primary"
                  }
                `}>
                  <MapPin size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink">
                      {visit.properties?.title ?? "Unknown Property"}
                    </span>
                    <Badge variant={statusVariant(visit.status) as any}>
                      {visit.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  {visit.properties?.address && (
                    <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                      <MapPin size={11} /> {visit.properties.address}
                    </p>
                  )}

                  {visit.leads && (
                    <button
                      onClick={() => router.push(`/leads/${visit.leads!.id}`)}
                      className="text-sm text-primary hover:underline mt-1 font-medium"
                    >
                      {visit.leads.full_name}
                    </button>
                  )}

                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-ink-muted">
                      <Clock size={11} />
                      {formatDateTime(visit.scheduled_at)}
                    </span>
                    {visit.profiles?.full_name && (
                      <span className="text-xs text-ink-muted">
                        · {visit.profiles.full_name}
                      </span>
                    )}
                  </div>

                  {visit.notes && (
                    <p className="text-sm text-ink-muted mt-2">{visit.notes}</p>
                  )}
                  {visit.feedback && (
                    <p className="text-sm text-ink mt-1.5 bg-surface px-3 py-2 rounded-lg">
                      💬 {visit.feedback}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {visit.status === "scheduled" && (
                    <Button
                      size="sm" variant="outline"
                      icon={<CheckCircle size={13} />}
                      onClick={() => markComplete(visit.id)}
                    >
                      Done
                    </Button>
                  )}
                  {visit.leads && (
                    <Button
                      size="sm" variant="ghost"
                      icon={<Eye size={13} />}
                      onClick={() => router.push(`/leads/${visit.leads!.id}`)}
                    >
                      Lead
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="Schedule Site Visit"
        subtitle="Book a property viewing for a lead"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Lead <span className="text-danger">*</span></label>
            <select
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              {...register("lead_id")}
            >
              <option value="">Select lead...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.full_name}</option>
              ))}
            </select>
            {errors.lead_id && <p className="text-xs text-danger">{errors.lead_id.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Property <span className="text-danger">*</span></label>
            <select
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              {...register("property_id")}
            >
              <option value="">Select property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            {errors.property_id && <p className="text-xs text-danger">{errors.property_id.message}</p>}
          </div>

          <Input
            label="Date & Time"
            type="datetime-local"
            required
            error={errors.scheduled_at?.message}
            {...register("scheduled_at")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes</label>
            <textarea
              rows={3}
              placeholder="Any preparation notes..."
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
              {...register("notes")}
            />
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => { setAddOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}