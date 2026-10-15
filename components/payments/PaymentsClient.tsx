// components/payments/PaymentsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Banknote, CheckCircle,
  Clock, XCircle, CreditCard,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/constants";

interface Payment {
  id: string; amount: number; status: string;
  method: string; payment_date: string;
  reference: string | null; notes: string | null;
  created_at: string;
  sales?: {
    id: string;
    leads?: { full_name: string } | null;
    properties?: { title: string } | null;
  } | null;
  profiles?: { full_name: string } | null;
}

interface Sale {
  id: string;
  sale_price: number | null;
  leads?: { full_name: string } | null;
  properties?: { title: string } | null;
}

const paymentSchema = z.object({
  sale_id:      z.string().min(1, "Select a sale"),
  amount:       z.coerce.number().min(1, "Amount required"),
  method:       z.string().min(1, "Select method"),
  payment_date: z.string().min(1, "Date required"),
  reference:    z.string().optional(),
  notes:        z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

const STATUS_FILTERS = ["all", "completed", "pending", "failed", "refunded"];

const statusVariant = (s: string) => {
  if (s === "completed") return "success";
  if (s === "failed")    return "danger";
  if (s === "refunded")  return "warning";
  return "default";
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle size={15} className="text-success" />;
  if (status === "failed")    return <XCircle size={15} className="text-danger" />;
  return <Clock size={15} className="text-ink-muted" />;
};

export default function PaymentsClient({
  payments: initialPayments,
  sales,
  currentUserId,
}: {
  payments: Payment[];
  sales: Sale[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [addOpen, setAddOpen]   = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serverError, setServerError]   = useState("");
  const [isPending, startTransition]    = useTransition();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) as any});

  // ── Stats ────────────────────────────────────────────
  const completed = payments.filter((p) => p.status === "completed");
  const pending   = payments.filter((p) => p.status === "pending");
  const totalIn   = completed.reduce((s, p) => s + p.amount, 0);
  const pendingAmt= pending.reduce((s, p) => s + p.amount, 0);

  // ── Filter ───────────────────────────────────────────
  const filtered = payments.filter((p) =>
    statusFilter === "all" ? true : p.status === statusFilter
  );

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: PaymentForm) => {
    setServerError("");
    const supabase = createClient() as any;

    const { data: inserted, error } = await supabase
      .from("payments")
      .insert({
        ...data,
        status:      "completed",
        recorded_by: currentUserId,
      })
      .select(`
        id, amount, status, method, payment_date,
        reference, notes, created_at,
        sales (
          id,
          leads (full_name),
          properties (title)
        ),
        profiles!payments_recorded_by_fkey (full_name)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setPayments((prev) => [inserted as Payment, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Columns ──────────────────────────────────────────
  const columns: Column<Payment>[] = [
    {
      key: "sales",
      header: "Client / Property",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">
            {row.sales?.leads?.full_name ?? "—"}
          </p>
          <p className="text-xs text-ink-muted truncate">
            {row.sales?.properties?.title ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (row) => (
        <p className="font-bold text-ink">{formatCurrency(row.amount)}</p>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-ink-muted">
          <CreditCard size={13} />
          {PAYMENT_METHOD_LABELS[row.method as keyof typeof PAYMENT_METHOD_LABELS] ?? row.method}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-1.5">
          <StatusIcon status={row.status} />
          <Badge variant={statusVariant(row.status) as any}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        </span>
      ),
    },
    {
      key: "payment_date",
      header: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted">{formatDate(row.payment_date)}</span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (row) => (
        <span className="text-sm text-ink-muted font-mono">
          {row.reference ?? "—"}
        </span>
      ),
    },
    {
      key: "profiles",
      header: "Recorded By",
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {row.profiles?.full_name ?? "System"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Added",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted">{timeAgo(row.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Payments</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {payments.length} total transaction{payments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          Record Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Received"
          value={formatCurrency(totalIn)}
          subtitle={`${completed.length} payments`}
          icon={<Banknote size={20} />}
          variant="success"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(pendingAmt)}
          subtitle={`${pending.length} awaiting`}
          icon={<Clock size={20} />}
          variant={pending.length > 0 ? "warning" : "default"}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(
            completed
              .filter((p) => {
                const d = new Date(p.payment_date);
                const n = new Date();
                return d.getMonth() === n.getMonth() &&
                  d.getFullYear() === n.getFullYear();
              })
              .reduce((s, p) => s + p.amount, 0)
          )}
          subtitle="Revenue this month"
          icon={<Banknote size={20} />}
          variant="primary"
        />
        <StatCard
          title="Transactions"
          value={payments.length}
          subtitle="All time"
          icon={<CreditCard size={20} />}
          variant="accent"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border">
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

      {/* Table */}
      <DataTable
        columns={columns as any}
        data={filtered as any}
        keyExtractor={(r: any) => r.id}
        searchable
        searchPlaceholder="Search by client, reference..."
        emptyTitle="No payments found"
        emptySubtitle="Record a payment to get started."
        emptyAction={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Record Payment
          </Button>
        }
      />

      {/* Record Payment Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="Record Payment"
        subtitle="Log a payment received from a client"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">
              Sale / Deal <span className="text-danger">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              {...register("sale_id")}
            >
              <option value="">Select sale...</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.leads?.full_name ?? "Unknown"} —{" "}
                  {s.properties?.title ?? "No property"}
                  {s.sale_price ? ` (${formatCurrency(s.sale_price)})` : ""}
                </option>
              ))}
            </select>
            {errors.sale_id && (
              <p className="text-xs text-danger">{errors.sale_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (GHS)"
              type="number"
              placeholder="50000"
              required
              error={errors.amount?.message}
              {...register("amount")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">
                Method <span className="text-danger">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("method")}
              >
                <option value="">Select method...</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.method && (
                <p className="text-xs text-danger">{errors.method.message}</p>
              )}
            </div>

            <Input
              label="Payment Date"
              type="date"
              required
              error={errors.payment_date?.message}
              {...register("payment_date")}
            />

            <Input
              label="Reference / Receipt No."
              placeholder="TXN-001234"
              {...register("reference")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
              {...register("notes")}
            />
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button" variant="outline"
              onClick={() => { setAddOpen(false); reset(); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}