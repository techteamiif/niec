import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Heart, Pin } from "lucide-react";
import { CommentsThread } from "@/components/CommentsThread";
import { UserAvatar } from "@/components/Avatar";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { requireEnterpriseForWrite } from "@/lib/member-write-access";
import { COPS, POST_TYPE_COLOR, POST_TYPE_LABELS } from "@/lib/niec";
import { toast } from "sonner";

type PostRow = Database["public"]["Tables"]["community_posts"]["Row"];
type PostDetail = PostRow & {
  profiles: {
    full_name: string | null;
    organisation_name: string | null;
    avatar_url: string | null;
    application_data: Database["public"]["Tables"]["profiles"]["Row"]["application_data"];
  } | null;
};

export const Route = createFileRoute("/_app/community/$postId")({
  component: CommunityPostPage,
});

function CommunityPostPage() {
  const { postId } = Route.useParams();
  const { user, profile, isStaff } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_posts")
      .select("*, profiles:author_id(full_name, organisation_name, avatar_url, application_data)")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      toast.error(`Could not load post: ${error.message}`);
      setPost(null);
      setLoading(false);
      return;
    }

    setPost(data as PostDetail | null);
    if (user && data) {
      const { data: like, error: likeError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (likeError) toast.error(`Could not load like status: ${likeError.message}`);
      setLiked(!!like);
    } else {
      setLiked(false);
    }
    setLoading(false);
  }, [postId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = async () => {
    if (!user || !post) return;
    if (!requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;

    if (liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      if (error) return toast.error(`Could not remove like: ${error.message}`);
      setLiked(false);
      setPost(
        (current) =>
          current && {
            ...current,
            likes_count: Math.max(0, current.likes_count - 1),
          },
      );
      return;
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: post.id, user_id: user.id });
    if (error) return toast.error(`Could not like post: ${error.message}`);
    setLiked(true);
    setPost((current) => current && { ...current, likes_count: current.likes_count + 1 });
  };

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/community"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Community feed
      </Link>

      {loading ? (
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Loading post…
        </div>
      ) : !post ? (
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8">
          <h1 className="font-display text-2xl">Post not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This post may have been removed or is unavailable to your account.
          </p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          <article
            className={`min-w-0 rounded-xl border bg-card p-6 md:p-8 ${post.is_pinned ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
          >
            {post.is_pinned && (
              <div className="mb-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Pin className="h-3 w-3" /> Pinned
              </div>
            )}
            <div className="flex items-center gap-3">
              <Link
                to="/member/$memberId"
                params={{ memberId: post.author_id }}
                search={{ postId: post.id }}
                aria-label={`View ${post.profiles?.full_name ?? "member"}'s profile`}
                className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <UserAvatar
                  name={post.profiles?.full_name ?? "?"}
                  src={post.profiles?.avatar_url}
                  size={40}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to="/member/$memberId"
                  params={{ memberId: post.author_id }}
                  search={{ postId: post.id }}
                  className="block truncate text-sm font-medium hover:text-primary"
                >
                  {post.profiles?.full_name ?? "Member"}
                </Link>
                <AccountTypeBadge applicationData={post.profiles?.application_data} />
                <div className="text-xs text-muted-foreground">
                  <div className="truncate">
                    {post.profiles?.organisation_name || "—"} ·{" "}
                    {COPS.find((cop) => cop.key === post.community_of_practice)?.name ?? "General"}
                  </div>
                  <time dateTime={post.created_at} className="block whitespace-nowrap">
                    {format(new Date(post.created_at), "PP p")}
                  </time>
                </div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${POST_TYPE_COLOR[post.post_type]}`}
              >
                {POST_TYPE_LABELS[post.post_type]}
              </span>
            </div>

            <h1 className="mt-5 font-display text-2xl md:text-3xl">{post.title}</h1>
            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
              {post.content}
            </div>
            {post.image_url && (
              <img
                src={post.image_url}
                alt={post.title}
                className="mt-5 max-h-[640px] w-full rounded-lg bg-muted object-contain"
              />
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>

          <section
            aria-label="Reactions and comments"
            className="flex min-w-0 flex-col rounded-xl border bg-card p-5 min-h-[calc(100vh-8rem)] lg:sticky lg:top-16 lg:h-[calc(100dvh-6rem)] lg:min-h-0 lg:self-start"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg">Comments</h2>
              <button
                type="button"
                onClick={toggleLike}
                aria-pressed={liked}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${liked ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {post.likes_count}
              </button>
            </div>
            <CommentsThread
              postId={post.id}
              panelLayout
              onCountChange={(delta) =>
                setPost(
                  (current) =>
                    current && {
                      ...current,
                      comments_count: Math.max(0, current.comments_count + delta),
                    },
                )
              }
            />
          </section>
        </div>
      )}
    </div>
  );
}
