import { ImageResponse } from "next/og";
import { jamesSvg } from "@/lib/james-art";

export const alt = "TradeNotes: James writes his notes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="420" height="490">${jamesSvg()}</svg>`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#0b0f14", color: "#e6edf3", padding: 70 }}>
        <img alt="" width={420} height={490} src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 60 }}>
          <div style={{ fontSize: 30, color: "#3b82f6", letterSpacing: 4 }}>TRADENOTES</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>James writes his notes.</div>
          <div style={{ fontSize: 34, color: "#8b98a5", marginTop: 20 }}>A short article or story, every day.</div>
        </div>
      </div>
    ),
    size,
  );
}
