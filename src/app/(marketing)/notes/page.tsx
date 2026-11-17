import Link from "next/link";
import { James } from "@/components/James";
import { SubscribeForm } from "@/components/SubscribeForm";
import { DISCLAIMER, formatDay, kindLabel, publishedNotes } from "@/lib/newsletter";
import { JAMES } from "@/lib/james";

export const metadata = { title: "James's Daily Notes — TradeNotes", description: "One short article or story from James, every day. Subscribe to get it by email." };
export const dynamic = "force-dynamic"; // "today" decides which notes are visible

export default function Notes() {
  const notes = publishedNotes();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <James pose="write" size={110} className="shrink-0 text-fg" />
        <div>
          <h1 className="text-4xl font-semibold">{JAMES.newsletterName}</h1>
          <p className="mt-2 text-muted">{JAMES.bio}</p>
        </div>
      </div>
      <section className="mt-8 rounded-lg border border-border bg-panel p-6">
        <h2 className="font-semibold">Get each page in your inbox</h2>
        <p className="mb-4 mt-1 text-sm text-muted">A new note every day: articles on how trading numbers work, and made-up story times about the habits behind them.</p>
        <SubscribeForm source="notes" />
      </section>
      <ol className="mt-10 space-y-4">
        {notes.map((n) => (
          <li key={n.slug}>
            <Link href={`/notes/${n.slug}`} className="block rounded-lg border border-border bg-panel p-5 hover:border-accent">
              <p className="text-xs uppercase tracking-widest text-accent"><time dateTime={n.date}>{formatDay(n.date)}</time> · {kindLabel(n.kind)}</p>
              <h2 className="mt-1 text-lg font-semibold">{n.title}</h2>
              <p className="mt-1 text-sm text-muted">{n.summary}</p>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-xs text-muted">{DISCLAIMER}</p>
    </div>
  );
}
