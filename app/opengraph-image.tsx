import { ImageResponse } from "next/og";

export const alt = "Mandate: your AI can shop. It can't cross the line.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when the site link is shared (Devpost, X, Slack, LinkedIn). */
export default function OpenGraphImage() {
  const pill = (text: string, bg: string, fg: string) => (
    <div style={{ display: "flex", padding: "6px 16px", borderRadius: 999, background: bg, color: fg, fontSize: 24, fontWeight: 600 }}>{text}</div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#f6f7f9", color: "#0b1220", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 32 }}>
            <svg width="30" height="30" viewBox="0 0 28 28">
              <path d="M7 14.5l4.5 4.5 9.5-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          Mandate
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>Your AI can shop.</div>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, color: "#1d4ed8" }}>It can&rsquo;t cross the line.</div>
          <div style={{ marginTop: 20, fontSize: 30, color: "#4a5568" }}>Signed spending rules every AI agent must obey, enforced before PayPal is paid.</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {pill("Paid", "#e3f4ea", "#04693f")}
          {pill("Asks you", "#fdf0dc", "#8a4b00")}
          {pill("Blocked", "#fbe7e7", "#a61b1b")}
          <div style={{ display: "flex", marginLeft: "auto", alignItems: "center", fontSize: 24, color: "#4a5568" }}>PayPal Agent Toolkit · AP2 v0.2 · MCP</div>
        </div>
      </div>
    ),
    size,
  );
}
