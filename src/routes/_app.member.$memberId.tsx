import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Building2, Globe, Linkedin, MapPin, MessageCircle } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { ORG_TYPE_LABELS } from "@/lib/niec";
import { toast } from "sonner";

type MemberProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "full_name"
  | "avatar_url"
  | "organisation_name"
  | "organisation_type"
  | "role_title"
  | "bio"
  | "location"
  | "sectors"
  | "sdg_focus"
  | "linkedin_url"
  | "website_url"
  | "joined_at"
>;

export const Route = createFileRoute("/_app/member/$memberId")({
  component: MemberDetailPage,
});

function externalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function MemberDetailPage() {
  const { memberId } = Route.useParams();
  const { user } = useAuth();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMember(null);

    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, organisation_name, organisation_type, role_title, bio, location, sectors, sdg_focus, linkedin_url, website_url, joined_at",
        )
        .eq("id", memberId)
        .eq("membership_status", "active")
        .neq("membership_tier", "observer")
        .maybeSingle();

      if (!active) return;
      if (error) {
        toast.error(`Could not load member profile: ${error.message}`);
      }
      setMember(data);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [memberId]);

  const linkedinUrl = externalUrl(member?.linkedin_url ?? null);
  const websiteUrl = externalUrl(member?.website_url ?? null);

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/members"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Member directory
      </Link>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Loading member profile…
        </div>
      ) : !member ? (
        <div className="rounded-xl border bg-card p-8">
          <h1 className="font-display text-2xl">Member not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This profile is unavailable or not visible in the member directory.
          </p>
        </div>
      ) : (
        <article className="mx-auto max-w-4xl overflow-hidden rounded-xl border bg-card">
          <div className="h-28 bg-[#D4A017]" />
          <div className="px-6 pb-7 md:px-9">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <UserAvatar
                name={member.full_name}
                src={member.avatar_url}
                size={96}
                className="border-4 border-card"
              />
              {user && member.id !== user.id && (
                <Link
                  to="/messages"
                  search={{ to: member.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </Link>
              )}
            </div>

            <div className="mt-4">
              <h1 className="font-display text-3xl">{member.full_name || "Member"}</h1>
              {member.role_title && (
                <p className="mt-1 text-muted-foreground">{member.role_title}</p>
              )}
              {member.organisation_name && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{member.organisation_name}</span>
                  {member.organisation_type && (
                    <span className="text-muted-foreground">
                      · {ORG_TYPE_LABELS[member.organisation_type]}
                    </span>
                  )}
                </div>
              )}
              {member.location && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {member.location}
                </div>
              )}
            </div>

            {member.bio && (
              <section className="mt-7 border-t pt-6">
                <h2 className="font-display text-lg">About</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {member.bio}
                </p>
              </section>
            )}

            {!!member.sectors?.length && (
              <section className="mt-6">
                <h2 className="font-display text-lg">Sectors</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {member.sectors.map((sector) => (
                    <span
                      key={sector}
                      className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                    >
                      {sector.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {!!member.sdg_focus?.length && (
              <section className="mt-6">
                <h2 className="font-display text-lg">SDG focus</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {member.sdg_focus.join(", ")}
                </p>
              </section>
            )}

            {(linkedinUrl || websiteUrl || member.joined_at) && (
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
                {member.joined_at && (
                  <span className="text-muted-foreground">
                    Member since {format(new Date(member.joined_at), "MMMM yyyy")}
                  </span>
                )}
              </section>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
