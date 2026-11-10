import { describe, it, expect } from "vitest";
import { sanitizeCsvCell, buildSafeCsv } from "@/lib/utils/csv";

describe("UI Logic, State Transformations & Interaction Calculations (UI Testing)", () => {
  describe("Status Indicator & Badge Helpers", () => {
    function getStatusBadgeConfig(status: "UP" | "DOWN" | "PAUSED" | "PENDING") {
      switch (status) {
        case "UP":
          return { label: "Operational", tone: "success", colorClass: "text-emerald-400 bg-emerald-500/10" };
        case "DOWN":
          return { label: "Degraded / Down", tone: "danger", colorClass: "text-rose-400 bg-rose-500/10" };
        case "PAUSED":
          return { label: "Paused", tone: "warning", colorClass: "text-amber-400 bg-amber-500/10" };
        case "PENDING":
        default:
          return { label: "Pending", tone: "neutral", colorClass: "text-slate-400 bg-slate-500/10" };
      }
    }

    it("correctly maps operational statuses to UI tokens", () => {
      expect(getStatusBadgeConfig("UP").tone).toBe("success");
      expect(getStatusBadgeConfig("DOWN").tone).toBe("danger");
      expect(getStatusBadgeConfig("PAUSED").tone).toBe("warning");
      expect(getStatusBadgeConfig("PENDING").tone).toBe("neutral");
    });
  });

  describe("Latency Threshold & Color Coding", () => {
    function getLatencyTone(ms: number | null): "fast" | "moderate" | "slow" {
      if (!ms || ms < 200) return "fast";
      if (ms <= 800) return "moderate";
      return "slow";
    }

    it("correctly identifies performance brackets", () => {
      expect(getLatencyTone(45)).toBe("fast");
      expect(getLatencyTone(199)).toBe("fast");
      expect(getLatencyTone(200)).toBe("moderate");
      expect(getLatencyTone(750)).toBe("moderate");
      expect(getLatencyTone(801)).toBe("slow");
      expect(getLatencyTone(2500)).toBe("slow");
    });
  });

  describe("Pagination Calculations & Boundary Safety", () => {
    function calculatePagination(totalItems: number, requestedPage: number, pageSize: number) {
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const safeCurrentPage = Math.min(Math.max(1, requestedPage), totalPages);
      const startIndex = (safeCurrentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);

      return {
        totalPages,
        safeCurrentPage,
        startIndex,
        endIndex,
      };
    }

    it("computes accurate slices for first, middle, and last page", () => {
      // 55 items with pageSize 10 = 6 pages
      const page1 = calculatePagination(55, 1, 10);
      expect(page1.totalPages).toBe(6);
      expect(page1.safeCurrentPage).toBe(1);
      expect(page1.startIndex).toBe(0);
      expect(page1.endIndex).toBe(10);

      const page6 = calculatePagination(55, 6, 10);
      expect(page6.safeCurrentPage).toBe(6);
      expect(page6.startIndex).toBe(50);
      expect(page6.endIndex).toBe(55);
    });

    it("safely clamps out-of-bounds page requests (negative or past last page)", () => {
      const negative = calculatePagination(20, -5, 10);
      expect(negative.safeCurrentPage).toBe(1);

      const excessive = calculatePagination(20, 999, 10);
      expect(excessive.safeCurrentPage).toBe(2);
    });

    it("handles zero total items without crashing or dividing by zero", () => {
      const empty = calculatePagination(0, 1, 10);
      expect(empty.totalPages).toBe(1);
      expect(empty.safeCurrentPage).toBe(1);
      expect(empty.startIndex).toBe(0);
      expect(empty.endIndex).toBe(0);
    });
  });

  describe("Interactive Search & Multi-Filter Logic", () => {
    const items = [
      { id: "1", name: "Users Microservice", url: "https://users.api.test", status: "UP", method: "GET" },
      { id: "2", name: "Payments Gateway", url: "https://pay.api.test", status: "DOWN", method: "POST" },
      { id: "3", name: "Notification Webhook", url: "https://notify.api.test", status: "PAUSED", method: "POST" },
    ];

    it("filters accurately across name, url, method and status", () => {
      const filterItems = (search: string, status: string, method: string) => {
        return items.filter((item) => {
          const matchesSearch =
            !search ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.url.toLowerCase().includes(search.toLowerCase());
          const matchesStatus = status === "ALL" || item.status === status;
          const matchesMethod = method === "ALL" || item.method === method;
          return matchesSearch && matchesStatus && matchesMethod;
        });
      };

      expect(filterItems("microservice", "ALL", "ALL").length).toBe(1);
      expect(filterItems("", "DOWN", "ALL").length).toBe(1);
      expect(filterItems("", "ALL", "POST").length).toBe(2);
      expect(filterItems("pay", "DOWN", "POST").length).toBe(1);
      expect(filterItems("nonexistent", "ALL", "ALL").length).toBe(0);
    });
  });

  describe("Safe CSV Export Sanitization (UI / Data Export)", () => {
    it("sanitizes fields starting with =, +, -, @, tab, or carriage return", () => {
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe('"\'\+cmd|\' /C calc\'!A0"');
      expect(sanitizeCsvCell("-2+3*[1]")).toBe('"\'\-2+3*[1]"');
      expect(sanitizeCsvCell("@malicious_link")).toBe('"\'@malicious_link"');
    });

    it("builds safe CSV documents with headers and escaped rows", () => {
      const csv = buildSafeCsv(
        ["Name", "Formula", "Normal"],
        [["Test API", "=1+1", "Clean Value"]]
      );
      expect(csv).toContain('"Name","Formula","Normal"');
      expect(csv).toContain('"Test API"');
      expect(csv).toContain('"\'=1+1"');
      expect(csv).toContain('"Clean Value"');
    });
  });
});
