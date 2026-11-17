"use server";
import { redirect } from "next/navigation";
import { subscribe, unsubscribe, type SubscribeResult } from "@/lib/subscribers";

export type SubscribeState = { result: SubscribeResult | null };

export async function subscribeAction(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  if (String(formData.get("website") ?? "")) return { result: "check_email" }; // honeypot: bots fill the hidden field
  try {
    return { result: await subscribe(String(formData.get("email") ?? ""), String(formData.get("src") ?? "") || null) };
  } catch (e) {
    console.error("subscribe failed", e instanceof Error ? e.message : e);
    return { result: "invalid" };
  }
}

export async function unsubscribeAction(formData: FormData) {
  await unsubscribe(String(formData.get("token") ?? ""));
  redirect("/newsletter/unsubscribe?done=1");
}
