import type { ReactNode } from "react";
import { Card } from "./ui";
import { INTENSITY_WORDS, intensityLevel, type RDistribution, type Heatmap, type MistakeCost, type DrawdownDetail } from "@/lib/analytics-extra";
import { money, signedMoney, pct, shortDate } from "@/lib/format";

/**
 * Colour-blind-safe result colouring, shared by the heatmap and the calendar: profit is BLUE, loss is ORANGE (a pair that stays
 * distinct for red-green colour blindness), the sign is always written (+ / −) with a ▲ / ▼ glyph, and size is written as a word
 * (small / medium / large) in the cell's accessible label and the legend. Colour is never the only signal.
 */
const STEP = [0, 12, 28, 48] as const; // % of the colour mixed into the panel background; text stays the normal text colour (contrast checked in both themes)
export function pnlTint(value: number, level: 0 | 1 | 2 | 3): { background?: string } {
  if (level === 0) return {};
  const v = value > 0 ? "var(--cb-gain)" : "var(--cb-loss)";
  return { background: `color-mix(in srgb, ${v} ${STEP[level]}%, transparent)` };
}
export const pnlGlyph = (v: number) => (v > 0 ? "▲" : v < 0 ? "▼" : "·");
export const pnlWord = (v: number) => (v > 0 ? "profit" : v < 0 ? "loss" : "break-even");

export function ColourLegend() {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3.5 w-5 rounded-sm border border-border" style={pnlTint(1, 3)} />▲ blue = profit</span>
      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3.5 w-5 rounded-sm border border-border" style={pnlTint(-1, 3)} />▼ orange = loss</span>
      <span>Darker = larger (3 steps, relative to the biggest cell). The sign is always written.</span>
    </p>
  );
}

const Note = ({ children }: { children: ReactNode }) => <p className="mt-0.5 text-xs text-muted">{children}</p>;

export function RDistributionCard({ d }: { d: RDistribution }) {
  const max = Math.max(1, ...d.buckets.map((b) => b.count));
  return (
    <Card>
      <h3 className="text-sm font-medium">R-multiple distribution</h3>
      <Note>How many trades ended in each band of R (result ÷ planned risk). Based on {d.withR} of {d.total} closed trades that have a stop; {d.withoutR} without a stop are not shown.</Note>
      {d.withR === 0 ? <p className="mt-3 text-sm text-muted">Add a stop loss to your trades to see their R-multiples.</p> : (
        <ul className="mt-3 space-y-1.5" aria-label="Trades per R band">
          {d.buckets.map((b) => {
            const neg = b.to !== null && b.to <= 0;
            return (
              <li key={b.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-xs sm:grid-cols-[8rem_minmax(0,1fr)_6.5rem]">
                <span className="text-muted">{neg ? "▼" : "▲"} {b.label}</span>
                <span aria-hidden="true" className="h-3 rounded-sm bg-raised"><span className="block h-3 rounded-sm" style={{ width: `${(b.count / max) * 100}%`, ...pnlTint(neg ? -1 : 1, 3) }} /></span>
                <span className="fig text-right">{b.count} · {pct(b.share)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hh = (h: number) => String(h).padStart(2, "0");

export function HeatmapCard({ h, tz, cur }: { h: Heatmap; tz: string; cur: string }) {
  const ranked = DAY_ORDER.flatMap((d) => h.cells[d].map((c, hour) => ({ d, hour, ...c }))).filter((c) => c.trades > 0);
  const best = [...ranked].sort((a, b) => b.netPnl - a.netPnl).filter((c) => c.netPnl > 0).slice(0, 3);
  const worst = [...ranked].sort((a, b) => a.netPnl - b.netPnl).filter((c) => c.netPnl < 0).slice(0, 3);
  const slot = (c: { d: number; hour: number; trades: number; netPnl: number }) => `${DAY_SHORT[c.d]} ${hh(c.hour)}:00 (${c.trades} trade${c.trades === 1 ? "" : "s"}, ${signedMoney(c.netPnl, cur)})`;
  return (
    <Card className="lg:col-span-2">
      <h3 className="text-sm font-medium">When you trade: weekday × hour</h3>
      <Note>Net P&amp;L by the weekday and hour you ENTERED, in {tz}. Each cell shows the number of trades; hover or tab for details.</Note>
      {h.trades === 0 ? <p className="mt-3 text-sm text-muted">No closed trades yet.</p> : (<>
        <div className="relative mt-3 overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-[11px]" aria-label="Net P&L by weekday and entry hour">
            <thead><tr><td />{Array.from({ length: 24 }, (_, i) => <th key={i} scope="col" className="min-w-6 px-0 pb-1 text-center font-normal text-muted">{i % 3 === 0 ? hh(i) : ""}<span className="sr-only">{i % 3 === 0 ? "" : hh(i)}</span></th>)}</tr></thead>
            <tbody>
              {DAY_ORDER.map((d) => (
                <tr key={d}>
                  <th scope="row" className="pr-2 text-left font-normal text-muted">{DAY_SHORT[d]}</th>
                  {h.cells[d].map((c, hour) => {
                    const lvl = intensityLevel(c.netPnl, h.maxAbs);
                    const label = c.trades === 0 ? `${DAY_SHORT[d]} ${hh(hour)}:00, no trades` : `${DAY_SHORT[d]} ${hh(hour)}:00, ${c.trades} trade${c.trades === 1 ? "" : "s"}, ${signedMoney(c.netPnl, cur)}, ${pnlWord(c.netPnl)}${lvl ? `, ${INTENSITY_WORDS[lvl]}` : ""}`;
                    return (
                      <td key={hour} title={label} aria-label={label} tabIndex={c.trades ? 0 : undefined}
                        className="h-6 min-w-6 rounded-sm border border-border/60 text-center align-middle text-fg focus-visible:outline-2" style={pnlTint(c.netPnl, lvl)}>
                        {c.trades > 0 && <span className="fig leading-none"><span aria-hidden="true" className="mr-px text-[8px]">{pnlGlyph(c.netPnl)}</span>{c.trades}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ColourLegend />
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div><p className="font-medium">Best slots</p><ul className="mt-1 space-y-0.5 text-muted">{best.length ? best.map((c) => <li key={`${c.d}${c.hour}`}>▲ {slot(c)}</li>) : <li>None in profit.</li>}</ul></div>
          <div><p className="font-medium">Worst slots</p><ul className="mt-1 space-y-0.5 text-muted">{worst.length ? worst.map((c) => <li key={`${c.d}${c.hour}`}>▼ {slot(c)}</li>) : <li>None at a loss.</li>}</ul></div>
        </div>
        <p className="mt-2 text-xs text-muted">Single hours hold few trades: a cell with 1 or 2 trades is an anecdote, not a pattern.</p>
      </>)}
    </Card>
  );
}

export function MistakeCostCard({ m, cur }: { m: MistakeCost; cur: string }) {
  const avg = (x: number | null) => (x === null ? "—" : signedMoney(x, cur));
  return (
    <Card id="mistake-cost" className="scroll-mt-20">
      <h3 className="text-sm font-medium">What your mistakes cost</h3>
      <Note>Net result of the trades carrying each mistake tag. A trade with several tags is counted under EACH of them, so the rows below do not add up to a total. The two lines underneath count every trade once.</Note>
      {m.tags.length === 0 ? <p className="mt-3 text-sm text-muted">No mistake tags yet. Tag a trade&apos;s mistakes when you log it and the cost shows up here.</p> : (<>
        <div className="relative mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th scope="col" className="pb-1.5 font-normal">Mistake</th><th scope="col" className="pb-1.5 text-right font-normal">Trades</th><th scope="col" className="pb-1.5 text-right font-normal">Net P&amp;L</th><th scope="col" className="hidden pb-1.5 text-right font-normal sm:table-cell">Losses only</th><th scope="col" className="pb-1.5 text-right font-normal">Avg / trade</th></tr></thead>
            <tbody>{m.tags.map((t) => (
              <tr key={t.tag} className="border-t border-border">
                <th scope="row" className="py-2 pr-3 text-left font-normal">{t.tag}</th>
                <td className="fig py-2 text-right">{t.trades}</td>
                <td className="fig py-2 text-right">{pnlGlyph(t.netPnl)} {signedMoney(t.netPnl, cur)}</td>
                <td className="fig hidden py-2 text-right sm:table-cell">{money(t.lossTotal, cur)}</td>
                <td className="fig py-2 text-right">{signedMoney(t.avgPerTrade, cur)}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-2">
          <div><dt className="text-muted">Trades with at least one mistake tag</dt><dd className="fig mt-0.5">{m.withMistake.trades} trades · {signedMoney(m.withMistake.netPnl, cur)} · {avg(m.withMistake.avgPerTrade)} per trade</dd></div>
          <div><dt className="text-muted">Trades with no mistake tag</dt><dd className="fig mt-0.5">{m.withoutMistake.trades} trades · {signedMoney(m.withoutMistake.netPnl, cur)} · {avg(m.withoutMistake.avgPerTrade)} per trade</dd></div>
        </dl>
      </>)}
    </Card>
  );
}

export function DrawdownCard({ d, cur }: { d: DrawdownDetail; cur: string }) {
  return (
    <Card>
      <h3 className="text-sm font-medium">Drawdown and recovery</h3>
      {d.maxDrawdown === 0 ? <p className="mt-2 text-sm text-muted">Your cumulative result has not fallen below an earlier high yet.</p> : (<>
        <p className="fig mt-2 text-2xl font-medium text-loss">{money(d.maxDrawdown, cur)}</p>
        <p className="mt-1 text-sm text-muted">
          Worst fall: from the high after trade {d.peakAfterTrade === 0 ? "0 (your starting level)" : `${d.peakAfterTrade}${d.peakAt ? ` (${shortDate(d.peakAt)})` : ""}`} down to the low after trade {d.troughAfterTrade}{d.troughAt ? ` (${shortDate(d.troughAt)})` : ""}.
        </p>
        <p className="mt-2 text-sm">
          {d.recovered
            ? <>Recovered: it took {d.tradesToRecover} more trade{d.tradesToRecover === 1 ? "" : "s"} to get back to that high{d.recoveredAt ? ` (${shortDate(d.recoveredAt)})` : ""}.</>
            : <>Not recovered yet: the curve has not returned to that high.</>}
        </p>
      </>)}
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted">Right now you are {d.current.fromPeak ? <><span className="fig text-fg">{money(d.current.drawdown, cur)}</span> below your highest point so far.</> : "at your highest point so far."}</p>
    </Card>
  );
}
