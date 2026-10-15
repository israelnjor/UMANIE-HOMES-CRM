// app/(dashboard)/properties/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PropertiesClient from "@/components/properties/PropertiesClient";

export const metadata = { title: "Properties – UMANIE Homes CRM" };

export default async function PropertiesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await (supabase as any)
    .from("properties")
    .select(`
      id, title, description, type, status, price,
      bedrooms, bathrooms, area_sqft, address, city,
      is_featured, created_at,
      projects (id, name),
      property_images (id, url, is_primary)
    `)
    .order("created_at", { ascending: false }) as { data: any[] | null };

  const { data: projects } = await (supabase as any)
    .from("projects")
    .select("id, name")
    .order("name") as { data: any[] | null };

  return (
    <PropertiesClient
      properties={properties ?? []}
      projects={projects ?? []}
      currentUserId={user.id}
    />
  );
}