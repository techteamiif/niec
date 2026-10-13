import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS } from "@/lib/niec";
import { formatEventSchedule, type EventSchedule } from "@/lib/event-schedule";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Calendar, MapPin, Video, ArrowRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { requireEnterpriseForWrite } from "@/lib/member-write-access";
import { EventImage } from "@/components/EventImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/events")({
  component: EventsPage,
});

function formatEventType(eventType: string) {
  const label = eventType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function EventsPage() {
  const { user, profile, isStaff } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<Set<string>>(new Set());
  const [attendingEvents, setAttendingEvents] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventEditData | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "mine">("upcoming");
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | "onsite" | "online" | "hybrid">("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [tierFilter, setTierFilter] = useState<"all" | keyof typeof TIER_LABELS>("all");
  const canCreateEvents = !!user && (
    isStaff ||
    (profile?.membership_status === "active" && tierMeets(profile.membership_tier, "contributor"))
  );

  const load = async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, event_type, start_date, end_date, schedule, location, is_virtual, virtual_link, registration_link, max_attendees, min_tier_required, is_paid, image_url, created_by",
      )
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
      const matchesTab =
        tab === "upcoming" ? !ended : tab === "past" ? ended : regs.has(ev.id);
      if (!matchesTab) return false;
      if (eventTypeFilter !== "all" && ev.event_type !== eventTypeFilter) return false;
      if (priceFilter === "free" && ev.is_paid) return false;
      if (priceFilter === "paid" && !ev.is_paid) return false;
      if (tierFilter !== "all" && ev.min_tier_required !== tierFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (ev.title ?? "").toLowerCase().includes(q) ||
        (ev.description ?? "").toLowerCase().includes(q) ||
        (ev.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, tab, regs, now, search, eventTypeFilter, priceFilter, tierFilter]);

  const clearFilters = () => {
    setSearch("");
    setEventTypeFilter("all");
    setPriceFilter("all");
    setTierFilter("all");
  };

  const deleteEvent = async () => {
    if (!eventToDelete || deleting) return;
    setDeleting(true);
    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventToDelete.id)
      .select("id")
      .maybeSingle();
    setDeleting(false);
    if (error) {
      toast.error(`Could not delete event: ${error.message}`);
      return;
    }
    if (!data) {
      toast.error("You do not have permission to delete this event.");
      return;
    }
    toast.success("Event deleted");
    setEventToDelete(null);
    await load();
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Events</h1>
          <p className="text-sm text-muted-foreground">Onsite, online, and hybrid events for NIEC members.</p>
        </div>
        {canCreateEvents && (
          <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + New event
          </button>
        )}
        {!canCreateEvents &&
          user &&
          !isStaff &&
          !tierMeets(profile?.membership_tier, "contributor") && (
          <button
            type="button"
            onClick={() => requireEnterpriseForWrite(profile?.membership_tier, isStaff)}
            className="rounded-md border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
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

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events, locations, keywords…"
          className="h-9 min-w-[220px] flex-1 rounded-md border bg-background px-3 text-sm"
        />

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value as typeof eventTypeFilter)}
          className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All types</option>
          <option value="onsite">Onsite</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <select
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
          className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All pricing</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)}
          className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All tiers</option>
          {Object.entries(TIER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {(search || eventTypeFilter !== "all" || priceFilter !== "all" || tierFilter !== "all") && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-md border px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            {            search.trim() ||
            eventTypeFilter !== "all" ||
            priceFilter !== "all" ||
            tierFilter !== "all"
              ? "No events match the selected filters."
              : tab === "upcoming"
                ? "No upcoming events."
                : tab === "past"
                  ? "No past events yet."
                  : "You haven't registered for any events yet."}
          </div>
        ) : filtered.map((ev) => {
          const canManageEvent = isStaff || (!!user && ev.created_by === user.id);
          return (
            <div key={ev.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="relative">
                <EventImage
                  src={ev.image_url}
                  title={ev.title}
                  className="h-52 w-full"
                />
                {canManageEvent && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Manage ${ev.title}`}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-36">
                      <DropdownMenuItem onSelect={() => setEventToEdit(ev)}>
                        <Pencil /> Edit event
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setEventToDelete({ id: ev.id, title: ev.title })}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 /> Delete event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start gap-2 text-xs text-primary">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="space-y-1">
                    {formatEventSchedule(ev.schedule, ev.start_date, ev.end_date).map((line, index) => (
                      <div key={`${line}-${index}`}>{line}</div>
                    ))}
                  </div>
                </div>
                <h3 className="mt-2 font-display text-xl">{ev.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ev.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {ev.event_type === "onsite" ||
                  ev.event_type === "hybrid" ||
                  (!ev.is_virtual && ev.event_type !== "online") ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{" "}
                      {ev.location || "Location to be announced"}
                    </span>
                  ) : null}
                  {ev.event_type === "online" || ev.event_type === "hybrid" || ev.is_virtual ? (
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" /> Online
                    </span>
                  ) : null}
                  <span className="rounded bg-muted px-2 py-0.5">
                    {formatEventType(ev.event_type)}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5">
                    {ev.is_paid ? "Paid" : "Free"}
                  </span>
                  {ev.max_attendees && (
                    <span className="rounded bg-muted px-2 py-0.5">
                      {ev.max_attendees} Seats
                    </span>
                  )}
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
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Min tier: {TIER_LABELS[ev.min_tier_required]}
                  </div>
                  <Link
                    to="/event/$eventId"
                    params={{ eventId: ev.id }}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    See details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && canCreateEvents && <CreateEvent onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} userId={user.id} />}
      {eventToEdit && user && (
        <CreateEvent
          event={eventToEdit}
          onClose={() => setEventToEdit(null)}
          onCreated={() => { setEventToEdit(null); void load(); }}
          userId={user.id}
        />
      )}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => { if (!open && !deleting) setEventToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {eventToDelete?.title ? `"${eventToDelete.title}"` : "This event"} will be permanently deleted along with its registrations and RSVPs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); void deleteEvent(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  location: string;
  is_virtual: boolean;
  virtual_link: string;
  registration_link: string;
  is_paid: boolean;
  min_tier_required: Database["public"]["Enums"]["membership_tier"];
  max_attendees: string;
};

type EventEditData = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  | "id"
  | "title"
  | "description"
  | "event_type"
  | "start_date"
  | "end_date"
  | "schedule"
  | "location"
  | "is_virtual"
  | "virtual_link"
  | "registration_link"
  | "max_attendees"
  | "min_tier_required"
  | "is_paid"
  | "image_url"
  | "created_by"
>;

type EventSessionForm = {
  date: string;
  time: string;
};

function dateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function eventScheduleDefaults(event: EventEditData | null) {
  if (event && isRecord(event.schedule) && event.schedule.mode === "custom" && Array.isArray(event.schedule.sessions)) {
    const sessions = event.schedule.sessions.flatMap((session) => {
      if (!isRecord(session) || typeof session.date !== "string") return [];
      return [{
        date: session.date,
        time: typeof session.time === "string"
          ? session.time
          : typeof session.start_time === "string" ? session.start_time : "",
      }];
    });
    if (sessions.length) return { mode: "custom" as const, sessions };
  }

  if (event && isRecord(event.schedule) && event.schedule.mode === "daily"
    && typeof event.schedule.start_date === "string" && typeof event.schedule.end_date === "string") {
    return {
      mode: "daily" as const,
      sessions: [{ date: "", time: "" }],
      startDate: event.schedule.start_date,
      endDate: event.schedule.end_date,
      time: typeof event.schedule.time === "string" ? event.schedule.time : "",
    };
  }

  return {
    mode: "daily" as const,
    sessions: [{ date: "", time: "" }],
    startDate: event ? dateInputValue(event.start_date) : "",
    endDate: event ? dateInputValue(event.end_date) : "",
    time: event ? timeInputValue(event.start_date) : "",
  };
}

function eventFormDefaults(event: EventEditData | null): EventFormState {
  const schedule = eventScheduleDefaults(event);
  const dailySchedule = schedule.mode === "daily" ? schedule : null;
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_type: event?.event_type === "online" || event?.event_type === "hybrid" ? event.event_type : "onsite",
    start_date: dailySchedule?.startDate ?? "",
    end_date: dailySchedule?.endDate ?? "",
    start_time: dailySchedule?.time ?? "",
    location: event?.location ?? "",
    is_virtual: event?.is_virtual ?? false,
    virtual_link: event?.virtual_link ?? "",
    registration_link: event?.registration_link ?? "",
    is_paid: event?.is_paid ?? false,
    min_tier_required: event?.min_tier_required ?? "observer",
    max_attendees: event?.max_attendees?.toString() ?? "",
  };
}

function CreateEvent({
  event = null,
  onClose,
  onCreated,
  userId,
}: {
  event?: EventEditData | null;
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const { profile, isStaff } = useAuth();
  const [form, setForm] = useState<EventFormState>(() => eventFormDefaults(event));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scheduleDefaults = eventScheduleDefaults(event);
  const [scheduleMode, setScheduleMode] = useState<"daily" | "custom">(scheduleDefaults.mode);
  const [sessions, setSessions] = useState<EventSessionForm[]>(scheduleDefaults.sessions);
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

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const set = <K extends keyof EventFormState,>(key: K, value: EventFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const selectImage = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setImageFile(null);
      toast.error("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setImageFile(file);
    setRemoveExistingImage(false);
  };

  const previewSchedule: EventSchedule | null =
    scheduleMode === "daily" &&
    form.start_date &&
    form.end_date &&
    form.end_date >= form.start_date
      ? {
          mode: "daily",
          start_date: form.start_date,
          end_date: form.end_date,
          time: form.start_time || undefined,
        }
      : scheduleMode === "custom" &&
          sessions.length > 0 &&
          sessions.every((session) => session.date)
        ? {
            mode: "custom",
            sessions: sessions.map(({ date, time }) => ({
              date,
              time: time || undefined,
            })),
          }
        : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!event && !requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;
    const registrationLink = form.registration_link.trim();
    if (!registrationLink) {
      toast.error("A registration link is required.");
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
      schedule = {
        mode: "daily",
        start_date: form.start_date,
        end_date: form.end_date,
        time: form.start_time || undefined,
      };
      startDateTime = new Date(`${form.start_date}T${form.start_time || "00:00"}`).toISOString();
      endDateTime = new Date(`${form.end_date}T23:59:59`).toISOString();
    } else {
      if (!sessions.every((session) => session.date) || sessions.length === 0) {
        toast.error("Add at least one session with a date.");
        return;
      }
      const sortedSessions = [...sessions].sort((left, right) =>
        `${left.date}T${left.time || "00:00"}`.localeCompare(`${right.date}T${right.time || "00:00"}`),
      );
      schedule = { mode: "custom", sessions: sortedSessions };
      startDateTime = new Date(`${sortedSessions[0].date}T${sortedSessions[0].time || "00:00"}`).toISOString();
      const lastSession = sortedSessions[sortedSessions.length - 1];
      endDateTime = new Date(`${lastSession.date}T23:59:59`).toISOString();
    }

    setBusy(true);
    let imageUrl = event?.image_url ?? null;
    let imagePath: string | null = null;
    if (removeExistingImage) imageUrl = null;
    if (imageFile) {
      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      imagePath = `${userId}/${crypto.randomUUID()}.${extensionByType[imageFile.type]}`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(imagePath, imageFile, { contentType: imageFile.type });
      if (uploadError) {
        setBusy(false);
        toast.error(`Could not upload image: ${uploadError.message}`);
        return;
      }
      imageUrl = supabase.storage.from("event-images").getPublicUrl(imagePath).data.publicUrl;
    }

    const eventValues = {
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
      image_url: imageUrl,
    };
    const result = event
      ? await supabase.from("events").update(eventValues).eq("id", event.id).select("id").maybeSingle()
      : await supabase.from("events").insert({ ...eventValues, created_by: userId }).select("id").maybeSingle();
    const { data, error } = result;
    if (error) {
      if (imagePath) {
        const { error: cleanupError } = await supabase.storage
          .from("event-images")
          .remove([imagePath]);
        if (cleanupError) toast.error(`Could not clean up uploaded image: ${cleanupError.message}`);
      }
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (!data) {
      setBusy(false);
      toast.error(event ? "You do not have permission to update this event." : "Could not create event.");
      return;
    }
    setBusy(false);
    toast.success(event ? "Event updated" : "Event created");
    onCreated();
  };
  const displayedImage = imagePreview ?? (removeExistingImage ? null : event?.image_url ?? null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-xl">{event ? "Edit event" : "New event"}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
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
        <div className="space-y-1.5">
          <label htmlFor="event-image" className="block text-sm font-medium">
            Event image (optional)
          </label>
          <input
            id="event-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              selectImage(e.currentTarget.files?.[0] ?? null);
              e.currentTarget.value = "";
            }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-2 file:text-sm"
          />
          {displayedImage && (
            <div className="space-y-2">
              <img
                src={displayedImage}
                alt="Event image preview"
                className="mt-2 max-h-48 w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  if (imageFile) setImageFile(null);
                  else setRemoveExistingImage(true);
                }}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Remove image
              </button>
            </div>
          )}
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
                    Start Date
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
                    End Date
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
              <div className="space-y-1.5">
                <label htmlFor="event-start-time" className="block text-sm font-medium">
                  Time (optional)
                </label>
                <input
                  id="event-start-time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => set("start_time", e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
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
                    <label htmlFor={`event-session-time-${index}`} className="block text-xs font-medium">
                      Time (optional)
                    </label>
                    <input
                      id={`event-session-time-${index}`}
                      type="time"
                      value={session.time}
                      onChange={(e) =>
                        setSessions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, time: e.target.value } : item,
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
                  setSessions((current) => [...current, { date: "", time: "" }])
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
              <p className="mt-1 text-muted-foreground">Enter the event dates; adding a time is optional.</p>
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
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? (event ? "Saving..." : "Creating...") : (event ? "Save changes" : "Create")}
          </button>
        </div>
      </form>
    </div>
  );
}
