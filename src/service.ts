import { InvalidCookieFile, InvalidCookies, InvalidData } from './errors';
import { Person } from './person';
import { CookieEntry } from './types';
import { request } from 'undici';
import { readFile } from 'node:fs/promises';

const STATE_CACHING_MS = 30_000;
const VALID_COOKIE_NAMES = new Set(['__Secure-1PSID', '__Secure-3PSID']);

function parseNetscapeCookieFile(contents: string): CookieEntry[] {
  const lines = contents.split(/\r?\n/);
  const entries: CookieEntry[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 7) continue;
    const [domain, flagStr, path, secureStr, expiryStr, name, value] = parts;
    const entry: CookieEntry = {
      domain,
      flag: flagStr.toLowerCase() === 'true' || flagStr === 'TRUE' || flagStr === '1',
      path,
      secure: secureStr.toLowerCase() === 'true' || secureStr === 'TRUE' || secureStr === '1',
      expiry: Number(expiryStr) || 0,
      name,
      value,
    };
    entries.push(entry);
  }
  return entries;
}

function cookiesToHeader(entries: CookieEntry[]): string {
  return entries.map(e => `${e.name}=${e.value}`).join('; ');
}

function hasValidCookie(entries: CookieEntry[]): boolean {
  const names = new Set(entries.map(e => e.name));
  for (const valid of VALID_COOKIE_NAMES) {
    if (names.has(valid)) return true;
  }
  return false;
}

async function getServerResponse(cookieHeader: string) {
  const url = 'https://www.google.com/maps/rpc/locationsharing/read';
  const params = new URLSearchParams({
    authuser: '2',
    hl: 'en',
    gl: 'us',
    pb: '!1m7!8m6!1m3!1i14!2i8413!3i5385!2i6!3x4095!2m3!1e0!2sm!3i407105169!3m7!2sen!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e1!5m4!1e4!8m2!1e0!1e1!6m9!1e12!2i2!26m1!4b1!30m1!1f1.3953487873077393!39b1!44e1!50e0!23i4111425',
  });
  const res = await request(`${url}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'cookie': cookieHeader,
      'user-agent': 'Mozilla/5.0 (compatible; locationsharinglibjs/0.1; +https://example.invalid)',
      'accept': '*/*',
    },
  });
  const text = await res.body.text();
  return { status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text };
}

function parseLocationData(text: string): any {
  try {
    // The Python client splits on first single quote then parses JSON
    const jsonStr = text.split("'", 2)[1];
    const data = JSON.parse(jsonStr);
    return data;
  } catch {
    throw new InvalidData(`Received invalid data: ${text}, cannot parse properly.`);
  }
}

export class Service {
  private email: string;
  private cookies: CookieEntry[];
  private cookieHeader: string;
  private cacheValue: any | null = null;
  private cacheAtMs = 0;

  constructor(options: { cookiesFile?: string; authenticatingAccount?: string }) {
    this.email = options.authenticatingAccount ?? 'unknown@gmail.com';
    // Synchronous constructor defers file I/O to an async factory
    this.cookies = [];
    this.cookieHeader = '';
  }

  static async fromCookiesFile(cookiesFile: string, authenticatingAccount = 'unknown@gmail.com') {
    const svc = new Service({ cookiesFile, authenticatingAccount });
    await svc.initializeFromCookieFile(cookiesFile);
    return svc;
  }

  private async initializeFromCookieFile(cookiesFile: string) {
    let contents: string;
    try {
      contents = await readFile(cookiesFile, 'utf8');
    } catch {
      throw new InvalidCookieFile('Could not open cookies file, either file does not exist or no read access.');
    }
    const entries = parseNetscapeCookieFile(contents);
    if (!hasValidCookie(entries)) {
      throw new InvalidCookies(`Missing either of ${Array.from(VALID_COOKIE_NAMES).join(', ')} cookies!`);
    }
    this.cookies = entries;
    this.cookieHeader = cookiesToHeader(entries);
    await this.validateCookie();
  }

  private async validateCookie() {
    const data = parseLocationData((await getServerResponse(this.cookieHeader)).text);
    const authField = data?.[6];
    if (authField === 'GgA=') {
      throw new InvalidCookies('Does not seem we have a valid session.');
    }
  }

  private isCacheValid(): boolean {
    return this.cacheValue !== null && Date.now() - this.cacheAtMs < STATE_CACHING_MS;
  }

  private async getData(): Promise<any> {
    if (this.isCacheValid()) return this.cacheValue;
    const response = await getServerResponse(this.cookieHeader);
    if (!response.ok) {
      // Align with Python returning [''] on error
      this.cacheValue = [''];
      this.cacheAtMs = Date.now();
      return this.cacheValue;
    }
    const data = parseLocationData(response.text);
    this.cacheValue = data;
    this.cacheAtMs = Date.now();
    return data;
  }

  async getSharedPeople(): Promise<Person[]> {
    const output = await this.getData();
    const sharedEntries = output?.[0] ?? [];
    const people: Person[] = [];
    for (const info of sharedEntries) {
      try {
        people.push(new Person(info));
      } catch {
        // drop invalid
      }
    }
    return people;
  }

  async getAuthenticatedPerson(): Promise<Person | null> {
    try {
      const output = await this.getData();
      const person = new Person([
        this.email,
        output?.[9]?.[1],
        null,
        null,
        null,
        null,
        [null, null, this.email, this.email],
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      return person;
    } catch {
      return null;
    }
  }

  async getAllPeople(): Promise<Person[]> {
    const shared = await this.getSharedPeople();
    const me = await this.getAuthenticatedPerson();
    return me ? [...shared, me] : shared;
  }

  async getPersonByNickname(nickname: string): Promise<Person | null> {
    const all = await this.getAllPeople();
    return (
      all.find(p => (p.nickname ?? '').toLowerCase() === nickname.toLowerCase()) ?? null
    );
  }

  async getCoordinatesByNickname(nickname: string): Promise<[string | number | null, string | number | null]> {
    const person = await this.getPersonByNickname(nickname);
    return person ? [person.latitude, person.longitude] : ['', ''];
  }

  async getLatitudeByNickname(nickname: string): Promise<string | number | ''> {
    const person = await this.getPersonByNickname(nickname);
    return person ? person.latitude ?? '' : '';
  }

  async getLongitudeByNickname(nickname: string): Promise<string | number | ''> {
    const person = await this.getPersonByNickname(nickname);
    return person ? person.longitude ?? '' : '';
  }

  async getTimedateByNickname(nickname: string): Promise<number | string | ''> {
    const person = await this.getPersonByNickname(nickname);
    return person ? person.timestamp ?? '' : '';
  }

  async getPersonByFullName(name: string): Promise<Person | null> {
    const all = await this.getAllPeople();
    return (
      all.find(p => (p.fullName ?? '').toLowerCase() === name.toLowerCase()) ?? null
    );
  }

  async getCoordinatesByFullName(name: string): Promise<[string | number | null, string | number | null]> {
    const person = await this.getPersonByFullName(name);
    return person ? [person.latitude, person.longitude] : ['', ''];
  }

  async getLatitudeByFullName(name: string): Promise<string | number | ''> {
    const person = await this.getPersonByFullName(name);
    return person ? person.latitude ?? '' : '';
  }

  async getLongitudeByFullName(name: string): Promise<string | number | ''> {
    const person = await this.getPersonByFullName(name);
    return person ? person.longitude ?? '' : '';
  }

  async getTimedateByFullName(name: string): Promise<number | string | ''> {
    const person = await this.getPersonByFullName(name);
    return person ? person.timestamp ?? '' : '';
  }
}
