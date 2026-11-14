import Link from "next/link";
import { cookies } from "next/headers";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { emailEnabled } from "@/lib/email";
import { remindersLive } from "@/lib/reminders";
import { LEGAL, isFilled } from "@/lib/legal";
import { logout } from "../../(auth)/actions";
import { savePreferences, deleteAccount } from "./actions";
import { ShareLinksPanel, type LinkRow } from "@/components/ShareLinksPanel";
import { linkStatus } from "@/lib/share";
import { Card, Notice, Badge, PageHeader, btnCls, btnGhostCls, linkCls, inputCls } from "@/components/ui";
import { money } from "@/lib/format";
import { COMMON_TIMEZONES } from "@/lib/timezone";

export const metadata = { title: "Settings — TradeNotes" };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border pt-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
      <div><h2 className="font-medium">{title}</h2>{sub && <p className="mt-1 text-xs leading-relaxed text-muted">{sub}</p>}</div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
const Line = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border py-2.5 text-sm first:border-t-0 first:pt-0"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words text-right">{children}</dd></div>
);

const DELETE_ERRORS: Record<string, string> = {
  confirm: "Type DELETE (in capitals) to confirm. Your account was not deleted.",
  password: "That password didn't match. Your account was not deleted.",
  files: "We couldn't delete your screenshots just now, so nothing was deleted. Please try again in a minute.",
  subscription: "We couldn't cancel your subscription automatically, so nothing was deleted. Cancel it from Plan & billing first, or contact support.",
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; delete_error?: string; revoked?: string }> }) {
  const { user, profile, accounts, plan, sub, db } = await getContext();
  const { saved, delete_error: deleteError, revoked } = await searchParams;
  const links: LinkRow[] = (await db((q) => q<Omit<LinkRow, "status">>("select id, label, scope, expires_at, revoked_at, created_at, show_amounts from tradenotes.share_links order by created_at desc limit 20"))).map((l) => ({ ...l, status: linkStatus(l) }));
  const paid = plan !== "free";
  const t = (await cookies()).get("tn_theme")?.value;
  const theme = t === "light" || t === "dark" ? t : "system";
  const acct = accounts[0];
  const support = isFilled(LEGAL.supportEmail) ? LEGAL.supportEmail : null;
  const limit = PLANS[plan].tradeLimit;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" />
      {saved && <Notice kind="ok">Preferences saved.</Notice>}

      <Section title="Plan" sub="What you're on and what it costs.">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-medium">{PLANS[plan].name} plan {plan !== "free" && <Badge tone="win">Active</Badge>}</p>
            <p className="mt-1 text-sm text-muted"><span className="fig">${PLANS[plan].monthly}</span> / month · {limit === null ? "unlimited trades" : `up to ${limit.toLocaleString("en-US")} trades`}{plan !== "free" && sub?.current_period_end ? ` · paid through ${new Date(sub.current_period_end).toISOString().slice(0, 10)}` : ""}</p>
          </div>
          <Link href="/app/billing" className={btnGhostCls}>{plan === "free" ? "See plans" : "Manage plan"}</Link>
        </Card>
      </Section>

      <Section title="Account" sub="Your sign-in and your trading accounts.">
        <dl>
          <Line k="Email">{user.email}</Line>
          <Line k="Trading accounts">{accounts.length} of {PLANS[plan].accounts}</Line>
          <Line k="First account">{acct ? `${acct.name} · ${acct.currency} · start ` : "—"}<span className="fig">{acct ? money(Number(acct.starting_balance), acct.currency) : ""}</span></Line>
        </dl>
        <Link href="/app/accounts" className={`${btnGhostCls} mt-3`}>Manage trading accounts</Link>
      </Section>

      <Section title="Preferences">
        <form action={savePreferences} className="space-y-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="show_explanations" defaultChecked={profile?.show_explanations ?? true} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span><span className="font-medium">Show plain-English explanations next to my stats</span><span className="mt-0.5 block text-xs text-muted">Turn off to see only the numbers.</span></span>
          </label>
          <label className="block max-w-sm text-sm">
            <span className="font-medium">Your time zone</span>
            <select name="timezone" defaultValue={profile?.timezone ?? "UTC"} className={`${inputCls} mt-1`}>
              {Array.from(new Set([profile?.timezone ?? "UTC", ...COMMON_TIMEZONES])).map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">Used to read broker files whose times have no time zone, and for calendar days and time-of-day stats. Trades are stored in UTC.</span>
          </label>
          {remindersLive() && PLANS[plan].reviews && (
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="hidden" name="reminders_shown" value="1" />
              <input type="checkbox" name="review_reminders" defaultChecked={profile?.review_reminders ?? false} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span><span className="font-medium">Email me a weekly review reminder</span><span className="mt-0.5 block text-xs text-muted">One short email a week (Monday), only if you have not written last week&apos;s review. It contains a link and no trading figures, and every email has an unsubscribe link. Off by default.</span></span>
            </label>
          )}
          <fieldset>
            <legend className="text-sm font-medium">Appearance <span className="font-normal text-muted">· on this device</span></legend>
            <div className="mt-2 grid max-w-sm grid-cols-3 gap-2">
              {([["system", "Match device"], ["dark", "Dark"], ["light", "Light"]] as const).map(([v, l]) => (
                <label key={v} className="relative flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-border px-2 text-center text-sm text-muted hover:border-border-strong has-[:checked]:border-fg has-[:checked]:bg-raised has-[:checked]:font-medium has-[:checked]:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="radio" name="theme" value={v} defaultChecked={theme === v} className="absolute inset-0 cursor-pointer opacity-0" />{l}
                </label>
              ))}
            </div>
          </fieldset>
          <button className={btnCls}>Save preferences</button>
        </form>
      </Section>

      <div id="sharing"><Section title="Sharing" sub="Public, read-only report links you control.">
        {revoked && <div className="mb-3"><Notice kind="ok">Link revoked. It stopped working immediately.</Notice></div>}
        {PLANS[plan].shareLinks ? <ShareLinksPanel links={links} currency={accounts[0]?.currency ?? "USD"} otherCurrencies={accounts.some((a) => a.currency !== (accounts[0]?.currency ?? "USD"))} /> : <p className="text-sm text-muted">Share links are not part of your plan.</p>}
      </Section></div>

      <Section title="Security">
        {emailEnabled()
          ? <p className="text-sm text-muted">To change your password, <Link href="/forgot-password" className={linkCls}>request a reset link</Link>. It is emailed to {user.email} and signs you out everywhere once used.</p>
          : <p className="text-sm text-muted">Changing your password yourself isn&apos;t available yet.{support ? ` Email ${support} from your account email and we'll reset it for you.` : " Contact support from your account email and we'll reset it for you."}</p>}
      </Section>

      <div id="data"><Section title="Your data" sub="You own what you enter.">
        <div className="space-y-4 text-sm">
          <div>
            <a href="/app/export" className={btnGhostCls} download>Download my trades (CSV)</a>
            <p className="mt-2 text-xs text-muted">Every trade with its exits, notes and tags. Opens in any spreadsheet. Screenshots, reviews and playbook rules are not included in the file: open a trade to view or save its screenshots, and read your reviews and rules on their pages. Hypothetical backtest trades are never in this file; they have their own labelled export on the Backtests page.</p>
          </div>
          <details className="rounded-md border border-border p-3" open={Boolean(deleteError)}>
            <summary className="cursor-pointer font-medium">Delete my account</summary>
            <p className="mt-2 text-muted">This permanently deletes your account, every trade, hypothetical backtest trade, note, review, playbook rule, share link and statistic. It can&apos;t be undone. Download your trades first if you want a copy.{paid ? " Your subscription is cancelled first so you are not charged again." : ""}</p>
            {deleteError && <div className="mt-3"><Notice kind="error">{DELETE_ERRORS[deleteError] ?? "Your account was not deleted. Please try again."}</Notice></div>}
            <form action={deleteAccount} className="mt-3 grid gap-3 sm:max-w-sm">
              <label className="text-sm">Type DELETE to confirm<input name="confirm" autoComplete="off" required className={`${inputCls} mt-1`} /></label>
              <label className="text-sm">Current password<input name="password" type="password" autoComplete="current-password" required className={`${inputCls} mt-1`} /></label>
              <button className="inline-flex min-h-10 items-center justify-center rounded-md border border-loss/60 px-4 text-sm font-medium text-loss hover:bg-loss/10">Delete my account permanently</button>
            </form>
          </details>
          <p className="text-xs text-muted">Questions about your data{support ? <> — email {support}</> : null}. <Link href="/legal/privacy" className={linkCls}>Privacy Policy</Link></p>
        </div>
      </Section></div>

      <div className="md:hidden"><Section title="Session">
        <form action={logout}><button className={btnGhostCls}>Log out</button></form>
      </Section></div>
    </div>
  );
}
