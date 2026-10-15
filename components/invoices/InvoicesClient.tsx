// components/invoices/InvoicesClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, FileText, CheckCircle,
  Clock, AlertCircle, Download, Send,
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

interface Invoice {
  id: string; invoice_number: string; amount: number;
  status: string; due_date: string | null; issued_date: string;
  notes: string | null; created_at: string;
  sales?: {
    id: string;
    leads?: { full_name: string; email: string; phone: string | null } | null;
    properties?: { title: string } | null;
  } | null;
  profiles?: { full_name: string } | null;
}

interface Sale {
  id: string; sale_price: number | null;
  leads?: { full_name: string } | null;
  properties?: { title: string } | null;
}

const invoiceSchema = z.object({
  sale_id:     z.string().min(1, "Select a sale"),
  amount:      z.coerce.number().min(1, "Amount required"),
  issued_date: z.string().min(1, "Issued date required"),
  due_date:    z.string().optional(),
  notes:       z.string().optional(),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

const STATUS_FILTERS = ["all", "draft", "sent", "paid", "overdue", "cancelled"];

const statusVariant = (s: string) => {
  if (s === "paid")      return "success";
  if (s === "overdue")   return "danger";
  if (s === "sent")      return "info";
  if (s === "cancelled") return "default";
  return "default";
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "paid")    return <CheckCircle size={14} className="text-success" />;
  if (status === "overdue") return <AlertCircle size={14} className="text-danger" />;
  return <Clock size={14} className="text-ink-muted" />;
};

export default function InvoicesClient({
  invoices: initialInvoices,
  sales,
  currentUserId,
}: {
  invoices: Invoice[];
  sales: Sale[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [addOpen, setAddOpen]   = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serverError, setServerError]   = useState("");
  const [isPending, startTransition]    = useTransition();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InvoiceForm>({ resolver: zodResolver(invoiceSchema) as any });

  // ── Stats ────────────────────────────────────────────
  const paid     = invoices.filter((i) => i.status === "paid");
  const overdue  = invoices.filter((i) => i.status === "overdue");
  const sent     = invoices.filter((i) => i.status === "sent");
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);
  const totalDue  = sent.reduce((s, i) => s + i.amount, 0);

  // ── Filter ───────────────────────────────────────────
  const filtered = invoices.filter((i) =>
    statusFilter === "all" ? true : i.status === statusFilter
  );

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: InvoiceForm) => {
    setServerError("");
    const supabase = createClient() as any;

    const { data: inserted, error } = await supabase
      .from("invoices")
      .insert({
        ...data,
        status:     "draft",
        created_by: currentUserId,
      })
      .select(`
        id, invoice_number, amount, status, due_date,
        issued_date, notes, created_at,
        sales (
          id,
          leads (full_name, email, phone),
          properties (title)
        ),
        profiles!invoices_created_by_fkey (full_name)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setInvoices((prev) => [inserted as Invoice, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Mark paid ─────────────────────────────────────────
  const markPaid = async (invoiceId: string) => {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", invoiceId);
    if (!error) {
      setInvoices((prev) =>
        prev.map((i) => i.id === invoiceId ? { ...i, status: "paid" } : i)
      );
      startTransition(() => router.refresh());
    }
  };

  // ── Columns ──────────────────────────────────────────
  const columns: Column<Invoice>[] = [
    {
      key: "invoice_number",
      header: "Invoice #",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-primary">
          {row.invoice_number}
        </span>
      ),
    },
    {
      key: "sales",
      header: "Client",
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
      key: "issued_date",
      header: "Issued",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted">{formatDate(row.issued_date)}</span>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      render: (row) => (
        <span className={`text-sm ${
          row.status === "overdue" ? "text-danger font-medium" : "text-ink-muted"
        }`}>
          {row.due_date ? formatDate(row.due_date) : "—"}
        </span>
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
          <h1 className="text-2xl font-bold text-ink">Invoices</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {invoices.length} total invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          subtitle={`${paid.length} invoice${paid.length !== 1 ? "s" : ""}`}
          icon={<CheckCircle size={20} />}
          variant="success"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(totalDue)}
          subtitle={`${sent.length} sent`}
          icon={<Clock size={20} />}
          variant="warning"
        />
        <StatCard
          title="Overdue"
          value={overdue.length}
          subtitle="Need follow-up"
          icon={<AlertCircle size={20} />}
          variant={overdue.length > 0 ? "danger" : "default"}
        />
        <StatCard
          title="Total Invoices"
          value={invoices.length}
          subtitle="All time"
          icon={<FileText size={20} />}
          variant="primary"
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
            {f === "overdue" && overdue.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-danger text-white rounded-full">
                {overdue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns as any}
        data={filtered as any}
        keyExtractor={(r: any) => r.id}
        searchable
        searchPlaceholder="Search by invoice number, client..."
        emptyTitle="No invoices found"
        emptySubtitle="Create your first invoice to get started."
        emptyAction={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            New Invoice
          </Button>
        }
        actions={(row: any) => (
          <div className="flex items-center gap-1 justify-end">
            {row.status !== "paid" && row.status !== "cancelled" && (
              <Button
                size="sm" variant="ghost"
                icon={<CheckCircle size={13} />}
                onClick={() => markPaid(row.id)}
              >
                Mark Paid
              </Button>
            )}
            <Button
              size="sm" variant="ghost"
              icon={<Download size={13} />}
              onClick={() => router.push(`/api/invoices/generate?id=${row.id}`)}
            >
              PDF
            </Button>
          </div>
        )}
      />

      {/* New Invoice Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="New Invoice"
        subtitle="Generate an invoice for a sale"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">
              Sale <span className="text-danger">*</span>
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
            <Input
              label="Issued Date"
              type="date"
              required
              error={errors.issued_date?.message}
              {...register("issued_date")}
            />
            <Input
              label="Due Date"
              type="date"
              {...register("due_date")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Notes</label>
            <textarea
              rows={2}
              placeholder="Payment terms, additional notes..."
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
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}