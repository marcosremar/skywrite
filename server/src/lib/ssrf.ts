import { lookup } from "dns/promises";
import { isIP } from "net";

function ipBlocked(ip: string): boolean {
  if (isIP(ip) === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0 || p[0] === 127 || p[0] === 10) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(lower)) return true;
  if (lower.startsWith("::ffff:")) {
    const rest = lower.slice(7);
    if (isIP(rest) === 4) return ipBlocked(rest);
    const hex = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return ipBlocked(`${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`);
    }
  }
  return false;
}

export async function resolvePublicUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  try {
    if (isIP(host)) return ipBlocked(host) ? null : url;
    const addrs = await Promise.race([
      lookup(host, { all: true }),
      new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new Error("dns timeout")), 5000);
        t.unref?.();
      }),
    ]);
    if (addrs.length === 0 || addrs.some((a) => ipBlocked(a.address))) return null;
    return url;
  } catch {
    return null;
  }
}
