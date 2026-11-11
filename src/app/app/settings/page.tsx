import Link from "next/link";
import { cookies } from "next/headers";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { emailEnabled } from "@/lib/email";
import { LEGAL, isFilled } from "@/lib/legal";
import { logout } from "../../(auth)/actions";
import { savePreferences } from "./actions";
import { Card, Notice, Badge, PageHeader, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { money } from "@/lib/format";

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

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { user, profile, accounts, plan, sub } = await getContext();
  const { saved } = await searchParams;
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

      <Section title="Account" sub="Your sign-in and the trading account your statistics are reported in.">
        <dl>
          <Line k="Email">{user.email}</Line>
          <Line k="Trading account">{acct?.name ?? "—"}</Line>
          <Line k="Account currency">{acct?.currency ?? "—"}</Line>
          <Line k="Starting balance"><span className="fig">{acct ? money(Number(acct.starting_balance), acct.currency) : "—"}</span></Line>
        </dl>
        <p className="mt-2 text-xs text-muted">Account details were set during onboarding and can&apos;t be edited here yet{support ? `. Email ${support} if something needs correcting.` : "."}</p>
      </Section>

      <Section title="Preferences">
        <form action={savePreferences} className="space-y-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="show_explanations" defaultChecked={profile?.show_explanations ?? true} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span><span className="font-medium">Show plain-English explanations next to my stats</span><span className="mt-0.5 block text-xs text-muted">Turn off to see only the numbers.</span></span>
          </label>
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

      <Section title="Security">
        {emailEnabled()
          ? <p className="text-sm text-muted">To change your password, <Link href="/forgot-password" className={linkCls}>request a reset link</Link>. It is emailed to {user.email} and signs you out everywhere once used.</p>
          : <p className="text-sm text-muted">Changing your password yourself isn&apos;t available yet.{support ? ` Email ${support} from your account email and we'll reset it for you.` : " Contact support from your account email and we'll reset it for you."}</p>}
      </Section>

      <Section title="Your data" sub="You own what you enter.">
        <p className="text-sm text-muted">You can ask for a copy of your data or for your account to be deleted at any time{support ? <> by emailing {support} from your account email</> : <> by contacting support from your account email</>}. Deletion is completed within {LEGAL.deletionDays} days. Self-service export isn&apos;t available yet. <Link href="/legal/privacy" className={linkCls}>Privacy Policy</Link></p>
      </Section>

      <div className="md:hidden"><Section title="Session">
        <form action={logout}><button className={btnGhostCls}>Log out</button></form>
      </Section></div>
    </div>
  );
}
