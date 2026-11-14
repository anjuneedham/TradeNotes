import Link from "next/link";
import CaptionTool from "@/components/CaptionTool";
import { Card, PageHeader, btnGhostCls } from "@/components/ui";

export const metadata = { title: "Caption tool — HQ" };
export default function Captions() {
  return (
    <>
      <PageHeader title="Caption tool" sub="Burned-in captions: 58 px, lower-middle, ≤24 characters per line, ≤2 lines, highlight the key word in amber (Andrew Builds style)."><Link href="/content" className={btnGhostCls}>← Board</Link></PageHeader>
      <Card><CaptionTool /></Card>
    </>
  );
}
