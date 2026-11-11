import { describe, it, expect } from "vitest";
import { render, type TemplateId } from "./email-templates";

const ALL: TemplateId[] = ["welcome", "verify_email", "reset_password", "subscription_confirmed", "payment_failed", "cancellation_scheduled", "subscription_ended", "account_notice"];
describe("email templates", () => {
  it.each(ALL)("%s renders subject, html and text", (id) => {
    const m = render(id, { url: "https://tradenotes.dev/x?token=abc", plan: "starter", periodEnd: "2026-12-01T00:00:00Z", message: "Hello" });
    expect(m.subject.length).toBeGreaterThan(5);
    expect(m.html).toContain("<!doctype html>");
    expect(m.text.length).toBeGreaterThan(20);
    expect(m.html).not.toMatch(/<img|undefined|null/);
  });
  it("links and plan names are filled in", () => {
    expect(render("reset_password", { url: "https://a.test/r?t=1" }).text).toContain("https://a.test/r?t=1");
    expect(render("subscription_confirmed", { plan: "pro", periodEnd: "2026-12-01T00:00:00Z" }).text).toContain("Premium is active");
    expect(render("cancellation_scheduled", { plan: "starter", periodEnd: "2026-12-01T00:00:00Z" }).text).toContain("December 1, 2026");
  });
  it("escapes injected HTML", () => {
    const m = render("account_notice", { message: '<script>alert(1)</script>' });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
  it("never promises profits", () => {
    for (const id of ALL) expect(render(id, { url: "u", plan: "pro" }).text).not.toMatch(/guarantee|profit/i);
  });
});
