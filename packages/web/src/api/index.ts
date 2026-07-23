import { Hono } from 'hono';
import { cors } from "hono/cors";
import { RRuleSet, rrulestr } from "rrule";
import fs from "node:fs";
import path from "node:path";

// ── 40th Ward public Google Calendar IDs ─────────────────────────────────────
const CAL1_ID = "c_50dc8883383193a9f6ba4d86cd23a836978e1d42028f0e7bb263955d5539912c@group.calendar.google.com";
const CAL2_ID = "c_05dba706bb25f28f63bfc0b821c9f8d5e29d9f2b105e78949388b675eb801572@group.calendar.google.com";

// ── Category persistence ──────────────────────────────────────────────────────
// DATA_DIR env var → set to a Railway volume mount path for persistence across deploys.
// Falls back to the local data/ folder alongside the source (dev + first deploy seed).
const _apiDir: string = (typeof (import.meta as any).dir === "string")
  ? (import.meta as any).dir
  : path.dirname(new URL(import.meta.url).pathname);
const _defaultDataDir = path.resolve(_apiDir, "../../data");
const DATA_DIR  = process.env.DATA_DIR ?? _defaultDataDir;
const DATA_FILE = path.join(DATA_DIR, "categories.json");

export interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  group: string;       // "government" | "community"
  order: number;
  keywords: string[];  // plain strings used as regex alternates
  match: (title: string) => boolean;
  matchDescription: (text: string) => boolean;
}

function buildMatcher(keywords: string[]): (title: string) => boolean {
  if (keywords.length === 0) return () => true;   // "other" sentinel
  const rx = new RegExp(keywords.join("|"), "i");
  return (t: string) => rx.test(t);
}

// Keywords eligible for description matching must be BOTH:
//  1. Free of regex metacharacters (.*  .?  ^  $  ()  [] etc.) — a wildcard
//     tuned for a short title (e.g. "ward.*office") can otherwise span
//     across unrelated sentences in a long free-form description.
//  2. Multi-word phrases (contain a space) — a single generic word like
//     "groundbreaking" is too ambiguous out of context (it can appear as an
//     ordinary adjective, e.g. "a groundbreaking new musical", with no
//     relation to an actual groundbreaking ceremony). Multi-word phrases
//     like "ward night" or "american blues theater" are specific enough to
//     safely substring-match against full description text.
const REGEX_METACHAR = /[.*+?^${}()|[\]\\]/;

function buildDescriptionMatcher(keywords: string[]): (text: string) => boolean {
  const safe = keywords.filter(k => !REGEX_METACHAR.test(k) && k.trim().includes(" "));
  if (safe.length === 0) return () => false;
  const rx = new RegExp(safe.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
  return (text: string) => rx.test(text);
}

// Built-in safety net — used only if categories.json is ever unreadable/empty,
// so the site never crashes trying to categorize an event.
const FALLBACK_CATEGORY: CategoryDef = {
  key: "other",
  label: "Other",
  icon: "📌",
  color: "#5A5A5A",
  group: "community",
  order: 999,
  keywords: [],
  match: () => true,
  matchDescription: () => true,
};

function loadCategories(): CategoryDef[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed: Omit<CategoryDef, "match">[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("categories.json parsed to an empty/invalid list");
    }
    return parsed
      .sort((a, b) => a.order - b.order)
      .map(c => ({ ...c, match: buildMatcher(c.keywords), matchDescription: buildDescriptionMatcher(c.keywords) }));
  } catch (e) {
    console.error("Failed to load categories.json, keeping previous list:", e);
    // Never return an empty list — fall back to whatever was last loaded
    // successfully, or a single safe "other" category if this is the very
    // first load attempt.
    return runtimeCategories && runtimeCategories.length > 0
      ? runtimeCategories
      : [FALLBACK_CATEGORY];
  }
}

function saveCategories(cats: Omit<CategoryDef, "match">[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  // Write atomically: write to a temp file then rename, so a concurrent
  // read from another request never sees a half-written/truncated file.
  const tmpFile = `${DATA_FILE}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(cats, null, 2), "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

// Initialize with the safe fallback first so loadCategories() always has
// something valid to reference in its catch branch, even on the very first call.
let runtimeCategories: CategoryDef[] = [FALLBACK_CATEGORY];
runtimeCategories = loadCategories();

function categorize(title: string, description: string = ""): CategoryDef {
  // Pass 1 — title only (unchanged, highest-confidence match).
  for (const cat of runtimeCategories) {
    if (cat.key === "other") continue; // always last-resort
    if (cat.match(title)) return cat;
  }
  // Pass 2 — fallback to description, only for multi-word literal phrases
  // (see buildDescriptionMatcher for why). Catches events whose defining
  // detail — a producing company, venue, or organizer — only appears in
  // the description, not the title itself (e.g. "American Blues Theater").
  if (description) {
    for (const cat of runtimeCategories) {
      if (cat.key === "other") continue;
      if (cat.matchDescription(description)) return cat;
    }
  }
  // Guaranteed non-empty due to loadCategories() never returning [].
  return runtimeCategories[runtimeCategories.length - 1] ?? FALLBACK_CATEGORY;
}

// ── Fetch public iCal and parse events ───────────────────────────────────────
function buildGCalLink(uid: string, calId: string): string {
  if (!uid || !calId) return "";
  try {
    const shortId = uid.replace(/@google\.com$/, "");
    const payload = `${shortId} ${calId}`;
    const encoded = Buffer.from(payload).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return `https://calendar.google.com/calendar/event?eid=${encoded}`;
  } catch {
    return "";
  }
}

function icsVal(raw: string): string {
  return raw.replace(/\r?\n[ \t]/g, "").trim()
    .replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\");
}

function getField(block: string, key: string): string {
  const m = block.match(new RegExp(`^${key}[^:\r\n]*:([^\r\n]+(?:\r?\n[ \t][^\r\n]+)*)`, "m"));
  return m ? icsVal(m[1]) : "";
}

// Extract the TZID parameter from a raw ICS property line, e.g.
// "DTSTART;TZID=America/Chicago:20260601T150000" → "America/Chicago"
function getLineTzid(line: string): string | undefined {
  return line.match(/TZID=([^:;]+)/)?.[1];
}

// Convert a wall-clock date/time meant to represent a moment in `timeZone`
// into the correct absolute UTC Date, automatically accounting for whatever
// DST rules apply on that specific date (no hardcoded UTC offset).
function zonedWallClockToUTC(isoNaive: string, timeZone: string): Date {
  const asUTC = new Date(isoNaive + "Z");
  if (Number.isNaN(asUTC.getTime())) return asUTC;
  const tzStr  = asUTC.toLocaleString("en-US", { timeZone });
  const utcStr = asUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const offsetMs = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  return new Date(asUTC.getTime() + offsetMs);
}

// Builds the same "naive digits as if UTC" ISO string that rrule.js produces
// internally for floating DTSTART values — used only to match EXDATE/
// RECURRENCE-ID exclusions against RRULE occurrences, both in that same
// (not-yet-timezone-corrected) representation.
function naiveISOWithZ(raw: string): string {
  const val = raw.replace(/.*:/, "");
  const iso = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T${val.slice(9,11)}:${val.slice(11,13)}:${val.slice(13,15)}.000Z`;
  return iso;
}

const DEFAULT_TZ = "America/Chicago";

function parseICSDate(raw: string, tzid?: string): { date: Date; allDay: boolean } {
  if (!raw) return { date: new Date(0), allDay: false };
  const isAllDay = /VALUE=DATE/.test(raw) || /^\d{8}$/.test(raw.replace(/.*:/, ""));
  const val = raw.replace(/.*:/, "");
  if (isAllDay) {
    const iso = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T00:00:00`;
    return { date: new Date(iso), allDay: true };
  }
  const d = val;
  const iso = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(9,11)}:${d.slice(11,13)}:${d.slice(13,15)}`;
  if (val.endsWith("Z")) {
    return { date: new Date(iso + "Z"), allDay: false };
  }
  // Floating/local time (e.g. "DTSTART;TZID=America/Chicago:20260601T150000")
  // — convert the wall-clock digits to the correct UTC instant using the
  // event's own TZID, falling back to Central time since that's this
  // calendar's home timezone.
  return { date: zonedWallClockToUTC(iso, tzid || DEFAULT_TZ), allDay: false };
}

function toChicagoISO(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: "America/Chicago" }).replace(" ", "T");
}

function parseICS(ics: string, calendarName: string, calendarId: string, timeMin: Date, timeMax: Date): any[] {
  const events: any[] = [];
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split(/BEGIN:VEVENT/);

  const overrides = new Map<string, Set<string>>();
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const recIdLine = block.match(/^RECURRENCE-ID[^\r\n]*/m)?.[0] ?? "";
    const recId = getField(block, "RECURRENCE-ID");
    if (!recId) continue;
    const uid = getField(block, "UID");
    if (!uid) continue;
    if (!overrides.has(uid)) overrides.set(uid, new Set());
    // Use the naive-digits representation so it matches occ.toISOString()
    // from rrule.js later, regardless of the RECURRENCE-ID's own TZID.
    overrides.get(uid)!.add(naiveISOWithZ(recIdLine || recId));
  }

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const recId = getField(block, "RECURRENCE-ID");
    const uid       = getField(block, "UID") || Math.random().toString(36);
    const summary   = getField(block, "SUMMARY") || "(no title)";
    const location  = getField(block, "LOCATION");
    const desc      = getField(block, "DESCRIPTION");
    const status    = getField(block, "STATUS") || "CONFIRMED";
    const url       = getField(block, "URL");
    const rruleStr  = getField(block, "RRULE");
    const exdateStr = getField(block, "EXDATE");

    const dtStartLine = block.match(/^DTSTART[^\r\n]*/m)?.[0] ?? "";
    const dtEndLine   = block.match(/^DTEND[^\r\n]*/m)?.[0] ?? "";
    const dtStartRaw  = dtStartLine.replace(/^DTSTART[^:]*:/, "").trim();
    const dtEndRaw    = dtEndLine.replace(/^DTEND[^:]*:/, "").trim();
    const dtStartTzid = getLineTzid(dtStartLine);
    const dtEndTzid   = getLineTzid(dtEndLine);

    const startParsed = parseICSDate(dtStartRaw, dtStartTzid);
    const endParsed   = parseICSDate(dtEndRaw, dtEndTzid);
    const duration    = endParsed.date.getTime() - startParsed.date.getTime();

    const makeEvent = (start: Date, end: Date, instanceUid: string) => {
      const isAllDay = startParsed.allDay;
      const startISO = isAllDay ? toChicagoISO(start).slice(0, 10) : toChicagoISO(start);
      const endISO   = isAllDay ? toChicagoISO(end).slice(0, 10)   : toChicagoISO(end);
      return {
        id: instanceUid,
        summary,
        start: isAllDay ? { date: startISO } : { dateTime: startISO },
        end:   isAllDay ? { date: endISO }   : { dateTime: endISO },
        location,
        description: desc,
        organizer: { displayName: calendarName },
        status,
        htmlLink: url || buildGCalLink(uid, calendarId),
      };
    };

    if (!rruleStr) {
      const start = startParsed.date;
      const end   = endParsed.date;
      if (start >= timeMin && start <= timeMax) {
        events.push(makeEvent(start, end, uid + (recId ? "_" + recId : "")));
      }
      continue;
    }

    try {
      const excludedISOs = new Set<string>();
      if (exdateStr) {
        // EXDATE may contain multiple comma-separated values sharing the
        // property's TZID param.
        exdateStr.split(",").forEach(ex => {
          excludedISOs.add(naiveISOWithZ(ex.trim()));
        });
      }
      const ov = overrides.get(uid);
      if (ov) ov.forEach(iso => excludedISOs.add(iso));

      const ruleText = `DTSTART:${dtStartRaw.replace(/[TZ]/g, c => c)}\nRRULE:${rruleStr}`;
      const rule = rrulestr(ruleText, { forceset: true }) as RRuleSet;
      const occurrences = rule.between(
        new Date(timeMin.getTime() - 86400000),
        new Date(timeMax.getTime() + 86400000),
        true
      );

      for (const occ of occurrences) {
        if (excludedISOs.has(occ.toISOString())) continue;
        let start = occ;
        if (!dtStartRaw.endsWith("Z")) {
          // occ's ISO digits are the naive wall-clock time (rrule.js treats
          // floating DTSTART as UTC internally) — convert those digits to
          // the correct UTC instant using the event's real TZID.
          const iso = occ.toISOString().replace("Z", "");
          start = zonedWallClockToUTC(iso, dtStartTzid || DEFAULT_TZ);
        }
        if (start < timeMin || start > timeMax) continue;
        const end = new Date(start.getTime() + duration);
        const instanceUid = `${uid}_${start.toISOString()}`;
        events.push(makeEvent(start, end, instanceUid));
      }
    } catch (_e) {
      if (startParsed.date >= timeMin && startParsed.date <= timeMax) {
        events.push(makeEvent(startParsed.date, endParsed.date, uid));
      }
    }
  }

  return events;
}

async function fetchICalEvents(timeMin: Date, timeMax: Date): Promise<any[]> {
  const calIds = [
    { id: CAL1_ID, name: "40th Ward Events" },
    { id: CAL2_ID, name: "40th Ward Community" },
  ];

  const allEvents: any[] = [];
  await Promise.all(calIds.map(async ({ id, name }) => {
    const encoded = encodeURIComponent(id);
    const url = `https://calendar.google.com/calendar/ical/${encoded}/public/basic.ics`;
    const res = await fetch(url, { headers: { "User-Agent": "40thWardCalendar/1.0" } });
    if (!res.ok) throw new Error(`iCal fetch failed for ${name}: ${res.status}`);
    const ics = await res.text();
    allEvents.push(...parseICS(ics, name, id, timeMin, timeMax));
  }));

  const seen = new Set<string>();
  const deduped = allEvents.filter(ev => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });

  deduped.sort((a, b) => {
    const as = a.start?.dateTime ?? a.start?.date ?? "";
    const bs = b.start?.dateTime ?? b.start?.date ?? "";
    return new Date(as).getTime() - new Date(bs).getTime();
  });

  return deduped;
}

// ── Shape raw event ───────────────────────────────────────────────────────────
function shapeEvent(ev: any) {
  const title = ev.summary ?? "(no title)";
  const desc  = ev.description ?? "";
  const cat   = categorize(title, desc);
  const startRaw = ev.start?.dateTime ?? ev.start?.date ?? "";
  const endRaw   = ev.end?.dateTime ?? ev.end?.date ?? "";
  const isAllDay = !ev.start?.dateTime;

  return {
    id: ev.id,
    title,
    start: startRaw,
    end: endRaw,
    isAllDay,
    location: ev.location ?? "",
    description: desc,
    organizer: ev.organizer?.displayName ?? ev.organizer?.email ?? "",
    status: ev.status ?? "",
    htmlLink: ev.htmlLink ?? "",
    category: cat.key,
    categoryLabel: cat.label,
    categoryIcon: cat.icon,
    categoryColor: cat.color,
    categoryGroup: cat.group,
  };
}

// ── Hono app ──────────────────────────────────────────────────────────────────
const app = new Hono()
  .basePath("api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true }))

  .get("/health", (c) => c.json({ status: "ok" }, 200))

  .get("/categories", (c) => {
    return c.json(
      runtimeCategories.map(({ key, label, icon, color, group, order }) => ({ key, label, icon, color, group, order })),
      200
    );
  })

  // ── Admin: get full category list including keywords ──────────────────────
  .get("/admin/categories", (c) => {
    return c.json(
      runtimeCategories.map(({ key, label, icon, color, group, order, keywords }) => ({
        key, label, icon, color, group, order, keywords,
      })),
      200
    );
  })

  // ── Admin: replace full category list ────────────────────────────────────
  .put("/admin/categories", async (c) => {
    try {
      const body = await c.req.json() as Omit<CategoryDef, "match">[];
      if (!Array.isArray(body)) return c.json({ error: "Expected array" }, 400);

      // Validate required fields
      for (const cat of body) {
        if (!cat.key || typeof cat.label !== "string") {
          return c.json({ error: `Invalid category: ${JSON.stringify(cat)}` }, 400);
        }
      }

      // Ensure "other" is always last
      const withoutOther = body.filter(c => c.key !== "other");
      const other = body.find(c => c.key === "other");
      const ordered = withoutOther.map((c, i) => ({ ...c, order: i }));
      if (other) ordered.push({ ...other, order: ordered.length, keywords: [] });

      saveCategories(ordered);
      runtimeCategories = loadCategories();

      return c.json({ ok: true, count: runtimeCategories.length }, 200);
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  })

  .get("/events", async (c) => {
    try {
      const qMin = c.req.query("timeMin");
      const qMax = c.req.query("timeMax");

      let timeMin: Date, timeMax: Date;
      if (qMin && qMax) {
        timeMin = new Date(qMin);
        timeMax = new Date(qMax);
      } else {
        const now = new Date();
        timeMin = new Date(now);
        timeMin.setHours(0, 0, 0, 0);
        timeMax = new Date(timeMin);
        timeMax.setDate(timeMax.getDate() + 31);
      }

      let raw: any[] = [];
      try {
        raw = await fetchICalEvents(timeMin, timeMax);
      } catch (e: any) {
        console.error("iCal fetch failed:", e.message);
        return c.json({ error: e.message }, 500);
      }

      const events = raw.map(shapeEvent);
      const grouped: Record<string, typeof events> = {};
      for (const ev of events) {
        if (!grouped[ev.category]) grouped[ev.category] = [];
        grouped[ev.category].push(ev);
      }

      return c.json({ events, grouped, fetchedAt: new Date().toISOString() }, 200);
    } catch (e: any) {
      console.error("/api/events error:", e);
      return c.json({ error: e.message ?? "Unknown error" }, 500);
    }
  });

export type AppType = typeof app;
export default app;
