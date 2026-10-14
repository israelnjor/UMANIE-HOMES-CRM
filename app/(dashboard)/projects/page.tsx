// app/(dashboard)/projects/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "@/components/projects/ProjectsClient";

export const metadata = { title: "Projects – UMANIE Homes CRM" };

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await (supabase as any)
    .from("projects")
    .select(`
      id, name, description, status, start_date, expected_end_date,
      actual_end_date, location, total_budget, total_spent,
      created_at, updated_at,
      profiles!projects_manager_id_fkey (full_name)
    `)
    .order("created_at", { ascending: false }) as { data: any[] | null };

  const { data: staff } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name") as { data: any[] | null };

  return (
    <ProjectsClient
      projects={projects ?? []}
      staff={staff ?? []}
      currentUserId={user.id}
    />
  );
}