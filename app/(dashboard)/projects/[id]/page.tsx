// app/(dashboard)/projects/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectDetailClient from "@/components/projects/ProjectDetailClient";

export const metadata = { title: "Project Detail – UMANIE Homes CRM" };

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: project },
    { data: inventory },
    { data: labour },
    { data: expenses },
    { data: staff },
  ] = await Promise.all([
    (supabase as any)
      .from("projects")
      .select(`
        *, profiles!projects_manager_id_fkey (id, full_name)
      `)
      .eq("id", params.id)
      .single(),

    (supabase as any)
      .from("inventory_items")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false }),

    (supabase as any)
      .from("labour_payments")
      .select(`*, profiles!labour_payments_recorded_by_fkey (full_name)`)
      .eq("project_id", params.id)
      .order("payment_date", { ascending: false }),

    (supabase as any)
      .from("project_expenses")
      .select(`*, profiles!project_expenses_recorded_by_fkey (full_name)`)
      .eq("project_id", params.id)
      .order("expense_date", { ascending: false }),

    (supabase as any)
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name"),
  ]);

  if (!project) notFound();

  return (
    <ProjectDetailClient
      project={project as any}
      inventory={(inventory ?? []) as any}
      labour={(labour ?? []) as any}
      expenses={(expenses ?? []) as any}
      staff={(staff ?? []) as any}
      currentUserId={user.id}
    />
  );
}