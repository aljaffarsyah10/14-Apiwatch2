import * as React from "react";
import type { Metadata } from "next";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | APIWatch Workspace",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <React.Suspense fallback={<div className="w-64 border-r border-border" />}>
        <AppSidebar />
      </React.Suspense>
      <SidebarInset className="flex flex-col min-h-screen bg-background">
        <React.Suspense fallback={<div className="h-16 border-b border-border" />}>
          <AppHeader />
        </React.Suspense>
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 space-y-8">
          <OnboardingProvider>
            <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading view...</div>}>
              {children}
            </React.Suspense>
          </OnboardingProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
