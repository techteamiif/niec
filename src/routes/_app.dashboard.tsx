import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { POST_TYPE_COLOR, POST_TYPE_LABELS, TIER_LABELS } from "@/lib/niec";
import { capFor, nextTier } from "@/lib/entitlements";
import { formatEventSchedule } from "@/lib/event-schedule";
import {
  Award,
  ArrowRight,
  Building2,
  Calendar,
  MessageSquare,
  MessageCircle,
  Heart,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import { format } from "date-fns";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { requireEnterpriseForWrite } from "@/lib/member-write-access";
import { toast } from "sonner";

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
  const { profile, user, isStaff } = useAuth();
  const [stats, setStats] = useState({ members: 0, deals: 0, events: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<any[]>([]);
  const [usage, setUsage] = useState<{ cop_count: number; mentorship_this_month: number } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const [m, d, e, p, ev] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("membership_status", "active"),
        supabase
          .from("deal_opportunities")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .gte("start_date", new Date().toISOString()),
        supabase
          .from("community_posts")
          .select(
            "*, profiles:author_id(full_name, organisation_name, avatar_url, application_data)",
          )
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("events")
          .select("id, title, start_date, end_date, schedule, location, is_virtual, event_type")
          .gte("start_date", new Date().toISOString())
          .order("start_date")
          .limit(3),
      ]);
      setStats({ members: m.count ?? 0, deals: d.count ?? 0, events: e.count ?? 0 });
      setPosts(p.data ?? []);
      setEvents(ev.data ?? []);
      if (user && p.data?.length) {
        const { data: likes, error } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in(
            "post_id",
            p.data.map((post) => post.id),
          );
        if (error) toast.error(`Could not load post reactions: ${error.message}`);
        setLikedPosts(new Set((likes ?? []).map((like) => like.post_id)));
      } else {
        setLikedPosts(new Set());
      }
    })();
    if (user) {
      supabase.rpc("get_tier_usage", { _user_id: user.id }).then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setUsage(row as any);
      });
    }
  }, [user]);

  const toggleLike = async (postId: string) => {
    if (!user || !requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;
    const isLiked = likedPosts.has(postId);
    if (isLiked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) return toast.error(`Could not remove reaction: ${error.message}`);
      setLikedPosts((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count - 1) } : post,
        ),
      );
      return;
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: user.id });
    if (error) return toast.error(`Could not react to post: ${error.message}`);
    setLikedPosts((current) => new Set(current).add(postId));
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post,
      ),
    );
  };

  const tier = profile?.membership_tier ?? "observer";
  const copCap = capFor(tier, "cops.join") ?? 0;
  const mentorCap = capFor(tier, "mentorship.book") ?? 0;
  const upgradeTarget = nextTier(tier);

  return (
    <div className="p-6 lg:p-10">
      {/* Welcome banner */}
      <div className="relative flex min-h-[164px] flex-col justify-center gap-5 overflow-hidden rounded-[28px] border border-black/[0.04] bg-white px-6 py-7 text-black shadow-[0_3px_8px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-14 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-full aspect-square rounded-r-full bg-[#f4f4f4]"
        />
        <div className="relative z-10">
          <div className="text-[13px] font-semibold text-black">Welcome Back,</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
            <h1 className="font-sans text-2xl font-bold leading-tight tracking-tight">
              {profile?.full_name || "Member"}
            </h1>
            <AccountTypeBadge applicationData={profile?.application_data} />
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#27F52F]/30 px-2 text-xs font-semibold text-[#003302]">
              <Award aria-hidden="true" className="h-4 w-4" />
              {TIER_LABELS[tier] ?? tier}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#003302]">
            <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{profile?.organisation_name || "—"}</span>
          </div>
        </div>
        <div className="relative z-10">
          <Link
            to="/community"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[#003302] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#00682e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <UsersRound aria-hidden="true" className="h-[18px] w-[18px]" />
            Open Community
          </Link>
        </div>
      </div>

      {/* <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users}       label="Active members"  value={stats.members} accent="bg-primary/15 text-primary" />
        <StatCard icon={TrendingUp}  label="Open deals"      value={stats.deals}   accent="bg-gold/25 text-gold-foreground" />
        <StatCard icon={Calendar}    label="Upcoming events" value={stats.events}  accent="bg-success/20 text-primary" />
        <StatCard icon={MessageSquare} label="Engagement"    value={profile?.engagement_score ?? 0} accent="bg-secondary/15 text-secondary" />
      </div> */}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Latest from the community</h2>
            <Link to="/community" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {posts.length === 0 && (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No posts yet. Be the first to share something in the community.
              </div>
            )}
            {posts.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border bg-card p-5 transition hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Link
                    to="/member/$memberId"
                    params={{ memberId: p.author_id }}
                    search={{ postId: p.id }}
                    aria-label={`View ${p.profiles?.full_name ?? "member"}'s profile`}
                    className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <UserAvatar
                      name={p.profiles?.full_name ?? "?"}
                      src={p.profiles?.avatar_url}
                      size={32}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Link
                        to="/member/$memberId"
                        params={{ memberId: p.author_id }}
                        search={{ postId: p.id }}
                        className="font-medium hover:text-primary"
                      >
                        {p.profiles?.full_name}
                      </Link>
                      <AccountTypeBadge applicationData={p.profiles?.application_data} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.profiles?.organisation_name} · {format(new Date(p.created_at), "PP")}
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${POST_TYPE_COLOR[p.post_type]}`}
                  >
                    {POST_TYPE_LABELS[p.post_type]}
                  </span>
                </div>
                <Link
                  to="/community/$postId"
                  params={{ postId: p.id }}
                  className="mt-3 block rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <h3 className="font-display text-lg">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.content}</p>
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="mt-3 max-h-[320px] w-full rounded-lg bg-muted object-contain"
                    />
                  )}
                </Link>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleLike(p.id)}
                    aria-pressed={likedPosts.has(p.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${likedPosts.has(p.id) ? "text-destructive" : "hover:bg-muted"}`}
                  >
                    <Heart
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 ${likedPosts.has(p.id) ? "fill-current" : ""}`}
                    />
                    {p.likes_count}
                  </button>
                  <Link
                    to="/community/$postId"
                    params={{ postId: p.id }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-muted"
                  >
                    <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
                    {p.comments_count}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <OnboardingChecklist />
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming events
            </div>
            <div className="space-y-3">
              {events.length === 0 && (
                <div className="text-sm text-muted-foreground">None scheduled.</div>
              )}
              {events.map((e) => (
                <Link
                  key={e.id}
                  to="/events"
                  className="block rounded-md border border-border/60 p-3 transition hover:border-primary"
                >
                  <div className="text-xs text-primary">
                    {formatEventSchedule(e.schedule, e.start_date, e.end_date).join(" · ")}
                  </div>
                  <div className="mt-1 text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.event_type === "hybrid"
                      ? `Hybrid${e.location ? ` · ${e.location}` : ""}`
                      : e.event_type === "onsite"
                        ? e.location || "Location to be announced"
                        : e.is_virtual
                          ? "Online"
                          : e.location}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your plan
              </div>
              <TierBadge tier={tier} />
            </div>
            <div className="mt-3 font-display text-lg">{TIER_LABELS[tier]}</div>
            {usage && (
              <div className="mt-3 space-y-2 text-xs">
                <UsageRow label="Communities of Practice" used={usage.cop_count} cap={copCap} />
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
          {used}
          {unlimited ? " · unlimited" : ` / ${cap}`}
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
