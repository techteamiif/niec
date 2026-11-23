import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Globe, Linkedin, MapPin, Pencil } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { MemberBadges } from "@/components/MemberBadges";
import { MembershipCard } from "@/components/MembershipCard";
import { TierBadge } from "@/components/TierBadge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ORG_TYPE_LABELS, TIER_LABELS } from "@/lib/niec";
import { getAccountType, readOnboardingData } from "@/lib/profile-onboarding";
import { COMMUNICATION_OPTIONS } from "@/lib/onboarding-options";
import { deleteOwnAccount } from "@/lib/account.functions";
import type { Json } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t pt-5">
      <h2 className="font-display text-lg">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SelectedValues({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function mergeApplicationData(existing: Json, updates: Record<string, Json>): Json {
  const current =
    existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return { ...current, ...updates };
}

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ProfilePage() {
  const { profile, user, refresh } = useAuth();
  const matches = useMatches();
  const navigate = useNavigate();
  const runDeleteOwnAccount = useServerFn(deleteOwnAccount);
  const [settingsSection, setSettingsSection] = useState<"email" | "password" | "deactivate" | "delete">("email");
  const [preferredChannel, setPreferredChannel] = useState("");
  const [communicationSaving, setCommunicationSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountDeleting, setAccountDeleting] = useState(false);
  const savedPreferredChannel = profile
    ? (readOnboardingData(profile.application_data).comm_preference ?? "")
    : "";

  useEffect(() => {
    setPreferredChannel(savedPreferredChannel);
  }, [savedPreferredChannel]);

  useEffect(() => {
    if (!profile || !user?.email || profile.email === user.email) return;
    void supabase
      .from("profiles")
      .update({ email: user.email })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) toast.error(`Could not sync your confirmed email address: ${error.message}`);
      });
  }, [profile?.email, user?.email, user?.id]);

  if (matches.some((match) => match.routeId.startsWith("/_app/profile/"))) {
    return <Outlet />;
  }

  if (!profile || !user) return null;

  const linkedinUrl = safeExternalUrl(profile.linkedin_url);
  const websiteUrl = safeExternalUrl(profile.website_url);
  const organisationType = ORG_TYPE_LABELS[profile.organisation_type];
  const memberTier = profile.paid_membership_tier ?? profile.membership_tier;
  const onboarding = readOnboardingData(profile.application_data);
  const isOrganisation = getAccountType(profile.application_data) === "organisation";
  const statementOfIntent = profile.bio || onboarding.statement_of_intent;
  const contactDetails = [
    ["Email", user.email],
    ["Phone", profile.phone],
  ].filter(([, value]) => Boolean(value)) as [string, string][];
  const membershipDetails = [
    ["Current membership", TIER_LABELS[memberTier] ?? memberTier],
    [
      "Membership status",
      `${profile.membership_status.charAt(0).toUpperCase()}${profile.membership_status.slice(1)}`,
    ],
    [
      "Tier selected during onboarding",
      onboarding.requested_tier
        ? (TIER_LABELS[onboarding.requested_tier] ?? onboarding.requested_tier)
        : null,
    ],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  const saveCommunicationPreference = async (event: React.FormEvent) => {
    event.preventDefault();
    setCommunicationSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          application_data: mergeApplicationData(profile.application_data, {
            comm_preference: preferredChannel,
          }),
        })
        .eq("id", user.id);
      if (error) {
        toast.error(`Could not save communication preference: ${error.message}`);
        return;
      }
      toast.success("Communication preference updated.");
      await refresh();
    } catch (error) {
      toast.error(
        `Could not save communication preference: ${error instanceof Error ? error.message : "Unexpected error"}`,
      );
    } finally {
      setCommunicationSaving(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });
      if (error) {
        toast.error(`Could not update password: ${error.message}`);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (error) {
      toast.error(
        `Could not update password: ${error instanceof Error ? error.message : "Unexpected error"}`,
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const updateEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || email === user?.email?.toLowerCase()) {
      toast.error("Enter a new email address that differs from your current one.");
      return;
    }

    setEmailSaving(true);
    setEmailConfirmationSent(false);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        toast.error(`Could not update email address: ${error.message}`);
        return;
      }
      setEmailConfirmationSent(true);
      toast.success("Email confirmation sent. Your address will change after confirmation.");
    } catch (error) {
      toast.error(
        `Could not update email address: ${error instanceof Error ? error.message : "Unexpected error"}`,
      );
    } finally {
      setEmailSaving(false);
    }
  };

  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") {
      toast.error('Type "DELETE" exactly to confirm account deletion.');
      return;
    }

    setAccountDeleting(true);
    try {
      await runDeleteOwnAccount({
        data: { password: deletePassword, confirmation: deleteConfirmation },
      });
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.error("[profile:delete-account:local-signout]", error);
      toast.success("Your account has been permanently deleted.");
      navigate({ to: "/login", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the account.");
      setAccountDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10">
      <Tabs defaultValue="about" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="about" className="mt-0">
          <article className="w-full overflow-hidden rounded-xl border bg-card">
            <div className="h-28 bg-[#D4A017]">
              {profile.cover_image_url && (
                <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="px-6 pb-7 md:px-9">
              <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <UserAvatar
                  name={profile.full_name}
                  src={profile.avatar_url}
                  size={96}
                  className="border-4 border-card"
                />
                <Link
                  to="/profile/edit"
                  aria-label="Edit profile"
                  title="Edit profile"
                  className="inline-flex h-10 w-10 items-center justify-center self-start rounded-md border text-muted-foreground transition hover:bg-muted hover:text-foreground sm:self-auto"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4">
                {isOrganisation ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <h1 className="font-display text-3xl">
                      {profile.organisation_name || "Organisation"}
                    </h1>
                    {organisationType && (
                      <span className="text-muted-foreground">· {organisationType}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-3xl">{profile.full_name || "Member"}</h1>
                  </div>
                )}
                {!isOrganisation && profile.role_title && (
                  <p className="mt-1 text-muted-foreground">{profile.role_title}</p>
                )}
                {profile.location && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {profile.location}
                  </div>
                )}
                <MemberBadges userId={user.id} />
              </div>

              <DetailSection title="Contact details">
                <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  {contactDetails.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </DetailSection>

              {statementOfIntent && (
                <DetailSection title="Statement of intent">
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {statementOfIntent}
                  </p>
                </DetailSection>
              )}

              {!!profile.sectors?.length && (
                <DetailSection title="Investment sectors">
                  <SelectedValues values={profile.sectors} />
                </DetailSection>
              )}

              {!!profile.sdg_focus?.length && (
                <DetailSection title="SDG focus areas">
                  <SelectedValues values={profile.sdg_focus} />
                </DetailSection>
              )}

              {(onboarding.aum_range || onboarding.investment_stage || onboarding.capital_provided) && (
                <DetailSection title="Investment focus">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    {onboarding.investment_stage && (
                      <div>
                        <dt className="text-xs text-muted-foreground">Investment stage</dt>
                        <dd className="mt-1">{onboarding.investment_stage}</dd>
                      </div>
                    )}
                    {onboarding.aum_range && (
                      <div>
                        <dt className="text-xs text-muted-foreground">AUM / annual budget</dt>
                        <dd className="mt-1">{onboarding.aum_range}</dd>
                      </div>
                    )}
                    {onboarding.capital_provided && (
                      <div>
                        <dt className="text-xs text-muted-foreground">Capital provided</dt>
                        <dd className="mt-1">{onboarding.capital_provided}</dd>
                      </div>
                    )}
                  </dl>
                </DetailSection>
              )}

              {onboarding.goals?.length ? (
                <DetailSection title="What I hope to gain from NIEC">
                  <SelectedValues values={onboarding.goals} />
                </DetailSection>
              ) : null}

              {onboarding.contributions?.length ? (
                <DetailSection title="What my organisation can contribute">
                  <SelectedValues values={onboarding.contributions} />
                </DetailSection>
              ) : null}

              {(onboarding.events_interested?.length ||
                onboarding.event_role ||
                onboarding.heard_from ||
                onboarding.comm_preference) && (
                <DetailSection title="Ecosystem engagement">
                  <div className="space-y-4 text-sm">
                    {!!onboarding.events_interested?.length && (
                      <div>
                        <h3 className="mb-2 text-xs text-muted-foreground">Events of interest</h3>
                        <SelectedValues values={onboarding.events_interested} />
                      </div>
                    )}
                    {onboarding.event_role && (
                      <p>
                        <span className="text-muted-foreground">Preferred event role: </span>
                        {onboarding.event_role}
                      </p>
                    )}
                    {onboarding.heard_from && (
                      <p>
                        <span className="text-muted-foreground">How I heard about NIEC: </span>
                        {onboarding.heard_from}
                      </p>
                    )}
                    {onboarding.comm_preference && (
                      <p>
                        <span className="text-muted-foreground">Preferred communication: </span>
                        {onboarding.comm_preference}
                      </p>
                    )}
                  </div>
                </DetailSection>
              )}

              {(linkedinUrl || websiteUrl) && (
                <section className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-5 text-sm">
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  )}
                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  )}
                </section>
              )}
            </div>
          </article>
        </TabsContent>

        <TabsContent value="membership" className="mt-0">
          <article className="rounded-xl border bg-card p-6">
            <h1 className="font-display text-2xl">Membership</h1>
            <DetailSection title="Membership details">
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {membershipDetails.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                      {label === "Current membership" ? <TierBadge tier={memberTier} /> : value}
                    </dd>
                  </div>
                ))}
              </dl>
            </DetailSection>
            <MembershipCard profile={profile} />
          </article>
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <section className="grid overflow-hidden rounded-xl border bg-card md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="border-b p-4 md:border-b-0 md:border-r">
              <h1 className="font-display text-2xl">Settings</h1>
              <nav aria-label="Account settings" className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
                {([
                  ["email", "Update Email Address"],
                  ["password", "Password"],
                  ["deactivate", "Deactivate Account"],
                  ["delete", "Delete Account"],
                ] as const).map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    aria-current={settingsSection === section ? "page" : undefined}
                    onClick={() => setSettingsSection(section)}
                    className={`shrink-0 rounded-md px-3 py-2 text-left text-sm transition md:w-full ${
                      settingsSection === section
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </aside>
            <div className="min-w-0 p-6">
            {settingsSection === "email" && (
              <section>
                <h2 className="font-display text-2xl">Update Email Address</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your current email address is <span className="font-medium text-foreground">{user.email}</span>.
                  Confirm the new address before it takes effect.
                </p>
                <form onSubmit={updateEmail} className="mt-5 max-w-xl space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      New email address
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value);
                        setEmailConfirmationSent(false);
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={emailSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {emailSaving ? "Sending confirmation…" : "Update email"}
                  </button>
                  {emailConfirmationSent && (
                    <p role="status" className="text-sm text-muted-foreground">
                      A confirmation message was sent to {newEmail.trim()}. Your current address remains active until you confirm.
                    </p>
                  )}
                </form>
              </section>
            )}

            {settingsSection === "password" && (
          <section>
            <h1 className="font-display text-2xl">Account security</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the password you use to sign in to NIEC. If you forgot your password, please{" "}
              <Link
                to="/forgot-password"
                className="text-primary underline-offset-4 hover:underline"
              >
                request a password reset
              </Link>
              .
            </p>
            <form onSubmit={changePassword} className="mt-5 max-w-xl space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Current password *
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  New password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Confirm new password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={passwordSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {passwordSaving ? "Updating…" : "Change password"}
              </button>
            </form>
          </section>
            )}

            {settingsSection === "deactivate" && (
              <section>
                <h2 className="font-display text-2xl">Deactivate Account</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Temporary account deactivation is informational for now. Contact{" "}
                  <a
                    href="mailto:info@impactinvestorsfoundation.org"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    info@impactinvestorsfoundation.org
                  </a>{" "}
                  to request help. Deactivation does not delete your profile or account data.
                </p>
              </section>
            )}

            {settingsSection === "delete" && (
              <section>
                <h2 className="font-display text-2xl text-destructive">Delete Account</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This permanently removes your sign-in account and profile, along with profile-linked content.
                  Membership application and payment history may be retained with the account link removed.
                  This action cannot be undone.
                </p>
                <form onSubmit={deleteAccount} className="mt-5 max-w-xl space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      Current password *
                    </span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      Type DELETE to confirm
                    </span>
                    <input
                      type="text"
                      required
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={accountDeleting}
                    className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                  >
                    {accountDeleting ? "Deleting account…" : "Permanently delete account"}
                  </button>
                </form>
              </section>
            )}

          {/* <section className="rounded-xl border bg-card p-6">
            <h2 className="font-display text-xl">Communication preferences</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how IIF should contact you about member events, resources, and opportunities.
            </p>
            <form
              onSubmit={saveCommunicationPreference}
              className="mt-5 flex max-w-xl flex-col gap-4"
            >
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Preferred contact channel
                </span>
                <select
                  value={preferredChannel}
                  onChange={(event) => setPreferredChannel(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No preference selected</option>
                  {COMMUNICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <button
                  type="submit"
                  disabled={communicationSaving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {communicationSaving ? "Saving…" : "Save preferences"}
                </button>
              </div>
            </form>
          </section> */}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
