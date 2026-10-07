import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TIER_LABELS } from "@/lib/niec";
import { formatEventSchedule, type EventSchedule } from "@/lib/event-schedule";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
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
  const [attendingEvents, setAttendingEvents] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "mine">("upcoming");

  const load = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, event_type, start_date, end_date, schedule, location, is_virtual, max_attendees, min_tier_required, is_paid")
      .order("start_date");
    if (error) toast.error(`Could not load events: ${error.message}`);
    const { data: attendeeCounts, error: attendeeCountsError } = await supabase
      .from("event_attendee_counts")
      .select("event_id, attendee_count");
    if (attendeeCountsError)
      toast.error(`Could not load event attendee counts: ${attendeeCountsError.message}`);
    const countsByEvent = new Map(
      (attendeeCounts ?? []).map(({ event_id, attendee_count }) => [event_id, attendee_count]),
    );
    setEvents((data ?? []).map((event) => ({
      ...event,
      attendee_count: countsByEvent.get(event.id) ?? 0,
    })));
    if (user) {
      const { data: r } = await supabase.from("event_registrations").select("event_id").eq("member_id", user.id);
      setRegs(new Set((r ?? []).map((x: any) => x.event_id)));
      const { data: attendance, error: attendanceError } = await supabase
        .from("event_attendees")
        .select("event_id")
        .eq("member_id", user.id)
        .eq("attending", true);
      if (attendanceError)
        toast.error(`Could not load your event attendance: ${attendanceError.message}`);
      setAttendingEvents(new Set((attendance ?? []).map(({ event_id }) => event_id)));
    } else {
      setRegs(new Set());
      setAttendingEvents(new Set());
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
          <p className="text-sm text-muted-foreground">Onsite, online, and hybrid events for NIEC members.</p>
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
              <div className="flex items-start gap-2 text-xs text-primary">
                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-1">
                  {formatEventSchedule(ev.schedule, ev.start_date, ev.end_date).map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))}
                </div>
              </div>
              <h3 className="mt-2 font-display text-xl">{ev.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{ev.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {ev.event_type === "onsite" ||
                ev.event_type === "hybrid" ||
                (!ev.is_virtual && ev.event_type !== "online") ? (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ev.location || "Location to be announced"}</span>
                ) : null}
                {ev.event_type === "online" || ev.event_type === "hybrid" || ev.is_virtual ? (
                  <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Online</span>
                ) : null}
                <span className="rounded bg-muted px-2 py-0.5">{formatEventType(ev.event_type)}</span>
                <span className="rounded bg-muted px-2 py-0.5">{ev.is_paid ? "Paid" : "Free"}</span>
                {ev.max_attendees && <span className="rounded bg-muted px-2 py-0.5">{ev.max_attendees} Seats</span>}
                <span className="rounded bg-muted px-2 py-0.5">
                  {ev.attendee_count} {ev.attendee_count === 1 ? "attendee" : "attendees"}
                </span>
              </div>
              {ev.attendee_count > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {attendingEvents.has(ev.id)
                    ? ev.attendee_count === 1
                      ? "You will be attending this event"
                      : `You and ${ev.attendee_count - 1} ${
                          ev.attendee_count === 2 ? "other person" : "people"
                        } will be attending this event`
                    : `${ev.attendee_count} ${
                        ev.attendee_count === 1 ? "person" : "people"
                      } will be attending this event`}
                </p>
              )}
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

type EventFormState = {
  title: string;
  description: string;
  event_type: "onsite" | "online" | "hybrid";
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  is_virtual: boolean;
  virtual_link: string;
  registration_link: string;
  is_paid: boolean;
  min_tier_required: Database["public"]["Enums"]["membership_tier"];
  max_attendees: string;
};

type EventSessionForm = {
  date: string;
  start_time: string;
  end_time: string;
};

function CreateEvent({
  onClose,
  onCreated,
  userId,
}: {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const [form, setForm] = useState<EventFormState>({
    title: "",
    description: "",
    event_type: "onsite",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    is_virtual: false,
    virtual_link: "",
    registration_link: "",
    is_paid: false,
    min_tier_required: "observer",
    max_attendees: "",
  });
  const [scheduleMode, setScheduleMode] = useState<"daily" | "custom">("daily");
  const [sessions, setSessions] = useState<EventSessionForm[]>([
    { date: "", start_time: "", end_time: "" },
  ]);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const documentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = documentOverflow;
    };
  }, []);

  const set = <K extends keyof EventFormState,>(key: K, value: EventFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const previewSchedule: EventSchedule | null =
    scheduleMode === "daily" &&
    form.start_date &&
    form.end_date &&
    form.end_date >= form.start_date &&
    form.start_time &&
    form.end_time &&
    form.end_time > form.start_time
      ? {
          mode: "daily",
          start_date: form.start_date,
          end_date: form.end_date,
          start_time: form.start_time,
          end_time: form.end_time,
        }
      : scheduleMode === "custom" &&
          sessions.length > 0 &&
          sessions.every(
            (session) =>
              session.date &&
              session.start_time &&
              session.end_time &&
              session.end_time > session.start_time,
          )
        ? {
            mode: "custom",
            sessions: sessions.map(({ date, start_time, end_time }) => ({
              date,
              start_time,
              end_time,
            })),
          }
        : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const registrationLink = form.registration_link.trim();
    if (!registrationLink) {
      toast.error("A registration link is required to create an event.");
      return;
    }
    if (
      scheduleMode === "daily" &&
      (!form.start_date || !form.end_date || form.end_date < form.start_date)
    ) {
      toast.error("Choose a valid event start and end date.");
      return;
    }

    let schedule: EventSchedule;
    let startDateTime: string;
    let endDateTime: string;
    if (scheduleMode === "daily") {
      if (!form.start_time || !form.end_time || form.end_time <= form.start_time) {
        toast.error("Choose an end time later than the start time.");
        return;
      }
      schedule = {
        mode: "daily",
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time,
        end_time: form.end_time,
      };
      startDateTime = new Date(`${form.start_date}T${form.start_time}`).toISOString();
      endDateTime = new Date(`${form.end_date}T${form.end_time}`).toISOString();
    } else {
      const validSessions = sessions.every(
        (session) =>
          session.date &&
          session.start_time &&
          session.end_time &&
          session.end_time > session.start_time,
      );
      if (!validSessions || sessions.length === 0) {
        toast.error("Add at least one session with an end time later than its start time.");
        return;
      }
      const sortedSessions = [...sessions].sort((left, right) =>
        `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`),
      );
      schedule = { mode: "custom", sessions: sortedSessions };
      startDateTime = new Date(
        `${sortedSessions[0].date}T${sortedSessions[0].start_time}`,
      ).toISOString();
      const lastSession = [...sortedSessions].sort((left, right) =>
        `${left.date}T${left.end_time}`.localeCompare(`${right.date}T${right.end_time}`),
      )[sortedSessions.length - 1];
      endDateTime = new Date(
        `${lastSession.date}T${lastSession.end_time}`,
      ).toISOString();
    }

    const { error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description,
      event_type: form.event_type,
      start_date: startDateTime,
      end_date: endDateTime,
      schedule,
      location: form.location || null,
      is_virtual: form.event_type === "online" || form.event_type === "hybrid",
      virtual_link: form.virtual_link || null,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      min_tier_required: form.min_tier_required,
      is_paid: form.is_paid,
      registration_link: registrationLink,
      created_by: userId,
    });
    if (error) return toast.error(error.message);
    toast.success("Event created");
    onCreated();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-xl">New event</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close event form"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
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
        <div className="space-y-2">
          <label htmlFor="event-schedule-mode" className="block text-sm font-medium">
            Schedule
          </label>
          <select
            id="event-schedule-mode"
            value={scheduleMode}
            onChange={(e) => setScheduleMode(e.target.value as "daily" | "custom")}
            className="h-10 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="daily">Same time each day</option>
            <option value="custom">Set individual sessions</option>
          </select>
          {scheduleMode === "daily" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="event-start-date" className="block text-sm font-medium">
                    First day
                  </label>
                  <input
                    id="event-start-date"
                    required
                    type="date"
                    value={form.start_date}
                    onChange={(e) => {
                      set("start_date", e.target.value);
                      if (!form.end_date) set("end_date", e.target.value);
                    }}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="event-end-date" className="block text-sm font-medium">
                    Last day
                  </label>
                  <input
                    id="event-end-date"
                    required
                    type="date"
                    min={form.start_date || undefined}
                    value={form.end_date}
                    onChange={(e) => set("end_date", e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="event-start-time" className="block text-sm font-medium">
                    Starts at
                  </label>
                  <input
                    id="event-start-time"
                    required
                    type="time"
                    value={form.start_time}
                    onChange={(e) => set("start_time", e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="event-end-time" className="block text-sm font-medium">
                    Ends at
                  </label>
                  <input
                    id="event-end-time"
                    required
                    type="time"
                    value={form.end_time}
                    onChange={(e) => set("end_time", e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                  <div className="space-y-1.5">
                    <label htmlFor={`event-session-date-${index}`} className="block text-xs font-medium">
                      Date
                    </label>
                    <input
                      id={`event-session-date-${index}`}
                      required
                      type="date"
                      value={session.date}
                      onChange={(e) =>
                        setSessions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, date: e.target.value } : item,
                          ),
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`event-session-start-${index}`} className="block text-xs font-medium">
                      Starts
                    </label>
                    <input
                      id={`event-session-start-${index}`}
                      required
                      type="time"
                      value={session.start_time}
                      onChange={(e) =>
                        setSessions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, start_time: e.target.value } : item,
                          ),
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`event-session-end-${index}`} className="block text-xs font-medium">
                      Ends
                    </label>
                    <input
                      id={`event-session-end-${index}`}
                      required
                      type="time"
                      value={session.end_time}
                      onChange={(e) =>
                        setSessions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, end_time: e.target.value } : item,
                          ),
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove session"
                    disabled={sessions.length === 1}
                    onClick={() =>
                      setSessions((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="h-10 rounded-md border px-3 text-sm disabled:opacity-40"
                  >
                    −
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSessions((current) => [...current, { date: "", start_time: "", end_time: "" }])
                }
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                + Add session
              </button>
            </div>
          )}
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule preview
            </div>
            {previewSchedule ? (
              <div className="mt-1 space-y-1">
                {formatEventSchedule(previewSchedule, "", "").map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">Enter the event dates and times to preview the schedule.</p>
            )}
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
              onChange={(e) => set("event_type", e.target.value as EventFormState["event_type"])}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="onsite">Onsite</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-min-tier" className="block text-sm font-medium">
              Membership tier
            </label>
            <select
              id="event-min-tier"
              value={form.min_tier_required}
              onChange={(e) =>
                set("min_tier_required", e.target.value as EventFormState["min_tier_required"])
              }
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
        {form.event_type === "online" || form.event_type === "hybrid" ? (
          <div className="space-y-1.5">
            <label htmlFor="event-virtual-link" className="block text-sm font-medium">
              Online event link
            </label>
            <input
              id="event-virtual-link"
              placeholder="Virtual link"
              value={form.virtual_link}
              onChange={(e) => set("virtual_link", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        ) : null}
        {form.event_type === "onsite" || form.event_type === "hybrid" ? (
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
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="event-registration-link" className="block text-sm font-medium">
              Registration link *
            </label>
            <input
              id="event-registration-link"
              required
              type="url"
              placeholder="https://example.com/register"
              value={form.registration_link}
              onChange={(e) => set("registration_link", e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-amount" className="block text-sm font-medium">Amount</label>
            <select
              id="event-amount"
              value={form.is_paid ? "paid" : "free"}
              onChange={(e) => set("is_paid", e.target.value === "paid")}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
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
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
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
