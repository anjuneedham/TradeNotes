import { ImageResponse } from "next/og";

export const alt = "TradeNotes: trading journal and performance analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share-card image for links to any page without its own image (Open Graph and Twitter). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", background: "#0d0f11", color: "#f3f1ea" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, border: "4px solid #f3f1ea", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#3fc2a0", fontSize: 40 }}>↗</div>
          <div style={{ fontSize: 56, fontWeight: 700 }}>TradeNotes</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>Know your trades. Understand your patterns.</div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#9aa6a1" }}>Trading journal &amp; performance analytics · Free plan</div>
      </div>
    ),
    { ...size },
  );
}
