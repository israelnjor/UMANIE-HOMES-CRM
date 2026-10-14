// components/leads/LeadsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Filter, Phone, Mail, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/constants";

// ── Types ──────────────────────────────────────────────
interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string;
  property_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  assigned_to: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

// ── Zod schema ─────────────────────────────────────────
const leadSchema = z.object({
  full_name:     z.string().min(2, "Name must be at least 2 characters"),
  email:         z.string().email("Invalid email address"),
  phone:         z.string().optional(),
  source:        z.string().min(1, "Please select a source"),
  property_type: z.string().optional(),
  budget_min:    z.coerce.number().optional(),
  budget_max:    z.coerce.number().optional(),
  notes:         z.string().optional(),
});

type LeadForm = z.infer<typeof leadSchema>;

// ── Badge helpers ──────────────────────────────────────
const statusVariant = (s: string) => {
  if (s === "won")        return "success";
  if (s === "lost")       return "danger";
  if (s === "new")        return "info";
  if (s === "negotiating") return "warning";
  if (s === "qualified")  return "accent";
  return "default";
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  ...Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];

// ── Component ──────────────────────────────────────────
export default function LeadsClient({
  initialLeads,
  currentUserId,
}: {
  initialLeads: Lead[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [leads, setLeads]       = useState<Lead[]>(initialLeads);
  const [addOpen, setAddOpen]   = useState(false);
  const [isPending, startTransition] = useTransition();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadForm>({ resolver: zodResolver(leadSchema) as any });

  // ── Filtered data ────────────────────────────────────
  const filtered = leads.filter((l) => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterSource && l.source !== filterSource) return false;
    return true;
  });

  // ── Submit new lead ──────────────────────────────────
  const onSubmit = async (data: LeadForm) => {
    setServerError("");
    const supabase = createClient() as any;

    const { data: inserted, error } = await supabase
      .from("leads")
      .insert({
        ...data,
        assigned_to: currentUserId,
        status: "new",
      })
      .select("*, profiles(full_name)")
      .single();

    if (error) {
      setServerError(error.message);
      return;
    }

    setLeads((prev) => [inserted as Lead, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Table columns ────────────────────────────────────
  const columns: Column<Lead>[] = [
    {
      key: "full_name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
            {row.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink truncate">{row.full_name}</p>
            <p className="text-xs text-ink-muted truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) =>
        row.phone ? (
          <span className="flex items-center gap-1.5 text-ink-muted text-sm">
            <Phone size={13} /> {row.phone}
          </span>
        ) : (
          <span className="text-ink-muted/40 text-sm">—</span>
        ),
    },
    {
      key: "source",
      header: "Source",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {LEAD_SOURCE_LABELS[row.source as keyof typeof LEAD_SOURCE_LABELS] ?? row.source}
        </span>
      ),
    },
    {
      key: "property_type",
      header: "Interest",
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {row.property_type
            ? (PROPERTY_TYPE_LABELS[row.property_type as keyof typeof PROPERTY_TYPE_LABELS] ?? row.property_type)
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={statusVariant(row.status) as any} dot>
          {LEAD_STATUS_LABELS[row.status as keyof typeof LEAD_STATUS_LABELS] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "assigned_to",
      header: "Assigned To",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-ink-muted">
          <UserCheck size={13} />
          {row.profiles?.full_name ?? "Unassigned"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Added",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted" title={formatDate(row.created_at)}>
          {timeAgo(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Leads</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {leads.length} total lead{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          Add Lead
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card padding="sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={15} className="text-ink-muted shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-ink outline-none focus:border-primary transition-colors"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-ink outline-none focus:border-primary transition-colors"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(filterStatus || filterSource) && (
            <button
              onClick={() => { setFilterStatus(""); setFilterSource(""); }}
              className="text-xs text-danger hover:underline"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-ink-muted">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      {/* ── Table ── */}
      <DataTable
        columns={columns as any}
        data={filtered as any}
        keyExtractor={(r) => (r as any).id}
        searchable
        searchPlaceholder="Search by name, email, phone..."
        onRowClick={(row: any) => router.push(`/leads/${row.id}`)}
        emptyTitle="No leads found"
        emptySubtitle="Add your first lead or adjust your filters."
        emptyAction={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Add Lead
          </Button>
        }
      />

      {/* ── Add Lead Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="Add New Lead"
        subtitle="Capture a new property enquiry"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Kwame Asante"
              required
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="kwame@example.com"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+233 XX XXX XXXX"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Lead Source <span className="text-danger">*</span></label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("source")}
              >
                <option value="">Select source...</option>
                {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.source && <p className="text-xs text-danger">{errors.source.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Property Interest</label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("property_type")}
              >
                <option value="">Select type...</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <Input
              label="Budget Min (GHS)"
              type="number"
              placeholder="50000"
              error={errors.budget_min?.message}
              {...register("budget_min")}
            />
            <Input
              label="Budget Max (GHS)"
              type="number"
              placeholder="200000"
              error={errors.budget_max?.message}
              {...register("budget_max")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes</label>
            <textarea
              rows={3}
              placeholder="Any additional notes about this lead..."
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
              {...register("notes")}
            />
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setAddOpen(false); reset(); setServerError(""); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}