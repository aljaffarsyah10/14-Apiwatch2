import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Status Board & Operational Health",
  description:
    "Real-time operational health, uptime percentages, and response latencies for all monitored services.",
  openGraph: {
    title: "APIWatch System Status — Live Operational Telemetry",
    description:
      "Real-time availability, incident history, and 24h performance metrics.",
  },
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
