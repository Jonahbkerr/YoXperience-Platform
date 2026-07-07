/**
 * Guard against non-public LLM base URLs.
 *
 * Two problems it solves:
 *  1. UX — a customer entering a localhost/LAN address (http://192.168.x:1234)
 *     gets a clear message instead of a cryptic "fetch failed", because the
 *     cloud worker/gateway can never reach their private network.
 *  2. Security — blocks SSRF: no pointing the gateway at loopback, RFC-1918
 *     private ranges, link-local, or the cloud metadata endpoint
 *     (169.254.169.254).
 *
 * Literal-IP + well-known-hostname checks only (no DNS resolution), which
 * covers the real cases here; a determined DNS-rebind is out of scope.
 */

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true; // malformed → treat as unsafe
  if (a === 0 || a === 127) return true; // this-host / loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique-local fc00::/7
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("::ffff:")) return isPrivateIPv4(h.slice(7)); // IPv4-mapped
  return false;
}

/**
 * Returns a human-readable reason string if the URL is not a reachable public
 * http(s) endpoint, otherwise null.
 */
export function publicUrlProblem(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "That doesn't look like a valid URL.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return "Use an http:// or https:// URL.";
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0"
  ) {
    return `"${host}" is only reachable from your own machine. The cloud engine can't see it — expose your model with a public tunnel (e.g. cloudflared) and use that URL.`;
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    return `${host} is a private/LAN address the cloud engine can't reach. Expose your model with a public tunnel (e.g. cloudflared) and use that https URL.`;
  }
  return null;
}
