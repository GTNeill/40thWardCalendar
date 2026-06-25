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
  match: (title: string, desc?: string) => boolean;
}

function buildMatcher(keywords: string[]): (title: string, desc?: string) => boolean {
  if (keywords.length === 0) return () => true;   // "other" sentinel
  const rx = new RegExp(keywords.join("|"), "i");
  return (t: string) => rx.test(t);
}

function loadCategories(): CategoryDef[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed: Omit<CategoryDef, "match">[] = JSON.parse(raw);
    return parsed
      .sort((a, b) => a.order - b.order)
      .map(c => ({ ...c, match: buildMatcher(c.keywords) }));
  } catch (e) {
    console.error("Failed to load categories.json, using empty list:", e);
    return [];
  }
}

function saveCategories(cats: Omit<CategoryDef, "match">[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(cats, null, 2), "utf-8");
}

let runtimeCategories: CategoryDef[] = loadCategories();

function categorize(title: string, description: string = ""): CategoryDef {
  for (const cat of runtimeCategories) {
    if (cat.match(title, description)) return cat;
  }
  return runtimeCategories[runtimeCategories.length - 1];
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

function parseICSDate(raw: string, _blockForTZ?: string): { date: Date; allDay: boolean } {
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
  return { date: new Date(iso), allDay: false };
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
    const recId = getField(block, "RECURRENCE-ID");
    if (!recId) continue;
    const uid = getField(block, "UID");
    if (!uid) continue;
    const { date } = parseICSDate(recId);
    if (!overrides.has(uid)) overrides.set(uid, new Set());
    overrides.get(uid)!.add(date.toISOString());
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

    const startParsed = parseICSDate(dtStartRaw, block);
    const endParsed   = parseICSDate(dtEndRaw, block);
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
        exdateStr.split(",").forEach(ex => {
          const { date } = parseICSDate(ex.trim());
          excludedISOs.add(date.toISOString());
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
        let start = occ;
        if (!dtStartRaw.endsWith("Z")) {
          const iso = occ.toISOString().replace("Z", "");
          start = new Date(iso);
        }
        if (start < timeMin || start > timeMax) continue;
        if (excludedISOs.has(occ.toISOString())) continue;
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
