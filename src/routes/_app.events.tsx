import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TIER_LABELS } from "@/lib/niec";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, MapPin, Video, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/events")({
  component: EventsPage,
});

function formatEventType(eventType: string) {
  const label = eventType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function EventsPage() {
  const { user, isStaff } = useAuth();
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
                <span className="rounded bg-muted px-2 py-0.5">{formatEventType(ev.event_type)}</span>
                {ev.max_attendees && <span className="rounded bg-muted px-2 py-0.5">Cap: {ev.max_attendees}</span>}
              </div>
              <div className="mt-4 flex flex-col items-start gap-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Min tier: {TIER_LABELS[ev.min_tier_required]}</div>
                <Link to="/event/$eventId" params={{ eventId: ev.id }}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  See details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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

function CreateEvent({
  onClose,
  onCreated,
  userId,
}: {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "convening",
    start_date: "",
    end_date: "",
    location: "",
    is_virtual: false,
    virtual_link: "",
    min_tier_required: "observer",
    max_attendees: "",
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
        <div className="space-y-1.5">
          <label htmlFor="event-title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="event-title"
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="event-description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="event-description"
            placeholder="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={1}
            className="w-full rounded-md border bg-background p-3 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="event-start-date" className="block text-sm font-medium">
              Start date
            </label>
            <input
              id="event-start-date"
              required
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-end-date" className="block text-sm font-medium">
              End date
            </label>
            <input
              id="event-end-date"
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="event-type" className="block text-sm font-medium">
              Event type
            </label>
            <select
              id="event-type"
              value={form.event_type}
              onChange={(e) => set("event_type", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              {[
                "convening",
                "deal_room",
                "cop_meeting",
                "webinar",
                "boot_camp",
                "policy_roundtable",
              ].map((t) => (
                <option key={t} value={t}>
                  {formatEventType(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-min-tier" className="block text-sm font-medium">
              Category (Membership Tier)
            </label>
            <select
              id="event-min-tier"
              value={form.min_tier_required}
              onChange={(e) => set("min_tier_required", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              {Object.entries(TIER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="event-is-virtual" className="flex items-center gap-2 text-sm">
          <input
            id="event-is-virtual"
            type="checkbox"
            checked={form.is_virtual}
            onChange={(e) => set("is_virtual", e.target.checked)}
          />{" "}
          Virtual event
        </label>
        {form.is_virtual ? (
          <div className="space-y-1.5">
            <label htmlFor="event-virtual-link" className="block text-sm font-medium">
              Virtual link
            </label>
            <input
              id="event-virtual-link"
              placeholder="Virtual link"
              value={form.virtual_link}
              onChange={(e) => set("virtual_link", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="event-location" className="block text-sm font-medium">
              Location
            </label>
            <input
              id="event-location"
              placeholder="Location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="event-max-attendees" className="block text-sm font-medium">
            Maximum attendees (optional)
          </label>
          <input
            id="event-max-attendees"
            type="number"
            placeholder="Maximum attendees"
            value={form.max_attendees}
            onChange={(e) => set("max_attendees", e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
