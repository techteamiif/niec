import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { COPS, TIER_LABELS } from "@/lib/niec";
import { formatEventSchedule } from "@/lib/event-schedule";
import {
  Award,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  Layers,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

type UpcomingEvent = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "start_date" | "end_date" | "event_type"
>;
type KnowledgeResource = Pick<
  Database["public"]["Tables"]["knowledge_resources"]["Row"],
  "id" | "title" | "resource_type"
>;

function Dashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  useEffect(() => {
    const loadHomeContent = async () => {
      const [eventsResult, resourcesResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, start_date, end_date, event_type")
          .gte("start_date", new Date().toISOString())
          .order("start_date")
          .limit(3),
        supabase
          .from("knowledge_resources")
          .select("id, title, resource_type")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (eventsResult.error) {
        setEventsError(eventsResult.error.message);
        toast.error(`Unable to load upcoming events: ${eventsResult.error.message}`);
      } else {
        setEvents(eventsResult.data ?? []);
      }
      setEventsLoading(false);

      if (resourcesResult.error) {
        setResourcesError(resourcesResult.error.message);
        toast.error(`Unable to load Knowledge Hub resources: ${resourcesResult.error.message}`);
      } else {
        setResources(resourcesResult.data ?? []);
      }
      setResourcesLoading(false);
    };

    void loadHomeContent();
  }, []);

  const tier = profile?.membership_tier ?? "observer";

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
            Open Feeds
          </Link>
        </div>
      </div>

      {/* <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users}       label="Active members"  value={stats.members} accent="bg-primary/15 text-primary" />
        <StatCard icon={TrendingUp}  label="Open deals"      value={stats.deals}   accent="bg-gold/25 text-gold-foreground" />
        <StatCard icon={Calendar}    label="Upcoming events" value={stats.events}  accent="bg-success/20 text-primary" />
        <StatCard icon={MessageSquare} label="Engagement"    value={profile?.engagement_score ?? 0} accent="bg-secondary/15 text-secondary" />
      </div> */}

      <div className="mt-10 grid gap-6 xl:grid-cols-3">
        <section className="min-w-0 rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming events
            </h2>
            <Link to="/events" className="shrink-0 text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">Loading events…</p>
            ) : eventsError ? (
              <p className="text-sm text-destructive">Unable to load upcoming events.</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            ) : (
              events.map((event) => (
                <Link
                  key={event.id}
                  to="/events"
                  className="block rounded-md border border-border/60 p-3 transition hover:border-primary"
                >
                  <div className="text-xs text-primary">
                    {formatEventSchedule(null, event.start_date, event.end_date).join(
                      " · ",
                    )}
                  </div>
                  <div className="mt-1 text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.event_type.replace(/_/g, " ")}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <BookOpen className="h-5 w-5 text-primary" />
              Knowledge Hub
            </h2>
            <Link to="/knowledge" className="shrink-0 text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {resourcesLoading ? (
              <p className="text-sm text-muted-foreground">Loading resources…</p>
            ) : resourcesError ? (
              <p className="text-sm text-destructive">Unable to load Knowledge Hub resources.</p>
            ) : resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resources have been published yet.</p>
            ) : (
              resources.map((resource) => (
                <Link
                  key={resource.id}
                  to="/knowledge/$resourceId"
                  params={{ resourceId: resource.id }}
                  className="flex items-start gap-3 rounded-md border border-border/60 p-3 transition hover:border-primary"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-xs capitalize text-muted-foreground">
                      {resource.resource_type.replace(/_/g, " ")}
                    </span>
                    <span className="block text-sm font-medium">{resource.title}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Layers className="h-5 w-5 text-primary" />
              COPs
            </h2>
            <Link to="/cops" className="shrink-0 text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {COPS.map((cop) => (
              <Link
                key={cop.key}
                to="/cops/$cop"
                params={{ cop: cop.key }}
                className="group flex items-center justify-between gap-3 rounded-md border border-border/60 p-3 transition hover:border-primary"
              >
                <span className="truncate text-sm font-medium">{cop.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Previous dashboard sections retained for reference.
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
      */}
    </div>
  );
}
