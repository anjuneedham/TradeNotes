import { ImageResponse } from "next/og";
import { jamesSvg } from "@/lib/james-art";
import { formatDay, kindLabel, noteBySlug } from "@/lib/newsletter";

export const alt = "A note from James";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const n = noteBySlug((await params).slug);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="300" height="350">${jamesSvg()}</svg>`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#0b0f14", color: "#e6edf3", padding: 60 }}>
        <img alt="" width={300} height={350} src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 50, flex: 1 }}>
          <div style={{ fontSize: 28, color: "#3b82f6", letterSpacing: 3 }}>{n ? `${kindLabel(n.kind).toUpperCase()} · ${formatDay(n.date).toUpperCase()}` : "JAMES'S DAILY NOTES"}</div>
          <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.12, marginTop: 14 }}>{n?.title ?? "James's Daily Notes"}</div>
          <div style={{ fontSize: 28, color: "#8b98a5", marginTop: 22 }}>James&apos;s Daily Notes · Not financial advice</div>
        </div>
      </div>
    ),
    size,
  );
}
