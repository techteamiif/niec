import { format, isValid, parseISO } from "date-fns";

export type DailyEventSchedule = {
  mode: "daily";
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
};

export type CustomEventSchedule = {
  mode: "custom";
  sessions: {
    date: string;
    start_time: string;
    end_time: string;
  }[];
};

export type EventSchedule = DailyEventSchedule | CustomEventSchedule;
type EventSession = CustomEventSchedule["sessions"][number];

function formatDateRange(startDate: string, endDate: string) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (startDate === endDate) return format(start, "MMMM do, yyyy");
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "MMMM do, yyyy")}–${format(end, "MMMM do, yyyy")}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "MMMM do")}–${format(end, "MMMM do, yyyy")}`;
  }
  return `${format(start, "MMMM do")}–${format(end, "do, yyyy")}`;
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatTimeRange(startTime: string, endTime: string) {
  const startPeriod = Number(startTime.slice(0, 2)) >= 12 ? "PM" : "AM";
  const endPeriod = Number(endTime.slice(0, 2)) >= 12 ? "PM" : "AM";
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return startPeriod === endPeriod ? `${start.slice(0, -3)}–${end}` : `${start}–${end}`;
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
  return (
    isRecord(value) && isDate(value.date) && isTime(value.start_time) && isTime(value.end_time)
  );
}

export function formatEventSchedule(value: unknown, startDate: string, endDate: string) {
  if (isRecord(value) && value.mode === "daily") {
    const { start_date, end_date, start_time, end_time } = value;
    if (isDate(start_date) && isDate(end_date) && isTime(start_time) && isTime(end_time)) {
      return [
        `${formatDateRange(start_date, end_date)} · ${formatTimeRange(start_time, end_time)}`,
      ];
    }
  }

  if (isRecord(value) && value.mode === "custom" && Array.isArray(value.sessions)) {
    const sessions = value.sessions.filter(isEventSession);
    if (sessions.length > 0) {
      return sessions
        .sort((left, right) =>
          `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`),
        )
        .map(
          (session) =>
            `${formatDateRange(session.date, session.date)} · ${formatTimeRange(
              session.start_time,
              session.end_time,
            )}`,
        );
    }
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start.toDateString() === end.toDateString()) {
    return [
      `${format(start, "MMMM do, yyyy")} · ${format(start, "h:mm a")}–${format(end, "h:mm a")}`,
    ];
  }
  return [
    `${format(start, "MMMM do, yyyy 'at' h:mm a")}–${format(end, "MMMM do, yyyy 'at' h:mm a")}`,
  ];
}
