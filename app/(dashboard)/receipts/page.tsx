// app/(dashboard)/receipts/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReceiptsClient from "@/components/invoices/ReceiptsClient";

export const metadata = { title: "Receipts – UMANIE Homes CRM" };

export default async function ReceiptsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: receipts }, { data: payments }] = await Promise.all([
    (supabase as any)
      .from("receipts")
      .select(`
        id, receipt_number, amount, notes, created_at,
        payments (
          id, method, payment_date, reference,
          sales (
            leads (full_name, email),
            properties (title)
          )
        ),
        profiles!receipts_created_by_fkey (full_name)
      `)
      .order("created_at", { ascending: false }),

    (supabase as any)
      .from("payments")
      .select(`
        id, amount, payment_date, method, reference,
        sales (
          leads (full_name),
          properties (title)
        )
      `)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ReceiptsClient
      receipts={(receipts ?? []) as any}
      payments={(payments ?? []) as any}
      currentUserId={user.id}
    />
  );
}