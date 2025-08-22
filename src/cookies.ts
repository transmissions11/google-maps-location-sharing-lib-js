import setCookieParser from "set-cookie-parser";

export const VALID_COOKIE_NAMES = new Set(["__Secure-1PSID", "__Secure-3PSID"]);

export function parseNetscapeCookieString(contents: string): Map<string, string> {
  const lines = contents.split(/\r?\n/);
  const cookies = new Map<string, string>();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 7) continue;
    const [_domain, _flagStr, _path, _secureStr, _expiryStr, name, value] = parts;
    cookies.set(name, value);
  }
  return cookies;
}

export function cookiesToHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function hasValidCookie(cookies: Map<string, string>): boolean {
  const names = new Set(cookies.keys());
  for (const valid of VALID_COOKIE_NAMES) {
    if (names.has(valid)) return true;
  }
  return false;
}

export function applySetCookiesToMap(
  cookies: Map<string, string>,
  setCookieHeaderRaw: string | string[] | undefined
): void {
  if (!setCookieHeaderRaw) return;
  const parsed = setCookieParser.parse(setCookieHeaderRaw, { map: true });
  for (const cookie of Object.values(parsed)) {
    const isExpired =
      (typeof cookie.maxAge === "number" && cookie.maxAge <= 0) ||
      (cookie.expires instanceof Date && cookie.expires.getTime() <= Date.now());
    if (isExpired) cookies.delete(cookie.name);
    else cookies.set(cookie.name, cookie.value);
  }
}
