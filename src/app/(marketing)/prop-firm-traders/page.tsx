import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { FunnelPage, H2, Bullets } from "@/components/Funnel";
import { OFFER } from "@/lib/marketing";
import { linkCls } from "@/components/ui";

export const metadata = pageMeta({ title: "Trading journal for prop-firm challenge traders — TradeNotes", description: "Track an evaluation in R: daily loss used, rule breaks, results by setup and session. Import from MT4/5, cTrader, Tradovate, NinjaTrader and more. Free plan, no card.", path: "/prop-firm-traders" });

export default function PropFirm() {
  return (
    <FunnelPage eyebrow="For prop-firm traders" title="Journal your challenge in R, and see which rule breaks cost you" intro="A trading journal for evaluation and funded-account traders: every result in R, mistakes tagged and totalled, and a checklist for your own rules." src="prop-landing" affiliated
      next={[{ href: "/learn/daily-loss-limit-in-r", label: "Your daily loss limit in R" }, { href: "/import", label: "Import from your platform" }, { href: "/features/playbook", label: "Playbook and rule adherence" }]}>
      <h2 className={H2}>What you get</h2>
      <Bullets items={["Every trade in R once you record a stop, so a target and a max loss become a number of trades.", "Mistake and emotion tags with what each one cost, in money and R.", "Results by setup, session, instrument and weekday, with small-sample warnings.", "Separate accounts for an evaluation, a funded account and personal trading.", "Import from MetaTrader 4/5, cTrader, Tradovate, NinjaTrader, TradingView and more (paid plans), or log by hand on Free.", "An AI Coach that answers questions about your own trades."]} />
      <h2 className={H2}>What it does not do</h2>
      <Bullets items={["It does not connect to your broker or prop firm, or sync automatically. You upload an export or log trades.", "It does not give signals or advice, and it cannot make anyone pass a challenge."]} />
      <h2 className={H2}>Price</h2>
      <p className="mt-4">{OFFER.free} {OFFER.paid} {OFFER.founding} <Link href="/pricing" className={linkCls}>Compare plans</Link>.</p>
    </FunnelPage>
  );
}
