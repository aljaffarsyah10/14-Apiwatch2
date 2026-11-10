"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { CommandPalette } from "@/components/layout/command-palette";

export function AppHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [commandOpen, setCommandOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb className="min-w-0 text-sm">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/dashboard" />}>
                  App
                </BreadcrumbLink>
              </BreadcrumbItem>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join("/")}`;
                const formattedName =
                  segment.charAt(0).toUpperCase() + segment.slice(1);

                return (
                  <React.Fragment key={segment}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{formattedName}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink render={<Link href={href} />}>
                          {formattedName}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search / Command Palette Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="h-8 gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Quick Search...</span>
            <kbd className="inline-flex h-4.5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              Ctrl K
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCommandOpen(true)}
            className="h-8 w-8 sm:hidden text-muted-foreground"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Badge variant="outline" className="hidden lg:inline-flex border-success/25 bg-success/10 text-success">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
            System Operational
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
