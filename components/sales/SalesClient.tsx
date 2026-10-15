// components/sales/SalesClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, TrendingUp, DollarSign, Target,
  CheckCircle, ArrowRight, Calendar,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { SALE_STAGE_LABELS } from "@/constants";

interface Sale {
  id: string; stage: string; sale_price: number | null;
  commission_rate: number | null; commission_amount: number | null;
  expected_close_date: string | null; actual_close_date: string | null;
  notes: string | null; created_at: string;
  leads?: { id: string; full_name: string; email: string; phone: string | null } | null;
  properties?: { id: string; title: string; city: string | null; price: number | null } | null;
  profiles?: { full_name: string } | null;
}
interface Lead     { id: string; full_name: string }
interface Property { id: string; title: string; price: number | null }
interface Staff    { id: string; full_name: string; role: string }

const saleSchema = z.object({
  lead_id:              z.string().min(1, "Select a lead"),
  property_id:          z.string().min(1, "Select a property"),
  stage:                z.string().min(1, "Select stage"),
  sale_price:           z.coerce.number().optional(),
  commission_rate:      z.coerce.number().optional(),
  expected_close_date:  z.string().optional(),
  assigned_to:          z.string().optional(),
  notes:                z.string().optional(),
});
type SaleForm = z.infer<typeof saleSchema>;

const STAGES = Object.entries(SALE_STAGE_LABELS);

const stageVariant = (s: string) => {
  if (s === "closed_won")  return "success";
  if (s === "closed_lost") return "danger";
  if (s === "negotiation") return "warning";
  if (s === "offer_made")  return "accent";
  return "info";
};

// Kanban column order
const KANBAN_STAGES = [
  "prospecting", "qualification", "site_visit",
  "offer_made", "negotiation", "closed_won",
];

export default function SalesClient({
  sales: initialSales,
  leads,
  properties,
  staff,
  currentUserId,
}: {
  sales: Sale[];
  leads: Lead[];
  properties: Property[];
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [sales, setSales]   = useState<Sale[]>(initialSales);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView]       = useState<"kanban" | "list">("kanban");
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition]  = useTransition();

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<SaleForm>({ resolver: zodResolver(saleSchema)  as any});

  const selectedPropertyId = watch("property_id");
  const selectedProperty   = properties.find((p) => p.id === selectedPropertyId);

  // ── Stats ────────────────────────────────────────────
  const closedWon   = sales.filter((s) => s.stage === "closed_won");
  const totalRev    = closedWon.reduce((sum, s) => sum + (s.sale_price ?? 0), 0);
  const totalComm   = closedWon.reduce((sum, s) => sum + (s.commission_amount ?? 0), 0);
  const inProgress  = sales.filter((s) => !["closed_won", "closed_lost"].includes(s.stage)).length;

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: SaleForm) => {
    setServerError("");
    const supabase = createClient() as any;

    const commAmount = data.sale_price && data.commission_rate
      ? (data.sale_price * data.commission_rate) / 100
      : null;

    const { data: inserted, error } = await supabase
      .from("sales")
      .insert({
        ...data,
        assigned_to:       data.assigned_to || currentUserId,
        commission_amount: commAmount,
      })
      .select(`
        id, stage, sale_price, commission_rate, commission_amount,
        expected_close_date, actual_close_date, notes, created_at,
        leads (id, full_name, email, phone),
        properties (id, title, city, price),
        profiles!sales_assigned_to_fkey (full_name)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setSales((prev) => [inserted as Sale, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Move stage ───────────────────────────────────────
  const moveStage = async (saleId: string, newStage: string) => {
    const supabase = createClient() as any;
    const updates: Record<string, unknown> = { stage: newStage };
    if (newStage === "closed_won") updates.actual_close_date = new Date().toISOString();
    const { error } = await supabase.from("sales").update(updates).eq("id", saleId);
    if (!error) {
      setSales((prev) =>
        prev.map((s) => s.id === saleId ? { ...s, ...updates } : s)
      );
      startTransition(() => router.refresh());
    }
  };

  // ── Kanban ───────────────────────────────────────────
  const KanbanColumn = ({ stage }: { stage: string }) => {
    const stageSales = sales.filter((s) => s.stage === stage);
    const label = SALE_STAGE_LABELS[stage as keyof typeof SALE_STAGE_LABELS] ?? stage;
    const totalValue = stageSales.reduce((sum, s) => sum + (s.sale_price ?? 0), 0);

    return (
      <div className="flex-1 min-w-[220px] max-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              {label}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              {stageSales.length} deal{stageSales.length !== 1 ? "s" : ""}
              {totalValue > 0 && ` · ${formatCurrency(totalValue)}`}
            </p>
          </div>
          <span className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs font-bold text-ink-muted">
            {stageSales.length}
          </span>
        </div>

        <div className="space-y-2">
          {stageSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-card border border-border rounded-xl p-3 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => router.push(`/leads/${sale.leads?.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink leading-tight">
                  {sale.leads?.full_name ?? "Unknown"}
                </p>
                <Badge variant={stageVariant(sale.stage) as any} className="shrink-0 text-[10px]">
                  {label}
                </Badge>
              </div>

              {sale.properties?.title && (
                <p className="text-xs text-ink-muted mt-1 truncate">
                  🏠 {sale.properties.title}
                </p>
              )}

              {sale.sale_price && (
                <p className="text-sm font-bold text-primary mt-2">
                  {formatCurrency(sale.sale_price)}
                </p>
              )}

              {sale.expected_close_date && (
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
                  <Calendar size={11} />
                  Close: {formatDate(sale.expected_close_date)}
                </p>
              )}

              {sale.profiles?.full_name && (
                <p className="text-xs text-ink-muted mt-1">
                  👤 {sale.profiles.full_name}
                </p>
              )}

              {/* Move stage buttons */}
              {stage !== "closed_won" && stage !== "closed_lost" && (
                <div className="flex gap-1 mt-2 pt-2 border-t border-border">
                  {KANBAN_STAGES.indexOf(stage) < KANBAN_STAGES.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStage = KANBAN_STAGES[KANBAN_STAGES.indexOf(stage) + 1];
                        moveStage(sale.id, nextStage);
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      Move forward <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {stageSales.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
              <p className="text-xs text-ink-muted">No deals</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sales Pipeline</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {sales.length} total deal{sales.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
              view === "kanban"
                ? "border-primary text-primary bg-primary-50"
                : "border-border text-ink-muted hover:text-ink"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
              view === "list"
                ? "border-primary text-primary bg-primary-50"
                : "border-border text-ink-muted hover:text-ink"
            }`}
          >
            List
          </button>
          <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
            New Deal
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="In Progress"
          value={inProgress}
          subtitle="Active deals"
          icon={<Target size={20} />}
          variant="primary"
        />
        <StatCard
          title="Closed Won"
          value={closedWon.length}
          subtitle="All time"
          icon={<CheckCircle size={20} />}
          variant="success"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRev)}
          subtitle="From closed deals"
          icon={<TrendingUp size={20} />}
          variant="accent"
        />
        <StatCard
          title="Commission"
          value={formatCurrency(totalComm)}
          subtitle="Total earned"
          icon={<DollarSign size={20} />}
        />
      </div>

      {/* Kanban / List */}
      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((stage) => (
            <KanbanColumn key={stage} stage={stage} />
          ))}
        </div>
      ) : (
        <Card padding="none">
          {sales.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp size={40} className="text-border mx-auto mb-3" />
              <p className="text-sm font-medium text-ink">No deals yet</p>
              <Button size="sm" className="mt-4" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                New Deal
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => router.push(`/leads/${sale.leads?.id}`)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-surface cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink">{sale.leads?.full_name ?? "—"}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {sale.properties?.title ?? "No property"} · {timeAgo(sale.created_at)}
                    </p>
                  </div>
                  <Badge variant={stageVariant(sale.stage) as any}>
                    {SALE_STAGE_LABELS[sale.stage as keyof typeof SALE_STAGE_LABELS] ?? sale.stage}
                  </Badge>
                  <p className="font-bold text-primary shrink-0">
                    {sale.sale_price ? formatCurrency(sale.sale_price) : "TBD"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* New Deal Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="New Deal"
        subtitle="Add a sale to the pipeline"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Lead <span className="text-danger">*</span></label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("lead_id")}
              >
                <option value="">Select lead...</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
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
                  <option key={p.id} value={p.id}>
                    {p.title}{p.price ? ` — ${formatCurrency(p.price)}` : ""}
                  </option>
                ))}
              </select>
              {errors.property_id && <p className="text-xs text-danger">{errors.property_id.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Stage <span className="text-danger">*</span></label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("stage")}
              >
                <option value="">Select stage...</option>
                {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {errors.stage && <p className="text-xs text-danger">{errors.stage.message}</p>}
            </div>

            <Input
              label="Sale Price (GHS)"
              type="number"
              placeholder={selectedProperty?.price?.toString() ?? "250000"}
              {...register("sale_price")}
            />

            <Input
              label="Commission Rate (%)"
              type="number"
              placeholder="5"
              {...register("commission_rate")}
            />

            <Input
              label="Expected Close Date"
              type="date"
              {...register("expected_close_date")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Assigned To</label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("assigned_to")}
              >
                <option value="">Assign to...</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Notes</label>
              <textarea
                rows={2}
                placeholder="Any notes about this deal..."
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
                {...register("notes")}
              />
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setAddOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Add Deal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}