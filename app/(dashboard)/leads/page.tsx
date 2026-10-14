// app/(dashboard)/leads/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadsClient from "@/components/leads/LeadsClient";

export const metadata = { title: "Leads – UMANIE Homes CRM" };

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leads } = await supabase
    .from("leads")
    .select(`
      id,
      full_name,
      email,
      phone,
      status,
      source,
      property_type,
      budget_min,
      budget_max,
      assigned_to,
      created_at,
      profiles!leads_assigned_to_fkey (full_name)
    `)
    .order("created_at", { ascending: false });

  return (
    <LeadsClient
      initialLeads={(leads ?? []) as any}
      currentUserId={user.id}
    />
  );
}