import Link from "next/link";
import { James } from "@/components/James";

export const metadata = { title: "Page not found — TradeNotes" };
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <James pose="think" size={120} className="mx-auto text-fg" />
      <h1 className="mt-4 text-2xl font-semibold">James can&apos;t find that page</h1>
      <p className="mt-2 text-muted">It isn&apos;t in his notes. Try the home page or his daily notes.</p>
      <p className="mt-6 flex justify-center gap-4"><Link href="/" className="text-accent">Home</Link><Link href="/notes" className="text-accent">James&apos;s Notes</Link></p>
    </div>
  );
}
