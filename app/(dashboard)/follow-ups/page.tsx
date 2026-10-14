// app/(dashboard)/follow-ups/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowUpsClient from "@/components/leads/FollowUpsClient";

export const metadata = { title: "Follow-ups – UMANIE Homes CRM" };

export default async function FollowUpsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: followUps } = await (supabase as any)
    .from("follow_ups")
    .select(`
      id, type, status, priority, scheduled_at,
      completed_at, notes, created_at,
      leads (id, full_name, email, phone),
      profiles!follow_ups_created_by_fkey (full_name)
    `)
    .order("scheduled_at", { ascending: true }) as { data: any[] | null };

  return <FollowUpsClient followUps={followUps ?? []} currentUserId={user.id} />;
}