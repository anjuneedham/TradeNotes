import Link from "next/link";
import { James } from "@/components/James";
import { unsubscribeAction } from "../actions";
import { btnCls } from "@/components/ui";

export const metadata = { title: "Unsubscribe — TradeNotes" };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const { token = "", done } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <James pose="think" size={110} className="mx-auto text-fg" />
      <h1 className="mt-4 text-2xl font-semibold">Unsubscribe from James&apos;s notes?</h1>
      <form action={unsubscribeAction} className="mt-6">
        {done ? <p className="text-muted">Done. No more emails from James. You can read the notes on the site any time.</p> : (<><input type="hidden" name="token" value={token} /><button className={btnCls}>Yes, unsubscribe me</button></>)}
      </form>
      <p className="mt-6"><Link href="/notes" className="text-accent">Back to the notes</Link></p>
    </div>
  );
}
