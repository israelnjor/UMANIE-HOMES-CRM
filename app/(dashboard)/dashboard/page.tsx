// app/(dashboard)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata = { title: "Dashboard – UMANIE Homes CRM" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single() as { data: { full_name: string; role: string } | null };

  // ── Stats ──────────────────────────────────────────────
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const results = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true })
      .gte("created_at", firstOfMonth),
    supabase.from("leads").select("*", { count: "exact", head: true })
      .gte("created_at", firstOfLastMonth)
      .lt("created_at", firstOfMonth),
    supabase.from("projects").select("*", { count: "exact", head: true })
      .in("status", ["planning", "in_progress", "on_hold"]),
    supabase.from("properties").select("status"),
    supabase.from("payments").select("amount")
      .eq("status", "completed")
      .gte("created_at", firstOfMonth),
    supabase.from("payments").select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const totalLeads         = results[0].count;
  const newLeadsThisMonth  = results[1].count;
  const newLeadsLastMonth  = results[2].count;
  const activeProjects     = results[3].count;
  const propertyStats      = results[4].data as { status: string }[] | null;
  const revenueData        = results[5].data as { amount: number }[] | null;
  const pendingPaymentsCount = results[6].count;

  const availableProperties = propertyStats?.filter((p) => p.status === "available").length ?? 0;
  const totalProperties = propertyStats?.length ?? 0;
  const monthlyRevenue = revenueData?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;
  const leadsGrowth = newLeadsLastMonth
    ? Math.round((((newLeadsThisMonth ?? 0) - (newLeadsLastMonth ?? 0)) / newLeadsLastMonth) * 100)
    : 0;

  // ── Lead pipeline chart ────────────────────────────────
  const { data: leadsRaw } = await (supabase as any)
    .from("leads")
    .select("status") as { data: { status: string }[] | null };

  const statusCounts: Record<string, number> = {};
  for (const l of leadsRaw ?? []) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  }
  const leadsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status, count,
  }));

  // ── Recent leads ───────────────────────────────────────
  const { data: recentLeads } = await (supabase as any)
    .from("leads")
    .select("id, full_name, email, phone, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  // ── Upcoming follow-ups ────────────────────────────────
  const { data: upcomingFollowUps } = await supabase
    .from("follow_ups")
    .select("id, type, scheduled_at, notes, leads(full_name)")
    .eq("status", "pending")
    .gte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);

  // ── Recent activity ────────────────────────────────────
  const { data: recentActivity } = await (supabase as any)
    .from("activity_logs")
    .select("id, action, entity_type, description, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(8) as { data: any[] | null };

  return (
    <DashboardClient
      userName={profile?.full_name ?? user.email ?? "User"}
      stats={{
        totalLeads: totalLeads ?? 0,
        newLeadsThisMonth: newLeadsThisMonth ?? 0,
        leadsGrowth,
        activeProjects: activeProjects ?? 0,
        availableProperties,
        totalProperties,
        monthlyRevenue,
        pendingPaymentsCount: pendingPaymentsCount ?? 0,
      }}
      leadsByStatus={leadsByStatus}
      recentLeads={(recentLeads ?? []) as any}
      upcomingFollowUps={(upcomingFollowUps ?? []) as any}
      recentActivity={(recentActivity ?? []) as any}
    />
  );
}