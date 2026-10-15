// components/projects/ProjectsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, FolderOpen, Clock, CheckCircle,
  AlertCircle, Banknote, MapPin, Calendar,
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
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_PROGRESS } from "@/constants";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  location: string | null;
  total_budget: number | null;
  total_spent: number | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface Staff { id: string; full_name: string; role: string }

const projectSchema = z.object({
  name:              z.string().min(2, "Name required"),
  description:       z.string().optional(),
  location:          z.string().optional(),
  status:            z.string().min(1, "Select status"),
  start_date:        z.string().optional(),
  expected_end_date: z.string().optional(),
  total_budget:      z.coerce.number().optional(),
  manager_id:        z.string().optional(),
});
type ProjectForm = z.infer<typeof projectSchema>;

const statusVariant = (s: string) => {
  if (s === "completed")  return "success";
  if (s === "cancelled")  return "danger";
  if (s === "in_progress") return "info";
  if (s === "on_hold")    return "warning";
  return "default";
};

const STATUSES = Object.entries(PROJECT_STATUS_LABELS);

export default function ProjectsClient({
  projects: initialProjects,
  staff,
  currentUserId,
}: {
  projects: Project[];
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [addOpen, setAddOpen]   = useState(false);
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ProjectForm>({ resolver: zodResolver(projectSchema)  as any });

  // ── Stats ────────────────────────────────────────────
  const active    = projects.filter((p) => p.status === "in_progress").length;
  const planning  = projects.filter((p) => p.status === "planning").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + (p.total_budget ?? 0), 0);

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: ProjectForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("projects")
      .insert({
        ...data,
        manager_id: data.manager_id || currentUserId,
        total_spent: 0,
      })
      .select(`
        id, name, description, status, start_date, expected_end_date,
        actual_end_date, location, total_budget, total_spent, created_at,
        profiles!projects_manager_id_fkey (full_name)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setProjects((prev) => [inserted as Project, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Columns ──────────────────────────────────────────
  const columns: Column<Project>[] = [
    {
      key: "name",
      header: "Project",
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">{row.name}</p>
          {row.location && (
            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {row.location}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <div className="space-y-1.5">
          <Badge variant={statusVariant(row.status) as any}>
            {PROJECT_STATUS_LABELS[row.status as keyof typeof PROJECT_STATUS_LABELS] ?? row.status}
          </Badge>
          <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${PROJECT_STATUS_PROGRESS[row.status as keyof typeof PROJECT_STATUS_PROGRESS] ?? 0}%`
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "total_budget",
      header: "Budget",
      render: (row) => (
        <div className="text-sm">
          <p className="text-ink font-medium">
            {row.total_budget ? formatCurrency(row.total_budget) : "—"}
          </p>
          {row.total_spent != null && row.total_budget != null && (
            <p className="text-xs text-ink-muted">
              Spent: {formatCurrency(row.total_spent)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "expected_end_date",
      header: "Timeline",
      render: (row) => (
        <div className="text-sm text-ink-muted">
          {row.start_date && (
            <p className="flex items-center gap-1">
              <Calendar size={11} /> {formatDate(row.start_date)}
            </p>
          )}
          {row.expected_end_date && (
            <p className="text-xs mt-0.5">→ {formatDate(row.expected_end_date)}</p>
          )}
        </div>
      ),
    },
    {
      key: "profiles",
      header: "Manager",
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {row.profiles?.full_name ?? "Unassigned"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
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
          <h1 className="text-2xl font-bold text-ink">Projects</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {projects.length} total project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="In Progress"
          value={active}
          subtitle="Active projects"
          icon={<FolderOpen size={20} />}
          variant="primary"
        />
        <StatCard
          title="Planning"
          value={planning}
          subtitle="Not yet started"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="Completed"
          value={completed}
          subtitle="All time"
          icon={<CheckCircle size={20} />}
          variant="success"
        />
        <StatCard
          title="Total Budget"
          value={formatCurrency(totalBudget)}
          subtitle="Across all projects"
          icon={<Banknote size={20} />}
          variant="accent"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns as any}
        data={projects as any}
        keyExtractor={(r: any) => r.id}
        searchable
        searchPlaceholder="Search projects..."
        onRowClick={(row: any) => router.push(`/projects/${row.id}`)}
        emptyTitle="No projects yet"
        emptySubtitle="Create your first project to get started."
        emptyAction={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            New Project
          </Button>
        }
      />

      {/* Add Project Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="New Project"
        subtitle="Create a new construction or development project"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Project Name"
                placeholder="e.g. Accra Heights Phase 2"
                required
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Description</label>
              <textarea
                rows={2}
                placeholder="Brief project description..."
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
                {...register("description")}
              />
            </div>

            <Input
              label="Location"
              placeholder="e.g. East Legon, Accra"
              error={errors.location?.message}
              {...register("location")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Status <span className="text-danger">*</span></label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("status")}
              >
                <option value="">Select status...</option>
                {STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.status && <p className="text-xs text-danger">{errors.status.message}</p>}
            </div>

            <Input
              label="Start Date"
              type="date"
              error={errors.start_date?.message}
              {...register("start_date")}
            />

            <Input
              label="Expected End Date"
              type="date"
              error={errors.expected_end_date?.message}
              {...register("expected_end_date")}
            />

            <Input
              label="Total Budget (GHS)"
              type="number"
              placeholder="500000"
              error={errors.total_budget?.message}
              {...register("total_budget")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Project Manager</label>
              <select
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("manager_id")}
              >
                <option value="">Assign manager...</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setAddOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}