import { createHash, randomBytes } from "node:crypto";

/** Server-only token helpers (kept apart from share.ts so client components can import the scope constants without pulling in node:crypto). */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** 256 random bits, URL-safe (43 characters). Shown to the owner once; only its hash is stored. */
export const newToken = (): string => randomBytes(32).toString("base64url");
export const isTokenShape = (t: unknown): t is string => typeof t === "string" && TOKEN.test(t);
export const hashToken = (t: string): string => createHash("sha256").update(t).digest("hex");
