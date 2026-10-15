// components/invoices/ReceiptsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Download, CreditCard } from "lucide-react";
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

interface ReceiptRecord {
  id: string; receipt_number: string; amount: number;
  notes: string | null; created_at: string;
  payments?: {
    id: string; method: string; payment_date: string;
    reference: string | null;
    sales?: {
      leads?: { full_name: string; email: string } | null;
      properties?: { title: string } | null;
    } | null;
  } | null;
  profiles?: { full_name: string } | null;
}

interface Payment {
  id: string; amount: number; payment_date: string;
  method: string; reference: string | null;
  sales?: {
    leads?: { full_name: string } | null;
    properties?: { title: string } | null;
  } | null;
}

const receiptSchema = z.object({
  payment_id: z.string().min(1, "Select a payment"),
  amount:     z.coerce.number().min(1, "Amount required"),
  notes:      z.string().optional(),
});
type ReceiptForm = z.infer<typeof receiptSchema>;

export default function ReceiptsClient({
  receipts: initialReceipts,
  payments,
  currentUserId,
}: {
  receipts: ReceiptRecord[];
  payments: Payment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(initialReceipts);
  const [addOpen, setAddOpen]   = useState(false);
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition]  = useTransition();

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<ReceiptForm>({ resolver: zodResolver(receiptSchema) as any });

  const selectedPaymentId = watch("payment_id");
  const selectedPayment   = payments.find((p) => p.id === selectedPaymentId);

  // ── Stats ────────────────────────────────────────────
  const totalIssued = receipts.reduce((s, r) => s + r.amount, 0);
  const thisMonth   = receipts.filter((r) => {
    const d = new Date(r.created_at);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: ReceiptForm) => {
    setServerError("");
    const supabase = createClient() as any;

    const { data: inserted, error } = await supabase
      .from("receipts")
      .insert({
        payment_id: data.payment_id,
        amount:     data.amount,
        notes:      data.notes ?? null,
        created_by: currentUserId,
      })
      .select(`
        id, receipt_number, amount, notes, created_at,
        payments (
          id, method, payment_date, reference,
          sales (
            leads (full_name, email),
            properties (title)
          )
        ),
        profiles!receipts_created_by_fkey (full_name)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setReceipts((prev) => [inserted as ReceiptRecord, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Columns ──────────────────────────────────────────
  const columns: Column<ReceiptRecord>[] = [
    {
      key: "receipt_number",
      header: "Receipt #",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-primary">
          {row.receipt_number}
        </span>
      ),
    },
    {
      key: "payments",
      header: "Client / Property",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">
            {row.payments?.sales?.leads?.full_name ?? "—"}
          </p>
          <p className="text-xs text-ink-muted truncate">
            {row.payments?.sales?.properties?.title ?? "—"}
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
          {row.payments?.method
            ? (PAYMENT_METHOD_LABELS[row.payments.method as keyof typeof PAYMENT_METHOD_LABELS] ?? row.payments.method)
            : "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Issued",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted">{timeAgo(row.created_at)}</span>
      ),
    },
    {
      key: "profiles",
      header: "Created By",
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {row.profiles?.full_name ?? "System"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Receipts</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {receipts.length} total receipt{receipts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          Issue Receipt
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Issued"
          value={formatCurrency(totalIssued)}
          subtitle="All receipts"
          icon={<Receipt size={20} />}
          variant="primary"
        />
        <StatCard
          title="This Month"
          value={thisMonth.length}
          subtitle={formatCurrency(thisMonth.reduce((s, r) => s + r.amount, 0))}
          icon={<Receipt size={20} />}
          variant="accent"
        />
        <StatCard
          title="Total Count"
          value={receipts.length}
          subtitle="All time"
          icon={<CreditCard size={20} />}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns as any}
        data={receipts as any}
        keyExtractor={(r: any) => r.id}
        searchable
        searchPlaceholder="Search by receipt number, client..."
        emptyTitle="No receipts yet"
        emptySubtitle="Issue a receipt for a completed payment."
        emptyAction={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Issue Receipt
          </Button>
        }
        actions={(row: any) => (
          <Button
            size="sm" variant="ghost"
            icon={<Download size={13} />}
            onClick={() => router.push(`/api/receipts/generate?id=${row.id}`)}
          >
            PDF
          </Button>
        )}
      />

      {/* Issue Receipt Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="Issue Receipt"
        subtitle="Generate a receipt for a completed payment"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">
              Payment <span className="text-danger">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              {...register("payment_id")}
            >
              <option value="">Select payment...</option>
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sales?.leads?.full_name ?? "Unknown"} —{" "}
                  {formatCurrency(p.amount)} on {formatDate(p.payment_date)}
                  {p.reference ? ` (${p.reference})` : ""}
                </option>
              ))}
            </select>
            {errors.payment_id && (
              <p className="text-xs text-danger">{errors.payment_id.message}</p>
            )}
          </div>

          {selectedPayment && (
            <div className="bg-surface rounded-lg px-4 py-3 text-sm space-y-1">
              <p className="text-ink-muted">
                Client: <span className="font-medium text-ink">
                  {selectedPayment.sales?.leads?.full_name ?? "—"}
                </span>
              </p>
              <p className="text-ink-muted">
                Property: <span className="font-medium text-ink">
                  {selectedPayment.sales?.properties?.title ?? "—"}
                </span>
              </p>
              <p className="text-ink-muted">
                Method: <span className="font-medium text-ink capitalize">
                  {selectedPayment.method.replace(/_/g, " ")}
                </span>
              </p>
            </div>
          )}

          <Input
            label="Amount (GHS)"
            type="number"
            placeholder={selectedPayment?.amount?.toString() ?? "50000"}
            required
            error={errors.amount?.message}
            {...register("amount")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional notes on this receipt..."
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
              Issue Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}