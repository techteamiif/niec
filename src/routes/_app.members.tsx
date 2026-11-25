import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { ORG_TYPE_LABELS } from "@/lib/niec";
import { useAuth } from "@/lib/auth";
import { Building2, MapPin, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { CustomSelect } from "@/components/ui/custom-select";

export const Route = createFileRoute("/_app/members")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: MembersPage,
});

function MembersPage() {
  const { user } = useAuth();
  const { q: initialQ } = Route.useSearch();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState(initialQ ?? "");
  const [accountTab, setAccountTab] = useState<"individual" | "organisation">("individual");
  const [tier, setTier] = useState("all");
  const [org, setOrg] = useState("all");

  useEffect(() => {
    if (initialQ !== undefined) setSearch(initialQ);
  }, [initialQ]);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, organisation_name, organisation_type, role_title, membership_status, bio, location, sdg_focus, sectors, linkedin_url, website_url, joined_at",
        )
        .eq("membership_status", "active")
        .neq("membership_tier", "observer");
      if (tier !== "all") q = q.eq("membership_tier", tier as any);
      if (accountTab === "organisation" && org !== "all") {
        q = q.eq("organisation_type", org as any);
      }
      const { data } = await q.limit(200);
      setMembers(data ?? []);
    })();
  }, [accountTab, tier, org]);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const isOrganisation =
      Boolean(m.organisation_name) && m.organisation_name !== "Individual member";
    return (
      (!isOrganisation && (m.full_name ?? "").toLowerCase().includes(s)) ||
      (m.organisation_name ?? "").toLowerCase().includes(s) ||
      (m.sectors ?? []).join(" ").toLowerCase().includes(s) ||
      (m.sdg_focus ?? []).join(" ").toLowerCase().includes(s)
    );
  }).filter((m) => {
    const isOrganisation =
      Boolean(m.organisation_name) && m.organisation_name !== "Individual member";
    return accountTab === "organisation" ? isOrganisation : !isOrganisation;
  });

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Member directory</h1>
        <p className="text-sm text-muted-foreground">
          {filtered.length} active{" "}
          {accountTab === "organisation"
            ? filtered.length === 1
              ? "organisation"
              : "organisations"
            : filtered.length === 1
              ? "individual"
              : "individuals"}{" "}
          in NIEC.
        </p>
      </div>

      <div className="mb-5 flex gap-2 border-b" role="tablist" aria-label="Member account type">
        {([
          ["individual", "Individuals"],
          ["organisation", "Organisations"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={accountTab === key}
            onClick={() => setAccountTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              accountTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, organisation, sector…"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <CustomSelect
          value={tier}
          onValueChange={setTier}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:w-40 sm:flex-none"
        >
          <option value="all">All tiers</option>
          <option value="contributor">Enterprise</option>
          <option value="growth_partner">Growth Partner</option>
          <option value="anchor">Anchor</option>
          <option value="strategic_partner">Strategic Partner</option>
        </CustomSelect>
        {accountTab === "organisation" && (
          <CustomSelect
            value={org}
            onValueChange={setOrg}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:w-40 sm:flex-none"
          >
            <option value="all">All organisations</option>
            {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </CustomSelect>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const isOrganisation =
            Boolean(m.organisation_name) && m.organisation_name !== "Individual member";

          return (
            <div key={m.id} className="rounded-xl border bg-card p-5 transition hover:shadow-sm">
              <Link
                to="/member/$memberId"
                params={{ memberId: m.id }}
                className="flex flex-col items-center rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isOrganisation ? (
                  <>
                    <UserAvatar name={m.organisation_name} src={m.avatar_url} size={72} />
                    <div className="mt-3 flex items-center gap-2 text-lg font-semibold">
                      <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span>{m.organisation_name}</span>
                    </div>
                    {m.location && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {m.location}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <UserAvatar name={m.full_name} src={m.avatar_url} size={72} />
                    <div className="mt-3 font-medium">{m.full_name || "—"}</div>
                    {m.role_title && (
                      <div className="mt-1 text-sm text-muted-foreground">{m.role_title}</div>
                    )}
                    {m.location && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {m.location}
                      </div>
                    )}
                  </>
                )}
              </Link>
              {user && m.id !== user.id && (
                <button
                  type="button"
                  onClick={() => toast.info("Message is not available at the moment")}
                  className="mx-auto mt-4 flex w-fit items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <MessageCircle className="h-3 w-3" /> Message
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            No members match.
          </div>
        )}
      </div>
    </div>
  );
}
