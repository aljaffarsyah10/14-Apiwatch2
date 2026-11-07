"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Layers,
  AlertTriangle,
  FileText,
  Settings,
  PlusCircle,
  ExternalLink,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getMe, logoutUser, UserSession } from "@/lib/api/auth";
import { toast } from "sonner";

const mainNavItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: Activity,
  },
  {
    title: "Endpoints",
    url: "/endpoints",
    icon: Layers,
  },
  {
    title: "Incidents",
    url: "/incidents",
    icon: AlertTriangle,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<UserSession | null>(null);

  React.useEffect(() => {
    getMe()
      .then((res) => {
        if (res?.user) setUser(res.user);
      })
      .catch(() => {
        // quiet in dev
      });
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const displayName = user?.name || "Admin User";
  const displayEmail = user?.email || "admin@apiwatch.local";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AW";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80">
      <SidebarHeader className="border-b border-border/50 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold tracking-tight text-sm">APIWatch</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                  Monitoring
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/endpoints/new" />}
                  tooltip="Add Endpoint"
                >
                  <PlusCircle className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">New Endpoint</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/" target="_blank" />}
                  tooltip="Public Status"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Public Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-1 w-full">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight truncate">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-[10px] text-muted-foreground">{displayEmail}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
