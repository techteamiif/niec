import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TierBadge } from "@/components/TierBadge";
import { UserAvatar } from "@/components/Avatar";
import { POST_TYPE_COLOR, POST_TYPE_LABELS, TIER_LABELS } from "@/lib/niec";
import { capFor, nextTier } from "@/lib/entitlements";
import { Calendar, MessageSquare, TrendingUp, Users, Sparkles, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-md ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 font-display text-3xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ members: 0, deals: 0, events: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [usage, setUsage] = useState<{ cop_count: number; mentorship_this_month: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [m, d, e, p, ev] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("membership_status", "active"),
        supabase.from("deal_opportunities").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("start_date", new Date().toISOString()),
        supabase.from("community_posts")
          .select("*, profiles:author_id(full_name, organisation_name, avatar_url, membership_tier)")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("events").select("*").gte("start_date", new Date().toISOString()).order("start_date").limit(3),
      ]);
      setStats({ members: m.count ?? 0, deals: d.count ?? 0, events: e.count ?? 0 });
      setPosts(p.data ?? []);
      setEvents(ev.data ?? []);
    })();
    if (user) {
      supabase.rpc("get_tier_usage", { _user_id: user.id }).then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setUsage(row as any);
      });
    }
  }, [user]);

  const tier = profile?.membership_tier ?? "observer";
  const copCap = capFor(tier, "cops.join") ?? 0;
  const mentorCap = capFor(tier, "mentorship.book") ?? 0;
  const upgradeTarget = nextTier(tier);

  return (
    <div className="p-6 lg:p-10">
      {/* Welcome banner */}
      <div className="rounded-2xl border bg-gradient-to-br from-navy via-navy to-primary p-8 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">Welcome back</div>
            <h1 className="mt-1 font-display text-3xl md:text-4xl">{profile?.full_name || "Member"}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-white/80">
              <TierBadge tier={profile?.membership_tier} />
              <span>{profile?.organisation_name || "—"}</span>
            </div>
          </div>
          <Link to="/community" className="rounded-md bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">
            Open community →
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users}       label="Active members"  value={stats.members} accent="bg-primary/15 text-primary" />
        <StatCard icon={TrendingUp}  label="Open deals"      value={stats.deals}   accent="bg-gold/25 text-gold-foreground" />
        <StatCard icon={Calendar}    label="Upcoming events" value={stats.events}  accent="bg-success/20 text-primary" />
        <StatCard icon={MessageSquare} label="Engagement"    value={profile?.engagement_score ?? 0} accent="bg-secondary/15 text-secondary" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Latest from the community</h2>
            <Link to="/community" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {posts.length === 0 && (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No posts yet. Be the first to share something in the community.
              </div>
            )}
            {posts.map((p) => (
              <article key={p.id} className="rounded-xl border bg-card p-5 transition hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <UserAvatar name={p.profiles?.full_name ?? "?"} src={p.profiles?.avatar_url} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{p.profiles?.full_name}</span>
                      <TierBadge tier={p.profiles?.membership_tier} />
                    </div>
                    <div className="text-xs text-muted-foreground">{p.profiles?.organisation_name} · {format(new Date(p.created_at), "PP")}</div>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${POST_TYPE_COLOR[p.post_type]}`}>{POST_TYPE_LABELS[p.post_type]}</span>
                </div>
                <h3 className="mt-3 font-display text-lg">{p.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.content}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>♥ {p.likes_count}</span>
                  <span>💬 {p.comments_count}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <OnboardingChecklist />
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming events</div>
            <div className="space-y-3">
              {events.length === 0 && <div className="text-sm text-muted-foreground">None scheduled.</div>}
              {events.map((e) => (
                <Link key={e.id} to="/events" className="block rounded-md border border-border/60 p-3 transition hover:border-primary">
                  <div className="text-xs text-primary">{format(new Date(e.start_date), "PPP")}</div>
                  <div className="mt-1 text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.is_virtual ? "Virtual" : e.location}</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your plan</div>
              <TierBadge tier={tier} />
            </div>
            <div className="mt-3 font-display text-lg">{TIER_LABELS[tier]}</div>
            {usage && (
              <div className="mt-3 space-y-2 text-xs">
                <UsageRow
                  label="Communities of Practice"
                  used={usage.cop_count}
                  cap={copCap}
                />
                <UsageRow
                  label="Mentorship this month"
                  used={usage.mentorship_this_month}
                  cap={mentorCap}
                />
              </div>
            )}
            {upgradeTarget && (
              <Link
                to="/upgrade"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade to {TIER_LABELS[upgradeTarget]}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function UsageRow({ label, used, cap }: { label: string; used: number; cap: number }) {
  const unlimited = cap >= 999;
  const pct = unlimited ? 0 : Math.min(100, cap > 0 ? (used / cap) * 100 : 100);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used}{unlimited ? " · unlimited" : ` / ${cap}`}
        </span>
      </div>
      {!unlimited && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
