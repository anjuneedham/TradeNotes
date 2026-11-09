import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext } from "@/lib/app-context";
import { Card, Field, inputCls, btnCls } from "@/components/ui";

async function complete(formData: FormData) {
  "use server";
  const { db, user, accounts } = await getContext({ requireOnboarded: false });
  const p = z.object({
    experience_level: z.enum(["beginner", "intermediate", "experienced"]),
    primary_market: z.enum(["forex", "futures", "stocks", "options", "crypto"]),
    trading_style: z.enum(["scalping", "day", "swing", "position"]),
    preferred_timeframe: z.string().max(10),
    main_goal: z.enum(["consistency", "risk", "strategy", "psychology", "track"]),
    account_name: z.string().trim().min(1).max(60),
    currency: z.string().trim().toUpperCase().length(3),
    starting_balance: z.coerce.number().min(0).max(1e9),
    show_explanations: z.preprocess((v) => v === "on", z.boolean()),
  }).safeParse(Object.fromEntries(formData));
  if (!p.success) redirect("/app/onboarding?error=1");
  const { account_name, currency, starting_balance, show_explanations, ...profile } = p.data;
  await db(async (q) => {
    await q(
      `update tradenotes.profiles set experience_level=$1, primary_market=$2, markets=$3, trading_style=$4, preferred_timeframe=$5,
         main_goal=$6, show_explanations=$7, onboarding_completed_at=now() where id=$8`,
      [profile.experience_level, profile.primary_market, [profile.primary_market], profile.trading_style, profile.preferred_timeframe, profile.main_goal, show_explanations, user.id],
    );
    if (accounts[0]) await q("update tradenotes.accounts set name=$1, currency=$2, starting_balance=$3 where id=$4", [account_name, currency, starting_balance, accounts[0].id]);
  });
  redirect("/app");
}

const sel = (name: string, opts: [string, string][], def?: string) => (
  <select name={name} defaultValue={def} className={inputCls} required>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
);

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { accounts, profile } = await getContext({ requireOnboarded: false });
  const { error } = await searchParams;
  const acct = accounts[0];
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Welcome to TradeNotes</h1>
      <p className="mt-2 text-sm text-muted">Six quick questions so we can set things up for you. It takes about a minute.</p>
      {error && <p role="alert" className="mt-3 text-sm text-loss">Something was missing — please check your answers.</p>}
      <form action={complete} className="mt-6 space-y-4">
        <Card className="space-y-4">
          <Field label="How would you describe your experience?">{sel("experience_level", [["beginner", "Beginner (under 1 year)"], ["intermediate", "Intermediate (1–3 years)"], ["experienced", "Experienced (3+ years)"]], profile?.experience_level ?? "beginner")}</Field>
          <Field label="What do you trade most?">{sel("primary_market", [["forex", "Forex"], ["futures", "Futures"], ["stocks", "Stocks"], ["options", "Options"], ["crypto", "Crypto"]], "forex")}</Field>
          <Field label="Trading style">{sel("trading_style", [["scalping", "Scalping (seconds–minutes)"], ["day", "Day trading"], ["swing", "Swing trading (days)"], ["position", "Position trading (weeks+)"]], "day")}</Field>
          <Field label="Main timeframe you trade">{sel("preferred_timeframe", ["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map((t) => [t, t] as [string, string]), "M15")}</Field>
          <Field label="What do you most want to improve?">{sel("main_goal", [["consistency", "Consistency"], ["risk", "Risk management"], ["strategy", "Finding a strategy that works"], ["psychology", "Discipline & emotions"], ["track", "Just track my results"]], "consistency")}</Field>
        </Card>
        <Card className="space-y-4">
          <p className="text-sm font-medium">Your first trading account</p>
          <Field label="Account name"><input name="account_name" defaultValue={acct?.name ?? "My Account"} required maxLength={60} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account currency"><input name="currency" defaultValue={acct?.currency ?? "USD"} maxLength={3} minLength={3} required className={inputCls} /></Field>
            <Field label="Starting balance"><input name="starting_balance" type="number" step="0.01" min="0" defaultValue={acct?.starting_balance ?? 0} className={inputCls} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_explanations" defaultChecked /> Show plain-English explanations next to my stats</label>
        </Card>
        <button className={`${btnCls} w-full py-3`}>Continue</button>
      </form>
    </div>
  );
}
