export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location: string;
  description: string;
  organizer: string;
  status: string;
  htmlLink: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
}

export const CATEGORY_ORDER = [
  "ward", "zoning", "publicSafety", "community", "environment",
  "arts", "health", "education", "immigration", "food", "celebrations", "social", "housing", "other"
];

export const CATEGORY_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Your Government",
    keys: ["ward", "zoning", "immigration", "housing"],
  },
  {
    label: "Your Community",
    keys: ["publicSafety", "community", "environment", "arts", "health", "education", "food", "celebrations", "social", "other"],
  },
];

export type RangeUnit = "week" | "month";

export function parseLocalDate(str: string): Date {
  if (!str) return new Date();
  if (str.length === 10) return new Date(str + "T00:00:00");
  return new Date(str);
}

export function fmtTime(str: string, isAllDay: boolean): string {
  if (isAllDay) return "All day";
  const d = parseLocalDate(str);
  return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDuration(start: string, end: string, isAllDay: boolean): string {
  if (isAllDay || !end) return "";
  const ms = parseLocalDate(end).getTime() - parseLocalDate(start).getTime();
  if (ms <= 0) return "";
  const totalMins = Math.round(ms / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function fmtWeekday(str: string): string {
  const d = parseLocalDate(str);
  return d.toLocaleString("en-US", { weekday: "short" });
}

export function fmtDayNum(str: string): number {
  return parseLocalDate(str).getDate();
}

export function fmtMonthShort(str: string): string {
  return parseLocalDate(str).toLocaleString("en-US", { month: "short" });
}

export function isToday(str: string): boolean {
  const d = parseLocalDate(str);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function isSameDay(a: string, b: Date): boolean {
  const da = parseLocalDate(a);
  return da.toDateString() === b.toDateString();
}

/** Midnight today */
export function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Rolling range anchored to today, offset by N weeks/months.
 *  week  → today+offset*7 through +7 days
 *  month → today+offset months through +1 month
 */
export function getRollingRange(unit: RangeUnit, offset: number): { start: Date; end: Date } {
  const today = todayMidnight();
  const start = new Date(today);
  if (unit === "week") {
    start.setDate(today.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else {
    start.setMonth(today.getMonth() + offset);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

/** Calendar-aligned range (used for the Calendar grid view).
 *  week  → Sunday–Saturday containing today + offset*7 days
 *  month → 1st–last day of the calendar month, offset months from today
 */
export function getRange(unit: RangeUnit, offset: number): { start: Date; end: Date } {
  const today = todayMidnight();

  if (unit === "week") {
    // Anchor to this week's Sunday, then shift by offset weeks
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + offset * 7);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);
    return { start: sunday, end: saturday };
  } else {
    // Calendar month: first day of month (today + offset months)
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

/** Format a range label: week shows "Jun 29 – Jul 5, 2026"; month shows "July 2026" */
export function fmtRangeLabel(start: Date, end: Date): string {
  // If same month+year, it's a calendar month view
  if (start.getDate() === 1 && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    return start.toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const endOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleString("en-US", opts)} – ${end.toLocaleString("en-US", endOpts)}`;
}

/** Generate array of Date objects for a range */
export function getDayRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  const cur = new Date(start);
  while (cur < end) {
    result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function toISO(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "-05:00");
}

export function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
