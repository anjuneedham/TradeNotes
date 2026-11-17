"use server";
import { cookies } from "next/headers";
import { cleanSrc } from "@/lib/db-config";
import { isMagnet, normalizeEmail, saveLead, MAGNETS } from "@/lib/leads";

export type LeadState = { ok?: true; file?: string; page?: string; error?: string };

/** Email + explicit consent -> store the lead -> reveal the download. A hidden "website" field catches simple bots. */
export async function requestDownload(_prev: LeadState, form: FormData): Promise<LeadState> {
  if (String(form.get("website") ?? "")) return { error: "Something went wrong. Please try again." };
  const magnet = String(form.get("magnet") ?? "");
  if (!isMagnet(magnet)) return { error: "Unknown download." };
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (!email) return { error: "Please enter a valid email address." };
  if (form.get("consent") !== "on") return { error: "Please tick the box so we can email you." };
  const source = cleanSrc((await cookies()).get("tn_src")?.value);
  try { await saveLead(email, magnet, source); } catch { return { error: "Could not save your email. Please try again in a minute." }; }
  return { ok: true, file: MAGNETS[magnet].file, page: MAGNETS[magnet].page };
}
