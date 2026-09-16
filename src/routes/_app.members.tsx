import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import { ORG_TYPE_LABELS } from "@/lib/niec";
import { useAuth } from "@/lib/auth";
import { Search, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_app/members")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: MembersPage,
});

function MembersPage() {
  const { user } = useAuth();
  const { q: initialQ } = Route.useSearch();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState(initialQ ?? "");
  const [tier, setTier] = useState("all");
  const [org, setOrg] = useState("all");

  useEffect(() => { if (initialQ !== undefined) setSearch(initialQ); }, [initialQ]);

  useEffect(() => {
    (async () => {
      let q = supabase.from("profiles").select("id, full_name, avatar_url, organisation_name, organisation_type, role_title, membership_tier, membership_status, bio, location, sdg_focus, sectors, linkedin_url, website_url, joined_at").eq("membership_status", "active");
      if (tier !== "all") q = q.eq("membership_tier", tier as any);
      if (org !== "all") q = q.eq("organisation_type", org as any);
      const { data } = await q.limit(200);
      setMembers(data ?? []);
    })();
  }, [tier, org]);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (m.full_name ?? "").toLowerCase().includes(s) ||
      (m.organisation_name ?? "").toLowerCase().includes(s) ||
      (m.sectors ?? []).join(" ").toLowerCase().includes(s) ||
      (m.sdg_focus ?? []).join(" ").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Member directory</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} active members in NIEC.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, organisation, sector…"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
        </div>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All tiers</option>
          <option value="observer">Observer</option>
          <option value="contributor">Contributor</option>
          <option value="growth_partner">Growth Partner</option>
          <option value="anchor">Anchor</option>
          <option value="strategic_partner">Strategic Partner</option>
        </select>
        <select value={org} onChange={(e) => setOrg(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All organisations</option>
          {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-xl border bg-card p-5 transition hover:shadow-sm">
            <div className="flex items-start gap-3">
              <UserAvatar name={m.full_name} src={m.avatar_url} size={48} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{m.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{m.role_title}</div>
                <div className="mt-1 text-sm">{m.organisation_name}</div>
                <div className="mt-2"><TierBadge tier={m.membership_tier} /></div>
              </div>
            </div>
            {m.location && <div className="mt-3 text-xs text-muted-foreground">📍 {m.location}</div>}
            {m.sectors?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {m.sectors.slice(0, 4).map((s: string) => (
                  <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{s.replace(/_/g, " ")}</span>
                ))}
              </div>
            )}
            {m.sdg_focus?.length > 0 && (
              <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                SDGs: {m.sdg_focus.slice(0, 6).join(", ")}
              </div>
            )}
            {user && m.id !== user.id && (
              <Link to="/messages" search={{ to: m.id }}
                className="mt-4 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <MessageCircle className="h-3 w-3" /> Message
              </Link>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No members match.</div>
        )}
      </div>
    </div>
  );
}
