"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Activity,
  Layers,
  AlertTriangle,
  FileText,
  Settings,
  PlusCircle,
  Play,
  Sun,
  Moon,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getEndpoints, EndpointItem, checkAllEndpoints } from "@/lib/api/endpoints";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaletteAction {
  id: string;
  group: "Endpoints" | "Navigation" | "Quick Actions";
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  perform: () => void;
}

function CommandPaletteContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = React.useState("");
  const [endpoints, setEndpoints] = React.useState<EndpointItem[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = React.useState(true);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isExecutingAction, setIsExecutingAction] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    getEndpoints()
      .then((data) => {
        if (!ignore) setEndpoints(data);
      })
      .catch(() => {
        if (!ignore) setEndpoints([]);
      })
      .finally(() => {
        if (!ignore) setIsLoadingEndpoints(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleRunAllChecks = React.useCallback(async () => {
    try {
      setIsExecutingAction(true);
      toast.info("Triggering batch health checks across all endpoints...");
      const res = await checkAllEndpoints();
      toast.success(res.message || "All endpoints checked successfully!");
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to execute batch checks");
    } finally {
      setIsExecutingAction(false);
    }
  }, [onClose, router]);

  const handleExportCsv = React.useCallback(() => {
    onClose();
    toast.info("Downloading 30-day SLA report...");
    const link = document.createElement("a");
    link.href = "/api/reports/export?period=30d";
    link.setAttribute("download", "apiwatch-report-30d.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [onClose]);

  const actions: PaletteAction[] = React.useMemo(() => {
    const list: PaletteAction[] = [];

    // Filter endpoints
    const filteredEndpoints = endpoints.filter(
      (ep) =>
        ep.name.toLowerCase().includes(query.toLowerCase()) ||
        ep.url.toLowerCase().includes(query.toLowerCase())
    );

    filteredEndpoints.slice(0, 5).forEach((ep) => {
      list.push({
        id: `ep-${ep.id}`,
        group: "Endpoints",
        title: ep.name,
        subtitle: `${ep.method} ${ep.url}`,
        icon: Activity,
        badge: <StatusBadge status={ep.status} showIcon={false} className="text-[11px] py-0 px-1.5" />,
        perform: () => {
          onClose();
          router.push(`/endpoints/${ep.id}`);
        },
      });
    });

    // Navigation items
    const navItems = [
      { title: "Dashboard Overview", url: "/dashboard", icon: Activity, subtitle: "Uptime SLA, metrics, & recent outages" },
      { title: "Monitored Endpoints", url: "/endpoints", icon: Layers, subtitle: "All configured HTTP/HTTPS endpoints" },
      { title: "Incident History", url: "/incidents", icon: AlertTriangle, subtitle: "Service outage logs & root causes" },
      { title: "SLA & Uptime Reports", url: "/reports", icon: FileText, subtitle: "Availability percentiles & compliance" },
      { title: "Workspace Settings", url: "/settings", icon: Settings, subtitle: "Notifications, team, & preferences" },
      { title: "Public Status Page", url: "/status", icon: ExternalLink, subtitle: "Public-facing system status board" },
    ];

    navItems
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.subtitle.toLowerCase().includes(query.toLowerCase()))
      .forEach((item) => {
        list.push({
          id: `nav-${item.url}`,
          group: "Navigation",
          title: item.title,
          subtitle: item.subtitle,
          icon: item.icon,
          perform: () => {
            onClose();
            router.push(item.url);
          },
        });
      });

    // Quick Actions
    const quickActions = [
      {
        id: "action-new-endpoint",
        title: "Create New Endpoint",
        subtitle: "Add an HTTP service to probe",
        icon: PlusCircle,
        perform: () => {
          onClose();
          router.push("/endpoints/new");
        },
      },
      {
        id: "action-run-all",
        title: "Run Health Check on All Endpoints",
        subtitle: "Execute immediate probe on all targets",
        icon: Play,
        perform: handleRunAllChecks,
      },
      {
        id: "action-export-csv",
        title: "Export SLA Report (CSV)",
        subtitle: "Download sanitized uptime report",
        icon: Download,
        perform: handleExportCsv,
      },
      {
        id: "action-toggle-theme",
        title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        subtitle: "Toggle application appearance",
        icon: theme === "dark" ? Sun : Moon,
        perform: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          onClose();
        },
      },
    ];

    quickActions
      .filter((action) => action.title.toLowerCase().includes(query.toLowerCase()) || action.subtitle.toLowerCase().includes(query.toLowerCase()))
      .forEach((action) => {
        list.push({
          id: action.id,
          group: "Quick Actions",
          title: action.title,
          subtitle: action.subtitle,
          icon: action.icon,
          perform: action.perform,
        });
      });

    return list;
  }, [endpoints, query, theme, onClose, router, handleRunAllChecks, handleExportCsv, setTheme]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (actions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (actions.length || 1)) % (actions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (actions[selectedIndex]) {
        actions[selectedIndex].perform();
      }
    }
  };

  return (
    <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden shadow-2xl border-border bg-popover">
      <DialogTitle className="sr-only">Quick Command & Navigation Palette</DialogTitle>
      {/* Search Input Bar */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Type a command, page name, or endpoint URL..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground outline-none font-medium"
          autoFocus
        />
        {isExecutingAction ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        ) : (
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        )}
      </div>

      {/* Results List */}
      <div className="max-h-96 overflow-y-auto p-2 space-y-1">
        {isLoadingEndpoints && endpoints.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Loading endpoints...
          </div>
        )}

        {actions.length === 0 && (
          <div className="p-8 text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">No matching results found</p>
            <p className="text-xs text-muted-foreground">
              Try searching for a different keyword or command.
            </p>
          </div>
        )}

        {actions.map((action, index) => {
          const isSelected = index === selectedIndex;
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              type="button"
              onClick={action.perform}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                isSelected
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {action.title}
                  </p>
                  {action.subtitle && (
                    <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                      {action.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {action.badge}
                <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
                  {action.group}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer shortcuts helper */}
      <div className="flex items-center justify-between border-t border-border/80 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↑</kbd>
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            Select
          </span>
        </div>
        <span>APIWatch Command Center</span>
      </div>
    </DialogContent>
  );
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CommandPaletteContent onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}
