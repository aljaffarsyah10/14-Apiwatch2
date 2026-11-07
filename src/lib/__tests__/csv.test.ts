import { describe, it, expect } from "vitest";
import { sanitizeCsvCell, buildSafeCsv } from "../utils/csv";

describe("Safe CSV Sanitization (CWE-1236 Formula Injection Prevention)", () => {
  it("should prepend single quote when string starts with dangerous formula symbols", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe(`"'=SUM(A1:A10)"`);
    expect(sanitizeCsvCell("+12345")).toBe(`"'+12345"`);
    expect(sanitizeCsvCell("-100")).toBe(`"'-100"`);
    expect(sanitizeCsvCell("@SUM")).toBe(`"'@SUM"`);
    expect(sanitizeCsvCell("\tTAB_INJECT")).toBe(`"'\tTAB_INJECT"`);
  });

  it("should escape existing double quotes by doubling them", () => {
    expect(sanitizeCsvCell('Hello "World"')).toBe(`"Hello ""World"""`);
  });

  it("should handle null and undefined safely", () => {
    expect(sanitizeCsvCell(null)).toBe(`""`);
    expect(sanitizeCsvCell(undefined)).toBe(`""`);
  });

  it("should correctly serialize safe alphanumeric content", () => {
    expect(sanitizeCsvCell("APIWatch Service")).toBe(`"APIWatch Service"`);
    expect(sanitizeCsvCell("https://api.example.com/health")).toBe(
      `"https://api.example.com/health"`
    );
  });

  it("should generate a complete multi-line CSV with proper escaping", () => {
    const headers = ["Service", "URL", "Status", "Latency"];
    const rows = [
      ["Auth Service", "https://api.test/auth", "UP", 45],
      ["=DANGEROUS()", "https://api.test/calc", "DOWN", 0],
    ];

    const csv = buildSafeCsv(headers, rows);
    expect(csv).toContain(`"Service","URL","Status","Latency"`);
    expect(csv).toContain(`"'=DANGEROUS()"`);
  });
});
