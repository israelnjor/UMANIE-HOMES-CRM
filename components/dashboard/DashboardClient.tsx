// components/dashboard/DashboardClient.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FolderOpen, Home, Banknote, Plus,
  Calendar, ArrowRight, Clock, Phone, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, timeAgo, generateInitials } from "@/lib/utils";
import { LEAD_STATUS_LABELS, BRAND } from "@/constants";

interface DashboardStats {
  totalLeads: number;
  newLeadsThisMonth: number;
  leadsGrowth: number;
  activeProjects: number;
  availableProperties: number;
  totalProperties: number;
  monthlyRevenue: number;
  pendingPaymentsCount: number;
}

interface LeadStatusCount { status: string; count: number }
interface RecentLead {
  id: string; full_name: string; email: string;
  phone: string | null; status: string; source: string; created_at: string;
}
interface UpcomingFollowUp {
  id: string; type: string; scheduled_at: string;
  notes: string | null; leads: { full_name: string } | null;
}
interface ActivityItem {
  id: string; action: string; entity_type: string;
  description: string | null; created_at: string;
  profiles: { full_name: string } | null;
}

interface Props {
  userName: string;
  stats: DashboardStats;
  leadsByStatus: LeadStatusCount[];
  recentLeads: RecentLead[];
  upcomingFollowUps: UpcomingFollowUp[];
  recentActivity: ActivityItem[];
}

const STATUS_COLORS: Record<string, string> = {
  new: "#2563EB",
  contacted: "#7C3AED",
  qualified: "#C9A84C",
  negotiating: "#D97706",
  won: "#16A34A",
  lost: "#DC2626",
  on_hold: "#6B7280",
};

export default function DashboardClient({
  userName, stats, leadsByStatus,
  recentLeads, upcomingFollowUps, recentActivity,
}: Props) {
  const router = useRouter();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const chartData = leadsByStatus.map((l) => ({
    name: LEAD_STATUS_LABELS[l.status as keyof typeof LEAD_STATUS_LABELS] ?? l.status,
    count: l.count,
    status: l.status,
  }));

  const leadBadgeVariant = (status: string) => {
    if (status === "won") return "success";
    if (status === "lost") return "danger";
    if (status === "new") return "info";
    if (status === "negotiating") return "warning";
    return "default";
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {greeting}, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long", year: "numeric",
              month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            icon={<Calendar size={15} />}
            onClick={() => router.push("/follow-ups")}
          >
            Schedule Follow-up
          </Button>
          <Button
            size="sm" icon={<Plus size={15} />}
            onClick={() => router.push("/leads")}
          >
            Add Lead
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          subtitle={`${stats.newLeadsThisMonth} new this month`}
          trend={{ value: stats.leadsGrowth, label: "vs last month" }}
          icon={<Users size={20} />}
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          subtitle="Currently in progress"
          icon={<FolderOpen size={20} />}
          variant="primary"
        />
        <StatCard
          title="Available Properties"
          value={stats.availableProperties}
          subtitle={`of ${stats.totalProperties} total`}
          icon={<Home size={20} />}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          subtitle={`${stats.pendingPaymentsCount} payment(s) pending`}
          icon={<Banknote size={20} />}
          variant="accent"
        />
      </div>

      {/* ── Middle Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Lead Pipeline Chart */}
        <Card className="lg:col-span-3" padding="md">
          <CardHeader
            title="Lead Pipeline"
            subtitle="Current distribution by status"
          />
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-ink-muted">
              No lead data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} barCategoryGap="35%">
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false} tickLine={false} width={24}
                />
                <Tooltip
                  cursor={{ fill: "#F8F6F2" }}
                  contentStyle={{
                    fontSize: 12, borderRadius: 8,
                    border: "1px solid #E8E4DC", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#1B2B4B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Upcoming Follow-ups */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader
            title="Upcoming Follow-ups"
            action={
              <Button
                variant="ghost" size="sm"
                icon={<ArrowRight size={14} />} iconPosition="right"
                onClick={() => router.push("/follow-ups")}
              >
                View all
              </Button>
            }
          />
          <div className="space-y-2">
            {upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-10">
                No upcoming follow-ups
              </p>
            ) : (
              upcomingFollowUps.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                  onClick={() => router.push("/follow-ups")}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {fu.leads?.full_name ?? "Unknown Lead"}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(fu.scheduled_at).toLocaleDateString("en-GH", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="info" className="shrink-0 capitalize text-[10px]">
                    {fu.type.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent Leads */}
        <Card className="lg:col-span-3" padding="none">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-ink">Recent Leads</h3>
              <p className="text-sm text-ink-muted mt-0.5">Latest enquiries</p>
            </div>
            <Button
              variant="ghost" size="sm"
              icon={<ArrowRight size={14} />} iconPosition="right"
              onClick={() => router.push("/leads")}
            >
              View all
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-12">No leads yet</p>
            ) : (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {generateInitials(lead.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{lead.full_name}</p>
                    <p className="text-xs text-ink-muted truncate">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={leadBadgeVariant(lead.status) as any} dot>
                      {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] ?? lead.status}
                    </Badge>
                    <span className="text-xs text-ink-muted whitespace-nowrap">
                      {timeAgo(lead.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader title="Recent Activity" subtitle="Latest system actions" />
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-10">No recent activity</p>
            ) : (
              recentActivity.map((log, i) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center">
                      <Activity size={13} className="text-primary" />
                    </div>
                    {i < recentActivity.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 mb-0" style={{ minHeight: 12 }} />
                    )}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="text-sm text-ink leading-snug">
                      {log.description ?? `${log.action} on ${log.entity_type}`}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {log.profiles?.full_name ?? "System"} · {timeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}