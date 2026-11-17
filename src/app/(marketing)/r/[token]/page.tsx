import { notFound } from "next/navigation";
import { loadSharedReport } from "@/lib/share-data";
import { ShareReportView } from "@/components/ShareReportView";

export const dynamic = "force-dynamic";
/** Never indexed, never cached, never leaks the address to other sites. Revoked, expired and unknown links all look the same: 404. */
export const metadata = {
  title: "Shared trading report — TradeNotes",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
  referrer: "no-referrer" as const,
};

export default async function SharedReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let report = null;
  try { report = await loadSharedReport(token); } catch (e) { console.error("shared report failed", e instanceof Error ? e.message : e); }
  if (!report) notFound();
  return <ShareReportView r={report} />;
}
