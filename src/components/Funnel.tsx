import Link from "next/link";
import { Eyebrow, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { OFFER, NOT_AFFILIATED, type NextLink } from "@/lib/marketing";

/** Primary CTA (signup with ?src) + secondary (demo) + optional lead capture link to /free. One per page block. */
export function Cta({ src, free = true, title = "Start your journal today" }: { src: string; free?: boolean; title?: string }) {
  return (
    <div className="mt-12 rounded-lg border border-border-strong bg-panel px-5 py-6 sm:px-8">
      <p className="text-lg font-medium tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted">{OFFER.free} {OFFER.paid}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={`/signup?src=${src}`} className={`${btnCls} !px-6`}>Start free, no card</Link>
        <Link href={`/demo?src=${src}`} className={btnGhostCls}>See the demo</Link>
        {free && <Link href={`/free?src=${src}`} className={`${linkCls} text-sm`}>Or get the free journal template</Link>}
      </div>
    </div>
  );
}

export function NextSteps({ links }: { links: NextLink[] }) {
  return (
    <nav aria-label="Next step" className="mt-10">
      <Eyebrow>Next step</Eyebrow>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="block h-full rounded-lg border border-border bg-panel p-4 text-sm hover:border-border-strong">{l.label} →</Link></li>
        ))}
      </ul>
    </nav>
  );
}

/** Standard page frame for funnel pages: heading, body, end-of-page CTA, next steps, disclaimer lines. */
export function FunnelPage({ eyebrow, title, intro, src, next, children, free = true, affiliated = false }: { eyebrow: string; title: string; intro: string; src: string; next: NextLink[]; children: React.ReactNode; free?: boolean; affiliated?: boolean }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-muted">{intro}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/signup?src=${src}`} className={`${btnCls} !px-6`}>Start free, no card</Link>
        <Link href={`/demo?src=${src}`} className={btnGhostCls}>See the demo</Link>
      </div>
      <div className="mt-10 leading-relaxed">{children}</div>
      <Cta src={src} free={free} />
      <NextSteps links={next} />
      <p className="mt-8 text-xs text-muted">TradeNotes does not provide financial advice and does not promise trading results.{affiliated ? ` ${NOT_AFFILIATED}` : ""}</p>
    </article>
  );
}

export const H2 = "mt-10 text-2xl font-semibold tracking-tight";
export function Bullets({ items }: { items: string[] }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}
