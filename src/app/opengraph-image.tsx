import { ImageResponse } from "next/og";

export const alt = "DM News Network — Breaking News from Pakistan & the World";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card with the 3D emblem baked in, so shared links look intentional. */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #07101f 0%, #0b1b33 48%, #12294a 100%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 420px at 88% 0%, rgba(216,31,42,0.35), transparent 60%), radial-gradient(700px 380px at 8% 100%, rgba(46,86,150,0.45), transparent 62%)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 28, zIndex: 1 }}>
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg,#e9eef5,#7d8ea3 45%,#f4f7fb 60%,#5b6a7d)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
              padding: 8,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 26,
                background: "linear-gradient(140deg,#1b3560,#0B1B33 40%,#050d1a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dce6f4",
                fontSize: 62,
                fontWeight: 800,
                letterSpacing: -2,
                borderBottom: "8px solid #D81F2A",
              }}
            >
              DM
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 54, fontWeight: 800, letterSpacing: -1.5 }}>DM News Network</span>
            <span style={{ fontSize: 24, color: "#ff9aa0", letterSpacing: 6, textTransform: "uppercase", marginTop: 6 }}>
              Independent · Verified · 24/7
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, zIndex: 1 }}>
          <span style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2, maxWidth: 980 }}>
            Breaking news from Pakistan and the world
          </span>
          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.65)" }}>
            Politics · Business · Technology · Sport · Culture · Live video
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.45)" }}>dmnewsnetwork.com</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#D81F2A",
              padding: "10px 20px",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Latest → 
          </span>
        </div>
      </div>
    ),
    size,
  );
}
