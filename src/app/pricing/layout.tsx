import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans — Transparent Synthetic Monitoring",
  description:
    "Flexible plans for solo developers to high-growth engineering teams. Includes a 14-day free Pro trial with 30s checks and multi-channel alerts.",
  openGraph: {
    title: "APIWatch Pricing — Transparent SaaS Plans",
    description:
      "Enterprise synthetic monitoring, 30s checks, SSL expiry alerts, and SLA exports.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
