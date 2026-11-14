import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { QuickLogForm } from "@/components/QuickLogForm";
import { InstallHint } from "@/components/InstallHint";
import { PageHeader, linkCls } from "@/components/ui";

export const metadata = { title: "Quick log — TradeNotes" };
export default async function QuickLog() {
  const { db, plan } = await getContext();
  const limit = PLANS[plan].tradeLimit;
  // Defaults from the most recent trade (row-level security: the user's own). Presentation only: the plan limit is enforced when saving.
  const { last, used } = await db(async (q) => ({
    last: (await q<{ symbol: string; side: "long" | "short"; quantity: string }>("select symbol, side, quantity from tradenotes.trades order by opened_at desc, created_at desc limit 1"))[0] ?? null,
    used: limit === null ? 0 : (await q<{ n: number }>("select count(*)::int as n from tradenotes.trades"))[0].n,
  }));
  const defaults = { symbol: last?.symbol ?? "", side: last?.side ?? ("long" as const), quantity: last ? String(Number(last.quantity)) : "" };
  return (
    <div className="mx-auto max-w-md space-y-5">
      <PageHeader title="Quick log" sub={<>Six fields, one tap. <Link href="/app/journal/new" className={linkCls}>Full form</Link></>} />
      <QuickLogForm defaults={defaults} plan={{ name: PLANS[plan].name, limit, used }} />
      <InstallHint />
    </div>
  );
}
