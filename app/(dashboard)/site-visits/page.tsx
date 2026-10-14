// app/(dashboard)/site-visits/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteVisitsClient from "@/components/leads/SiteVisitsClient";

export const metadata = { title: "Site Visits – UMANIE Homes CRM" };

export default async function SiteVisitsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: visits } = await (supabase as any)
    .from("site_visits")
    .select(`
      id, scheduled_at, status, notes, feedback,
      created_at,
      leads (id, full_name, email, phone),
      properties (id, title, address),
      profiles!site_visits_conducted_by_fkey (full_name)
    `)
    .order("scheduled_at", { ascending: true }) as { data: any[] | null };

  const { data: properties } = await (supabase as any)
    .from("properties")
    .select("id, title, address")
    .eq("status", "available")
    .order("title") as { data: any[] | null };

  const { data: leads } = await (supabase as any)
    .from("leads")
    .select("id, full_name")
    .not("status", "in", '("won","lost")')
    .order("full_name") as { data: any[] | null };

  return (
    <SiteVisitsClient
      visits={visits ?? []}
      properties={properties ?? []}
      leads={leads ?? []}
      currentUserId={user.id}
    />
  );
}