import { PLANS, type PlanId } from "./plans";

/**
 * Screenshot rules (pure, unit-tested). Cost guardrails from docs/NEXT_BUILD_BRIEF.md §3b:
 * 2 MB per image (after client-side compression), 5 per trade, per-user quota by plan, refuse uploads once the
 * storage allowance is 80% used, and a per-user upload rate limit.
 */
export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
export const MAX_SCREENSHOTS_PER_TRADE = 5;
export const UPLOADS_PER_HOUR = 30;
export const ALLOWANCE_STOP_RATIO = 0.8;
/** Supabase Free plan includes 1 GB of storage; the owner can raise this with SCREENSHOT_STORAGE_ALLOWANCE_MB after upgrading. */
export const DEFAULT_ALLOWANCE_BYTES = 1024 * 1024 * 1024;
export const allowanceBytes = (env: string | undefined = process.env.SCREENSHOT_STORAGE_ALLOWANCE_MB) => {
  const mb = Number(env);
  return Number.isFinite(mb) && mb > 0 ? Math.floor(mb * 1024 * 1024) : DEFAULT_ALLOWANCE_BYTES;
};
/**
 * SQL for the signed-in user's screenshot bytes across BOTH kinds (real-trade and hypothetical-trade screenshots share one quota).
 * Run under row-level security, so each table only contains the user's own rows. Used by the upload route; tested against a real database in
 * screenshot-quota.db.test.ts.
 */
export const USER_SCREENSHOT_BYTES_SQL = "(coalesce((select sum(size_bytes) from tradenotes.trade_screenshots), 0) + coalesce((select sum(size_bytes) from tradenotes.backtest_screenshots), 0))::bigint";
export const quotaBytes = (plan: PlanId) => PLANS[plan].screenshotQuotaMB * 1024 * 1024;

export type ImageType = "image/png" | "image/jpeg" | "image/webp";
export const EXT: Record<ImageType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Real file type from the first bytes. Anything else (SVG, GIF, HTML, a renamed .exe) is rejected. */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  return null;
}
const ascii = (b: Uint8Array, s: number, e: number) => String.fromCharCode(...b.subarray(s, e));

/**
 * Remove metadata that can carry personal data (EXIF incl. GPS, XMP, text comments). Image data is untouched.
 * If the file structure is not what we expect, the original bytes are returned unchanged (validation already passed).
 */
export function stripMetadata(b: Uint8Array, type: ImageType): Uint8Array {
  try {
    if (type === "image/jpeg") return stripJpeg(b);
    if (type === "image/png") return stripPng(b);
    return stripWebp(b);
  } catch { return b; }
}

function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b;
    const marker = b[i + 1];
    if (marker === 0xda) { out.push(b.subarray(i)); return concat(out); } // start of scan: rest is image data
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return b;
    const seg = b.subarray(i, i + 2 + len);
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe; // APP1 (EXIF/XMP), APP13 (IPTC), COM
    if (!drop) out.push(seg);
    i += 2 + len;
  }
  return b; // never reached the image data: not a structure we understand
}

const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
function stripPng(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, i + 8);
    const end = i + 12 + len;
    if (end > b.length) return b;
    if (!PNG_DROP.has(type)) out.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return concat(out);
}

function stripWebp(b: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, i + 4);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + len + (len & 1);
    if (end > b.length + 1 || end <= i) return b; // malformed: never loop or read past the end
    if (type !== "EXIF" && type !== "XMP ") {
      const c = b.slice(i, Math.min(end, b.length));
      if (type === "VP8X" && c.length > 8) c[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
      chunks.push(c);
    }
    i = end;
  }
  const body = concat(chunks);
  const head = new Uint8Array(12);
  head.set(b.subarray(0, 12));
  const size = body.length + 4;
  head[4] = size & 0xff; head[5] = (size >> 8) & 0xff; head[6] = (size >> 16) & 0xff; head[7] = (size >> 24) & 0xff;
  return concat([head, body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export interface UploadCheck { plan: PlanId; size: number; type: ImageType | null; onTrade: number; userBytes: number; totalBytes: number; lastHour: number; allowance?: number }
/** Returns a user-facing refusal, or null when the upload may proceed. Order: plan, type, size, per-trade, rate, user quota, platform allowance. */
export function checkUpload(c: UploadCheck): { code: "plan" | "type" | "size" | "count" | "rate" | "quota" | "allowance"; message: string } | null {
  const quota = quotaBytes(c.plan);
  if (quota <= 0) return { code: "plan", message: `Screenshots are included in ${PLANS.starter.name} and ${PLANS.pro.name}.` };
  if (!c.type) return { code: "type", message: "Only PNG, JPEG or WebP images can be uploaded." };
  if (c.size <= 0 || c.size > MAX_SCREENSHOT_BYTES) return { code: "size", message: "Images must be 2 MB or smaller." };
  if (c.onTrade >= MAX_SCREENSHOTS_PER_TRADE) return { code: "count", message: `A trade can have up to ${MAX_SCREENSHOTS_PER_TRADE} screenshots. Delete one to add another.` };
  if (c.lastHour >= UPLOADS_PER_HOUR) return { code: "rate", message: "You've uploaded a lot of screenshots in the last hour. Please try again later." };
  if (c.userBytes + c.size > quota) return { code: "quota", message: `You've used your ${formatMB(quota)} screenshot storage. Delete some screenshots to add more.` };
  if (c.totalBytes + c.size > (c.allowance ?? allowanceBytes()) * ALLOWANCE_STOP_RATIO) return { code: "allowance", message: "Screenshot uploads are paused while we add storage. Your existing screenshots are safe." };
  return null;
}
export const formatMB = (bytes: number) => (bytes >= 1024 ** 3 ? `${+(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);
