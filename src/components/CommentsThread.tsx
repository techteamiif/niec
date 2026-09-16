import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/Avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null; organisation_name: string } | null;
}

export function CommentsThread({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (delta: number) => void;
}) {
  const { user, profile, isStaff } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const canPost = !!user && profile?.membership_status === "active";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles:author_id(full_name, avatar_url, organisation_name)")
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
    setBusy(true);
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: user.id, content: draft.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDraft("");
    onCountChange?.(1);
    load();
  };

  const startEdit = (c: CommentRow) => {
    setEditingId(c.id);
    setEditValue(c.content);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
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
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setComments((cs) => cs.filter((c) => c.id !== id));
    onCountChange?.(-1);
  };

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-muted-foreground">No comments yet. Be the first to reply.</div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const mine = user?.id === c.author_id;
            const canEdit = mine;
            const canDelete = mine || isStaff;
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
                    ) : (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.content}</p>
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

      {canPost ? (
        <form onSubmit={submit} className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a comment…"
            rows={2}
            className="flex-1 rounded-md border bg-background p-2 text-sm"
          />
          <button
            disabled={busy || !draft.trim()}
            className="self-end rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Posting…" : "Comment"}
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
