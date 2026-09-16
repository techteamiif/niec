import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, is_read: true } : x));
  };

  const open = async (n: any) => {
    if (!n.is_read) await markRead(n.id);
    if (n.link) {
      if (n.link.startsWith("http")) window.location.href = n.link;
      else navigate({ to: n.link });
    }
  };

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
    toast.success("All marked as read");
    load();
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">{items.filter((x) => !x.is_read).length} unread</p>
        </div>
        <button onClick={markAll} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          <Check className="h-4 w-4" /> Mark all read
        </button>
      </div>
      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => open(n)}
            className={`block w-full rounded-xl border bg-card p-4 text-left transition hover:bg-muted/40 ${!n.is_read ? "border-primary/40" : ""} ${n.link ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {n.type.replace(/_/g, " ")} · {format(new Date(n.created_at), "PP p")}
                </div>
                <div className="mt-1 font-medium">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.message}</div>
                {n.link && <div className="mt-1 text-xs text-primary">Open →</div>}
              </div>
              {!n.is_read && (
                <span
                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                  className="ml-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                  title="Mark as read"
                />
              )}
            </div>
          </button>
        ))}
        {items.length === 0 && <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No notifications.</div>}
      </div>
    </div>
  );
}
