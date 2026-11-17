"use client";
import { useEffect, useState } from "react";
import { Card } from "./ui";

interface InstallPrompt extends Event { prompt: () => Promise<void> }
const KEY = "tn_install_hint_dismissed";
/** Safe storage access: private windows and blocked storage throw; the hint must still render and work for the session. */
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const write = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };

/**
 * "Add to home screen" hint for the quick-log page. There is no service worker: the page installs as a shortcut that opens full-screen
 * and needs the network, like the website itself. Hidden when already installed or dismissed; renders nothing until the browser is known.
 */
export function InstallHint() {
  const [mode, setMode] = useState<"hidden" | "ios" | "prompt" | "other">("hidden");
  const [evt, setEvt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || read()) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    const mobile = ios || /Android/.test(ua);
    if (!mobile) return; // a desktop browser has no home screen
    setMode(ios ? "ios" : "other");
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallPrompt); setMode("prompt"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (mode === "hidden") return null;
  const dismiss = () => { write(); setMode("hidden"); };
  return (
    <Card className="flex items-start justify-between gap-3" >
      <div className="text-sm" data-testid="install-hint">
        <p className="font-medium">Put quick-log on your home screen</p>
        <p className="mt-1 text-muted">
          {mode === "ios" ? <>In Safari, tap the <strong className="font-medium text-fg">Share</strong> button, then <strong className="font-medium text-fg">Add to Home Screen</strong>.</>
            : mode === "prompt" ? "Install it as an app icon so it opens in one tap."
            : <>In your browser menu, choose <strong className="font-medium text-fg">Add to Home screen</strong> (or <strong className="font-medium text-fg">Install app</strong>).</>}
          {" "}It opens full-screen and needs an internet connection.
        </p>
        {mode === "prompt" && evt && <button type="button" onClick={() => { evt.prompt().catch(() => undefined); dismiss(); }} className="mt-2 inline-flex min-h-11 items-center rounded-md bg-fg px-4 text-sm font-medium text-bg">Install</button>}
      </div>
      <button type="button" onClick={dismiss} className="-mr-2 -mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded text-muted hover:text-fg" aria-label="Dismiss this hint">✕</button>
    </Card>
  );
}
