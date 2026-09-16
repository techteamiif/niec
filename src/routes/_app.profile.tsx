import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserAvatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import { ORG_TYPE_LABELS } from "@/lib/niec";
import { MemberBadges } from "@/components/MemberBadges";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    organisation_name: profile?.organisation_name ?? "",
    organisation_type: profile?.organisation_type ?? "other",
    role_title: profile?.role_title ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    website_url: profile?.website_url ?? "",
    sectors: (profile?.sectors ?? []).join(", "),
    sdg_focus: (profile?.sdg_focus ?? []).join(", "),
  });
  const [busy, setBusy] = useState(false);

  if (!profile || !user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      ...form,
      organisation_type: form.organisation_type as any,
      sectors: form.sectors.split(",").map((s) => s.trim()).filter(Boolean),
      sdg_focus: form.sdg_focus.split(",").map((s) => s.trim()).filter(Boolean),
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };
  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return toast.error(upErr.message);
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Avatar updated");
    refresh();
  };
  const s = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 lg:p-10">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-xl border bg-card p-6 text-center">
          <UserAvatar name={profile.full_name} src={profile.avatar_url} size={96} className="mx-auto" />
          <label className="mt-3 inline-block cursor-pointer text-xs text-primary hover:underline">
            Change avatar
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
          <div className="mt-4 font-display text-xl">{profile.full_name}</div>
          <div className="text-sm text-muted-foreground">{profile.role_title}</div>
          <div className="mt-3 flex justify-center"><TierBadge tier={profile.membership_tier} /></div>
          <div className="mt-3 flex justify-center"><MemberBadges userId={user.id} compact /></div>
          <div className="mt-5 rounded-lg bg-muted/40 p-3 text-left text-xs">
            <div className="text-muted-foreground">Engagement score</div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, profile.engagement_score)}%` }} />
            </div>
            <div className="mt-1 text-right font-medium">{profile.engagement_score}/100</div>
          </div>
        </aside>

        <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="font-display text-xl">Edit profile</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><input value={form.full_name} onChange={(e) => s("full_name", e.target.value)} className="input" /></Field>
            <Field label="Role / title"><input value={form.role_title} onChange={(e) => s("role_title", e.target.value)} className="input" /></Field>
            <Field label="Organisation"><input value={form.organisation_name} onChange={(e) => s("organisation_name", e.target.value)} className="input" /></Field>
            <Field label="Organisation type">
              <select value={form.organisation_type} onChange={(e) => s("organisation_type", e.target.value)} className="input">
                {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Location"><input value={form.location} onChange={(e) => s("location", e.target.value)} className="input" /></Field>
            <Field label="LinkedIn URL"><input value={form.linkedin_url} onChange={(e) => s("linkedin_url", e.target.value)} className="input" /></Field>
            <Field label="Website"><input value={form.website_url} onChange={(e) => s("website_url", e.target.value)} className="input" /></Field>
          </div>
          <Field label="Bio"><textarea value={form.bio} onChange={(e) => s("bio", e.target.value)} rows={3} className="input" /></Field>
          <Field label="Sectors (comma-separated)"><input value={form.sectors} onChange={(e) => s("sectors", e.target.value)} className="input" /></Field>
          <Field label="SDG focus (1–17, comma-separated)"><input value={form.sdg_focus} onChange={(e) => s("sdg_focus", e.target.value)} className="input" /></Field>
          <div className="flex items-center justify-between gap-3">
            <button type="button"
              onClick={() => { localStorage.removeItem("niec_onboarding_dismissed"); window.location.reload(); }}
              className="text-xs text-muted-foreground hover:text-primary hover:underline">
              Show getting-started checklist
            </button>
            <button disabled={busy} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
          <style>{`.input{ height:2.5rem; width:100%; border-radius:0.5rem; border:1px solid var(--color-input); background:var(--color-background); padding:0 0.75rem; font-size:0.875rem; outline:none; }
.input:focus{ border-color:var(--color-primary); }
textarea.input{ height:auto; padding:0.75rem; }`}</style>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
