// components/layout/SettingsClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, Users, Shield, LogOut } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { generateInitials } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/constants";

interface Profile {
  id: string; full_name: string; email: string;
  role: string; phone: string | null; avatar_url: string | null;
}
interface Company {
  id?: string; name: string; email: string | null;
  phone: string | null; address: string | null;
  website: string | null; logo_url: string | null;
}
interface Staff {
  id: string; full_name: string; email: string;
  role: string; created_at: string;
}

const TABS = ["profile", "company", "team"] as const;
type Tab = typeof TABS[number];

const roleVariant = (r: string) => {
  if (r === "ceo")   return "accent";
  if (r === "admin") return "primary";
  return "default";
};

export default function SettingsClient({
  profile: initialProfile,
  company: initialCompany,
  staff,
  currentUserId,
}: {
  profile: Profile;
  company: Company | null;
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [company, setCompany] = useState<Company>(
    initialCompany ?? { name: "", email: null, phone: null, address: null, website: null, logo_url: null }
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [companySaved,  setCompanySaved]  = useState(false);
  const [serverError,   setServerError]   = useState("");

  // ── Save profile ─────────────────────────────────────
  const saveProfile = async () => {
    setProfileSaving(true);
    setServerError("");
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone:     profile.phone,
      })
      .eq("id", currentUserId);
    setProfileSaving(false);
    if (error) { setServerError(error.message); return; }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
    router.refresh();
  };

  // ── Save company ─────────────────────────────────────
  const saveCompany = async () => {
    setCompanySaving(true);
    setServerError("");
    const supabase = createClient() as any;
    const { error } = initialCompany
      ? await supabase.from("company_profile").update(company).eq("id", initialCompany.id)
      : await supabase.from("company_profile").insert(company);
    setCompanySaving(false);
    if (error) { setServerError(error.message); return; }
    setCompanySaved(true);
    setTimeout(() => setCompanySaved(false), 2500);
    router.refresh();
  };

  // ── Sign out ─────────────────────────────────────────
  const signOut = async () => {
    const supabase = createClient() as any;
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Manage your account, company, and team
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
              ${tab === t
                ? "border-primary text-primary"
                : "border-transparent text-ink-muted hover:text-ink"
              }
            `}
          >
            {t === "team" ? "Team Members" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {tab === "profile" && (
        <div className="space-y-5">
          <Card padding="md">
            <CardHeader title="Your Profile" subtitle="Update your personal information" />

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                {generateInitials(profile.full_name || profile.email)}
              </div>
              <div>
                <p className="font-semibold text-ink">{profile.full_name || "—"}</p>
                <p className="text-sm text-ink-muted">{profile.email}</p>
                <Badge variant={roleVariant(profile.role) as any} className="mt-1">
                  {USER_ROLE_LABELS[profile.role as keyof typeof USER_ROLE_LABELS] ?? profile.role}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Your full name"
              />
              <Input
                label="Email Address"
                value={profile.email}
                disabled
                hint="Email cannot be changed here"
              />
              <Input
                label="Phone Number"
                value={profile.phone ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+233 XX XXX XXXX"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink">Role</label>
                <div className="px-3 py-2.5 rounded-lg border border-border bg-surface text-sm text-ink-muted">
                  {USER_ROLE_LABELS[profile.role as keyof typeof USER_ROLE_LABELS] ?? profile.role}
                  <span className="ml-2 text-xs">(contact admin to change)</span>
                </div>
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg mt-4">
                {serverError}
              </p>
            )}

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
              <Button
                variant="danger"
                size="sm"
                icon={<LogOut size={14} />}
                onClick={signOut}
              >
                Sign Out
              </Button>
              <Button
                loading={profileSaving}
                onClick={saveProfile}
                variant={profileSaved ? "secondary" : "primary"}
              >
                {profileSaved ? "✓ Saved" : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Company Tab ── */}
      {tab === "company" && (
        <Card padding="md">
          <CardHeader
            title="Company Profile"
            subtitle="Information displayed on invoices, receipts and agreements"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Company Name"
                value={company.name ?? ""}
                onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                placeholder="UMANIE Homes Africa"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={company.email ?? ""}
              onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
              placeholder="info@umaniehomes.com"
            />
            <Input
              label="Phone"
              value={company.phone ?? ""}
              onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
              placeholder="+233 XX XXX XXXX"
            />
            <div className="sm:col-span-2">
              <Input
                label="Address"
                value={company.address ?? ""}
                onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                placeholder="123 Airport Road, Accra, Ghana"
              />
            </div>
            <Input
              label="Website"
              value={company.website ?? ""}
              onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))}
              placeholder="https://umaniehomes.com"
            />
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg mt-4">
              {serverError}
            </p>
          )}

          <div className="flex justify-end mt-5 pt-4 border-t border-border">
            <Button
              loading={companySaving}
              onClick={saveCompany}
              variant={companySaved ? "secondary" : "primary"}
            >
              {companySaved ? "✓ Saved" : "Save Company Info"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Team Tab ── */}
      {tab === "team" && (
        <Card padding="none">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h3 className="text-base font-semibold text-ink">Team Members</h3>
            <p className="text-sm text-ink-muted mt-0.5">
              {staff.length} member{staff.length !== 1 ? "s" : ""} — add new users via Supabase Auth dashboard
            </p>
          </div>
          <div className="divide-y divide-border">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {generateInitials(member.full_name || member.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">
                    {member.full_name || "—"}
                    {member.id === currentUserId && (
                      <span className="ml-2 text-xs text-ink-muted">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted truncate">{member.email}</p>
                </div>
                <Badge variant={roleVariant(member.role) as any}>
                  {USER_ROLE_LABELS[member.role as keyof typeof USER_ROLE_LABELS] ?? member.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}