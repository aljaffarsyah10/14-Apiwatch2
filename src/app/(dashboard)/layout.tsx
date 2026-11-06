import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

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
        <React.Suspense fallback={<div className="h-14 border-b border-border" />}>
          <AppHeader />
        </React.Suspense>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading view...</div>}>
            {children}
          </React.Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
