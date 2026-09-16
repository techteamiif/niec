import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/Avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_app/messages")({
  validateSearch: z.object({ to: z.string().uuid().optional() }),
  component: MessagesPage,
});

type DM = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null };
type Profile = { id: string; full_name: string; avatar_url: string | null; organisation_name: string | null };

function MessagesPage() {
  const { user } = useAuth();
  const { to } = useSearch({ from: "/_app/messages" });
  const [messages, setMessages] = useState<DM[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activePeer, setActivePeer] = useState<string | null>(to ?? null);
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    const dms = (data ?? []) as DM[];
    setMessages(dms);
    const peerIds = Array.from(new Set(dms.map((m) => (m.sender_id === user.id ? m.recipient_id : m.sender_id))));
    if (to && !peerIds.includes(to)) peerIds.push(to);
    if (peerIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, avatar_url, organisation_name").in("id", peerIds);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    if (!activePeer && peerIds[0]) setActivePeer(peerIds[0]);
  };

  useEffect(() => { loadAll(); }, [user]);
  useEffect(() => { if (to) setActivePeer(to); }, [to]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("dm-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${user.id}` }, loadAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${user.id}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Mark conversation read
  useEffect(() => {
    if (!user || !activePeer) return;
    supabase.from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .eq("sender_id", activePeer)
      .is("read_at", null)
      .then(() => {});
  }, [activePeer, messages.length, user]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [activePeer, messages.length]);

  const threads = useMemo(() => {
    if (!user) return [] as Array<[string, DM, number]>;
    const map = new Map<string, DM>();
    const unread = new Map<string, number>();
    messages.forEach((m) => {
      const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const prev = map.get(peer);
      if (!prev || new Date(m.created_at) > new Date(prev.created_at)) map.set(peer, m);
      if (m.recipient_id === user.id && !m.read_at && peer !== activePeer) {
        unread.set(peer, (unread.get(peer) ?? 0) + 1);
      }
    });
    if (to && !map.has(to)) map.set(to, { id: "draft", sender_id: user.id, recipient_id: to, content: "", created_at: new Date().toISOString(), read_at: null });
    return Array.from(map.entries())
      .map(([peer, last]) => [peer, last, unread.get(peer) ?? 0] as [string, DM, number])
      .sort((a, b) => +new Date(b[1].created_at) - +new Date(a[1].created_at));
  }, [messages, user, to, activePeer]);

  const thread = useMemo(() => {
    if (!user || !activePeer) return [];
    return messages.filter((m) =>
      (m.sender_id === user.id && m.recipient_id === activePeer) ||
      (m.sender_id === activePeer && m.recipient_id === user.id)
    );
  }, [messages, activePeer, user]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePeer || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id, recipient_id: activePeer, content,
    });
    if (error) { toast.error(error.message); setDraft(content); return; }
    // Recipient notification is created automatically by DB trigger.
    loadAll();
  };

  const activeProfile = activePeer ? profiles[activePeer] : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6 lg:p-10">
      <div className="mb-4">
        <h1 className="font-display text-3xl">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct conversations with NIEC members.</p>
      </div>
      <div className="grid flex-1 min-h-0 gap-4 overflow-hidden rounded-xl border bg-card md:grid-cols-[280px_1fr]">
        <aside className="overflow-y-auto border-r">
          {threads.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">
              No conversations yet. Open the <a className="text-primary underline" href="/members">members directory</a> to start one.
            </div>
          )}
          {threads.map(([peerId, last, unread]) => {
            const p = profiles[peerId];
            const isActive = activePeer === peerId;
            return (
              <button key={peerId} onClick={() => setActivePeer(peerId)}
                className={`flex w-full items-start gap-3 border-b p-3 text-left transition hover:bg-muted/50 ${isActive ? "bg-muted" : ""}`}>
                <UserAvatar name={p?.full_name ?? "?"} src={p?.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`truncate text-sm ${unread > 0 ? "font-semibold" : "font-medium"}`}>{p?.full_name ?? "Member"}</div>
                    {unread > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                  <div className={`truncate text-xs ${unread > 0 ? "text-foreground" : "text-muted-foreground"}`}>{last.content || "Start a conversation…"}</div>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="flex min-h-0 flex-col">
          {activePeer ? (
            <>
              <header className="flex items-center gap-3 border-b p-4">
                <UserAvatar name={activeProfile?.full_name ?? "?"} src={activeProfile?.avatar_url} size={36} />
                <div>
                  <div className="text-sm font-medium">{activeProfile?.full_name ?? "Member"}</div>
                  <div className="text-xs text-muted-foreground">{activeProfile?.organisation_name}</div>
                </div>
              </header>
              <div ref={scrollerRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {thread.map((m) => {
                  const mine = m.sender_id === user!.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <div>{m.content}</div>
                        <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {thread.length === 0 && <div className="text-center text-sm text-muted-foreground">Say hello 👋</div>}
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…"
                  className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" />
                <button className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Send className="h-4 w-4" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a conversation</div>
          )}
        </section>
      </div>
    </div>
  );
}
