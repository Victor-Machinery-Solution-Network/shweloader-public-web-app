import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "ShweLoader — Myanmar's Heavy Equipment Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded default OG image applied to every route without its own. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#15130e",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg,#fdd968,#fbb811)",
            }}
          />
          <div style={{ color: "#f4f1e6", fontSize: 34, fontWeight: 700 }}>
            ShweLoader
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              color: "#fbb811",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Heavy equipment.
          </div>
          <div
            style={{
              color: "#f4f1e6",
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Buy, rent &amp; sell machinery in Myanmar.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#a8a496",
            fontSize: 26,
            fontWeight: 500,
          }}
        >
          Excavators · Wheel loaders · Cranes · Bulldozers · Trucks
        </div>
      </div>
    ),
    { ...size },
  );
}
