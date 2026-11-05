import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { Building2, Globe, Linkedin, MapPin, Pencil } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { MemberBadges } from "@/components/MemberBadges";
import { TierBadge } from "@/components/TierBadge";
import { useAuth } from "@/lib/auth";
import { ORG_TYPE_LABELS, TIER_LABELS } from "@/lib/niec";
import { readOnboardingData } from "@/lib/profile-onboarding";

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
        <span key={value} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
          {value}
        </span>
      ))}
    </div>
  );
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
  const { profile, user } = useAuth();
  const matches = useMatches();

  if (matches.some((match) => match.routeId.startsWith("/_app/profile/"))) {
    return <Outlet />;
  }

  if (!profile || !user) return null;

  const linkedinUrl = safeExternalUrl(profile.linkedin_url);
  const websiteUrl = safeExternalUrl(profile.website_url);
  const organisationType = ORG_TYPE_LABELS[profile.organisation_type];
  const onboarding = readOnboardingData(profile.application_data);
  const statementOfIntent = profile.bio || onboarding.statement_of_intent;
  const details = [
    ["Email", user.email],
    ["Phone", profile.phone],
    ["Current membership", TIER_LABELS[profile.membership_tier] ?? profile.membership_tier],
    ["Membership status", `${profile.membership_status.charAt(0).toUpperCase()}${profile.membership_status.slice(1)}`],
    ["Tier selected during onboarding", onboarding.requested_tier ? TIER_LABELS[onboarding.requested_tier] ?? onboarding.requested_tier : null],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <div className="p-6 lg:p-10">
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
            <h1 className="font-display text-3xl">{profile.full_name || "Member"}</h1>
            {profile.role_title && (
              <p className="mt-1 text-muted-foreground">{profile.role_title}</p>
            )}
            {profile.organisation_name && (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{profile.organisation_name}</span>
                {organisationType && (
                  <span className="text-muted-foreground">· {organisationType}</span>
                )}
              </div>
            )}
            {profile.location && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {profile.location}
              </div>
            )}
            <MemberBadges userId={user.id} />
          </div>

          <DetailSection title="Personal and membership details">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                    {label === "Current membership" ? <TierBadge tier={profile.membership_tier} /> : value}
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

          {(onboarding.aum_range || onboarding.investment_stage) && (
            <DetailSection title="Investment focus">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {onboarding.investment_stage && (
                  <div><dt className="text-xs text-muted-foreground">Investment stage</dt><dd className="mt-1">{onboarding.investment_stage}</dd></div>
                )}
                {onboarding.aum_range && (
                  <div><dt className="text-xs text-muted-foreground">AUM / annual budget</dt><dd className="mt-1">{onboarding.aum_range}</dd></div>
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

          {(onboarding.events_interested?.length || onboarding.event_role || onboarding.heard_from || onboarding.comm_preference) && (
            <DetailSection title="Ecosystem engagement">
              <div className="space-y-4 text-sm">
                {!!onboarding.events_interested?.length && (
                  <div><h3 className="mb-2 text-xs text-muted-foreground">Events of interest</h3><SelectedValues values={onboarding.events_interested} /></div>
                )}
                {onboarding.event_role && <p><span className="text-muted-foreground">Preferred event role: </span>{onboarding.event_role}</p>}
                {onboarding.heard_from && <p><span className="text-muted-foreground">How I heard about NIEC: </span>{onboarding.heard_from}</p>}
                {onboarding.comm_preference && <p><span className="text-muted-foreground">Preferred communication: </span>{onboarding.comm_preference}</p>}
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
    </div>
  );
}
