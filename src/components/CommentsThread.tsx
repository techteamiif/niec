import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/Avatar";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, Check, X, Send, MessageCircle } from "lucide-react";
import { tierMeets } from "@/lib/niec";
import { requireEnterpriseForWrite } from "@/lib/member-write-access";

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    organisation_name: string;
    application_data: Database["public"]["Tables"]["profiles"]["Row"]["application_data"];
  } | null;
}

export function CommentsThread({
  postId,
  onCountChange,
  panelLayout = false,
}: {
  postId: string;
  onCountChange?: (delta: number) => void;
  panelLayout?: boolean;
}) {
  const { user, profile, isStaff } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const canPost =
    !!user &&
    (isStaff ||
      (profile?.membership_status === "active" &&
        tierMeets(profile.membership_tier, "contributor")));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles:author_id(full_name, avatar_url, organisation_name, application_data)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setComments((data ?? []) as unknown as CommentRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draft.trim()) return;
    if (!requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;
    setBusy(true);
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: user.id, content: draft.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDraft("");
    if (draftRef.current) draftRef.current.style.height = "auto";
    onCountChange?.(1);
    load();
  };

  const startEdit = (c: CommentRow) => {
    if (!requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;
    setEditingId(c.id);
    setEditValue(c.content);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    if (!requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;
    const { error } = await supabase
      .from("comments")
      .update({ content: editValue.trim() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, content: editValue.trim() } : c)));
    setEditingId(null);
    setEditValue("");
  };

  const remove = async (id: string) => {
    if (!isStaff && !requireEnterpriseForWrite(profile?.membership_tier, false)) return;
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setComments((cs) => cs.filter((c) => c.id !== id));
    onCountChange?.(-1);
  };

  return (
    <div className={`mt-4 flex flex-1 flex-col border-t pt-4 ${panelLayout ? "min-h-0" : ""}`}>
      <div
        className={
          panelLayout
            ? "comment-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
            : "flex-1"
        }
      >
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div
            className={`flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground ${panelLayout ? "" : "min-h-48"}`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted/60 text-muted-foreground/70">
              <MessageCircle aria-hidden="true" className="h-5 w-5" />
            </div>
            <p>No comments yet. Be the first to reply.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => {
              const mine = user?.id === c.author_id;
              const canEdit =
                mine && (isStaff || tierMeets(profile?.membership_tier, "contributor"));
              const canDelete =
                isStaff || (mine && tierMeets(profile?.membership_tier, "contributor"));
              const isEditing = editingId === c.id;
              return (
                <li key={c.id} className="flex gap-3">
                  <UserAvatar
                    name={c.profiles?.full_name ?? "?"}
                    src={c.profiles?.avatar_url ?? null}
                    size={30}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-lg bg-muted/60 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">{c.profiles?.full_name ?? "Member"}</span>
                        <span className="text-muted-foreground">
                          · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="mt-1.5">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            rows={2}
                            className="w-full rounded-md border bg-background p-2 text-sm"
                          />
                          <div className="mt-1.5 flex gap-1.5">
                            <button
                              onClick={() => saveEdit(c.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                              <Check className="h-3 w-3" /> Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditValue("");
                              }}
                              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                            >
                              <X className="h-3 w-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : user && profile?.membership_tier === "observer" ? (
                        <button
                          type="button"
                          onClick={() =>
                            requireEnterpriseForWrite(profile.membership_tier, isStaff)
                          }
                          className="text-left text-xs text-muted-foreground hover:text-foreground"
                        >
                          Upgrade to Enterprise to comment.
                        </button>
                      ) : (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                          {c.content}
                        </p>
                      )}
                    </div>
                    {!isEditing && (canEdit || canDelete) && (
                      <div className="mt-1 flex gap-2 pl-1 text-[11px] text-muted-foreground">
                        {canEdit && (
                          <button
                            onClick={() => startEdit(c)}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => remove(c.id)}
                            className="inline-flex items-center gap-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canPost ? (
        <form
          onSubmit={submit}
          className={`flex shrink-0 gap-2 ${panelLayout ? "items-end pt-3" : "items-center"}`}
        >
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (panelLayout) {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
              }
            }}
            placeholder="Write a comment…"
            rows={1}
            className={`min-h-10 flex-1 resize-none rounded-2xl border border-border/70 bg-background px-4 py-2 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-muted-foreground/15 ${panelLayout ? "comment-scrollbar max-h-40 overflow-y-auto" : ""}`}
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={busy ? "Sending comment" : "Send comment"}
            title={busy ? "Sending comment" : "Send comment"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <div className="text-xs text-muted-foreground">
          {user ? "Your membership must be active to comment." : "Sign in to comment."}
        </div>
      )}
    </div>
  );
}
