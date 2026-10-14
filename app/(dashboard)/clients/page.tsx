// app/(dashboard)/clients/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientsClient from "@/components/leads/ClientsClient";

export const metadata = { title: "Clients – UMANIE Homes CRM" };

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clients } = await (supabase as any)
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
    .eq("status", "won")
    .order("created_at", { ascending: false }) as { data: any[] | null };

  return (
    <ClientsClient
      clients={clients ?? []}
      currentUserId={user.id}
    />
  );
}