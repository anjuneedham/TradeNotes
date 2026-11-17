"use client";
import { useEffect, useState } from "react";

const KEY = "tn-theme";
export type ThemeName = "stickman" | "classic";

/** Inline script (runs before first paint) so the saved theme applies without a flash. */
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="classic"?"classic":"stickman"}catch(e){document.documentElement.dataset.theme="stickman"}`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "classic" ? "classic" : "stickman"); }, []);
  function flip() {
    const next: ThemeName = theme === "classic" ? "stickman" : "classic";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: theme just won't persist */ }
    setTheme(next);
  }
  const on = theme !== "classic";
  return (
    <button type="button" onClick={flip} aria-pressed={on} title="Switch between the stickman look and the classic look" className="sm-toggle">
      <span aria-hidden="true">{on ? "✏️" : "▦"}</span> {on ? "Stickman" : "Classic"}
    </button>
  );
}
