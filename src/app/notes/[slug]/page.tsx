import Link from "next/link";
import { notFound } from "next/navigation";
import { James } from "@/components/James";
import { SubscribeForm } from "@/components/SubscribeForm";
import { DISCLAIMER, formatDay, kindLabel, noteBySlug, publishedNotes } from "@/lib/newsletter";
import { JAMES } from "@/lib/james";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const n = noteBySlug((await params).slug);
  return n ? { title: `${n.title} — James's Daily Notes`, description: n.summary } : { title: "Note not found" };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = noteBySlug(slug);
  if (!note) notFound();
  const all = publishedNotes();
  const i = all.findIndex((n) => n.slug === slug);
  const newer = all[i - 1], older = all[i + 1];
  return (
    <article className="mx-auto max-w-2xl px-4 py-14">
      <p className="text-xs uppercase tracking-widest text-accent"><time dateTime={note.date}>{formatDay(note.date)}</time> · {kindLabel(note.kind)}</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">{note.title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed">
        {note.body.map((p, k) => <p key={k}>{p}</p>)}
      </div>
      <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
        <James pose="wave" size={70} className="shrink-0 text-fg" />
        <p className="text-sm text-muted">{JAMES.signOff}</p>
      </div>
      <section className="mt-8 rounded-lg border border-border bg-panel p-6">
        <h2 className="font-semibold">Want tomorrow&apos;s page?</h2>
        <div className="mt-3"><SubscribeForm source="note" /></div>
      </section>
      <nav className="mt-8 flex justify-between text-sm">
        {older ? <Link href={`/notes/${older.slug}`} className="text-accent">← {older.title}</Link> : <span />}
        {newer ? <Link href={`/notes/${newer.slug}`} className="text-accent">{newer.title} →</Link> : <span />}
      </nav>
      <p className="mt-8 text-xs text-muted">{DISCLAIMER}</p>
    </article>
  );
}
