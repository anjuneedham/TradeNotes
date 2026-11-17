import Link from "next/link";
import { James, type JamesPose } from "./James";
import { linkCls } from "./ui";

/** James's sign-off strip for the end of a page: one line in his voice and a way into the daily notes. */
export function JamesNote({ line = "Everything I know about trading, I wrote down first.", pose = "wave" }: { line?: string; pose?: JamesPose }) {
  return (
    <aside aria-label="A note from James" className="mt-10 flex items-center gap-4 rounded-lg border border-border bg-panel px-5 py-4">
      <James pose={pose} size={64} className="shrink-0 text-fg" />
      <div className="min-w-0 text-sm">
        <p className="font-medium">{line} <span className="font-normal text-muted">— James</span></p>
        <p className="mt-1 text-muted">A short article or story from him every day. <Link href="/notes" className={linkCls}>Read James&apos;s notes</Link> or <Link href="/notes#subscribe" className={linkCls}>get them by email</Link>.</p>
      </div>
    </aside>
  );
}
