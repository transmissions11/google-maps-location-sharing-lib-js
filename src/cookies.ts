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
