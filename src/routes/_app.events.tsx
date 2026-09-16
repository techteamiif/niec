import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS } from "@/lib/niec";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, MapPin, Video, Download, X } from "lucide-react";

export const Route = createFileRoute("/_app/events")({
  component: EventsPage,
});

function toICS(ev: any) {
  const dt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => (s ?? "").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const loc = ev.is_virtual ? (ev.virtual_link ?? "Virtual") : (ev.location ?? "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NIEC//EN", "BEGIN:VEVENT",
    `UID:${ev.id}@niec`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(ev.start_date)}`,
    `DTEND:${dt(ev.end_date ?? ev.start_date)}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(ev.description ?? "")}`,
    `LOCATION:${esc(loc)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(ev: any) {
  const blob = new Blob([toICS(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function EventsPage() {
  const { user, profile, isStaff } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "mine">("upcoming");

  const load = async () => {
    const { data } = await supabase.from("events").select("*").order("start_date");
    setEvents(data ?? []);
    if (user) {
      const { data: r } = await supabase.from("event_registrations").select("event_id").eq("member_id", user.id);
      setRegs(new Set((r ?? []).map((x: any) => x.event_id)));
    }
  };
  useEffect(() => { load(); }, [user]);

  const register = async (ev: any) => {
    if (!user) return;
    if (!tierMeets(profile?.membership_tier, ev.min_tier_required)) {
      toast.error(`Requires ${TIER_LABELS[ev.min_tier_required]} tier or above`);
      return;
    }
    const { error } = await supabase.from("event_registrations").insert({ event_id: ev.id, member_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("You're registered"); load(); }
  };

  const cancel = async (ev: any) => {
    if (!user) return;
    if (!confirm(`Cancel your registration for "${ev.title}"?`)) return;
    const { error } = await supabase.from("event_registrations")
      .delete().eq("event_id", ev.id).eq("member_id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Registration cancelled"); load(); }
  };

  const now = Date.now();
  const filtered = useMemo(() => {
    return events.filter((ev) => {
      const ended = new Date(ev.end_date ?? ev.start_date).getTime() < now;
      if (tab === "upcoming") return !ended;
      if (tab === "past") return ended;
      return regs.has(ev.id);
    });
  }, [events, tab, regs, now]);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Events</h1>
          <p className="text-sm text-muted-foreground">Convenings, deal rooms, CoP meetings, boot camps and policy roundtables.</p>
        </div>
        {isStaff && (
          <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + New event
          </button>
        )}
      </div>

      <div className="mb-5 flex gap-2 border-b">
        {([
          ["upcoming", "Upcoming"],
          ["past", "Past"],
          ["mine", `My events${regs.size ? ` (${regs.size})` : ""}`],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((ev) => {
          const allowed = tierMeets(profile?.membership_tier, ev.min_tier_required);
          const registered = regs.has(ev.id);
          const ended = new Date(ev.end_date ?? ev.start_date).getTime() < now;
          return (
            <div key={ev.id} className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-primary">
                <Calendar className="h-3.5 w-3.5" /> {format(new Date(ev.start_date), "PPP p")}
              </div>
              <h3 className="mt-2 font-display text-xl">{ev.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{ev.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                {ev.is_virtual
                  ? <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Virtual</span>
                  : <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ev.location}</span>}
                <span className="rounded bg-muted px-2 py-0.5 uppercase tracking-wider">{ev.event_type.replace(/_/g, " ")}</span>
                {ev.max_attendees && <span className="rounded bg-muted px-2 py-0.5">Cap: {ev.max_attendees}</span>}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Min tier: {TIER_LABELS[ev.min_tier_required]}</div>
                <div className="flex items-center gap-2">
                  {registered && (
                    <button onClick={() => downloadICS(ev)} title="Add to calendar"
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
                      <Download className="h-3 w-3" /> .ics
                    </button>
                  )}
                  {ended ? (
                    <span className="rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">Ended</span>
                  ) : registered ? (
                    <button onClick={() => cancel(ev)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10">
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  ) : (
                    <button disabled={!allowed} onClick={() => register(ev)}
                      title={allowed ? "" : "Upgrade your tier to register"}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                      {allowed ? "Register" : "Tier locked"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            {tab === "upcoming" && "No upcoming events."}
            {tab === "past" && "No past events yet."}
            {tab === "mine" && "You haven't registered for any events yet."}
          </div>
        )}
      </div>

      {showCreate && isStaff && <CreateEvent onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} userId={user!.id} />}
    </div>
  );
}

function CreateEvent({ onClose, onCreated, userId }: { onClose: () => void; onCreated: () => void; userId: string }) {
  const [form, setForm] = useState({
    title: "", description: "", event_type: "convening",
    start_date: "", end_date: "", location: "", is_virtual: false, virtual_link: "",
    min_tier_required: "observer", max_attendees: "",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      created_by: userId,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date || form.start_date).toISOString(),
    };
    const { error } = await supabase.from("events").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Event created");
    onCreated();
  };
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-xl space-y-3 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-xl">New event</h2>
        <input required placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
        <textarea placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="w-full rounded-md border bg-background p-3 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input required type="datetime-local" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" />
          <input type="datetime-local" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.event_type} onChange={(e) => set("event_type", e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
            {["convening","deal_room","cop_meeting","webinar","boot_camp","policy_roundtable"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={form.min_tier_required} onChange={(e) => set("min_tier_required", e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
            {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_virtual} onChange={(e) => set("is_virtual", e.target.checked)} /> Virtual event
        </label>
        {form.is_virtual
          ? <input placeholder="Virtual link" value={form.virtual_link} onChange={(e) => set("virtual_link", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
          : <input placeholder="Location" value={form.location} onChange={(e) => set("location", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />}
        <input type="number" placeholder="Max attendees (optional)" value={form.max_attendees} onChange={(e) => set("max_attendees", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create</button>
        </div>
      </form>
    </div>
  );
}
