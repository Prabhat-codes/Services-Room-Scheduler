/** All scheduling happens in IST; store UTC, render Asia/Kolkata. */
export const TZ = "Asia/Kolkata";

const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const dayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

export const fmtTime = (d: Date) => timeFmt.format(d).replace(" ", "\u202f").toLowerCase();
export const fmtDay = (d: Date) => dayFmt.format(d);
/** YYYY-MM-DD in IST. */
export const dayKey = (d: Date) => keyFmt.format(d);
/** HH:MM (24h) in IST, for <input type="time">. */
export const hm = (d: Date) => hmFmt.format(d);

/** Build a UTC Date from an IST calendar date + HH:MM. */
export const fromIst = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);

export function fmtRange(start: Date, end: Date) {
  const sameDay = dayKey(start) === dayKey(end);
  return sameDay
    ? `${fmtTime(start)} – ${fmtTime(end)}`
    : `${fmtDay(start)} ${fmtTime(start)} – ${fmtDay(end)} ${fmtTime(end)}`;
}

export function dayLabel(d: Date, now = new Date()) {
  const k = dayKey(d);
  if (k === dayKey(now)) return "Today";
  if (k === dayKey(new Date(now.getTime() + 864e5))) return "Tomorrow";
  if (k === dayKey(new Date(now.getTime() - 864e5))) return "Yesterday";
  return fmtDay(d);
}

export function relative(d: Date, now = new Date()) {
  const mins = Math.round((d.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(mins);
  const span = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.floor(abs / 60)} h ${abs % 60 ? `${abs % 60} min` : ""}`.trim() : `${Math.round(abs / 1440)} d`;
  if (abs < 1) return "just now";
  return mins > 0 ? `in ${span}` : `${span} ago`;
}
