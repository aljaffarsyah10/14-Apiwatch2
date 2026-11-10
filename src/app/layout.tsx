import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Inter: a highly legible UI typeface (tall x-height, open apertures)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "APIWatch — Automated API Monitoring & Outage Alerting",
    template: "%s | APIWatch",
  },
  description:
    "Real-time HTTP/HTTPS API monitoring, multi-layer SSRF defense, 24h uptime reporting, and instant incident alerting for engineering teams.",
  keywords: [
    "API monitoring",
    "uptime monitor",
    "health check",
    "incident alert",
    "latency tracker",
    "SLA reporting",
  ],
  authors: [{ name: "APIWatch Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://apiwatch.io",
    title: "APIWatch — Automated API Monitoring & Outage Alerting",
    description:
      "Real-time HTTP/HTTPS API monitoring with multi-layer SSRF defense and automated email alerts.",
    siteName: "APIWatch",
  },
  twitter: {
    card: "summary_large_image",
    title: "APIWatch — Automated API Monitoring",
    description:
      "Real-time HTTP/HTTPS API monitoring, uptime alerting, and performance observability.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={150}>
            {children}
            <Toaster position="bottom-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
