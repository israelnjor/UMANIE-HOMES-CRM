// components/leads/LeadDetailClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar,
  Edit2, Plus, CheckCircle, Clock, MessageSquare,
  User, Banknote, Home,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  PROPERTY_TYPE_LABELS,
  PRIORITY_COLORS,
} from "@/constants";

// ── Types ──────────────────────────────────────────────
interface Lead {
  id: string; full_name: string; email: string;
  phone: string | null; status: string; source: string;
  property_type: string | null; budget_min: number | null;
  budget_max: number | null; notes: string | null;
  assigned_to: string | null; created_at: string; updated_at: string;
  profiles?: { id: string; full_name: string } | null;
}
interface FollowUp {
  id: string; type: string; status: string; priority: string;
  scheduled_at: string; completed_at: string | null;
  notes: string | null; created_at: string;
  profiles?: { full_name: string } | null;
}
interface Note {
  id: string; content: string; created_at: string;
  profiles?: { full_name: string } | null;
}
interface Staff { id: string; full_name: string; role: string }

// ── Schemas ────────────────────────────────────────────
const followUpSchema = z.object({
  type:         z.string().min(1, "Select a type"),
  priority:     z.string().min(1, "Select priority"),
  scheduled_at: z.string().min(1, "Select date and time"),
  notes:        z.string().optional(),
});
const noteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty"),
});
type FollowUpForm = z.infer<typeof followUpSchema>;
type NoteForm = z.infer<typeof noteSchema>;

const STATUSES = Object.entries(LEAD_STATUS_LABELS);
const FOLLOW_UP_TYPES = [
  "phone_call", "email", "site_visit", "meeting", "whatsapp", "other"
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const statusVariant = (s: string) => {
  if (s === "won") return "success";
  if (s === "lost") return "danger";
  if (s === "new") return "info";
  if (s === "negotiating") return "warning";
  if (s === "qualified") return "accent";
  return "default";
};

const priorityVariant = (p: string) => {
  if (p === "urgent") return "danger";
  if (p === "high") return "warning";
  if (p === "medium") return "info";
  return "default";
};

// ── Component ──────────────────────────────────────────
export default function LeadDetailClient({
  lead: initialLead,
  followUps: initialFollowUps,
  notes: initialNotes,
  staff,
  currentUserId,
}: {
  lead: Lead;
  followUps: FollowUp[];
  notes: Note[];
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [lead, setLead]           = useState<Lead>(initialLead);
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps);
  const [notes, setNotes]         = useState<Note[]>(initialNotes);
  const [isPending, startTransition] = useTransition();

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [fuOpen, setFuOpen]   = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const fuForm = useForm<FollowUpForm>({ resolver: zodResolver(followUpSchema) });
  const noteForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });

  // ── Update status ────────────────────────────────────
  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("leads")
      .update({ status } as any)
      .eq("id", lead.id);
    if (!error) {
      setLead((prev) => ({ ...prev, status }));
      startTransition(() => router.refresh());
    }
    setStatusUpdating(false);
  };

  // ── Add follow-up ────────────────────────────────────
  const onAddFollowUp = async (data: FollowUpForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("follow_ups")
      .insert({
        lead_id:      lead.id,
        type:         data.type,
        priority:     data.priority,
        scheduled_at: data.scheduled_at,
        notes:        data.notes ?? null,
        created_by:   currentUserId,
        status:       "pending",
      })
      .select(`id, type, status, priority, scheduled_at,
               completed_at, notes, created_at,
               profiles!follow_ups_created_by_fkey (full_name)`)
      .single();
    if (error) { setServerError(error.message); return; }
    setFollowUps((prev) => [inserted as FollowUp, ...prev]);
    fuForm.reset();
    setFuOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Add note ─────────────────────────────────────────
  const onAddNote = async (data: NoteForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("lead_notes")
      .insert({
        lead_id:    lead.id,
        content:    data.content,
        created_by: currentUserId,
      })
      .select(`id, content, created_at,
               profiles!lead_notes_created_by_fkey (full_name)`)
      .single();
    if (error) { setServerError(error.message); return; }
    setNotes((prev) => [inserted as Note, ...prev]);
    noteForm.reset();
    setNoteOpen(false);
  };

  // ── Mark follow-up complete ───────────────────────────
  const markComplete = async (fuId: string) => {
    const supabase = createClient() as any;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "completed", completed_at: now } as any)
      .eq("id", fuId);
    if (!error) {
      setFollowUps((prev) =>
        prev.map((f) =>
          f.id === fuId ? { ...f, status: "completed", completed_at: now } : f
        )
      );
    }
  };

  // ── Info row helper ───────────────────────────────────
  const InfoRow = ({
    icon, label, value,
  }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-ink-muted mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-muted mb-0.5">{label}</p>
        <div className="text-sm font-medium text-ink">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => router.push("/leads")}
          className="text-ink-muted hover:text-ink transition-colors mt-1"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{lead.full_name}</h1>
            <Badge variant={statusVariant(lead.status) as any} dot>
              {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] ?? lead.status}
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-0.5">
            Lead since {formatDate(lead.created_at)} ·{" "}
            {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] ?? lead.source}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            icon={<Plus size={14} />}
            onClick={() => setNoteOpen(true)}
          >
            Add Note
          </Button>
          <Button
            size="sm"
            icon={<Calendar size={14} />}
            onClick={() => setFuOpen(true)}
          >
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="space-y-4">

          {/* Contact info */}
          <Card padding="md">
            <CardHeader title="Contact Information" />
            <InfoRow icon={<Mail size={15} />}    label="Email"   value={lead.email} />
            <InfoRow icon={<Phone size={15} />}   label="Phone"   value={lead.phone ?? "—"} />
            <InfoRow
              icon={<Home size={15} />}
              label="Property Interest"
              value={lead.property_type
                ? (PROPERTY_TYPE_LABELS[lead.property_type as keyof typeof PROPERTY_TYPE_LABELS] ?? lead.property_type)
                : "—"}
            />
            <InfoRow
              icon={<Banknote size={15} />}
              label="Budget"
              value={
                lead.budget_min || lead.budget_max
                  ? `${lead.budget_min ? formatCurrency(lead.budget_min) : "?"} – ${lead.budget_max ? formatCurrency(lead.budget_max) : "?"}`
                  : "—"
              }
            />
            <InfoRow
              icon={<User size={15} />}
              label="Assigned To"
              value={lead.profiles?.full_name ?? "Unassigned"}
            />
          </Card>

          {/* Update status */}
          <Card padding="md">
            <CardHeader title="Update Status" />
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(([value, label]) => (
                <button
                  key={value}
                  disabled={statusUpdating || lead.status === value}
                  onClick={() => updateStatus(value)}
                  className={`
                    text-xs px-3 py-2 rounded-lg border font-medium transition-all
                    ${lead.status === value
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-ink-muted hover:border-primary hover:text-primary"
                    }
                    disabled:cursor-not-allowed disabled:opacity-60
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card padding="md">
              <CardHeader title="Lead Notes" />
              <p className="text-sm text-ink-muted leading-relaxed">{lead.notes}</p>
            </Card>
          )}
        </div>

        {/* Right columns — Follow-ups + Activity */}
        <div className="lg:col-span-2 space-y-5">

          {/* Follow-ups */}
          <Card padding="none">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-ink">Follow-ups</h3>
                <p className="text-sm text-ink-muted mt-0.5">
                  {followUps.length} scheduled
                </p>
              </div>
              <Button
                size="sm" icon={<Plus size={14} />}
                onClick={() => setFuOpen(true)}
              >
                Schedule
              </Button>
            </div>

            <div className="divide-y divide-border">
              {followUps.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-ink-muted">No follow-ups yet</p>
                  <Button
                    size="sm" variant="outline"
                    className="mt-3"
                    onClick={() => setFuOpen(true)}
                  >
                    Schedule first follow-up
                  </Button>
                </div>
              ) : (
                followUps.map((fu) => (
                  <div key={fu.id} className="px-5 py-4 flex items-start gap-4">
                    <div className={`
                      w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                      ${fu.status === "completed"
                        ? "bg-success-bg text-success"
                        : "bg-primary-50 text-primary"
                      }
                    `}>
                      {fu.status === "completed"
                        ? <CheckCircle size={16} />
                        : <Clock size={16} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink capitalize">
                          {fu.type.replace(/_/g, " ")}
                        </span>
                        <Badge variant={priorityVariant(fu.priority) as any}>
                          {fu.priority}
                        </Badge>
                        {fu.status === "completed" && (
                          <Badge variant="success">Completed</Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {formatDateTime(fu.scheduled_at)}
                        {fu.profiles?.full_name && ` · ${fu.profiles.full_name}`}
                      </p>
                      {fu.notes && (
                        <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                          {fu.notes}
                        </p>
                      )}
                    </div>
                    {fu.status !== "completed" && (
                      <button
                        onClick={() => markComplete(fu.id)}
                        className="text-xs text-success hover:underline shrink-0 mt-0.5"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Internal Notes */}
          <Card padding="none">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-ink">Internal Notes</h3>
                <p className="text-sm text-ink-muted mt-0.5">Team notes on this lead</p>
              </div>
              <Button
                size="sm" variant="outline"
                icon={<Plus size={14} />}
                onClick={() => setNoteOpen(true)}
              >
                Add Note
              </Button>
            </div>
            <div className="divide-y divide-border">
              {notes.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-10">
                  No notes yet
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="px-5 py-4 flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(note.profiles?.full_name ?? "?")
                        .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {note.profiles?.full_name ?? "Unknown"}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {timeAgo(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Schedule Follow-up Modal ── */}
      <Modal
        open={fuOpen}
        onClose={() => { setFuOpen(false); fuForm.reset(); setServerError(""); }}
        title="Schedule Follow-up"
        subtitle={`For ${lead.full_name}`}
        size="md"
      >
        <form onSubmit={fuForm.handleSubmit(onAddFollowUp)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Type <span className="text-danger">*</span></label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...fuForm.register("type")}
              >
                <option value="">Select...</option>
                {FOLLOW_UP_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
              {fuForm.formState.errors.type && (
                <p className="text-xs text-danger">{fuForm.formState.errors.type.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Priority <span className="text-danger">*</span></label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...fuForm.register("priority")}
              >
                <option value="">Select...</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              {fuForm.formState.errors.priority && (
                <p className="text-xs text-danger">{fuForm.formState.errors.priority.message}</p>
              )}
            </div>
          </div>

          <Input
            label="Date & Time"
            type="datetime-local"
            required
            error={fuForm.formState.errors.scheduled_at?.message}
            {...fuForm.register("scheduled_at")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes</label>
            <textarea
              rows={3}
              placeholder="What needs to be discussed?"
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
              {...fuForm.register("notes")}
            />
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => { setFuOpen(false); fuForm.reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={fuForm.formState.isSubmitting}>
              Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Note Modal ── */}
      <Modal
        open={noteOpen}
        onClose={() => { setNoteOpen(false); noteForm.reset(); setServerError(""); }}
        title="Add Note"
        subtitle={`Internal note for ${lead.full_name}`}
        size="sm"
      >
        <form onSubmit={noteForm.handleSubmit(onAddNote)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Note <span className="text-danger">*</span></label>
            <textarea
              rows={4}
              placeholder="Write your note here..."
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
              {...noteForm.register("content")}
            />
            {noteForm.formState.errors.content && (
              <p className="text-xs text-danger">{noteForm.formState.errors.content.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setNoteOpen(false); noteForm.reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={noteForm.formState.isSubmitting}>
              Save Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}