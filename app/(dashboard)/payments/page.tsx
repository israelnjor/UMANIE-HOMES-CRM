// app/(dashboard)/payments/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentsClient from "@/components/payments/PaymentsClient";

export const metadata = { title: "Payments – UMANIE Homes CRM" };

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: payments }, { data: sales }] = await Promise.all([
    (supabase as any)
      .from("payments")
      .select(`
        id, amount, status, method, payment_date,
        reference, notes, created_at,
        sales (
          id,
          leads (full_name),
          properties (title)
        ),
        profiles!payments_recorded_by_fkey (full_name)
      `)
      .order("created_at", { ascending: false }),

    (supabase as any)
      .from("sales")
      .select(`
        id,
        leads (full_name),
        properties (title),
        sale_price
      `)
      .not("stage", "in", '("closed_lost")')
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PaymentsClient
      payments={(payments ?? []) as any}
      sales={(sales ?? []) as any}
      currentUserId={user.id}
    />
  );
}