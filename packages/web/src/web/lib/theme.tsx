import { createContext, useContext, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export interface Theme {
  mode: ThemeMode;
  bg: string;
  bgHeader: string;
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  textFaint: string;
  accent: string;       // red — top bar, footer bar only
  accentDark: string;
  teal: string;         // teal — active UI controls (buttons, tabs)
  rowHover: string;
  eventBorder: string;
  popupBg: string;
  popupBorder: string;
  fontDisplay: string;
  fontBody: string;
}

// 40th Ward brand palette:
// Deep teal #0b3e4a, teal #147671, light teal #5bb5b1, cream #fffbf4
// Red/orange accent #CF2C28, secondary #ca482b, text #333333

const DARK: Theme = {
  mode: "dark",
  bg: "#0b2a33",
  bgHeader: "#0b2a33ee",
  surface: "#0d3340",
  border: "#1a4a58",
  textPrimary: "#fffbf4",
  textMuted: "#8ab8c0",
  textFaint: "#2a5060",
  accent: "#CF2C28",
  accentDark: "#a01e1b",
  teal: "#147671",         // 40th ward teal — active controls
  rowHover: "#0f3d4d",
  eventBorder: "#1c4a5a",
  popupBg: "#0a2530",
  popupBorder: "#2a6070",
  fontDisplay: "'Anton', 'Arial Black', sans-serif",
  fontBody: "'Public Sans', 'Arial', sans-serif",
};

const LIGHT: Theme = {
  mode: "light",
  bg: "#fffbf4",
  bgHeader: "#fffbf4f5",
  surface: "#ffffff",
  border: "#c8dde1",
  textPrimary: "#0b3e4a",
  textMuted: "#0b3e4a99",
  textFaint: "#0b3e4a44",
  accent: "#CF2C28",
  accentDark: "#a01e1b",
  teal: "#147671",         // 40th ward teal — active controls
  rowHover: "#f0fafb",
  eventBorder: "#c8e4e8",
  popupBg: "#ffffff",
  popupBorder: "#8ab8c0",
  fontDisplay: "'Anton', 'Arial Black', sans-serif",
  fontBody: "'Public Sans', 'Arial', sans-serif",
};

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: LIGHT,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const theme = mode === "dark" ? DARK : LIGHT;
  const toggle = () => setMode(m => (m === "dark" ? "light" : "dark"));
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
