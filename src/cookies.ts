import type { CookieEntry } from "./types";

export const VALID_COOKIE_NAMES = new Set(["__Secure-1PSID", "__Secure-3PSID"]);

export function parseNetscapeCookieFile(contents: string): CookieEntry[] {
  const lines = contents.split(/\r?\n/);
  const entries: CookieEntry[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 7) continue;
    const [domain, flagStr, path, secureStr, expiryStr, name, value] = parts;
    const entry: CookieEntry = {
      domain,
      flag: flagStr.toLowerCase() === "true" || flagStr === "TRUE" || flagStr === "1",
      path,
      secure: secureStr.toLowerCase() === "true" || secureStr === "TRUE" || secureStr === "1",
      expiry: Number(expiryStr) || 0,
      name,
      value,
    };
    entries.push(entry);
  }
  return entries;
}

export function cookiesToHeader(entries: CookieEntry[]): string {
  return entries.map((e) => `${e.name}=${e.value}`).join("; ");
}

export function hasValidCookie(entries: CookieEntry[]): boolean {
  const names = new Set(entries.map((e) => e.name));
  for (const valid of VALID_COOKIE_NAMES) {
    if (names.has(valid)) return true;
  }
  return false;
}

export function cookieEntriesToMap(entries: CookieEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) map.set(entry.name, entry.value);
  return map;
}

export function cookieMapToHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function splitCombinedSetCookieHeader(headerValue: string): string[] {
  const result: string[] = [];
  let startIndex = 0;
  let inExpires = false;
  for (let i = 0; i < headerValue.length; i++) {
    const char = headerValue[i];
    if (!inExpires && headerValue.slice(i, i + 8).toLowerCase() === "expires=") {
      inExpires = true;
      i += 7; // skip over "expires="
      continue;
    }
    if (inExpires && char === ";") {
      inExpires = false;
      continue;
    }
    if (!inExpires && char === ",") {
      const part = headerValue.slice(startIndex, i).trim();
      if (part) result.push(part);
      startIndex = i + 1;
    }
  }
  const last = headerValue.slice(startIndex).trim();
  if (last) result.push(last);
  return result;
}

function toSetCookieArray(setCookieRaw: string | string[] | undefined): string[] {
  if (!setCookieRaw) return [];
  if (Array.isArray(setCookieRaw)) return setCookieRaw;
  return splitCombinedSetCookieHeader(setCookieRaw);
}

export function applySetCookiesToMap(
  cookies: Map<string, string>,
  setCookieRaw: string | string[] | undefined
): void {
  const setCookies = toSetCookieArray(setCookieRaw);
  for (const sc of setCookies) {
    const semi = sc.indexOf(";");
    const first = semi === -1 ? sc : sc.slice(0, semi);
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) cookies.set(name, value);
  }
}
