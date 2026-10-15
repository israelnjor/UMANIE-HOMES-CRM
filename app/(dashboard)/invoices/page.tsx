// app/(dashboard)/invoices/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvoicesClient from "@/components/invoices/InvoicesClient";

export const metadata = { title: "Invoices – UMANIE Homes CRM" };

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: invoices }, { data: sales }] = await Promise.all([
    (supabase as any)
      .from("invoices")
      .select(`
        id, invoice_number, amount, status, due_date,
        issued_date, notes, created_at,
        sales (
          id,
          leads (full_name, email, phone),
          properties (title)
        ),
        profiles!invoices_created_by_fkey (full_name)
      `)
      .order("created_at", { ascending: false }),

    (supabase as any)
      .from("sales")
      .select(`
        id, sale_price,
        leads (full_name),
        properties (title)
      `)
      .not("stage", "in", '("closed_lost")')
      .order("created_at", { ascending: false }),
  ]);

  return (
    <InvoicesClient
      invoices={(invoices ?? []) as any}
      sales={(sales ?? []) as any}
      currentUserId={user.id}
    />
  );
}