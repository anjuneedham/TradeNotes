"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Notice, btnGhostCls } from "./ui";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SIDE = 2560;
export interface Shot { id: string; caption: string | null; size_bytes: number }

/**
 * Shrink an image in the browser so it fits the 2 MB cap: re-encode (which also drops EXIF/GPS) and scale down if needed.
 * Small PNG/JPEG/WebP files under the cap are sent as they are; the server sniffs, strips metadata and re-checks everything.
 */
async function compress(file: Blob): Promise<Blob> {
  if (file.size <= MAX_BYTES && /^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85)) ?? await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (out && out.size <= MAX_BYTES) return out;
    scale *= 0.75;
  }
  throw new Error("This image is too large even after compression.");
}

export function ScreenshotGallery({ tradeId, shots, state, max }: { tradeId: string; shots: Shot[]; state: "ok" | "plan" | "unavailable"; max: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canAdd = state === "ok" && shots.length < max;

  async function upload(files: Blob[]) {
    setError("");
    for (const f of files.slice(0, max - shots.length)) {
      setBusy(true);
      try {
        const blob = await compress(f);
        const fd = new FormData();
        fd.set("trade_id", tradeId); fd.set("file", blob, "screenshot");
        const res = await fetch("/app/screenshots", { method: "POST", body: fd });
        if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload failed."); break; }
      } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); break; }
      finally { setBusy(false); }
    }
    router.refresh();
  }
  async function remove(id: string) {
    setError("");
    const res = await fetch(`/app/screenshots/${id}`, { method: "DELETE" });
    if (!res.ok) setError("Couldn't delete that screenshot. Please try again.");
    setOpen(null);
    router.refresh();
  }

  // Paste a screenshot straight from the clipboard while on this page.
  useEffect(() => {
    if (!canAdd) return;
    const onPaste = (e: ClipboardEvent) => {
      const imgs = [...(e.clipboardData?.items ?? [])].filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (imgs.length) { e.preventDefault(); upload(imgs); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Screenshots <span className="font-normal text-muted">· {shots.length} of {max}</span></h2>
        {canAdd && <p className="hidden text-xs text-muted sm:block">Tip: copy a chart and press Ctrl/⌘ + V here.</p>}
      </div>
      {state === "unavailable" && <div className="mt-3"><Notice>Screenshot uploads aren&apos;t available yet. Everything else works as normal.</Notice></div>}
      {state === "plan" && (
        <div className="mt-3"><Notice kind="warn">Attach chart screenshots to your trades on Standard and Premium. {shots.length > 0 && "Your existing screenshots stay visible. "}<Link href="/app/billing" className="underline underline-offset-2">See plans</Link></Notice></div>
      )}
      {error && <div className="mt-3"><Notice kind="error">{error}</Notice></div>}
      {shots.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shots.map((s, i) => (
            <li key={s.id} className="overflow-hidden rounded-md border border-border">
              <button type="button" onClick={() => setOpen(s.id)} className="block w-full" aria-label={`Open screenshot ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/app/screenshots/${s.id}`} alt={s.caption ?? `Trade screenshot ${i + 1}`} loading="lazy" className="aspect-video w-full bg-raised object-cover" />
              </button>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-muted">
                <span className="truncate">{s.caption ?? `${Math.round(s.size_bytes / 1024)} KB`}</span>
                <button type="button" onClick={() => remove(s.id)} className="shrink-0 rounded px-1.5 py-1 hover:text-loss" aria-label={`Delete screenshot ${i + 1}`}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {shots.length === 0 && state === "ok" && <p className="mt-2 text-sm text-muted">Add the chart at entry and at exit. PNG, JPEG or WebP; large images are shrunk to 2 MB automatically.</p>}
      {canAdd && (
        <div className="mt-3">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" id={`shot-${tradeId}`} onChange={(e) => { upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
          <label htmlFor={`shot-${tradeId}`} className={`${btnGhostCls} cursor-pointer`} aria-disabled={busy}>{busy ? "Uploading…" : "Add screenshot"}</label>
        </div>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Screenshot" className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3" onClick={() => setOpen(null)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(null)}>
          <div className="flex justify-end gap-2">
            <button type="button" autoFocus className="rounded bg-white/10 px-3 py-2 text-sm text-white" onClick={() => setOpen(null)}>Close</button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/app/screenshots/${open}`} alt="Trade screenshot, full size" className="m-auto max-h-full max-w-full object-contain" />
        </div>
      )}
    </Card>
  );
}
