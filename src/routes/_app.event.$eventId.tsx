import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Video } from "lucide-react";
import { formatEventSchedule } from "@/lib/event-schedule";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS } from "@/lib/niec";
import { toast } from "sonner";

type EventRecord = Database["public"]["Tables"]["events"]["Row"];
type AttendanceResponse = "yes" | "no" | null;
type EventAttendee = {
  member_id: string;
  registered_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/_app/event/$eventId")({
  component: EventDetailPage,
});

function formatEventType(eventType: string) {
  const label = eventType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { user, profile, isStaff } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [attendanceResponse, setAttendanceResponse] = useState<AttendanceResponse>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [tab, setTab] = useState<"details" | "attendees">("details");
  const [loading, setLoading] = useState(true);
  const canViewAttendees = !!event && (isStaff || event.created_by === user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, event_type, start_date, end_date, schedule, location, is_virtual, max_attendees, min_tier_required, created_by, is_paid")
      .eq("id", eventId)
      .maybeSingle();
    if (error) {
      toast.error(`Could not load event: ${error.message}`);
      setEvent(null);
      setLoading(false);
      return;
    }
    if (!data) {
      setEvent(null);
      setLoading(false);
      return;
    }
    const [
      { data: virtualLink, error: virtualLinkError },
      { data: registrationLink, error: registrationLinkError },
    ] = await Promise.all([
      supabase.rpc("get_event_virtual_link", { _event_id: eventId }),
      supabase.rpc("get_event_registration_link", { _event_id: eventId }),
    ]);
    if (virtualLinkError) toast.error(`Could not load online event link: ${virtualLinkError.message}`);
    if (registrationLinkError) toast.error(`Could not load registration link: ${registrationLinkError.message}`);
    setEvent({
      ...data,
      virtual_link: virtualLink ?? null,
      registration_link: registrationLink ?? null,
    });

    const { data: count, error: countError } = await supabase
      .from("event_attendee_counts")
      .select("attendee_count")
      .eq("event_id", eventId)
      .maybeSingle();
    if (countError) toast.error(`Could not load attendee count: ${countError.message}`);
    setAttendeeCount(count?.attendee_count ?? 0);

    if (isStaff || data.created_by === user?.id) {
      const { data: attendeeRows, error: attendeeError } = await supabase
        .from("event_attendees")
        .select("member_id, registered_at, profiles:member_id(full_name, avatar_url)")
        .eq("event_id", eventId)
        .eq("attending", true)
        .order("registered_at");
      if (attendeeError) toast.error(`Could not load attendees: ${attendeeError.message}`);
      setAttendees(attendeeRows ?? []);
    } else {
      setAttendees([]);
    }

    if (user) {
      const { data: rsvp, error: rsvpError } = await supabase
        .from("event_attendees")
        .select("attending")
        .eq("event_id", eventId)
        .eq("member_id", user.id)
        .maybeSingle();
      if (rsvpError) toast.error(`Could not check your attendance: ${rsvpError.message}`);
      setAttendanceResponse(rsvp ? (rsvp.attending ? "yes" : "no") : null);
    } else {
      setAttendanceResponse(null);
    }
    setLoading(false);
  }, [eventId, isStaff, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canViewAttendees && tab === "attendees") setTab("details");
  }, [canViewAttendees, tab]);

  const register = () => {
    if (event && !event.registration_link?.trim()) {
      toast.error("This event does not have a registration link yet.");
    }
  };

  const setAttendance = async (response: Exclude<AttendanceResponse, null>) => {
    if (!user || !event || updatingAttendance) return;
    if (!allowed) {
      toast.error(`Requires ${TIER_LABELS[event.min_tier_required]} tier or above`);
      return;
    }
    const previousResponse = attendanceResponse;
    const previousCount = attendeeCount;
    const previousAttendee = attendees.find((attendee) => attendee.member_id === user.id);
    const previousAttendees = attendees;
    const wasAttending = previousResponse === "yes";
    const willAttend = response === "yes";
    const countChange = Number(willAttend) - Number(wasAttending);

    setUpdatingAttendance(true);
    setAttendanceResponse(response);
    setAttendeeCount((count) => Math.max(0, count + countChange));
    if (canViewAttendees && user) {
      setAttendees((current) =>
        willAttend
          ? [
              ...current.filter((attendee) => attendee.member_id !== user.id),
              previousAttendee ?? {
                  member_id: user.id,
                  registered_at: new Date().toISOString(),
                  profiles: profile
                    ? { full_name: profile.full_name, avatar_url: profile.avatar_url }
                    : null,
                },
            ]
          : current.filter((attendee) => attendee.member_id !== user.id),
      );
    }

    const { error } = await supabase.from("event_attendees").upsert(
      {
        event_id: event.id,
        member_id: user.id,
        attending: response === "yes",
      },
      { onConflict: "event_id,member_id" },
    );
    setUpdatingAttendance(false);
    if (error) {
      setAttendanceResponse(previousResponse);
      setAttendeeCount(previousCount);
      if (canViewAttendees && user) {
        setAttendees(previousAttendees);
      }
      toast.error(error.message);
      return;
    }
    toast.success(response === "yes" ? "You're on the attendee list" : "Your response was saved");
  };

  const ended = event ? new Date(event.end_date ?? event.start_date).getTime() < Date.now() : false;
  const allowed = event ? tierMeets(profile?.membership_tier, event.min_tier_required) : false;
  const isAttending = attendanceResponse === "yes";

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/events"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Events
      </Link>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Loading event…
        </div>
      ) : !event ? (
        <div className="rounded-xl border bg-card p-8">
          <h1 className="font-display text-2xl">Event not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This event may have been removed or is unavailable.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="font-display text-3xl">{event.title}</h1>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {event.event_type === "onsite" ||
                event.event_type === "hybrid" ||
                !event.is_virtual ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location || "Location to be announced"}
                  </span>
                ) : null}
                {event.event_type === "online" ||
                event.event_type === "hybrid" ||
                event.is_virtual ? (
                  <span className="inline-flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {event.virtual_link ? (
                      <a
                        className="text-primary underline"
                        href={event.virtual_link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Join virtual event
                      </a>
                    ) : (
                      "Online event"
                    )}
                  </span>
                ) : null}
                <span className="rounded bg-muted px-2.5 py-1 text-xs">
                  {formatEventType(event.event_type)}
                </span>
                <span className="rounded bg-muted px-2.5 py-1 text-xs">
                  {event.is_paid ? "Paid" : "Free"}
                </span>
              </div>
              <div className="mt-8 flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  {isAttending
                    ? attendeeCount === 1
                      ? "You will be attending this event"
                      : `You and ${attendeeCount - 1} ${
                          attendeeCount === 2 ? "other" : "others"
                        } will be attending`
                    : attendeeCount > 0
                      ? `${attendeeCount} ${attendeeCount === 1 ? "person" : "people"} will be attending.`
                      : attendanceResponse === "no"
                        ? "No attendees yet."
                        : "No one will be attending yet."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-1 text-sm text-foreground">Will you be attending?</p>
                  {!ended && (
                    <>
                    <button
                      onClick={() => setAttendance("yes")}
                      disabled={!allowed || updatingAttendance}
                      aria-pressed={isAttending}
                      title={
                        allowed
                          ? ""
                          : `Requires ${TIER_LABELS[event.min_tier_required]} tier or above`
                      }
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                        isAttending
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/90"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAttendance("no")}
                      disabled={!allowed || updatingAttendance}
                      aria-pressed={attendanceResponse === "no"}
                      title={
                        allowed
                          ? ""
                          : `Requires ${TIER_LABELS[event.min_tier_required]} tier or above`
                      }
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                        attendanceResponse === "no"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/90"
                      }`}
                    >
                      No
                    </button>
                    </>
                  )}
                </div>
              </div>
              {/* <p className="mt-2 text-sm text-muted-foreground">
                Convenings, deal rooms, CoP meetings, boot camps and policy roundtables.
              </p> */}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!ended &&
                (allowed ? (
                  event.registration_link?.trim() ? (
                    <a
                      href={event.registration_link.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Register
                    </a>
                  ) : (
                    <button
                      onClick={register}
                      className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Register
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    title={`Requires ${TIER_LABELS[event.min_tier_required]} tier or above`}
                    className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground opacity-50"
                  >
                    Tier locked
                  </button>
                ))}
              {ended && (
                <span className="rounded-md bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                  Event ended
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 border-b">
            {(["details", ...(canViewAttendees ? ["attendees" as const] : [])] as const).map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
                    tab === item
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                  {item === "attendees" && ` (${attendeeCount})`}
                </button>
              ),
            )}
          </div>

          {tab === "details" ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
              <section className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Calendar className="h-4 w-4" />
                  {formatEventSchedule(event.schedule, event.start_date, event.end_date).map(
                    (line, index) => (
                      <span key={`${line}-${index}`}>{line}</span>
                    ),
                  )}
                </div>
                {/* <h2 className="mt-3 font-display text-2xl">{event.title}</h2> */}
                {event.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </section>

              <aside className="space-y-4">
                <section className="rounded-xl border bg-card p-5">
                  <h2 className="font-display text-lg">Other information</h2>
                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      {/* <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Date and time
                      </dt> */}
                      {formatEventSchedule(event.schedule, event.start_date, event.end_date).map(
                        (line, index) => (
                          <dd key={`${line}-${index}`} className="mt-1">
                            {line}
                          </dd>
                        ),
                      )}
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Minimum membership tier
                      </dt>
                      <dd className="mt-1">{TIER_LABELS[event.min_tier_required]}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Amount
                      </dt>
                      <dd className="mt-1">{event.is_paid ? "Paid" : "Free"}</dd>
                    </div>
                    {event.max_attendees && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Capacity
                        </dt>
                        <dd className="mt-1">{event.max_attendees} attendees</dd>
                      </div>
                    )}
                  </dl>
                </section>
              </aside>
            </div>
          ) : canViewAttendees ? (
            <section className="mt-5">
              <div className="mb-4">
                <h2 className="font-display text-xl">Attendees</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {attendeeCount} will be attending
                </p>
              </div>
              {attendees.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.member_id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-4"
                    >
                      <Avatar>
                        <AvatarImage src={attendee.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(attendee.profiles?.full_name ?? "?")
                            .split(/\s+/)
                            .map((part: string) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {attendee.profiles?.full_name ?? "Member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Attending {format(new Date(attendee.registered_at), "PPP")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                  No one has RSVPed yet.
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
