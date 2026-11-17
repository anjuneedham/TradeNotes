import Link from "next/link";
import { James } from "@/components/James";
import { confirm } from "@/lib/subscribers";
import { Notice } from "@/components/ui";

export const metadata = { title: "Confirm subscription — TradeNotes" };
export const dynamic = "force-dynamic";

export default async function Confirm({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const ok = await confirm(String((await searchParams).token ?? ""));
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <James pose={ok ? "wave" : "think"} size={110} className="mx-auto text-fg" />
      {ok ? <Notice kind="ok">You&apos;re in. James&apos;s next note lands in your inbox on its day.</Notice> : <Notice kind="error">That confirmation link isn&apos;t valid. Subscribe again from the notes page to get a fresh one.</Notice>}
      <p className="mt-6"><Link href="/notes" className="text-accent">Read the notes →</Link></p>
    </div>
  );
}
