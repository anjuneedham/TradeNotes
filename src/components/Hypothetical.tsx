import { Badge } from "./ui";
import { HYPOTHETICAL, HYPOTHETICAL_DETAIL } from "@/lib/backtest";

/** The permanent label on every backtest screen. It is not dismissible and not conditional. */
export function HypotheticalBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" aria-label={HYPOTHETICAL} className="rounded-md border border-warn/60 bg-warn/10 px-3.5 py-3 text-sm leading-relaxed">
      <p className="flex flex-wrap items-center gap-2 font-semibold"><Badge tone="warn">Hypothetical</Badge>{HYPOTHETICAL}</p>
      {!compact && <p className="mt-1 text-muted">{HYPOTHETICAL_DETAIL}</p>}
    </div>
  );
}
