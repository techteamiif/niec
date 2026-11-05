import { format, isValid, parseISO } from "date-fns";

export type DailyEventSchedule = {
  mode: "daily";
  start_date: string;
  end_date: string;
  time?: string;
  start_time?: string;
  end_time?: string;
};

export type CustomEventSchedule = {
  mode: "custom";
  sessions: {
    date: string;
    time?: string;
    start_time?: string;
    end_time?: string;
  }[];
};

export type EventSchedule = DailyEventSchedule | CustomEventSchedule;
type EventSession = CustomEventSchedule["sessions"][number];

function formatDateRange(startDate: string, endDate: string) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (startDate === endDate) return format(start, "MMM d, yyyy");
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "MMM d, yyyy")}–${format(end, "MMM d, yyyy")}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "MMM d")}–${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d")}–${format(end, "d, yyyy")}`;
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "pm" : "am";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${period}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isEventSession(value: unknown): value is EventSession {
  if (!isRecord(value) || !isDate(value.date)) return false;
  return (
    value.time === undefined ||
    value.time === null ||
    value.time === "" ||
    isTime(value.time) ||
    (isTime(value.start_time) && isTime(value.end_time))
  );
}

export function formatEventSchedule(value: unknown, startDate: string, endDate: string) {
  if (isRecord(value) && value.mode === "daily") {
    const { start_date, end_date } = value;
    if (isDate(start_date) && isDate(end_date)) {
      const time = isTime(value.time) ? value.time : isTime(value.start_time) ? value.start_time : null;
      return [`${formatDateRange(start_date, end_date)}${time ? ` · ${formatTime(time)}` : ""}`];
    }
  }

  if (isRecord(value) && value.mode === "custom" && Array.isArray(value.sessions)) {
    const sessions = value.sessions.filter(isEventSession);
    if (sessions.length > 0) {
      return sessions
        .sort((left, right) =>
          `${left.date}T${left.time ?? left.start_time ?? ""}`.localeCompare(
            `${right.date}T${right.time ?? right.start_time ?? ""}`,
          ),
        )
        .map((session) => {
          const time = isTime(session.time)
            ? session.time
            : isTime(session.start_time)
              ? session.start_time
              : null;
          return `${formatDateRange(session.date, session.date)}${time ? ` · ${formatTime(time)}` : ""}`;
        });
    }
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateRange = formatDateRange(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
  const time = start.getHours() || start.getMinutes()
    ? ` · ${formatTime(format(start, "HH:mm"))}`
    : "";
  return [`${dateRange}${time}`];
}
