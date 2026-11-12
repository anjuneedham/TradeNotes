import { describe, it, expect } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrub, sentryOptions } from "./monitor";

describe("monitoring privacy", () => {
  it("removes request bodies, cookies, headers, query string and user", () => {
    const e = { type: undefined, request: { url: "https://x/app", data: "notes", cookies: { a: "b" }, headers: { cookie: "s" }, query_string: "q=1" }, user: { email: "a@b.c" } } as unknown as ErrorEvent;
    const out = scrub(e);
    expect(out.request).toEqual({ url: "https://x/app" });
    expect(out.user).toBeUndefined();
  });
  it("is disabled without a DSN and never sends default PII", () => {
    expect(sentryOptions(undefined).enabled).toBe(false);
    expect(sentryOptions("https://k@o1.ingest.sentry.io/1").enabled).toBe(true);
    expect(sentryOptions("x").sendDefaultPii).toBe(false);
  });
});
