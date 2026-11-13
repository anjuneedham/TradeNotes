import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "More — TradeNotes" };
const LINKS = [
  { href: "/app/reviews", title: "Reviews", sub: "Daily, weekly and monthly reviews." },
  { href: "/app/playbook", title: "Playbook", sub: "Entry checklists per strategy." },
  { href: "/app/quick", title: "Quick log", sub: "Six fields, built for a phone." },
  { href: "/app/strategies/compare", title: "Compare strategies", sub: "Premium: strategies side by side." },
  { href: "/app/backtests", title: "Backtests", sub: "Premium: hypothetical trades, kept apart from real ones." },
  { href: "/app/accounts", title: "Accounts", sub: "Add and switch trading accounts." },
  { href: "/app/import", title: "Import trades", sub: "Bring in a broker export." },
  { href: "/app/settings", title: "Settings", sub: "Time zone, appearance, export, delete account." },
  { href: "/app/billing", title: "Plan and billing", sub: "Your plan, usage and invoices." },
  { href: "/learn", title: "Metric guide", sub: "What each number means." },
];

/** The phone's "More" tab: everything that does not fit in the bottom bar. */
export default async function More() {
  await getContext(); // validates the session like every /app page
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="More" />
      <Card className="!p-0">
        <ul className="divide-y divide-border">
          {LINKS.map((l) => (
            <li key={l.href}><Link href={l.href} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-raised/60"><span><span className="block font-medium">{l.title}</span><span className="block text-xs text-muted">{l.sub}</span></span><span aria-hidden="true" className="text-muted">→</span></Link></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
