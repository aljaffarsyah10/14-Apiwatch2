import { ImageResponse } from "next/og";

export const alt = "APIWatch — Automated API Monitoring & Outage Alerting";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fafafa",
        }}
      >
        {/* Brand header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "30px",
              fontWeight: "bold",
            }}
          >
            ⚡
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-0.04em" }}>
              APIWatch
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#60a5fa",
                background: "rgba(37, 99, 235, 0.2)",
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(59, 130, 246, 0.4)",
              }}
            >
              v2.0 Production
            </span>
          </div>
        </div>

        {/* Hero headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "58px",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.04em",
              maxWidth: "960px",
              color: "#f8fafc",
            }}
          >
            Automated API Monitoring & Instant Outage Alerting
          </div>
          <div
            style={{
              fontSize: "24px",
              lineHeight: 1.4,
              color: "#94a3b8",
              maxWidth: "880px",
            }}
          >
            Real-time HTTP/HTTPS telemetry, multi-layer SSRF defense, 24h SLA reports, and automated multi-channel notifications for high-velocity teams.
          </div>
        </div>

        {/* Value pills footer */}
        <div style={{ display: "flex", gap: "24px", fontSize: "16px", color: "#64748b" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
            30s Probe Intervals
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
            Zero Cloud Egress SSRF Guard
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6" }} />
            Prometheus Metrics & Health Checks
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ec4899" }} />
            Public SLA Status Pages
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
