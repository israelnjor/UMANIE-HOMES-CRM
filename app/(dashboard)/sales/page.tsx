// app/(dashboard)/sales/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalesClient from "@/components/sales/SalesClient";

export const metadata = { title: "Sales Pipeline – UMANIE Homes CRM" };

export default async function SalesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: sales },
    { data: leads },
    { data: properties },
    { data: staff },
  ] = await Promise.all([
    (supabase as any)
      .from("sales")
      .select(`
        id, stage, sale_price, commission_rate, commission_amount,
        expected_close_date, actual_close_date, notes, created_at,
        leads (id, full_name, email, phone),
        properties (id, title, city, price),
        profiles!sales_assigned_to_fkey (full_name)
      `)
      .order("created_at", { ascending: false }),

    (supabase as any)
      .from("leads")
      .select("id, full_name")
      .in("status", ["qualified", "negotiating"])
      .order("full_name"),

    (supabase as any)
      .from("properties")
      .select("id, title, price")
      .in("status", ["available", "reserved"])
      .order("title"),

    (supabase as any)
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name"),
  ]);

  return (
    <SalesClient
      sales={(sales ?? []) as any}
      leads={(leads ?? []) as any}
      properties={(properties ?? []) as any}
      staff={(staff ?? []) as any}
      currentUserId={user.id}
    />
  );
}