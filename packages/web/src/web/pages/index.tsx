import { useState, useRef, useEffect } from "react";
import {
  RefreshCw, LayoutGrid, CalendarDays, AlertCircle,
  ChevronLeft, ChevronRight, Sun, Moon, ZoomIn, ZoomOut
} from "lucide-react";
import { useEvents } from "../hooks/useEvents";
import { useQueryClient } from "@tanstack/react-query";
import CategoryCards from "../components/CategoryCards";
import CalendarGrid from "../components/CalendarGrid";
import SkeletonCards from "../components/SkeletonCards";
import SkeletonTimeline from "../components/SkeletonTimeline";
import { timeSince, getRange, getRollingRange, fmtRangeLabel, toISO, type RangeUnit } from "../lib/calendarUtils";
import { useTheme } from "../lib/theme";

type Tab = "cards" | "timeline";

const ZOOM_MIN = 75;
const ZOOM_MAX = 150;
const ZOOM_STEP = 5;
const ZOOM_DEFAULT = 100;

/* ─── Vertical zoom slider — scales content text/layout via CSS zoom ─── */
function ZoomSlider({
  zoom,
  onChange,
  top,
  theme,
}: {
  zoom: number;
  onChange: (z: number) => void;
  top: number;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <div
      title={`Content zoom: ${zoom}%`}
      style={{
        position: "fixed",
        top: top + 16,
        right: 24,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "12px 8px",
        borderRadius: 12,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.mode === "dark" ? "0 4px 14px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <button
        onClick={() => onChange(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
        title="Increase text size"
        aria-label="Increase text size"
        disabled={zoom >= ZOOM_MAX}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: 6, border: "none",
          background: "transparent", color: theme.textMuted,
          cursor: zoom >= ZOOM_MAX ? "not-allowed" : "pointer",
          opacity: zoom >= ZOOM_MAX ? 0.35 : 1,
        }}
      >
        <ZoomIn size={15} />
      </button>

      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={zoom}
        onChange={e => onChange(Number(e.target.value))}
        title={`Content zoom: ${zoom}%`}
        aria-label="Content text zoom level"
        // Vertical range input: -webkit-appearance covers Chrome/Safari/Edge,
        // orient="vertical" (via prop spread) covers Firefox.
        {...({ orient: "vertical" } as any)}
        style={{
          WebkitAppearance: "slider-vertical" as any,
          width: 20,
          height: 110,
          accentColor: theme.teal,
          cursor: "pointer",
          background: "transparent",
        }}
      />

      <button
        onClick={() => onChange(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
        title="Decrease text size"
        aria-label="Decrease text size"
        disabled={zoom <= ZOOM_MIN}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: 6, border: "none",
          background: "transparent", color: theme.textMuted,
          cursor: zoom <= ZOOM_MIN ? "not-allowed" : "pointer",
          opacity: zoom <= ZOOM_MIN ? 0.35 : 1,
        }}
      >
        <ZoomOut size={15} />
      </button>

      <div
        onClick={() => onChange(ZOOM_DEFAULT)}
        title="Reset zoom to 100%"
        style={{
          fontSize: "0.62rem",
          fontWeight: 700,
          color: theme.textMuted,
          cursor: "pointer",
          userSelect: "none",
          letterSpacing: "0.02em",
        }}
      >
        {zoom}%
      </div>
    </div>
  );
}

export default function Index() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>("cards");
  const [unit, setUnit] = useState<RangeUnit>("month");
  const [offset, setOffset] = useState(0);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(140);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cards use rolling range (today → +week/month); Calendar grid uses calendar-aligned range
  const cardRange = getRollingRange(unit, offset);
  const gridRange = getRange(unit, offset);
  const { start, end } = tab === "cards" ? cardRange : gridRange;
  const timeMin = toISO(start);
  const timeMax = toISO(end);
  const rangeLabel = fmtRangeLabel(start, end);

  const { data, isLoading, isError, error, isFetching, dataUpdatedAt } = useEvents({ timeMin, timeMax });
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["calendar-events"] });

  // Button styles matching 40th Ward aesthetic
  const btnBase: React.CSSProperties = {
    fontFamily: theme.fontBody,
    borderColor: theme.border,
    color: theme.textPrimary,
    transition: "border-color 0.15s, color 0.15s, background 0.15s",
  };
  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = theme.teal;
    e.currentTarget.style.color = theme.teal;
  };
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = theme.border;
    e.currentTarget.style.color = theme.textPrimary;
  };

  const Divider = () => (
    <div className="w-px self-stretch my-3 flex-shrink-0" style={{ background: theme.border }} />
  );

  return (
    <div className="min-h-screen" style={{ background: theme.bg, fontFamily: theme.fontBody }}>

      {/* ── Top accent bar ── */}
      <div style={{ height: 4, background: theme.teal }} />

      {/* ── Header ── */}
      <header
        ref={headerRef}
        className="sticky top-0 z-10 border-b"
        style={{
          background: theme.bgHeader,
          borderColor: theme.border,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 48px" }}>

          {/* Row 1: Logo area */}
          <div className="flex items-end pt-5 pb-2">
            <div>
              <h1
                className="leading-none"
                style={{
                  fontFamily: theme.fontDisplay,
                  fontSize: "1.85rem",
                  color: theme.textPrimary,
                  letterSpacing: "0.02em",
                }}
              >
                40th Ward
              </h1>
              <p
                className="mt-0.5"
                style={{
                  fontFamily: theme.fontBody,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: theme.textMuted,
                  letterSpacing: "0.04em",
                }}
              >
                Chicago Community Events Calendar
              </p>
            </div>
          </div>

          {/* Row 2: Range label left, controls right */}
          <div className="flex items-center justify-between pb-3" style={{ gap: "10px" }}>

            {/* ── Range label + updated timestamp ── */}
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary, fontFamily: theme.fontBody }}>
                {rangeLabel}
              </p>
              {dataUpdatedAt > 0 && (
                <span className="text-xs" style={{ color: theme.textMuted, opacity: 0.6 }}>
                  Updated {timeSince(new Date(dataUpdatedAt).toISOString())}
                </span>
              )}
            </div>

            {/* ── Right-side controls ── */}
            <div className="flex items-center" style={{ gap: "10px" }}>

            {/* ── Week / Month toggle ── */}
            <div
              className="flex rounded overflow-hidden border"
              style={{ borderColor: theme.border }}
            >
              {(["week", "month"] as RangeUnit[]).map(u => (
                <button
                  key={u}
                  onClick={() => { setUnit(u); setOffset(0); }}
                  title={u === "week" ? "Show one week at a time" : "Show one month at a time"}
                  style={{
                    fontFamily: theme.fontBody,
                    padding: "9px 20px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "none",
                    letterSpacing: "0.08em",
                    background: unit === u ? theme.teal : "transparent",
                    color: unit === u ? "#ffffff" : theme.textPrimary,
                    borderRight: u === "week" ? `1px solid ${theme.border}` : undefined,
                    transition: "background 0.15s, color 0.15s",
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                  }}
                >
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </button>
              ))}
            </div>

            <Divider />

            {/* ── Back / Forward arrows ── */}
            <div className="flex items-center" style={{ gap: "6px" }}>
              <button
                onClick={() => setOffset(o => o - 1)}
                className="flex items-center justify-center rounded border"
                style={{ ...btnBase, width: 40, height: 40 }}
                onMouseEnter={onEnter} onMouseLeave={onLeave}
                title={unit === "week" ? "Previous week" : "Previous month"}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setOffset(0)}
                className="rounded border font-bold text-xs"
                style={{
                  ...btnBase,
                  padding: "9px 18px",
                  textTransform: "none",
                  letterSpacing: "0.08em",
                  fontFamily: theme.fontBody,
                  fontSize: "0.8rem",
                }}
                onMouseEnter={onEnter} onMouseLeave={onLeave}
                title="Jump back to today"
              >
                Today
              </button>
              <button
                onClick={() => setOffset(o => o + 1)}
                className="flex items-center justify-center rounded border"
                style={{ ...btnBase, width: 40, height: 40 }}
                onMouseEnter={onEnter} onMouseLeave={onLeave}
                title={unit === "week" ? "Next week" : "Next month"}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <Divider />

            {/* ── Cards / Calendar tabs ── */}
            <div
              className="flex rounded overflow-hidden border"
              style={{ borderColor: theme.border }}
            >
              {([
                { id: "cards",    icon: <LayoutGrid size={14} />,  label: "Cards",    title: "Card view — events grouped by category" },
                { id: "timeline", icon: <CalendarDays size={14} />, label: "Calendar", title: "Calendar/timeline view" },
              ] as const).map(({ id, icon, label, title }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  title={title}
                  className="flex items-center"
                  style={{
                    gap: "7px",
                    fontFamily: theme.fontBody,
                    padding: "9px 20px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "none",
                    letterSpacing: "0.08em",
                    background: tab === id ? theme.teal : "transparent",
                    color: tab === id ? "#ffffff" : theme.textPrimary,
                    borderRight: id === "cards" ? `1px solid ${theme.border}` : undefined,
                    transition: "background 0.15s, color 0.15s",
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <Divider />

            {/* ── Refresh ── */}
            <button
              onClick={refresh}
              disabled={isFetching}
              title={isFetching ? "Loading…" : "Refresh"}
              className="flex items-center justify-center rounded border disabled:opacity-40"
              style={{ ...btnBase, width: 40, height: 40 }}
              onMouseEnter={e => { if (!isFetching) onEnter(e); }}
              onMouseLeave={onLeave}
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
            </button>

            <Divider />

            {/* ── Theme toggle ── */}
            <button
              onClick={toggle}
              className="flex items-center justify-center rounded border"
              style={{ ...btnBase, width: 40, height: 40 }}
              onMouseEnter={onEnter} onMouseLeave={onLeave}
              title={theme.mode === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme.mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            </div>{/* end right-side controls */}
          </div>{/* end row 2 */}
        </div>
      </header>

      {/* ── Zoom slider — floats over the content page, not the header ── */}
      <ZoomSlider zoom={zoom} onChange={setZoom} top={headerHeight} theme={theme} />

      {/* ── Main ── */}
      <main style={{ maxWidth: 1152, margin: "0 auto", padding: "40px 48px", zoom: `${zoom}%` as any }}>

        {/* Error */}
        {isError && (
          <div
            className="flex items-center gap-3 p-4 rounded mb-8 border"
            style={{
              background: theme.mode === "dark" ? "#1a0808" : "#fff5f5",
              borderColor: "#CF2C28",
            }}
          >
            <AlertCircle size={16} style={{ color: "#CF2C28", flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#CF2C28", fontFamily: theme.fontBody }}>
                Failed to load events
              </p>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{error?.message}</p>
            </div>
            <button
              onClick={refresh}
              className="ml-auto text-xs px-4 py-2 rounded border font-semibold"
              style={{
                borderColor: "#CF2C28",
                color: "#CF2C28",
                fontFamily: theme.fontBody,
                letterSpacing: "0.08em",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        <div key={`${tab}-${unit}-${offset}`}>
          {tab === "cards" ? (
            isLoading ? <SkeletonCards /> : data ? <CategoryCards grouped={data.grouped} /> : null
          ) : (
            isLoading ? <SkeletonTimeline /> : data ? <CalendarGrid events={data.events} start={start} end={end} unit={unit} /> : null
          )}
        </div>

      </main>

      {/* ── Footer ── */}
      <footer
        className="mt-12 py-8"
        style={{
          background: theme.mode === "dark" ? "#051820" : "#0b3e4a",
          borderTop: `4px solid ${theme.teal}`,
        }}
      >
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fontBody }}>
            40th Ward of Chicago · Alderperson Andre Vasquez
          </p>
          <a
            href="https://40thward.org/events/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold"
            style={{ color: "#fffbf4", fontFamily: theme.fontBody, textDecoration: "none" }}
          >
            40thward.org →
          </a>
        </div>
      </footer>

    </div>
  );
}
