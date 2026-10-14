// components/leads/ClientsClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { Users, Phone, Mail, Home, Banknote } from "lucide-react";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import { formatCurrency, timeAgo, generateInitials } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, LEAD_SOURCE_LABELS } from "@/constants";

interface Client {
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

export default function ClientsClient({
  clients,
  currentUserId,
}: {
  clients: Client[];
  currentUserId: string;
}) {
  const router = useRouter();

  const columns: Column<Client>[] = [
    {
      key: "full_name",
      header: "Client",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {generateInitials(row.full_name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink truncate">{row.full_name}</p>
            <p className="text-xs text-ink-muted truncate flex items-center gap-1">
              <Mail size={11} /> {row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) =>
        row.phone ? (
          <span className="flex items-center gap-1.5 text-sm text-ink-muted">
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
      header: "Property",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Home size={13} />
          {row.property_type
            ? (PROPERTY_TYPE_LABELS[row.property_type as keyof typeof PROPERTY_TYPE_LABELS] ?? row.property_type)
            : "—"}
        </span>
      ),
    },
    {
      key: "budget_max",
      header: "Budget",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Banknote size={13} />
          {row.budget_max ? formatCurrency(row.budget_max) : "—"}
        </span>
      ),
    },
    {
      key: "assigned_to",
      header: "Handled By",
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {row.profiles?.full_name ?? "Unassigned"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Client Since",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-ink-muted">
          {timeAgo(row.created_at)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <Badge variant="success" dot>Won</Badge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Clients</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Converted leads — {clients.length} total client{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={clients.length}
          icon={<Users size={20} />}
        />
        <StatCard
          title="This Month"
          value={
            clients.filter((c) => {
              const d = new Date(c.created_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear();
            }).length
          }
          subtitle="New conversions"
          icon={<Users size={20} />}
          variant="primary"
        />
        <StatCard
          title="Avg. Budget"
          value={
            clients.length
              ? formatCurrency(
                  clients.reduce((s, c) => s + (c.budget_max ?? 0), 0) /
                    clients.filter((c) => c.budget_max).length || 0
                )
              : "GHS 0"
          }
          subtitle="Max budget"
          icon={<Banknote size={20} />}
        />
        <StatCard
          title="Top Interest"
          value={(() => {
            const counts: Record<string, number> = {};
            clients.forEach((c) => {
              if (c.property_type)
                counts[c.property_type] = (counts[c.property_type] ?? 0) + 1;
            });
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            return top
              ? (PROPERTY_TYPE_LABELS[top[0] as keyof typeof PROPERTY_TYPE_LABELS] ?? top[0])
              : "—";
          })()}
          subtitle="Most requested type"
          icon={<Home size={20} />}
          variant="accent"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns as any}
        data={clients as any}
        keyExtractor={(r: any) => r.id}
        searchable
        searchPlaceholder="Search clients by name, email..."
        onRowClick={(row: any) => router.push(`/leads/${row.id}`)}
        emptyTitle="No clients yet"
        emptySubtitle="Clients appear here when a lead is marked as Won."
      />
    </div>
  );
}