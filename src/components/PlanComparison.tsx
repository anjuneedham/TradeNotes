import { PLANS, type PlanId } from "@/lib/plans";
import { PLAN_ORDER, FEATURES_NOW, FEATURES_DEV, type FeatureRow } from "@/lib/plan-features";

const Yes = () => (<><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="inline text-fg"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="sr-only">Included</span></>);
const No = () => (<><span aria-hidden="true" className="text-muted">—</span><span className="sr-only">Not included</span></>);
const cell = (v: string | boolean) => (v === true ? <Yes /> : v === false ? <No /> : <span className="fig">{v}</span>);

function Rows({ rows, current }: { rows: FeatureRow[]; current?: PlanId }) {
  return rows.map((r) => (
    <tr key={r.label} className="border-t border-border">
      <th scope="row" className="py-3 pr-3 text-left font-normal"><span className="block">{r.label}</span>{r.detail && <span className="mt-0.5 block text-xs text-muted">{r.detail}</span>}</th>
      {PLAN_ORDER.map((id) => <td key={id} className={`px-2 py-3 text-center ${current === id ? "bg-raised/60" : ""}`}>{cell(r.cells[id])}</td>)}
    </tr>
  ));
}

/** Full tier comparison. "In development" rows are visually and textually separated from what exists today. */
export function PlanComparison({ current }: { current?: PlanId }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">Plan comparison</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[46%] pb-3 text-left text-xs font-normal text-muted">Available now</th>
            {PLAN_ORDER.map((id) => (
              <th key={id} scope="col" className={`px-2 pb-3 text-center ${current === id ? "rounded-t-md bg-raised/60" : ""}`}>
                <span className="block font-medium">{PLANS[id].name}</span>
                <span className="fig block text-xs font-normal text-muted">${PLANS[id].monthly}/mo</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody><Rows rows={FEATURES_NOW} current={current} /></tbody>
        <tbody>
          <tr><th scope="colgroup" colSpan={4} className="border-t border-border-strong pb-1 pt-6 text-left text-xs font-normal text-muted">
            <span className="font-medium text-warn">In development — not available yet.</span> No release date is promised. This shows which plan each is intended for.</th></tr>
          <Rows rows={FEATURES_DEV} current={current} />
        </tbody>
      </table>
    </div>
  );
}
