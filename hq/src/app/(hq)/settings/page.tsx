import { q } from "@/lib/db";
import { getNurtureTemplates, getSettings, getTemplates } from "@/lib/settings";
import { saveSettingsAction, saveTemplate } from "@/app/actions/misc";
import { emailConfigured } from "@/lib/mail";
import { totpEnabled } from "@/lib/auth";
import { Badge, Card, Field, Flash, PageHeader, btnCls, btnGhostCls, inputCls } from "@/components/ui";

export const metadata = { title: "Settings — HQ" };
async function siteStatus(url: string): Promise<string> {
  try { const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000), redirect: "manual", cache: "no-store" }); return `HTTP ${r.status}`; } catch { return "unreachable"; }
}
export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams; const s = await getSettings();
  const [tpls, nurture, db, site] = await Promise.all([getTemplates(), getNurtureTemplates(), q<{ v: string }>("select version() as v").then((r) => r[0].v.split(" ").slice(0, 2).join(" ")).catch(() => "ERROR"), siteStatus(s.site_url)]);
  const env = (k: string) => Boolean(process.env[k]);
  const rows: [string, boolean, string][] = [
    ["Database", db !== "ERROR", db], ["Customer site reachable", site.startsWith("HTTP 2") || site.startsWith("HTTP 3") || site === "HTTP 401" || site === "HTTP 403", `${s.site_url} → ${site}`],
    ["Two-factor (TOTP) on HQ login", totpEnabled(), totpEnabled() ? "enabled" : "OFF — set HQ_TOTP_SECRET (node scripts/hash-password.mjs --totp)"],
    ["Email sending (Resend)", emailConfigured(), emailConfigured() ? "configured" : "off — set RESEND_API_KEY + EMAIL_FROM"], ["Sender identity for email footers", Boolean(s.business_name && s.support_email), s.business_name && s.support_email ? "set" : "missing — fill business name + support email below"],
    ["Verified database TLS", env("DATABASE_SSL_CA"), env("DATABASE_SSL_CA") ? "certificate verified" : "encrypted but not certificate-verified (set DATABASE_SSL_CA)"],
  ];
  return (
    <>
      <PageHeader title="Settings" sub="Targets, identity, message templates and system status." />
      <Flash sp={sp} />
      <Card title="System status"><ul className="space-y-1 text-sm">{rows.map(([l, ok, d]) => <li key={l} className="flex flex-wrap items-center gap-2"><Badge tone={ok ? "good" : "warn"}>{ok ? "OK" : "check"}</Badge><span className="font-medium">{l}</span><span className="text-muted">{d}</span></li>)}</ul></Card>
      <Card title="Targets & identity">
        <form action={saveSettingsAction} className="grid gap-3 md:grid-cols-3">
          <Field label="Customer site URL"><input name="site_url" defaultValue={s.site_url} className={inputCls} /></Field>
          <Field label="Time zone (for “today”)"><input name="tz" defaultValue={s.tz} className={inputCls} /></Field>
          <Field label="Calendly / booking link (demos)"><input name="calendly_url" defaultValue={s.calendly_url} className={inputCls} /></Field>
          <Field label="Goal: paying customers"><input name="goal_paying" type="number" defaultValue={s.goal_paying} className={inputCls} /></Field>
          <Field label="Goal date"><input name="goal_date" type="date" defaultValue={s.goal_date} className={inputCls} /></Field>
          <div />
          <Field label="DMs/day — TikTok"><input name="dm_target_tiktok" type="number" defaultValue={s.dm_target_tiktok} className={inputCls} /></Field>
          <Field label="DMs/day — Instagram"><input name="dm_target_instagram" type="number" defaultValue={s.dm_target_instagram} className={inputCls} /></Field>
          <div />
          <Field label="TikToks/day"><input name="post_target_tiktok" type="number" defaultValue={s.post_target_tiktok} className={inputCls} /></Field>
          <Field label="Shorts/day"><input name="post_target_youtube" type="number" defaultValue={s.post_target_youtube} className={inputCls} /></Field>
          <div />
          <Field label="Business name (email footer)"><input name="business_name" defaultValue={s.business_name} className={inputCls} /></Field>
          <Field label="Support email (footer + reply-to)"><input name="support_email" type="email" defaultValue={s.support_email} className={inputCls} /></Field>
          <Field label="Sender first name"><input name="sender_name" defaultValue={s.sender_name} className={inputCls} /></Field>
          <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="show_test_accounts" defaultChecked={s.show_test_accounts} /> Include test accounts (e2e/example emails) in customer lists and counts</label>
          <div className="md:col-span-3"><button className={btnCls}>Save settings</button></div>
        </form>
      </Card>
      <Card title="Outreach & post templates">
        <div className="space-y-4">{tpls.map((t) => (
          <form key={t.key} action={saveTemplate} className="space-y-2 rounded-md border border-border p-3"><input type="hidden" name="key" value={t.key} />
            <div className="flex items-center justify-between text-sm"><strong>{t.title}</strong>{t.custom && <Badge tone="accent">customised</Badge>}</div>
            <textarea name="body" rows={4} defaultValue={t.body} className={inputCls} />
            <div className="flex gap-2"><button className={btnGhostCls}>Save</button>{t.custom && <button name="reset" value="1" className={btnGhostCls}>Reset to default</button>}</div></form>))}</div>
        <p className="mt-2 text-xs text-muted">Placeholders: {"{name}"} {"{specific thing}"} {"{SITE}"} {"{link}"}. No profit claims, no testimonials you don’t have.</p>
      </Card>
      <Card title="Nurture email templates">
        <div className="space-y-4">{Object.entries(nurture).map(([k, m]) => (
          <form key={k} action={saveTemplate} className="space-y-2 rounded-md border border-border p-3"><input type="hidden" name="key" value={`nurture_${k}`} />
            <input name="subject" defaultValue={m.subject} className={inputCls} aria-label="Subject" /><textarea name="body" rows={6} defaultValue={m.body} className={inputCls} aria-label="Body" />
            <div className="flex gap-2"><button className={btnGhostCls}>Save {k.toUpperCase()}</button><button name="reset" value="1" className={btnGhostCls}>Reset</button></div></form>))}</div>
        <p className="mt-2 text-xs text-muted">Placeholders: {"{name}"} {"{sender}"} {"{trades_line}"} {"{founding_line}"}. Don’t describe features that don’t exist yet.</p>
      </Card>
    </>
  );
}
