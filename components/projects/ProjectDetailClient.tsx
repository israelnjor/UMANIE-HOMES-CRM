// components/projects/ProjectDetailClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Calendar, Banknote,
  Package, Users, Receipt, Plus, Edit2,
  TrendingUp, AlertCircle,
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
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_PROGRESS } from "@/constants";

// ── Types ──────────────────────────────────────────────
interface Project {
  id: string; name: string; description: string | null;
  status: string; start_date: string | null;
  expected_end_date: string | null; actual_end_date: string | null;
  location: string | null; total_budget: number | null;
  total_spent: number | null; created_at: string;
  profiles?: { id: string; full_name: string } | null;
}
interface InventoryItem {
  id: string; name: string; category: string | null;
  unit: string; quantity_in: number; quantity_used: number;
  quantity_remaining: number; unit_cost: number | null;
  low_stock_threshold: number | null; created_at: string;
}
interface LabourPayment {
  id: string; worker_name: string; role: string | null;
  amount: number; payment_date: string; notes: string | null;
  profiles?: { full_name: string } | null;
}
interface ProjectExpense {
  id: string; category: string; description: string;
  amount: number; expense_date: string; vendor: string | null;
  profiles?: { full_name: string } | null;
}
interface Staff { id: string; full_name: string; role: string }

// ── Schemas ────────────────────────────────────────────
const inventorySchema = z.object({
  name:         z.string().min(1, "Name required"),
  category:     z.string().optional(),
  unit:         z.string().min(1, "Unit required"),
  quantity_in:  z.coerce.number().min(0),
  unit_cost:    z.coerce.number().optional(),
  low_stock_threshold: z.coerce.number().optional(),
});
const labourSchema = z.object({
  worker_name:  z.string().min(1, "Name required"),
  role:         z.string().optional(),
  amount:       z.coerce.number().min(1, "Amount required"),
  payment_date: z.string().min(1, "Date required"),
  notes:        z.string().optional(),
});
const expenseSchema = z.object({
  category:     z.string().min(1, "Category required"),
  description:  z.string().min(1, "Description required"),
  amount:       z.coerce.number().min(1, "Amount required"),
  expense_date: z.string().min(1, "Date required"),
  vendor:       z.string().optional(),
});

type InventoryForm = z.infer<typeof inventorySchema>;
type LabourForm    = z.infer<typeof labourSchema>;
type ExpenseForm   = z.infer<typeof expenseSchema>;

const TABS = ["overview", "inventory", "labour", "expenses"] as const;
type Tab = typeof TABS[number];

const EXPENSE_CATEGORIES = [
  "materials", "equipment", "transport", "utilities",
  "professional_fees", "permits", "maintenance", "other",
];
const INVENTORY_CATEGORIES = [
  "cement", "steel", "wood", "electrical", "plumbing",
  "finishing", "equipment", "safety", "other",
];

const statusVariant = (s: string) => {
  if (s === "completed")   return "success";
  if (s === "cancelled")   return "danger";
  if (s === "in_progress") return "info";
  if (s === "on_hold")     return "warning";
  return "default";
};

export default function ProjectDetailClient({
  project: initialProject,
  inventory: initialInventory,
  labour: initialLabour,
  expenses: initialExpenses,
  staff,
  currentUserId,
}: {
  project: Project;
  inventory: InventoryItem[];
  labour: LabourPayment[];
  expenses: ProjectExpense[];
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [project, setProject]     = useState<Project>(initialProject);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [labour, setLabour]       = useState<LabourPayment[]>(initialLabour);
  const [expenses, setExpenses]   = useState<ProjectExpense[]>(initialExpenses);
  const [tab, setTab]             = useState<Tab>("overview");
  const [invOpen, setInvOpen]     = useState(false);
  const [labOpen, setLabOpen]     = useState(false);
  const [expOpen, setExpOpen]     = useState(false);
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const invForm  = useForm<InventoryForm>({ resolver: zodResolver(inventorySchema) });
  const labForm  = useForm<LabourForm>({ resolver: zodResolver(labourSchema) });
  const expForm  = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema) });

  // ── Budget calc ──────────────────────────────────────
  const budgetUsed    = project.total_spent ?? 0;
  const budgetTotal   = project.total_budget ?? 0;
  const budgetPct     = budgetTotal > 0 ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : 0;
  const budgetWarning = budgetPct >= 80;
  const progress      = PROJECT_STATUS_PROGRESS[project.status as keyof typeof PROJECT_STATUS_PROGRESS] ?? 0;

  // ── Add inventory ────────────────────────────────────
  const onAddInventory = async (data: InventoryForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("inventory_items")
      .insert({
        ...data,
        project_id:         project.id,
        quantity_used:      0,
        quantity_remaining: data.quantity_in,
      })
      .select("*")
      .single();
    if (error) { setServerError(error.message); return; }
    setInventory((prev) => [inserted, ...prev]);
    invForm.reset();
    setInvOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Add labour ───────────────────────────────────────
  const onAddLabour = async (data: LabourForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("labour_payments")
      .insert({
        ...data,
        project_id:  project.id,
        recorded_by: currentUserId,
      })
      .select(`*, profiles!labour_payments_recorded_by_fkey (full_name)`)
      .single();
    if (error) { setServerError(error.message); return; }
    setLabour((prev) => [inserted, ...prev]);
    setProject((p) => ({ ...p, total_spent: (p.total_spent ?? 0) + data.amount }));
    labForm.reset();
    setLabOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Add expense ──────────────────────────────────────
  const onAddExpense = async (data: ExpenseForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("project_expenses")
      .insert({
        ...data,
        project_id:  project.id,
        recorded_by: currentUserId,
      })
      .select(`*, profiles!project_expenses_recorded_by_fkey (full_name)`)
      .single();
    if (error) { setServerError(error.message); return; }
    setExpenses((prev) => [inserted, ...prev]);
    setProject((p) => ({ ...p, total_spent: (p.total_spent ?? 0) + data.amount }));
    expForm.reset();
    setExpOpen(false);
    startTransition(() => router.refresh());
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => router.push("/projects")}
          className="text-ink-muted hover:text-ink transition-colors mt-1"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{project.name}</h1>
            <Badge variant={statusVariant(project.status) as any}>
              {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] ?? project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-ink-muted">
            {project.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {project.location}
              </span>
            )}
            {project.profiles?.full_name && (
              <span className="flex items-center gap-1">
                <Users size={13} /> {project.profiles.full_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            icon={<Receipt size={14} />}
            onClick={() => setExpOpen(true)}
          >
            Add Expense
          </Button>
          <Button
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setInvOpen(true)}
          >
            Add Stock
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t
                ? "border-primary text-primary"
                : "border-transparent text-ink-muted hover:text-ink"
              }
            `}
          >
            {t}
            {t === "inventory" && (
              <span className="ml-1.5 text-xs text-ink-muted">({inventory.length})</span>
            )}
            {t === "labour" && (
              <span className="ml-1.5 text-xs text-ink-muted">({labour.length})</span>
            )}
            {t === "expenses" && (
              <span className="ml-1.5 text-xs text-ink-muted">({expenses.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Budget"
              value={formatCurrency(budgetTotal)}
              icon={<Banknote size={20} />}
              variant="primary"
            />
            <StatCard
              title="Total Spent"
              value={formatCurrency(budgetUsed)}
              subtitle={`${budgetPct}% of budget`}
              icon={<TrendingUp size={20} />}
              variant={budgetWarning ? "danger" : "default"}
            />
            <StatCard
              title="Remaining"
              value={formatCurrency(budgetTotal - budgetUsed)}
              icon={<Banknote size={20} />}
              variant={budgetWarning ? "warning" : "success"}
            />
            <StatCard
              title="Progress"
              value={`${progress}%`}
              subtitle={PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
              icon={<TrendingUp size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Budget bar */}
            <Card padding="md">
              <CardHeader title="Budget Usage" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Spent</span>
                  <span className={`font-medium ${budgetWarning ? "text-danger" : "text-ink"}`}>
                    {budgetPct}%
                  </span>
                </div>
                <div className="w-full h-3 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPct >= 100 ? "bg-danger" :
                      budgetPct >= 80  ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
                {budgetWarning && (
                  <p className="text-xs text-danger flex items-center gap-1">
                    <AlertCircle size={12} />
                    Budget {budgetPct >= 100 ? "exceeded" : "nearly exhausted"}
                  </p>
                )}
              </div>
            </Card>

            {/* Project info */}
            <Card padding="md">
              <CardHeader title="Project Details" />
              <div className="space-y-2 text-sm">
                {project.description && (
                  <p className="text-ink-muted leading-relaxed">{project.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="text-xs text-ink-muted">Start Date</p>
                    <p className="font-medium text-ink mt-0.5">
                      {project.start_date ? formatDate(project.start_date) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Expected End</p>
                    <p className="font-medium text-ink mt-0.5">
                      {project.expected_end_date ? formatDate(project.expected_end_date) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Manager</p>
                    <p className="font-medium text-ink mt-0.5">
                      {project.profiles?.full_name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Created</p>
                    <p className="font-medium text-ink mt-0.5">
                      {timeAgo(project.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Inventory Tab ── */}
      {tab === "inventory" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setInvOpen(true)}>
              Add Stock
            </Button>
          </div>
          {inventory.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-10">
                <Package size={36} className="text-ink-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-ink">No inventory yet</p>
                <Button size="sm" className="mt-4" onClick={() => setInvOpen(true)}>
                  Add first item
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map((item) => {
                const lowStock = item.low_stock_threshold != null &&
                  item.quantity_remaining <= item.low_stock_threshold;
                return (
                  <Card key={item.id} padding="md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink truncate">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-ink-muted capitalize mt-0.5">{item.category}</p>
                        )}
                      </div>
                      {lowStock && <Badge variant="danger" dot>Low</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-center">
                      <div>
                        <p className="text-lg font-bold text-ink">{item.quantity_in}</p>
                        <p className="text-xs text-ink-muted">In</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-warning">{item.quantity_used}</p>
                        <p className="text-xs text-ink-muted">Used</p>
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${lowStock ? "text-danger" : "text-success"}`}>
                          {item.quantity_remaining}
                        </p>
                        <p className="text-xs text-ink-muted">Left</p>
                      </div>
                    </div>
                    {item.unit_cost && (
                      <p className="text-xs text-ink-muted mt-2">
                        {formatCurrency(item.unit_cost)} / {item.unit}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Labour Tab ── */}
      {tab === "labour" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              Total: <span className="font-semibold text-ink">
                {formatCurrency(labour.reduce((s, l) => s + l.amount, 0))}
              </span>
            </p>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setLabOpen(true)}>
              Add Payment
            </Button>
          </div>
          {labour.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-10">
                <Users size={36} className="text-ink-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-ink">No labour payments yet</p>
                <Button size="sm" className="mt-4" onClick={() => setLabOpen(true)}>
                  Record payment
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-border">
                {labour.map((l) => (
                  <div key={l.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {l.worker_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{l.worker_name}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {l.role ?? "Worker"} · {formatDate(l.payment_date)}
                        {l.profiles?.full_name && ` · Recorded by ${l.profiles.full_name}`}
                      </p>
                      {l.notes && <p className="text-xs text-ink-muted mt-1">{l.notes}</p>}
                    </div>
                    <p className="font-semibold text-ink shrink-0">
                      {formatCurrency(l.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Expenses Tab ── */}
      {tab === "expenses" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              Total: <span className="font-semibold text-ink">
                {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
              </span>
            </p>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setExpOpen(true)}>
              Add Expense
            </Button>
          </div>
          {expenses.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-10">
                <Receipt size={36} className="text-ink-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-ink">No expenses recorded</p>
                <Button size="sm" className="mt-4" onClick={() => setExpOpen(true)}>
                  Add expense
                </Button>
              </div>
            </Card>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-border">
                {expenses.map((e) => (
                  <div key={e.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-warning-bg flex items-center justify-center shrink-0">
                      <Receipt size={16} className="text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{e.description}</p>
                      <p className="text-xs text-ink-muted mt-0.5 capitalize">
                        {e.category.replace(/_/g, " ")} · {formatDate(e.expense_date)}
                        {e.vendor && ` · ${e.vendor}`}
                      </p>
                    </div>
                    <p className="font-semibold text-ink shrink-0">
                      {formatCurrency(e.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Add Inventory Modal ── */}
      <Modal
        open={invOpen}
        onClose={() => { setInvOpen(false); invForm.reset(); setServerError(""); }}
        title="Add Inventory Item"
        subtitle="Record new stock for this project"
        size="md"
      >
        <form onSubmit={invForm.handleSubmit(onAddInventory)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Item Name" placeholder="e.g. Portland Cement" required
                error={invForm.formState.errors.name?.message}
                {...invForm.register("name")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Category</label>
              <select className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...invForm.register("category")}>
                <option value="">Select...</option>
                {INVENTORY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <Input label="Unit" placeholder="e.g. bags, tonnes, m²" required
              error={invForm.formState.errors.unit?.message}
              {...invForm.register("unit")} />
            <Input label="Quantity" type="number" placeholder="100" required
              error={invForm.formState.errors.quantity_in?.message}
              {...invForm.register("quantity_in")} />
            <Input label="Unit Cost (GHS)" type="number" placeholder="45"
              error={invForm.formState.errors.unit_cost?.message}
              {...invForm.register("unit_cost")} />
            <Input label="Low Stock Threshold" type="number" placeholder="10"
              {...invForm.register("low_stock_threshold")} />
          </div>
          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setInvOpen(false)}>Cancel</Button>
            <Button type="submit" loading={invForm.formState.isSubmitting}>Add Stock</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Labour Modal ── */}
      <Modal
        open={labOpen}
        onClose={() => { setLabOpen(false); labForm.reset(); setServerError(""); }}
        title="Record Labour Payment"
        subtitle="Log a worker payment for this project"
        size="md"
      >
        <form onSubmit={labForm.handleSubmit(onAddLabour)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Worker Name" placeholder="e.g. Kofi Mensah" required
              error={labForm.formState.errors.worker_name?.message}
              {...labForm.register("worker_name")} />
            <Input label="Role" placeholder="e.g. Mason, Carpenter"
              {...labForm.register("role")} />
            <Input label="Amount (GHS)" type="number" placeholder="500" required
              error={labForm.formState.errors.amount?.message}
              {...labForm.register("amount")} />
            <Input label="Payment Date" type="date" required
              error={labForm.formState.errors.payment_date?.message}
              {...labForm.register("payment_date")} />
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Notes</label>
              <textarea rows={2} placeholder="Optional notes..."
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
                {...labForm.register("notes")} />
            </div>
          </div>
          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setLabOpen(false)}>Cancel</Button>
            <Button type="submit" loading={labForm.formState.isSubmitting}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Expense Modal ── */}
      <Modal
        open={expOpen}
        onClose={() => { setExpOpen(false); expForm.reset(); setServerError(""); }}
        title="Add Project Expense"
        subtitle="Record a project cost or purchase"
        size="md"
      >
        <form onSubmit={expForm.handleSubmit(onAddExpense)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Category <span className="text-danger">*</span></label>
              <select className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...expForm.register("category")}>
                <option value="">Select...</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
              {expForm.formState.errors.category && (
                <p className="text-xs text-danger">{expForm.formState.errors.category.message}</p>
              )}
            </div>
            <Input label="Vendor / Supplier" placeholder="e.g. Buildmart Ghana"
              {...expForm.register("vendor")} />
            <div className="col-span-2">
              <Input label="Description" placeholder="What was this expense for?" required
                error={expForm.formState.errors.description?.message}
                {...expForm.register("description")} />
            </div>
            <Input label="Amount (GHS)" type="number" placeholder="1200" required
              error={expForm.formState.errors.amount?.message}
              {...expForm.register("amount")} />
            <Input label="Date" type="date" required
              error={expForm.formState.errors.expense_date?.message}
              {...expForm.register("expense_date")} />
          </div>
          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setExpOpen(false)}>Cancel</Button>
            <Button type="submit" loading={expForm.formState.isSubmitting}>Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}