import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/Avatar";
import { CommentsThread } from "@/components/CommentsThread";
import { TierBadge } from "@/components/TierBadge";
import { COPS, POST_TYPE_COLOR, POST_TYPE_LABELS } from "@/lib/niec";
import { can } from "@/lib/entitlements";
import { toast } from "sonner";
import { Pin, Plus, Heart, MessageCircle, Lock } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/community")({
  component: CommunityPage,
});

function CommunityPage() {
  const { user, profile, isStaff } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [copFilter, setCopFilter] = useState<string>("all");
  const [sort, setSort] = useState<"latest" | "liked" | "commented">("latest");
  const [composerOpen, setComposerOpen] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const toggleComments = (id: string) =>
    setOpenComments((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const load = async () => {
    let q = supabase
      .from("community_posts")
      .select("*, profiles:author_id(full_name, organisation_name, avatar_url, membership_tier)")
      .order("is_pinned", { ascending: false });
    if (typeFilter !== "all") q = q.eq("post_type", typeFilter as any);
    if (copFilter !== "all") q = q.eq("community_of_practice", copFilter as any);
    if (sort === "liked") q = q.order("likes_count", { ascending: false });
    else if (sort === "commented") q = q.order("comments_count", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    const { data, error } = await q.limit(50);
    if (error) toast.error(error.message);
    setPosts(data ?? []);
    if (user) {
      const { data: l } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id);
      setLiked(new Set((l ?? []).map((x: any) => x.post_id)));
    }
  };
  useEffect(() => { load(); }, [typeFilter, copFilter, sort, user]);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    if (liked.has(postId)) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setLiked((s) => { const n = new Set(s); n.delete(postId); return n; });
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p));
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      if (error) return toast.error(error.message);
      setLiked((s) => new Set(s).add(postId));
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
  };

  const togglePin = async (id: string, is: boolean) => {
    const { error } = await supabase.from("community_posts").update({ is_pinned: !is }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Community</h1>
          <p className="text-sm text-muted-foreground">The NIEC member feed.</p>
        </div>
        {can(profile?.membership_tier, "community.post") || isStaff ? (
          <button onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create post
          </button>
        ) : (
          <Link to="/upgrade" title="Upgrade to Contributor to post"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
            <Lock className="h-4 w-4" /> Upgrade to post
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All types</option>
          {Object.entries(POST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={copFilter} onChange={(e) => setCopFilter(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All CoPs</option>
          {COPS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          <option value="general">General</option>
        </select>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          Sort:
          {(["latest", "liked", "commented"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`rounded px-2 py-1 ${sort === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {posts.length === 0 && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            No posts match your filters. Try clearing them — or <a href="/community" className="text-primary hover:underline">start the conversation</a> with your first post.
          </div>
        )}
        {posts.map((p) => (
          <article key={p.id} className={`rounded-xl border bg-card p-5 ${p.is_pinned ? "border-primary/50 ring-1 ring-primary/20" : ""}`}>
            {p.is_pinned && (
              <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Pin className="h-3 w-3" /> Pinned
              </div>
            )}
            <div className="flex items-center gap-3">
              <UserAvatar name={p.profiles?.full_name ?? "?"} src={p.profiles?.avatar_url} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{p.profiles?.full_name}</span>
                  <TierBadge tier={p.profiles?.membership_tier} />
                </div>
                <div className="text-xs text-muted-foreground">{p.profiles?.organisation_name} · {format(new Date(p.created_at), "PP p")}</div>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${POST_TYPE_COLOR[p.post_type]}`}>{POST_TYPE_LABELS[p.post_type]}</span>
              {isStaff && (
                <button onClick={() => togglePin(p.id, p.is_pinned)} title={p.is_pinned ? "Unpin" : "Pin"}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pin className="h-4 w-4" />
                </button>
              )}
            </div>
            <h3 className="mt-3 font-display text-lg">{p.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{p.content}</p>
            {p.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tags.map((t: string) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">#{t}</span>)}
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs">
              <button onClick={() => toggleLike(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${liked.has(p.id) ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-muted"}`}>
                <Heart className={`h-3.5 w-3.5 ${liked.has(p.id) ? "fill-current" : ""}`} /> {p.likes_count}
              </button>
              <button onClick={() => toggleComments(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${openComments.has(p.id) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <MessageCircle className="h-3.5 w-3.5" /> {p.comments_count}
              </button>
            </div>
            {openComments.has(p.id) && (
              <CommentsThread
                postId={p.id}
                onCountChange={(d) =>
                  setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, comments_count: Math.max(0, x.comments_count + d) } : x)))
                }
              />
            )}
          </article>
        ))}
      </div>

      {composerOpen && user && profile && (
        <Composer
          onClose={() => setComposerOpen(false)}
          authorId={user.id}
          onCreated={() => { setComposerOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function Composer({ onClose, authorId, onCreated }: { onClose: () => void; authorId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [cop, setCop] = useState("general");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("all_members");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("community_posts").insert({
      author_id: authorId,
      title, content, post_type: postType as any, community_of_practice: cop as any,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      visibility: visibility as any,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Post published");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Create post</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="space-y-3">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
          <textarea required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share an update, ask a question, post an opportunity…"
            rows={8} className="w-full rounded-md border bg-background p-3 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={postType} onChange={(e) => setPostType(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
              {Object.entries(POST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={cop} onChange={(e) => setCop(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="general">General</option>
              {COPS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </div>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated)"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
            <option value="all_members">All members</option>
            <option value="contributor_plus">Contributor and above</option>
            <option value="growth_partner_plus">Growth Partner and above</option>
            <option value="anchor_plus">Anchor and above</option>
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
