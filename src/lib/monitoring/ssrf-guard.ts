import dns from "dns/promises";
import net from "net";

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

/**
 * Checks whether an IPv4 address falls within private, loopback, link-local, or reserved subnets.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, treat as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud Metadata: 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address falls within private, loopback, link-local, or reserved subnets.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback ::1
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") {
    return true;
  }

  // Unspecified ::
  if (normalized === "::" || normalized === "0000:0000:0000:0000:0000:0000:0000:0000") {
    return true;
  }

  // IPv4-mapped IPv6 ::ffff:x.x.x.x
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // Unique Local Address (fc00::/7) -> starts with fc or fd
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) {
    return true;
  }

  // Link-local unicast (fe80::/10) -> starts with fe8, fe9, fea, feb
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith("ff")) {
    return true;
  }

  return false;
}

/**
 * Validates a resolved IP address against all blocked ranges.
 */
export function isIpBlocked(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return true; // Not a valid IP
}

export interface SSRFValidationResult {
  hostname: string;
  resolvedIp: string;
  ipFamily: 4 | 6;
  parsedUrl: URL;
}

/**
 * Validates a target URL against SSRF vulnerabilities.
 * Resolves DNS and asserts that target IP is a public, non-reserved routable address.
 */
export async function validateSafeUrl(rawUrl: string): Promise<SSRFValidationResult> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new SSRFError(`Invalid URL string: ${rawUrl}`);
  }

  // Only allow http and https
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new SSRFError(`Forbidden protocol '${parsedUrl.protocol}'. Only http: and https: are permitted.`);
  }

  // Disallow user credentials in URL
  if (parsedUrl.username || parsedUrl.password) {
    throw new SSRFError("URLs containing user authentication credentials in userinfo are forbidden.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Disallow common localhost and cloud metadata aliases directly
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "metadata",
    "instance-data",
  ];

  if (blockedHostnames.includes(hostname)) {
    throw new SSRFError(`Access to host '${hostname}' is prohibited.`);
  }

  // If hostname is already an IP, check it directly
  if (net.isIP(hostname)) {
    if (isIpBlocked(hostname)) {
      throw new SSRFError(`Access to internal/private IP address '${hostname}' is strictly prohibited.`);
    }
    const family = (net.isIP(hostname) as 4 | 6);
    return {
      hostname,
      resolvedIp: hostname,
      ipFamily: family,
      parsedUrl,
    };
  }

  // Resolve hostname via DNS
  try {
    const lookup = await dns.lookup(hostname, { all: true });

    if (!lookup || lookup.length === 0) {
      throw new SSRFError(`Failed to resolve DNS for host: ${hostname}`);
    }

    // Every resolved IP address must be safe
    for (const address of lookup) {
      if (isIpBlocked(address.address)) {
        throw new SSRFError(
          `Host '${hostname}' resolved to prohibited address '${address.address}'. Access blocked.`
        );
      }
    }

    const primary = lookup[0];
    return {
      hostname,
      resolvedIp: primary.address,
      ipFamily: primary.family as 4 | 6,
      parsedUrl,
    };
  } catch (err: unknown) {
    if (err instanceof SSRFError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new SSRFError(`DNS resolution failed for '${hostname}': ${msg}`);
  }
}
