/**
 * Sanitizes a cell value to prevent CSV Formula Injection (CWE-1236).
 * Any value beginning with '=', '+', '-', '@', '\t', or '\r'
 * has a single quote prepended so spreadsheet programs treat it strictly as literal text.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check if string begins with dangerous formula trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds a complete CSV file string from headers and row objects.
 */
export function buildSafeCsv(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  const headerLine = headers.map(sanitizeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(","));

  return [headerLine, ...rowLines].join("\r\n");
}
