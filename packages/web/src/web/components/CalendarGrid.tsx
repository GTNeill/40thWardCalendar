import { useState, useRef, useEffect, useCallback } from "react";
import type { CalEvent } from "../lib/calendarUtils";
import {
  parseLocalDate, fmtTime, fmtDuration, fmtWeekday, fmtDayNum, fmtMonthShort,
  isSameDay, CATEGORY_ORDER,
} from "../lib/calendarUtils";
import { Clock, MapPin, User, Calendar, AlarmClock, ExternalLink } from "lucide-react";
import { useTheme } from "../lib/theme";

type RangeUnit = "week" | "month";

interface Props {
  events: CalEvent[];
  start: Date;
  end: Date;
  unit: RangeUnit;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── Popup ─────────────────────────────────────────────────── */
function EventPopup({
  ev,
  anchorRef,
}: {
  ev: CalEvent;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { theme } = useTheme();
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cat = ev.categoryColor;

  useEffect(() => {
    if (!anchorRef.current || !popupRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const popup = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 10;
    let left = anchor.right + GAP;
    if (left + popup.width > vw - 8) left = anchor.left - popup.width - GAP;
    let top = anchor.top + anchor.height / 2 - popup.height / 2;
    top = Math.max(8, Math.min(top, vh - popup.height - 8));
    setPos({ top, left });
  }, [anchorRef]);

  const dur = fmtDuration(ev.start, ev.end, ev.isAllDay);
  const timeStr = ev.isAllDay
    ? "All day"
    : `${fmtTime(ev.start, false)} – ${ev.end ? fmtTime(ev.end, false) : ""}`;

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        zIndex: 9999,
        width: 300,
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        background: theme.popupBg,
        border: `1.5px solid ${theme.popupBorder}`,
        borderRadius: 12,
        boxShadow:
          theme.mode === "dark"
            ? "0 0 0 1px #000, 0 12px 48px rgba(0,0,0,0.85), 0 2px 10px rgba(0,0,0,0.6)"
            : "0 0 0 1px rgba(0,0,0,0.08), 0 12px 48px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.12)",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div style={{ height: 5, background: cat }} />
      <div style={{ padding: "12px 14px 8px" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: cat, marginBottom: 3 }}>
          {ev.categoryIcon} {ev.categoryLabel}
        </div>
        <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3, color: theme.textPrimary }}>
          {ev.title}
        </div>
      </div>
      <div style={{ height: 1, background: theme.border, margin: "0 14px" }} />
      <div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Clock size={13} style={{ color: cat, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: theme.textPrimary }}>
              {fmtWeekday(ev.start)}, {fmtMonthShort(ev.start)} {fmtDayNum(ev.start)}
            </div>
            <div style={{ fontSize: "0.76rem", color: theme.textPrimary, opacity: 0.65, marginTop: 1 }}>
              {timeStr}
              {dur && (
                <span style={{ marginLeft: 7, padding: "1px 6px", borderRadius: 99, background: `${cat}22`, color: cat, fontSize: "0.68rem", fontWeight: 700 }}>
                  {dur}
                </span>
              )}
            </div>
          </div>
        </div>
        {ev.location && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <MapPin size={13} style={{ color: cat, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: "0.78rem", color: theme.textMuted, lineHeight: 1.4 }}>{ev.location}</div>
          </div>
        )}
        {ev.description && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlarmClock size={13} style={{ color: cat, flexShrink: 0, marginTop: 2 }} />
            <div
              style={{ fontSize: "0.75rem", color: theme.textMuted, lineHeight: 1.5, maxHeight: 64, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
              dangerouslySetInnerHTML={{ __html: ev.description.replace(/<[^>]*>/g, " ").trim() }}
            />
          </div>
        )}
        {ev.organizer && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <User size={13} style={{ color: cat, flexShrink: 0 }} />
            <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>{ev.organizer}</div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={13} style={{ color: cat, flexShrink: 0 }} />
          <div style={{ fontSize: "0.75rem", color: theme.textMuted }}>{ev.categoryLabel}</div>
        </div>
        {ev.htmlLink && (
          <>
            <div style={{ height: 1, background: theme.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ExternalLink size={12} style={{ color: cat }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: cat }}>Open in Google Calendar</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Event Chip ─────────────────────────────────────────────── */
function EventChip({ ev }: { ev: CalEvent }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cat = ev.categoryColor;

  const enter = useCallback(() => {
    timerRef.current = setTimeout(() => setHovered(true), 280);
  }, []);
  const leave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(false);
  }, []);

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={enter}
        onMouseLeave={leave}
        style={{
          display: "flex",
          alignItems: "flex-start",       // top-align icon with wrapped text
          gap: 5,
          padding: "3px 6px",
          borderRadius: 5,
          marginBottom: 2,
          background: hovered ? `${cat}33` : `${cat}1a`,
          borderLeft: `2px solid ${cat}`,
          cursor: ev.htmlLink ? "pointer" : "default",
          transition: "background 0.15s",
        }}
        onClick={() => { if (ev.htmlLink) window.open(ev.htmlLink, "_blank", "noopener,noreferrer"); }}
      >
        {/* dot / diamond — flex-shrink so it stays tiny */}
        <span style={{ fontSize: "0.55rem", color: cat, fontWeight: 800, flexShrink: 0, marginTop: "0.2em" }}>
          {ev.isAllDay ? "●" : "◆"}
        </span>
        {/* Title wraps freely; no truncation */}
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: hovered ? cat : theme.textPrimary,
            transition: "color 0.15s",
            lineHeight: 1.4,
            wordBreak: "break-word",
            minWidth: 0,
          }}
        >
          {!ev.isAllDay && (
            <span style={{ color: cat, marginRight: 4, fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap" }}>
              {fmtTime(ev.start, false).replace(":00", "").toLowerCase()}
            </span>
          )}
          {ev.title}
        </span>
      </div>
      {hovered && <EventPopup ev={ev} anchorRef={ref as React.RefObject<HTMLElement | null>} />}
    </>
  );
}

/* ─── Day Cell ───────────────────────────────────────────────── */
function DayCell({
  date,
  events,
  inMonth,
}: {
  date: Date;
  events: CalEvent[];
  inMonth: boolean;
}) {
  const { theme } = useTheme();
  const isToday = date.toDateString() === new Date().toDateString();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const sorted = [...events].sort((a, b) => {
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    return parseLocalDate(a.start).getTime() - parseLocalDate(b.start).getTime();
  });

  return (
    <div
      style={{
        // No fixed minHeight — cell grows with content
        padding: "6px 6px 6px",
        background: isToday
          ? theme.mode === "dark" ? "#1a130a" : "#FFF7EC"
          : !inMonth
          ? theme.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)"
          : "transparent",
      }}
    >
      {/* Day number bubble — top-right */}
      <div style={{ marginBottom: 4, display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.78rem",
            fontWeight: isToday ? 800 : 500,
            flexShrink: 0,
            background: isToday ? theme.accent : "transparent",
            color: isToday
              ? "#0A0A0A"
              : !inMonth
              ? theme.textFaint
              : isWeekend
              ? theme.textMuted
              : theme.textPrimary,
          }}
        >
          {date.getDate()}
        </div>
      </div>

      {/* Event chips — stacked, each wraps its own title */}
      <div>
        {sorted.map(ev => (
          <EventChip key={ev.id} ev={ev} />
        ))}
      </div>
    </div>
  );
}

/* ─── Week View ──────────────────────────────────────────────── */
function WeekView({ events, start }: { events: CalEvent[]; start: Date }) {
  const { theme } = useTheme();
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* DOW / date header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${theme.border}` }}>
        {days.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          const isWeekend = i === 0 || i === 6;
          return (
            <div
              key={i}
              style={{
                padding: "10px 0",
                textAlign: "center",
                borderRight: i < 6 ? `1px solid ${theme.border}` : undefined,
                background: isToday
                  ? theme.mode === "dark" ? "#1a130a" : "#FFF7EC"
                  : "transparent",
              }}
            >
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: isWeekend ? theme.textMuted : theme.textPrimary, opacity: isToday ? 1 : 0.7 }}>
                {DOW[i]}
              </div>
              <div
                style={{
                  margin: "4px auto 0",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  fontWeight: isToday ? 800 : 600,
                  background: isToday ? theme.accent : "transparent",
                  color: isToday ? "#0A0A0A" : isWeekend ? theme.textMuted : theme.textPrimary,
                }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cell row — each column stretches to tallest sibling */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", alignItems: "stretch" }}>
        {days.map((d, i) => {
          const dayEvs = events.filter(ev => isSameDay(ev.start, d));
          return (
            <div key={i} style={{ borderRight: i < 6 ? `1px solid ${theme.border}` : undefined }}>
              <DayCell date={d} events={dayEvs} inMonth={true} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Month View ─────────────────────────────────────────────── */
function MonthView({ events, start }: { events: CalEvent[]; start: Date }) {
  const { theme } = useTheme();
  const firstDay = new Date(start.getFullYear(), start.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  const weeks: Date[][] = Array.from({ length: 6 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + wi * 7 + di);
      return d;
    })
  );

  const currentMonth = start.getMonth();

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* DOW header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${theme.border}` }}>
        {DOW.map((d, i) => (
          <div
            key={d}
            style={{
              padding: "8px 0",
              textAlign: "center",
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: i === 0 || i === 6 ? theme.textMuted : theme.textPrimary,
              opacity: 0.75,
              borderRight: i < 6 ? `1px solid ${theme.border}` : undefined,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            alignItems: "stretch",
            borderBottom: wi < 5 ? `1px solid ${theme.border}` : undefined,
          }}
        >
          {week.map((d, di) => {
            const inMonth = d.getMonth() === currentMonth;
            const dayEvs = events.filter(ev => isSameDay(ev.start, d));
            return (
              <div key={di} style={{ borderRight: di < 6 ? `1px solid ${theme.border}` : undefined }}>
                <DayCell date={d} events={dayEvs} inMonth={inMonth} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─── Category Filter Bar ────────────────────────────────────── */
interface FilterBarProps {
  events: CalEvent[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

function CategoryFilterBar({ events, selected, onChange }: FilterBarProps) {
  const { theme } = useTheme();

  // Derive which categories appear, ordered by CATEGORY_ORDER
  const catMap = events.reduce((map, ev) => {
    if (!map.has(ev.category))
      map.set(ev.category, { key: ev.category, label: ev.categoryLabel, icon: ev.categoryIcon, color: ev.categoryColor });
    return map;
  }, new Map<string, { key: string; label: string; icon: string; color: string }>());
  const cats = CATEGORY_ORDER.filter(k => catMap.has(k)).map(k => catMap.get(k)!);

  const allSelected = selected.size === 0;

  const toggle = (key: string) => {
    if (allSelected) {
      // Solo this category
      onChange(new Set([key]));
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
      onChange(next.size === 0 ? new Set() : next); // empty → back to All
    } else {
      next.add(key);
      onChange(next.size === cats.length ? new Set() : next); // all → back to All
    }
  };

  if (cats.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px",
        marginBottom: "16px",
      }}
    >
      {/* All button */}
      <button
        onClick={() => onChange(new Set())}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 12px",
          borderRadius: 99,
          fontSize: "0.72rem",
          fontWeight: 700,
          cursor: "pointer",
          border: `1.5px solid ${allSelected ? theme.accent : theme.border}`,
          background: allSelected ? `${theme.accent}22` : "transparent",
          color: allSelected ? theme.accent : theme.textMuted,
          transition: "all 0.15s",
          outline: "none",
        }}
      >
        All
      </button>

      {/* Per-category buttons */}
      {cats.map(cat => {
        const active = !allSelected && selected.has(cat.key);
        return (
          <button
            key={cat.key}
            onClick={() => toggle(cat.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 11px",
              borderRadius: 99,
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              border: `1.5px solid ${active ? cat.color : theme.border}`,
              background: active ? `${cat.color}22` : "transparent",
              color: active ? cat.color : theme.textMuted,
              transition: "all 0.15s",
              outline: "none",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────── */
export default function CalendarGrid({ events, start, unit }: Props) {
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  // Apply filter: empty set = All
  const filtered = selectedCats.size === 0
    ? events
    : events.filter(ev => selectedCats.has(ev.category));

  return (
    <div>
      <CategoryFilterBar events={events} selected={selectedCats} onChange={setSelectedCats} />
      {unit === "week"
        ? <WeekView events={filtered} start={start} />
        : <MonthView events={filtered} start={start} />}
    </div>
  );
}
