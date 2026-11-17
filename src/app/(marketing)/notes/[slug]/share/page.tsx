import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyBlock } from "@/components/CopyBlock";
import { James } from "@/components/James";
import { noteBySlug } from "@/lib/newsletter";
import { socialPosts } from "@/lib/social";

export const metadata = { title: "Share this note — James's Daily Notes", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Share({ params }: { params: Promise<{ slug: string }> }) {
  const note = noteBySlug((await params).slug);
  if (!note) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <James pose="wave" size={90} className="text-fg" />
      <h1 className="mt-3 text-2xl font-semibold">Share: {note.title}</h1>
      <p className="mt-1 text-sm text-muted">Ready-made posts in James&apos;s voice. Read, edit if you like, then post them yourself. Nothing is posted automatically.</p>
      <div className="mt-6 space-y-4">{socialPosts(note).map((p) => <CopyBlock key={p.platform} label={p.label} text={p.text} limit={p.limit} />)}</div>
      <p className="mt-6"><Link href={`/notes/${note.slug}`} className="text-accent">← Back to the note</Link></p>
    </div>
  );
}
