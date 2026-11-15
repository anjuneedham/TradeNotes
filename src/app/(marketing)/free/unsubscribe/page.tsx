import { redirect } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { unsubscribeLead } from "@/lib/leads";
import { btnCls } from "@/components/ui";

export const metadata = pageMeta({ title: "Unsubscribe — TradeNotes", description: "Stop TradeNotes tips emails.", path: "/free/unsubscribe", index: false });

async function unsubscribe(form: FormData) {
  "use server";
  const ok = await unsubscribeLead(String(form.get("t") ?? ""));
  redirect(ok ? "/free/unsubscribe?done=1" : "/free/unsubscribe?error=1");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const { t, done, error } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Unsubscribe from TradeNotes tips</h1>
      {done ? <p className="mt-4 text-muted">Done. You won&apos;t get any more tips emails from us.</p>
        : error ? <p className="mt-4 text-loss">That link didn&apos;t work. Reply to any of our emails and we&apos;ll remove you by hand.</p>
        : <form action={unsubscribe} className="mt-6"><input type="hidden" name="t" value={t ?? ""} /><button className={btnCls}>Unsubscribe</button></form>}
    </div>
  );
}
