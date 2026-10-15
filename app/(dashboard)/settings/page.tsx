// app/(dashboard)/settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "@/components/layout/SettingsClient";

export const metadata = { title: "Settings – UMANIE Homes CRM" };

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() as { data: any };

  const { data: company } = await (supabase as any)
    .from("company_profile")
    .select("*")
    .single() as { data: any };

  const { data: staff } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at") as { data: any[] | null };

  return (
    <SettingsClient
      profile={profile}
      company={company}
      staff={staff ?? []}
      currentUserId={user.id}
    />
  );
}