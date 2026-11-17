import { JamesNote } from "@/components/JamesNote";
import { PencilUnderline } from "@/components/stickman/PencilArrow";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import LeadForm from "@/components/LeadForm";
import { Eyebrow, linkCls } from "@/components/ui";

export const metadata = pageMeta({
  title: "Free trading journal template (spreadsheet) + review checklist — TradeNotes",
  description: "Download a free trading journal template for Excel or Google Sheets, with R-multiple, mistake and plan-followed columns, plus a 30-trade review checklist. Built for forex, futures and prop firm traders.",
  path: "/free",
});

export default function Free() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Eyebrow>Free tools for traders</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Free trading journal template and review checklist</h1>
      <PencilUnderline className="!mx-0" />
      <p className="mt-3 text-muted">Most traders who journal start with a spreadsheet. If that&apos;s you, start with a good one. This template has the columns that matter: planned risk, R-multiple, whether you followed your plan, and a mistake tag, so your reviews show where your results really come from.</p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>✓ <strong>Journal template</strong> (CSV, opens in Excel, Google Sheets or Numbers), with 2 worked example rows (forex and futures)</li>
        <li>✓ <strong>30-trade review checklist</strong>: 35 minutes, 4 steps, one change to test next</li>
        <li>✓ Works for live accounts, demo accounts and prop firm challenges</li>
      </ul>
      <div className="mt-8"><LeadForm /></div>
      <h2 className="mt-12 text-xl font-semibold tracking-tight">Also free</h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li><Link href="/learn/r-multiple-prop-firm-challenge" className={linkCls}>R-multiple calculator and guide</Link>: see what each trade was worth in units of risk.</li>
        <li><Link href="/learn" className={linkCls}>Trading metrics explained</Link>: win rate, profit factor, expectancy and drawdown in plain English.</li>
        <li><Link href="/demo" className={linkCls}>TradeNotes demo</Link>: a full sample journal, no account needed.</li>
      </ul>
      <p className="mt-10 text-xs text-muted">Educational content, not financial advice. Trading involves substantial risk of loss.</p>
      <JamesNote />
    </div>
  );
}
