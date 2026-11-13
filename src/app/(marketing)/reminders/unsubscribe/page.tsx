import Link from "next/link";
import { verifyUnsubscribeToken } from "@/lib/reminders";
import { unsubscribeReminders } from "./actions";
import { btnCls, Card } from "@/components/ui";

export const metadata = { title: "Unsubscribe from review reminders — TradeNotes", robots: { index: false, follow: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const sp = await searchParams;
  const valid = Boolean(sp.t && process.env.BETTER_AUTH_SECRET && verifyUnsubscribeToken(sp.t, process.env.BETTER_AUTH_SECRET));
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <h1 className="text-xl font-semibold">Weekly review reminders</h1>
        {sp.done ? <p className="mt-3 text-sm">Done. You will not get weekly review reminders any more. You can turn them back on in Settings.</p>
          : valid ? (<>
            <p className="mt-3 text-sm text-muted">Stop the weekly review reminder email?</p>
            <form action={unsubscribeReminders} className="mt-4"><input type="hidden" name="t" value={sp.t} /><button className={btnCls}>Unsubscribe</button></form>
          </>)
          : <p className="mt-3 text-sm text-muted">This link is not valid or has expired. You can turn reminders off any time in Settings after signing in.</p>}
        <p className="mt-4 text-sm"><Link href="/login" className="text-accent underline-offset-4 hover:underline">Go to TradeNotes</Link></p>
      </Card>
    </div>
  );
}
