// app/(dashboard)/leads/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadDetailClient from "@/components/leads/LeadDetailClient";

export const metadata = { title: "Lead Detail – UMANIE Homes CRM" };

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: lead },
    { data: followUps },
    { data: notes },
    { data: staff },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        *,
        profiles!leads_assigned_to_fkey (id, full_name)
      `)
      .eq("id", params.id)
      .single(),

    supabase
      .from("follow_ups")
      .select(`
        id, type, status, priority, scheduled_at,
        completed_at, notes, created_at,
        profiles!follow_ups_created_by_fkey (full_name)
      `)
      .eq("lead_id", params.id)
      .order("scheduled_at", { ascending: false }),

    supabase
      .from("lead_notes")
      .select(`
        id, content, created_at,
        profiles!lead_notes_created_by_fkey (full_name)
      `)
      .eq("lead_id", params.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name"),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={lead as any}
      followUps={(followUps ?? []) as any}
      notes={(notes ?? []) as any}
      staff={(staff ?? []) as any}
      currentUserId={user.id}
    />
  );
}