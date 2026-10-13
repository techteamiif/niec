import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserAvatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import { MemberBadges } from "@/components/MemberBadges";
import { TIER_LABELS } from "@/lib/niec";
import { readOnboardingData } from "@/lib/profile-onboarding";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES, type NigerianState } from "@/lib/nigeriaLocations";
import {
  AUM_OPTIONS,
  COMMUNICATION_OPTIONS,
  CONTRIBUTION_OPTIONS,
  EVENT_OPTIONS,
  EVENT_ROLE_OPTIONS,
  GOAL_OPTIONS,
  HEARD_OPTIONS,
  INVESTMENT_STAGE_OPTIONS,
  JOB_TITLES,
  ORG_TYPES,
  SDG_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/onboarding-options";
import type { Database, Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/profile/edit")({
  component: ProfilePage,
});

type ProfileForm = {
  full_name: string;
  organisation_name: string;
  organisation_type: string;
  role_title: string;
  state: string;
  lga: string;
  phone: string;
  bio: string;
  linkedin_url: string;
  website_url: string;
  sdg_focus: string[];
  sectors: string[];
  aum_range: string;
  investment_stage: string;
  goals: string[];
  contributions: string[];
  events_interested: string[];
  event_role: string;
  heard_from: string;
  comm_preference: string;
};

type SaveSection = "personal" | "organisation" | "investment" | "engagement" | "statement";

function mergeApplicationData(existing: Json, updates: Record<string, Json>): Json {
  const current = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return { ...current, ...updates };
}

function createForm(profile: NonNullable<ReturnType<typeof useAuth>["profile"]>): ProfileForm {
  const onboarding = readOnboardingData(profile.application_data);
  const locationParts = profile.location?.split(",").map((part) => part.trim()) ?? [];
  const state = locationParts.at(-1) ?? "";
  const lga = locationParts.length > 1 ? locationParts.slice(0, -1).join(", ") : "";
  const validState = NIGERIAN_STATES.includes(state as NigerianState) ? state : "";
  const stateLgas = validState ? NIGERIA_LOCATIONS[validState as NigerianState] as readonly string[] : [];
  const validLga = stateLgas.includes(lga) ? lga : "";

  return {
    full_name: profile.full_name ?? "",
    organisation_name: profile.organisation_name ?? "",
    organisation_type: profile.organisation_type ?? "",
    role_title: profile.role_title ?? "",
    state: validState,
    lga: validLga,
    phone: profile.phone ?? "",
    bio: profile.bio ?? onboarding.statement_of_intent ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    website_url: profile.website_url ?? "",
    sdg_focus: profile.sdg_focus ?? [],
    sectors: profile.sectors ?? [],
    aum_range: onboarding.aum_range ?? "",
    investment_stage: onboarding.investment_stage ?? "",
    goals: onboarding.goals ?? [],
    contributions: onboarding.contributions ?? [],
    events_interested: onboarding.events_interested ?? [],
    event_role: onboarding.event_role ?? "",
    heard_from: onboarding.heard_from ?? "",
    comm_preference: onboarding.comm_preference ?? "",
  };
}

function ProfilePage() {
  const { profile, user, refresh } = useAuth();
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [busy, setBusy] = useState<Record<SaveSection, boolean>>({
    personal: false,
    organisation: false,
    investment: false,
    engagement: false,
    statement: false,
  });
  const [coverBusy, setCoverBusy] = useState(false);

  useEffect(() => {
    if (profile && !form) setForm(createForm(profile));
  }, [profile, form]);

  if (!profile || !user || !form) return null;

  const save = async (e: React.FormEvent, section: SaveSection) => {
    e.preventDefault();
    const state = NIGERIAN_STATES.find((value) => value === form.state);
    const location = state && form.lga ? `${form.lga}, ${state}` : profile.location ?? "";
    let updates: Database["public"]["Tables"]["profiles"]["Update"];

    if (section === "personal") {
      updates = { full_name: form.full_name, phone: form.phone || null };
    } else if (section === "organisation") {
      updates = {
        organisation_name: form.organisation_name,
        organisation_type: form.organisation_type
          ? form.organisation_type as Database["public"]["Enums"]["org_type"]
          : null,
        role_title: form.role_title,
        location,
        linkedin_url: form.linkedin_url || null,
        website_url: form.website_url || null,
      };
    } else if (section === "investment") {
      updates = {
        sdg_focus: form.sdg_focus,
        sectors: form.sectors,
        application_data: mergeApplicationData(profile.application_data, {
          aum_range: form.aum_range,
          investment_stage: form.investment_stage,
        }),
      };
    } else if (section === "engagement") {
      updates = {
        application_data: mergeApplicationData(profile.application_data, {
          goals: form.goals,
          contributions: form.contributions,
          events_interested: form.events_interested,
          event_role: form.event_role,
          heard_from: form.heard_from,
          comm_preference: form.comm_preference,
        }),
      };
    } else {
      updates = {
        bio: form.bio || null,
        application_data: mergeApplicationData(profile.application_data, {
          statement_of_intent: form.bio,
        }),
      };
    }

    setBusy((current) => ({ ...current, [section]: true }));
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    setBusy((current) => ({ ...current, [section]: false }));
    if (error) return toast.error(`Could not update profile: ${error.message}`);
    toast.success("Profile updated");
    await refresh();
  };

  const uploadAvatar = async (file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (uploadError) return toast.error(`Could not upload avatar: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    if (error) return toast.error(`Could not update profile avatar: ${error.message}`);
    toast.success("Avatar updated");
    await refresh();
  };

  const uploadCoverPhoto = async (file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/cover-${Date.now()}.${ext}`;
    setCoverBusy(true);
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (uploadError) {
      setCoverBusy(false);
      return toast.error(`Could not upload cover photo: ${uploadError.message}`);
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ cover_image_url: publicUrl }).eq("id", user.id);
    setCoverBusy(false);
    if (error) return toast.error(`Could not save cover photo: ${error.message}`);
    toast.success("Cover photo updated");
    await refresh();
  };

  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/profile"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to profile
      </Link>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-xl border bg-card p-6 text-center">
          <UserAvatar name={profile.full_name} src={profile.avatar_url} size={96} className="mx-auto" />
          <label className="mt-3 inline-block cursor-pointer text-xs text-primary hover:underline">
            Change avatar
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
          <div className="mt-4 font-display text-xl">{profile.full_name}</div>
          <div className="text-sm text-muted-foreground">{profile.role_title}</div>
          <div className="mt-3 flex justify-center"><MemberBadges userId={user.id} compact /></div>
          <div className="mt-5 rounded-lg bg-muted/40 p-3 text-left text-xs">
            <div className="text-muted-foreground">Engagement score</div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, profile.engagement_score)}%` }} />
            </div>
            <div className="mt-1 text-right font-medium">{profile.engagement_score}/100</div>
          </div>
        </aside>

        <div className="space-y-6">
          <h2 className="font-display text-xl">Edit profile</h2>
          <form onSubmit={(e) => save(e, "personal")} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-medium">Personal and membership details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name"><input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="input" /></Field>
              <Field label="Email"><input value={user.email ?? profile.email} disabled className="input disabled:opacity-70" /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input" /></Field>
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Cover photo</div>
                <div className="overflow-hidden rounded-lg border border-input">
                  <div className="h-28 bg-muted">
                    {profile.cover_image_url && (
                      <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center justify-between gap-3 p-3 text-sm">
                    <span>{coverBusy ? "Uploading cover photo…" : "Choose a cover photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={coverBusy}
                      className="max-w-[180px] text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCoverPhoto(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Your cover photo appears on your profile.</p>
              </div>
              <Field label="Current membership tier">
                <div className="flex h-10 items-center gap-2 rounded-lg border border-input px-3">
                  <TierBadge tier={profile.membership_tier} />
                  <Link to="/upgrade" className="text-xs text-primary hover:underline">Upgrade</Link>
                </div>
              </Field>
              <Field label="Membership status"><input value={profile.membership_status} disabled className="input capitalize disabled:opacity-70" /></Field>
              <Field label="Tier selected during onboarding">
                <input value={(() => {
                  const requestedTier = readOnboardingData(profile.application_data).requested_tier;
                  return requestedTier ? TIER_LABELS[requestedTier] ?? requestedTier : "Not provided";
                })()} disabled className="input disabled:opacity-70" />
              </Field>
            </div>
            <SaveButton busy={busy.personal} />
          </form>

          <form onSubmit={(e) => save(e, "organisation")} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-medium">Organisation and professional details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Organisation"><input value={form.organisation_name} onChange={(e) => update("organisation_name", e.target.value)} className="input" /></Field>
              <Field label="Organisation type">
                <select value={form.organisation_type} onChange={(e) => update("organisation_type", e.target.value)} className="input">
                  <option value="">Select organisation type</option>
                  {ORG_TYPES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Job title">
                <select value={form.role_title} onChange={(e) => update("role_title", e.target.value)} className="input">
                  {!JOB_TITLES.includes(form.role_title) && form.role_title && <option value={form.role_title}>{form.role_title}</option>}
                  <option value="">Select job title</option>
                  {JOB_TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
                </select>
              </Field>
              <Field label="LinkedIn"><input value={form.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} className="input" /></Field>
              <Field label="Website"><input value={form.website_url} onChange={(e) => update("website_url", e.target.value)} className="input" /></Field>
              <Field label="State">
                <select value={form.state} onChange={(e) => setForm((current) => current ? { ...current, state: e.target.value, lga: "" } : current)} className="input">
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </Field>
              <Field label="Local Government Area">
                <select value={form.lga} disabled={!form.state} onChange={(e) => update("lga", e.target.value)} className="input disabled:opacity-70">
                  <option value="">Select LGA</option>
                  {form.state && NIGERIA_LOCATIONS[form.state as NigerianState].map((lga) => <option key={lga} value={lga}>{lga}</option>)}
                </select>
              </Field>
            </div>
            <SaveButton busy={busy.organisation} />
          </form>

          <form onSubmit={(e) => save(e, "investment")} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-medium">Investment profile</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Investment stage focus">
                <select value={form.investment_stage} onChange={(e) => update("investment_stage", e.target.value)} className="input">
                  <option value="">Select stage</option>
                  {INVESTMENT_STAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="AUM / annual budget">
                <select value={form.aum_range} onChange={(e) => update("aum_range", e.target.value)} className="input">
                  <option value="">Select range</option>
                  {AUM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
            </div>
            <MultiSelect label="SDG focus areas" options={SDG_OPTIONS} values={form.sdg_focus} onChange={(values) => update("sdg_focus", values)} />
            <MultiSelect label="Investment sectors" options={SECTOR_OPTIONS} values={form.sectors} onChange={(values) => update("sectors", values)} />
            <SaveButton busy={busy.investment} />
          </form>

          <form onSubmit={(e) => save(e, "engagement")} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-medium">Ecosystem engagement</h3>
            <MultiSelect label="What do you hope to gain from NIEC?" options={GOAL_OPTIONS} values={form.goals} onChange={(values) => update("goals", values)} />
            <MultiSelect label="What can your organisation contribute?" options={CONTRIBUTION_OPTIONS} values={form.contributions} onChange={(values) => update("contributions", values)} />
            <MultiSelect label="Events of interest" options={EVENT_OPTIONS} values={form.events_interested} onChange={(values) => update("events_interested", values)} />
            <Field label="Preferred event role">
              <ChoiceButtons options={EVENT_ROLE_OPTIONS} value={form.event_role} onChange={(value) => update("event_role", value)} />
            </Field>
            <Field label="How did you hear about NIEC?">
              <ChoiceButtons options={HEARD_OPTIONS} value={form.heard_from} onChange={(value) => update("heard_from", value)} />
            </Field>
            <Field label="Preferred communication channel">
              <select value={form.comm_preference} onChange={(e) => update("comm_preference", e.target.value)} className="input">
                <option value="">Select communication channel</option>
                {COMMUNICATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <SaveButton busy={busy.engagement} />
          </form>

          <form onSubmit={(e) => save(e, "statement")} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-medium">Statement of intent</h3>
            <Field label="Tell us why your organisation wants to join NIEC and what impact you aim to make">
              <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={4} className="input" />
            </Field>
            <SaveButton busy={busy.statement} />
          </form>

          <div className="flex justify-end">
            <button type="button"
              onClick={() => { localStorage.removeItem("niec_onboarding_dismissed"); window.location.reload(); }}
              className="text-xs text-muted-foreground hover:text-primary hover:underline">
              Show getting-started checklist
            </button>
          </div>
          <style>{`.input{ min-height:2.5rem; width:100%; border-radius:0.5rem; border:1px solid var(--color-input); background:var(--color-background); padding:0 0.75rem; font-size:0.875rem; outline:none; }
.input:focus{ border-color:var(--color-primary); }
textarea.input{ height:auto; padding:0.75rem; }`}</style>
        </div>
      </div>
    </div>
  );
}

function SaveButton({ busy }: { busy: boolean }) {
  return (
    <div className="flex justify-end border-t pt-4">
      <button disabled={busy} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {busy ? "Saving…" : "Save changes"}
      </button>
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

function MultiSelect({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onChange(selected ? values.filter((value) => value !== option) : [...values, option])}
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ChoiceButtons({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition ${value === option ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary/40"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
