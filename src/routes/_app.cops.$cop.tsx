import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { COPS, COP_SLUG_REDIRECTS, initials, tierMeets } from "@/lib/niec";
import { toast } from "sonner";
import { ArrowLeft, Crown, Pin, Plus, Trophy, Users, Vote, MessageSquare, Calendar, BookOpen, Layers, FileText, ThumbsUp, AlertTriangle, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/cops/$cop")({
  component: CopWorkspace,
});

function CopWorkspace() {
  const { cop } = Route.useParams();
  // Redirect legacy slugs (from before the IIF programme-alignment rename) to the new ones.
  const redirect = COP_SLUG_REDIRECTS[cop];
  if (redirect) return <Navigate to="/cops/$cop" params={{ cop: redirect }} replace />;
  const meta = COPS.find((c) => c.key === cop);

  const { user, profile, isStaff } = useAuth();
  const [tab, setTab] = useState("overview");
  const [members, setMembers] = useState<any[]>([]);
  const [chairs, setChairs] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rfcs, setRfcs] = useState<any[]>([]);
  const [rfcReactions, setRfcReactions] = useState<Record<string, Record<string, number>>>({});
  const [myRfcReactions, setMyRfcReactions] = useState<Record<string, string>>({});
  const [joined, setJoined] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<number, number>>>({});
  const [myVotes, setMyVotes] = useState<Record<string, Set<number>>>({});
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});

  const isChair = useMemo(() => chairs.some((c) => c.user_id === user?.id), [chairs, user]);
  const canManage = isStaff || isChair;

  if (!meta) {
    return (
      <div className="p-10">
        <p>Unknown community of practice.</p>
        <Link to="/cops" className="text-primary underline">Back</Link>
      </div>
    );
  }

  const load = async () => {
    const [mem, role, p, e, r, wg, pl] = await Promise.all([
      supabase.from("cop_memberships").select("member_id, joined_at, profiles!inner(id, full_name, avatar_url, organisation_name, membership_tier)").eq("cop", cop as any),
      supabase.from("cop_roles").select("user_id, role, profiles:user_id(full_name, avatar_url)").eq("cop", cop as any),
      supabase.from("community_posts").select("*, profiles:author_id(full_name, avatar_url)").eq("community_of_practice", cop as any).order("pinned_in_cop", { ascending: false }).order("created_at", { ascending: false }).limit(50),
      supabase.from("events").select("*").gte("start_date", new Date().toISOString()).order("start_date").limit(20),
      supabase.from("knowledge_resources").select("*").eq("community_of_practice", cop as any).order("created_at", { ascending: false }).limit(50),
      supabase.from("working_groups").select("*, profiles:lead_id(full_name, avatar_url)").eq("cop", cop as any).order("created_at", { ascending: false }),
      supabase.from("polls").select("*").eq("cop", cop as any).order("created_at", { ascending: false }),
    ]);
    setMembers(mem.data ?? []);
    setChairs(role.data ?? []);
    setPosts(p.data ?? []);
    setEvents((e.data ?? []).filter((ev: any) => !ev.community_of_practice || ev.community_of_practice === cop));
    setResources(r.data ?? []);
    setGroups(wg.data ?? []);
    setPolls(pl.data ?? []);
    setJoined((mem.data ?? []).some((m: any) => m.member_id === user?.id));

    // leaderboard
    const { data: lb } = await supabase.from("cop_leaderboard").select("*").eq("cop", cop as any).order("engagement_score", { ascending: false }).limit(10);
    setLeaderboard(lb ?? []);

    // poll votes
    if ((pl.data ?? []).length) {
      const ids = pl.data!.map((x: any) => x.id);
      const { data: votes } = await supabase.from("poll_votes").select("poll_id, option_index, user_id").in("poll_id", ids);
      const counts: Record<string, Record<number, number>> = {};
      const mine: Record<string, Set<number>> = {};
      (votes ?? []).forEach((v: any) => {
        counts[v.poll_id] = counts[v.poll_id] ?? {};
        counts[v.poll_id][v.option_index] = (counts[v.poll_id][v.option_index] ?? 0) + 1;
        if (v.user_id === user?.id) {
          mine[v.poll_id] = mine[v.poll_id] ?? new Set();
          mine[v.poll_id].add(v.option_index);
        }
      });
      setVoteCounts(counts); setMyVotes(mine);
    }

    // group members
    if ((wg.data ?? []).length) {
      const gids = wg.data!.map((g: any) => g.id);
      const { data: gm } = await supabase.from("working_group_members").select("group_id, user_id").in("group_id", gids);
      const map: Record<string, string[]> = {};
      (gm ?? []).forEach((m: any) => {
        map[m.group_id] = map[m.group_id] ?? [];
        map[m.group_id].push(m.user_id);
      });
      setGroupMembers(map);
    }

    // RFCs
    const { data: rd } = await supabase.from("rfcs").select("*, profiles:author_id(full_name, avatar_url)").eq("cop", cop as any).order("created_at", { ascending: false });
    setRfcs(rd ?? []);
    if ((rd ?? []).length) {
      const ids = rd!.map((x: any) => x.id);
      const { data: reacts } = await supabase.from("rfc_reactions").select("rfc_id, reaction, user_id").in("rfc_id", ids);
      const counts: Record<string, Record<string, number>> = {};
      const mine: Record<string, string> = {};
      (reacts ?? []).forEach((r: any) => {
        counts[r.rfc_id] = counts[r.rfc_id] ?? {};
        counts[r.rfc_id][r.reaction] = (counts[r.rfc_id][r.reaction] ?? 0) + 1;
        if (r.user_id === user?.id) mine[r.rfc_id] = r.reaction;
      });
      setRfcReactions(counts); setMyRfcReactions(mine);
    } else {
      setRfcReactions({}); setMyRfcReactions({});
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cop, user]);

  const join = async () => {
    if (!user) return;
    if (!tierMeets(profile?.membership_tier, "contributor")) return toast.error("Contributor tier required.");
    const { error } = await supabase.from("cop_memberships").insert({ member_id: user.id, cop: cop as any });
    if (error) return toast.error(error.message);
    toast.success("Joined " + meta.name);
    load();
  };
  const leave = async () => {
    if (!user) return;
    await supabase.from("cop_memberships").delete().eq("member_id", user.id).eq("cop", cop as any);
    toast.success("Left CoP"); load();
  };

  const togglePin = async (postId: string, current: boolean) => {
    const { error } = await supabase.from("community_posts").update({ pinned_in_cop: !current }).eq("id", postId);
    if (error) return toast.error(error.message);
    load();
  };

  const vote = async (pollId: string, idx: number, multi: boolean) => {
    if (!user) return;
    const mine = myVotes[pollId] ?? new Set();
    if (mine.has(idx)) {
      await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id).eq("option_index", idx);
    } else {
      if (!multi && mine.size > 0) {
        await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
      }
      const { error } = await supabase.from("poll_votes").insert({ poll_id: pollId, user_id: user.id, option_index: idx });
      if (error) return toast.error(error.message);
    }
    load();
  };

  const toggleGroupMembership = async (gid: string) => {
    if (!user) return;
    const in_ = (groupMembers[gid] ?? []).includes(user.id);
    if (in_) {
      await supabase.from("working_group_members").delete().eq("group_id", gid).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("working_group_members").insert({ group_id: gid, user_id: user.id });
      if (error) return toast.error(error.message);
    }
    load();
  };

  const reactRfc = async (rfcId: string, reaction: "support" | "concern" | "watching") => {
    if (!user) return;
    const mine = myRfcReactions[rfcId];
    if (mine === reaction) {
      await supabase.from("rfc_reactions").delete().eq("rfc_id", rfcId).eq("user_id", user.id);
    } else if (mine) {
      await supabase.from("rfc_reactions").update({ reaction }).eq("rfc_id", rfcId).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("rfc_reactions").insert({ rfc_id: rfcId, user_id: user.id, reaction });
      if (error) return toast.error(error.message);
    }
    load();
  };

  const decideRfc = async (rfcId: string, status: "accepted" | "parked" | "rejected", note: string) => {
    if (!user) return;
    const { error } = await supabase.from("rfcs").update({ status, decided_by: user.id, decided_at: new Date().toISOString(), decision_note: note }).eq("id", rfcId);
    if (error) return toast.error(error.message);
    toast.success("Decision recorded");
    load();
  };

  return (
    <div className="p-6 lg:p-10">
      <Link to="/cops" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All CoPs
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-2" style={{ backgroundColor: meta.color }} />
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl">{meta.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {members.length} members</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {groups.length} working groups</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Vote className="h-3 w-3" /> {polls.length} polls</span>
            </div>
          </div>
          <div className="flex gap-2">
            {joined
              ? <Button variant="outline" onClick={leave}>Leave CoP</Button>
              : <Button onClick={join}>Join CoP</Button>}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><BookOpen className="mr-1 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="feed"><MessageSquare className="mr-1 h-4 w-4" /> Feed</TabsTrigger>
          <TabsTrigger value="groups"><Layers className="mr-1 h-4 w-4" /> Working Groups</TabsTrigger>
          <TabsTrigger value="polls"><Vote className="mr-1 h-4 w-4" /> Polls</TabsTrigger>
          <TabsTrigger value="proposals"><FileText className="mr-1 h-4 w-4" /> Proposals {rfcs.filter((r) => r.status === "open").length > 0 && <Badge variant="secondary" className="ml-1">{rfcs.filter((r) => r.status === "open").length}</Badge>}</TabsTrigger>
          <TabsTrigger value="events"><Calendar className="mr-1 h-4 w-4" /> Events</TabsTrigger>
          <TabsTrigger value="resources"><BookOpen className="mr-1 h-4 w-4" /> Resources</TabsTrigger>
          <TabsTrigger value="members"><Users className="mr-1 h-4 w-4" /> Members</TabsTrigger>
          <TabsTrigger value="leaderboard"><Trophy className="mr-1 h-4 w-4" /> Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 lg:col-span-2">
              <h2 className="font-display text-lg">Leadership</h2>
              {chairs.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No chairs assigned yet. Staff can appoint chairs from the admin CRM.</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {chairs.map((c: any) => (
                    <div key={c.user_id + c.role} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(c.profiles?.full_name ?? "")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{c.profiles?.full_name}</div>
                        <div className="text-xs text-muted-foreground capitalize inline-flex items-center gap-1">
                          <Crown className="h-3 w-3" /> {c.role.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <h2 className="mt-6 font-display text-lg">Pinned</h2>
              <div className="mt-3 space-y-3">
                {posts.filter((p) => p.pinned_in_cop).slice(0, 3).map((p) => (
                  <PostCard key={p.id} post={p} canManage={canManage} onPin={togglePin} />
                ))}
                {posts.filter((p) => p.pinned_in_cop).length === 0 && (
                  <p className="text-sm text-muted-foreground">No pinned posts yet.</p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-display text-base">Quick stats</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Members</dt><dd className="font-semibold">{members.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Working groups</dt><dd className="font-semibold">{groups.filter((g) => g.status === "active").length} active</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Recent posts (30d)</dt><dd className="font-semibold">{posts.filter((p) => new Date(p.created_at) > new Date(Date.now() - 30 * 86400000)).length}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Resources</dt><dd className="font-semibold">{resources.length}</dd></div>
                </dl>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-display text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-gold" /> Top contributors</h3>
                <div className="mt-3 space-y-2">
                  {leaderboard.slice(0, 5).map((l: any, i: number) => (
                    <div key={l.user_id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={l.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(l.full_name ?? "")}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{l.full_name}</span>
                      <span className="text-xs font-semibold text-primary">{l.engagement_score}</span>
                    </div>
                  ))}
                  {leaderboard.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Feed */}
        <TabsContent value="feed" className="mt-6">
          <div className="space-y-3">
            {posts.map((p) => <PostCard key={p.id} post={p} canManage={canManage} onPin={togglePin} />)}
            {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet. Start the conversation from the <Link to="/community" className="text-primary underline">Community</Link> feed.</p>}
          </div>
        </TabsContent>

        {/* Working groups */}
        <TabsContent value="groups" className="mt-6">
          <div className="mb-4 flex justify-end">
            {canManage && <NewGroupDialog cop={cop} onCreated={load} />}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => {
              const gm = groupMembers[g.id] ?? [];
              const inGroup = user ? gm.includes(user.id) : false;
              return (
                <div key={g.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg">{g.name}</h3>
                      <Badge variant={g.status === "active" ? "default" : "secondary"} className="mt-1">{g.status}</Badge>
                    </div>
                    <Button size="sm" variant={inGroup ? "outline" : "default"} onClick={() => toggleGroupMembership(g.id)} disabled={!joined}>
                      {inGroup ? "Leave" : "Join"}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
                  {g.deliverable && <p className="mt-2 text-xs"><span className="font-semibold">Deliverable:</span> {g.deliverable}</p>}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={g.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback>{initials(g.profiles?.full_name ?? "")}</AvatarFallback>
                    </Avatar>
                    Lead: {g.profiles?.full_name} · {gm.length} member{gm.length === 1 ? "" : "s"}
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-sm text-muted-foreground">No working groups yet.{canManage && " Create the first one above."}</p>}
          </div>
        </TabsContent>

        {/* Polls */}
        <TabsContent value="polls" className="mt-6">
          <div className="mb-4 flex justify-end">
            {canManage && <NewPollDialog cop={cop} onCreated={load} />}
          </div>
          <div className="space-y-4">
            {polls.map((p) => {
              const opts: string[] = (p.options as any) ?? [];
              const counts = voteCounts[p.id] ?? {};
              const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
              const closed = p.closes_at && new Date(p.closes_at) < new Date();
              return (
                <div key={p.id} className="rounded-xl border bg-card p-5">
                  <h3 className="font-medium">{p.question}</h3>
                  <div className="mt-3 space-y-2">
                    {opts.map((opt, i) => {
                      const c = counts[i] ?? 0;
                      const pct = Math.round((c / total) * 100);
                      const mine = (myVotes[p.id] ?? new Set()).has(i);
                      return (
                        <button key={i} onClick={() => !closed && vote(p.id, i, p.multi_select)} disabled={!!closed || !joined}
                          className={`relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition ${mine ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                          <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
                          <div className="relative flex items-center justify-between">
                            <span>{opt} {mine && "✓"}</span>
                            <span className="text-xs text-muted-foreground">{c} · {pct}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.multi_select ? "Multi-select" : "Single choice"}{closed ? " · Closed" : p.closes_at ? ` · Closes ${new Date(p.closes_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
              );
            })}
            {polls.length === 0 && <p className="text-sm text-muted-foreground">No polls yet.</p>}
          </div>
        </TabsContent>

        {/* Proposals (RFCs) */}
        <TabsContent value="proposals" className="mt-6">
          <div className="mb-4 flex justify-end">
            {joined && <NewRfcDialog cop={cop} onCreated={load} />}
          </div>
          <div className="space-y-3">
            {rfcs.map((r) => {
              const counts = rfcReactions[r.id] ?? {};
              const mine = myRfcReactions[r.id];
              return (
                <div key={r.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg">{r.title}</h3>
                        <RfcStatusBadge s={r.status} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.profiles?.full_name} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
                  {r.status !== "open" && r.decision_note && (
                    <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs"><strong>Decision note:</strong> {r.decision_note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => reactRfc(r.id, "support")} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${mine === "support" ? "border-success bg-success/10 text-primary" : "hover:bg-muted"}`}>
                      <ThumbsUp className="h-3 w-3" /> Support {counts.support ?? 0}
                    </button>
                    <button onClick={() => reactRfc(r.id, "concern")} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${mine === "concern" ? "border-destructive bg-destructive/10 text-destructive" : "hover:bg-muted"}`}>
                      <AlertTriangle className="h-3 w-3" /> Concern {counts.concern ?? 0}
                    </button>
                    <button onClick={() => reactRfc(r.id, "watching")} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${mine === "watching" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      <Eye className="h-3 w-3" /> Watching {counts.watching ?? 0}
                    </button>
                    {canManage && r.status === "open" && (
                      <DecideRfcDialog rfcId={r.id} onDecided={(s, n) => decideRfc(r.id, s, n)} />
                    )}
                  </div>
                </div>
              );
            })}
            {rfcs.length === 0 && <p className="text-sm text-muted-foreground">No proposals yet. {joined ? "Be the first to submit one." : "Join the CoP to submit one."}</p>}
          </div>
        </TabsContent>

        {/* Events */}
        <TabsContent value="events" className="mt-6">
          <p className="mb-3 text-xs text-muted-foreground">Upcoming NIEC events — relevant convenings and CoP touchpoints.</p>
          <div className="space-y-3">
            {events.map((e) => (
              <Link key={e.id} to="/events" className="block rounded-xl border bg-card p-4 hover:shadow-md">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{new Date(e.start_date).toLocaleString()}</div>
                <div className="mt-1 font-medium">{e.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
              </Link>
            ))}
            {events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
          </div>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map((r) => (
              <Link key={r.id} to="/knowledge" className="rounded-xl border bg-card p-4 hover:shadow-md">
                <Badge variant="secondary" className="capitalize">{r.resource_type}</Badge>
                <div className="mt-2 font-medium">{r.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              </Link>
            ))}
            {resources.length === 0 && <p className="text-sm text-muted-foreground">No resources yet.</p>}
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={m.member_id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(m.profiles?.full_name ?? "")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.profiles?.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.profiles?.organisation_name}</div>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
          </div>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="mt-6">
          <div className="rounded-xl border bg-card divide-y">
            {leaderboard.map((l: any, i: number) => (
              <div key={l.user_id} className="flex items-center gap-4 p-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? "bg-gold/20 text-gold-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={l.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(l.full_name ?? "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate text-sm font-medium">{l.full_name}</div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">{l.engagement_score}</div>
                  <div className="text-xs text-muted-foreground">{l.posts_30d} posts / 30d</div>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="p-4 text-sm text-muted-foreground">No engagement data yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostCard({ post, canManage, onPin }: { post: any; canManage: boolean; onPin: (id: string, current: boolean) => void }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
          <AvatarFallback>{initials(post.profiles?.full_name ?? "")}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">{post.profiles?.full_name}</div>
            {canManage && (
              <Button size="sm" variant="ghost" onClick={() => onPin(post.id, post.pinned_in_cop)}>
                <Pin className={`h-4 w-4 ${post.pinned_in_cop ? "fill-current text-gold" : ""}`} />
              </Button>
            )}
          </div>
          <div className="mt-1 font-medium">{post.title}</div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            {post.likes_count} likes · {post.comments_count} comments · {new Date(post.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewGroupDialog({ cop, onCreated }: { cop: string; onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const submit = async () => {
    if (!user || !name) return;
    const { error } = await supabase.from("working_groups").insert({
      cop: cop as any, name, description, deliverable, lead_id: user.id, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Working group created");
    setOpen(false); setName(""); setDescription(""); setDeliverable("");
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New working group</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New working group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Deliverable</Label><Input value={deliverable} onChange={(e) => setDeliverable(e.target.value)} placeholder="e.g. Q3 toolkit, policy brief, dataset" /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewPollDialog({ cop, onCreated }: { cop: string; onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [multi, setMulti] = useState(false);
  const submit = async () => {
    if (!user || !question) return;
    const options = optionsText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return toast.error("Add at least 2 options");
    const { error } = await supabase.from("polls").insert({
      cop: cop as any, question, options, multi_select: multi, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Poll created");
    setOpen(false); setQuestion(""); setOptionsText(""); setMulti(false);
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New poll</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New poll</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Question</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
          <div><Label>Options (one per line)</Label><Textarea rows={5} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> Allow multiple selections</label>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RfcStatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    accepted: "bg-success/20 text-primary",
    parked: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${map[s] ?? ""}`}>{s}</span>;
}

function NewRfcDialog({ cop, onCreated }: { cop: string; onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const submit = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("rfcs").insert({ cop: cop as any, author_id: user.id, title, body });
    if (error) return toast.error(error.message);
    toast.success("Proposal submitted");
    setOpen(false); setTitle(""); setBody(""); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New proposal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New proposal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What are you proposing and why?" /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Submit</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideRfcDialog({ rfcId, onDecided }: { rfcId: string; onDecided: (s: "accepted" | "parked" | "rejected", note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"accepted" | "parked" | "rejected">("accepted");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Decide</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record decision</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="accepted">Accepted</option>
              <option value="parked">Parked</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div><Label>Note</Label><Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onDecided(status, note); setOpen(false); }}>Save decision</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

