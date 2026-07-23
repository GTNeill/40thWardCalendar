import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "../lib/theme";

interface Category {
  key: string;
  label: string;
  icon: string;
  color: string;
  group: string;
  order: number;
  keywords: string[];
}

const GROUP_OPTIONS = [
  { value: "government", label: "Your Government" },
  { value: "community", label: "Your Community" },
];

// ── Keyword chip editor ───────────────────────────────────────────────────────
function KeywordEditor({
  keywords,
  onChange,
  disabled,
  theme,
}: {
  keywords: string[];
  onChange: (kw: string[]) => void;
  disabled?: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const [input, setInput] = useState("");

  const addKeyword = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    // flushSync forces this state update through synchronously (not batched)
    // so a Save click that follows immediately after (e.g. clicking Save
    // while text is still typed but not yet committed via Enter) always
    // reads the up-to-date keyword list instead of a stale pre-blur render.
    flushSync(() => {
      onChange([...keywords, trimmed]);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.replace(/,$/, "").trim();
      if (val) addKeyword(val);
      setInput("");
    } else if (e.key === "Backspace" && !input && keywords.length > 0) {
      onChange(keywords.slice(0, -1));
    }
  };

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "4px",
      padding: "6px 8px",
      border: `1px solid ${theme.border}`,
      borderRadius: "6px",
      background: theme.surface,
      minHeight: "38px",
      alignItems: "center",
    }}>
      {keywords.map((kw, i) => (
        <span key={i} style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          background: `${theme.teal}22`,
          border: `1px solid ${theme.teal}66`,
          borderRadius: "12px",
          fontSize: "11px",
          color: theme.textPrimary,
          fontFamily: "monospace",
        }}>
          {kw}
          {!disabled && (
            <button
              onClick={() => onChange(keywords.filter((_, j) => j !== i))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.textMuted,
                padding: "0 0 0 2px",
                fontSize: "12px",
                lineHeight: 1,
              }}
            >×</button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            const val = input.trim();
            if (val) { addKeyword(val); setInput(""); }
          }}
          placeholder={keywords.length === 0 ? "type keyword, Enter to add…" : ""}
          style={{
            flex: "1 1 120px",
            border: "none",
            outline: "none",
            background: "transparent",
            color: theme.textPrimary,
            fontSize: "12px",
            minWidth: "80px",
          }}
        />
      )}
    </div>
  );
}

// ── Single category row ───────────────────────────────────────────────────────
function CategoryRow({
  cat,
  idx,
  total,
  onChange,
  onDelete,
  onMove,
  theme,
}: {
  cat: Category;
  idx: number;
  total: number;
  onChange: (c: Category) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const isOther = cat.key === "other";

  const arrowBtn: React.CSSProperties = {
    padding: "2px 4px",
    background: "transparent",
    border: `1px solid ${theme.border}`,
    borderRadius: "4px",
    color: theme.textMuted,
    cursor: "pointer",
    fontSize: "10px",
    lineHeight: 1,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "10px",
    color: theme.textMuted,
    marginBottom: "3px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    border: `1px solid ${theme.border}`,
    borderRadius: "6px",
    background: theme.surface,
    color: theme.textPrimary,
    fontSize: "13px",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px 80px 48px 60px 1fr 100px 120px 1fr 80px",
      gap: "8px",
      alignItems: "start",
      padding: "12px",
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "8px",
      borderLeft: `4px solid ${cat.color}`,
    }}>
      {/* Order controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
        <button onClick={() => onMove(-1)} disabled={idx === 0 || isOther} title="Move up" style={arrowBtn}>▲</button>
        <button onClick={() => onMove(1)} disabled={idx >= total - (isOther ? 1 : 2) || isOther} title="Move down" style={arrowBtn}>▼</button>
      </div>

      {/* Key */}
      <div>
        <label style={labelStyle}>Key</label>
        <input
          value={cat.key}
          readOnly={!cat.key.startsWith("__new")}
          onChange={e => onChange({ ...cat, key: e.target.value })}
          style={{
            ...inputStyle,
            background: !cat.key.startsWith("__new") ? `${theme.textFaint}22` : theme.surface,
            fontFamily: "monospace",
            fontSize: "11px",
          }}
        />
      </div>

      {/* Icon */}
      <div>
        <label style={labelStyle}>Icon</label>
        <input
          value={cat.icon}
          onChange={e => onChange({ ...cat, icon: e.target.value })}
          disabled={isOther}
          style={{ ...inputStyle, fontSize: "20px", textAlign: "center", padding: "4px" }}
        />
      </div>

      {/* Color swatch */}
      <div>
        <label style={labelStyle}>Color</label>
        <input
          type="color"
          value={cat.color}
          onChange={e => onChange({ ...cat, color: e.target.value })}
          disabled={isOther}
          style={{
            width: "100%",
            height: "36px",
            padding: "2px",
            border: `1px solid ${theme.border}`,
            borderRadius: "6px",
            background: theme.surface,
            cursor: isOther ? "not-allowed" : "pointer",
          }}
        />
      </div>

      {/* Label */}
      <div>
        <label style={labelStyle}>Label</label>
        <input
          value={cat.label}
          onChange={e => onChange({ ...cat, label: e.target.value })}
          style={inputStyle}
        />
      </div>

      {/* Hex */}
      <div>
        <label style={labelStyle}>Hex</label>
        <input
          value={cat.color}
          onChange={e => onChange({ ...cat, color: e.target.value })}
          disabled={isOther}
          style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12px" }}
        />
      </div>

      {/* Group */}
      <div>
        <label style={labelStyle}>Group</label>
        <select
          value={cat.group}
          onChange={e => onChange({ ...cat, group: e.target.value })}
          style={{ ...inputStyle }}
        >
          {GROUP_OPTIONS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Keywords */}
      <div>
        <label style={labelStyle}>Keywords (Enter or , to add)</label>
        <KeywordEditor
          keywords={cat.keywords}
          onChange={kw => onChange({ ...cat, keywords: kw })}
          disabled={isOther}
          theme={theme}
        />
      </div>

      {/* Delete */}
      <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
        <button
          onClick={onDelete}
          disabled={isOther}
          title="Delete category"
          style={{
            padding: "6px 10px",
            background: "rgba(200,50,50,0.15)",
            border: "1px solid rgba(200,50,50,0.4)",
            borderRadius: "6px",
            color: "#e05555",
            cursor: isOther ? "not-allowed" : "pointer",
            opacity: isOther ? 0.3 : 1,
            fontSize: "14px",
          }}
        >🗑</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
let newKeyCounter = 0;
function newKey() { return `__new_${++newKeyCounter}`; }

export default function AdminCat() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then(r => r.json())
      .then((data: Category[]) => {
        setCategories(data.sort((a, b) => a.order - b.order));
        setLoading(false);
      })
      .catch(e => {
        setStatus({ msg: `Failed to load: ${e.message}`, ok: false });
        setLoading(false);
      });
  }, []);

  const showStatus = (msg: string, ok: boolean) => {
    setStatus({ msg, ok });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 4000);
  };

  const update = useCallback((idx: number, cat: Category) => {
    setCategories(prev => prev.map((c, i) => i === idx ? cat : c));
    setDirty(true);
  }, []);

  const remove = useCallback((idx: number) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }, []);

  const move = useCallback((idx: number, dir: -1 | 1) => {
    setCategories(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setDirty(true);
  }, []);

  const addNew = () => {
    const newCat: Category = {
      key: newKey(),
      label: "New Category",
      icon: "📁",
      color: "#888888",
      group: "community",
      order: categories.length,
      keywords: [],
    };
    setCategories(prev => {
      const withoutOther = prev.filter(c => c.key !== "other");
      const other = prev.find(c => c.key === "other");
      return other ? [...withoutOther, newCat, other] : [...withoutOther, newCat];
    });
    setDirty(true);
  };

  const save = async () => {
    // Force-commit any text still sitting in a focused keyword input (e.g.
    // typed but not confirmed with Enter/comma) before reading `categories`.
    // Blurring here synchronously triggers that input's onBlur → addKeyword,
    // which now uses flushSync, so the state is guaranteed current below.
    (document.activeElement as HTMLElement | null)?.blur();

    setSaving(true);
    try {
      const keys = categories.map(c =>
        c.key.startsWith("__new") ? c.label.toLowerCase().replace(/\s+/g, "_") : c.key
      );
      const hasDupe = keys.some((k, i) => keys.indexOf(k) !== i);
      if (hasDupe) {
        showStatus("Duplicate category keys — fix before saving.", false);
        setSaving(false);
        return;
      }

      const payload = categories.map((c, i) => ({
        ...c,
        key: c.key.startsWith("__new") ? c.label.toLowerCase().replace(/[^a-z0-9]/g, "_") : c.key,
        order: i,
      }));

      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      showStatus(`Saved ${data.count} categories.`, true);
      setDirty(false);

      const fresh = await fetch("/api/admin/categories").then(r => r.json());
      setCategories((fresh as Category[]).sort((a, b) => a.order - b.order));
    } catch (e: any) {
      showStatus(e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const nonOther = categories.filter(c => c.key !== "other");
  const other = categories.find(c => c.key === "other");
  const displayList = other ? [...nonOther, other] : categories;

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      color: theme.textPrimary,
      fontFamily: theme.fontBody,
    }}>
      {/* Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: theme.bgHeader,
        borderBottom: `1px solid ${theme.border}`,
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        justifyContent: "space-between",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{
            color: theme.textMuted,
            textDecoration: "none",
            fontSize: "13px",
            padding: "6px 10px",
            border: `1px solid ${theme.border}`,
            borderRadius: "6px",
          }}>← Calendar</a>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: theme.textPrimary }}>
            Category Manager
          </h1>
          {dirty && (
            <span style={{
              fontSize: "11px",
              color: theme.accent,
              background: `${theme.accent}18`,
              border: `1px solid ${theme.accent}44`,
              borderRadius: "4px",
              padding: "2px 8px",
            }}>unsaved changes</span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {status && (
            <span style={{
              fontSize: "13px",
              color: status.ok ? "#4caf8a" : "#e05555",
              background: status.ok ? "rgba(76,175,138,0.1)" : "rgba(224,85,85,0.1)",
              border: `1px solid ${status.ok ? "rgba(76,175,138,0.3)" : "rgba(224,85,85,0.3)"}`,
              borderRadius: "6px",
              padding: "6px 12px",
            }}>{status.msg}</span>
          )}
          <button
            onClick={addNew}
            style={{
              padding: "8px 16px",
              background: `${theme.teal}22`,
              border: `1px solid ${theme.teal}66`,
              borderRadius: "6px",
              color: theme.teal,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >+ Add Category</button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            style={{
              padding: "8px 20px",
              background: dirty ? theme.accent : `${theme.accent}33`,
              border: `1px solid ${theme.accent}`,
              borderRadius: "6px",
              color: dirty ? "#fff" : `${theme.textPrimary}66`,
              cursor: dirty ? "pointer" : "not-allowed",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>

      {/* Tip bar */}
      <div style={{
        padding: "10px 32px",
        background: `${theme.teal}11`,
        borderBottom: `1px solid ${theme.border}`,
        fontSize: "12px",
        color: theme.textMuted,
      }}>
        <strong style={{ color: theme.textPrimary }}>Tip:</strong>{" "}
        Keywords match case-insensitively against event titles. Use{" "}
        <code style={{ background: `${theme.textFaint}44`, padding: "1px 4px", borderRadius: "3px" }}>.*</code>{" "}
        for wildcards. <strong>Other</strong> always catches unmatched events — its keywords are ignored.
        Press <kbd style={{ background: `${theme.textFaint}44`, padding: "1px 5px", borderRadius: "3px" }}>Enter</kbd>{" "}
        or <kbd style={{ background: `${theme.textFaint}44`, padding: "1px 5px", borderRadius: "3px" }}>,</kbd> to add a keyword.
      </div>

      {/* Body */}
      <div style={{ padding: "24px 32px", maxWidth: "1400px", margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: theme.textMuted, paddingTop: "60px" }}>
            Loading categories…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {displayList.map((cat, idx) => (
              <CategoryRow
                key={cat.key}
                cat={cat}
                idx={idx}
                total={displayList.length}
                onChange={c => update(idx, c)}
                onDelete={() => remove(idx)}
                onMove={dir => move(idx, dir)}
                theme={theme}
              />
            ))}
          </div>
        )}

        {/* Group preview */}
        {!loading && (
          <div style={{ marginTop: "32px", display: "flex", gap: "24px" }}>
            {GROUP_OPTIONS.map(g => {
              const cats = displayList.filter(c => c.group === g.value);
              return (
                <div key={g.value} style={{
                  flex: 1,
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  padding: "16px",
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: theme.textMuted,
                    marginBottom: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                    {g.label}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {cats.map(c => (
                      <span key={c.key} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "4px 10px",
                        background: `${c.color}22`,
                        border: `1px solid ${c.color}55`,
                        borderRadius: "20px",
                        fontSize: "12px",
                        color: c.color,
                      }}>
                        {c.icon} {c.label}
                      </span>
                    ))}
                    {cats.length === 0 && (
                      <span style={{ fontSize: "12px", color: theme.textMuted }}>none assigned</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
