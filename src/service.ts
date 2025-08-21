import { InvalidCookieFile, InvalidCookies, InvalidData } from "./errors";
import { parsePerson } from "./person";
import { CookieEntry, Person } from "./types";
import {
  parseNetscapeCookieFile,
  hasValidCookie,
  cookiesToHeader,
  VALID_COOKIE_NAMES,
} from "./cookies";
import { request } from "undici";
import { readFile } from "node:fs/promises";

async function getServerResponse(cookieHeader: string) {
  const url = "https://www.google.com/maps/rpc/locationsharing/read";
  const params = new URLSearchParams({
    authuser: "2",
    hl: "en",
    gl: "us",
    // pd holds the information about the rendering of the map and
    // it is irrelevant with the location sharing capabilities.
    // the below info points to google's headquarters.
    pb: "!1m7!8m6!1m3!1i14!2i8413!3i5385!2i6!3x4095!2m3!1e0!2sm!3i407105169!3m7!2sen!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e1!5m4!1e4!8m2!1e0!1e1!6m9!1e12!2i2!26m1!4b1!30m1!1f1.3953487873077393!39b1!44e1!50e0!23i4111425",
  });
  const res = await request(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      accept: "*/*",
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
  private cookies: CookieEntry[];
  private cookieHeader: string;

  constructor(options: { cookiesFile?: string }) {
    this.cookies = [];
    this.cookieHeader = "";
  }

  static async fromCookiesFile(cookiesFile: string) {
    const svc = new Service({ cookiesFile });
    await svc.initializeFromCookieFile(cookiesFile);
    return svc;
  }

  private async initializeFromCookieFile(cookiesFile: string) {
    let contents: string;
    try {
      contents = await readFile(cookiesFile, "utf8");
    } catch {
      throw new InvalidCookieFile(
        "Could not open cookies file, either file does not exist or no read access."
      );
    }
    const entries = parseNetscapeCookieFile(contents);
    if (!hasValidCookie(entries)) {
      throw new InvalidCookies(
        `Missing either of ${Array.from(VALID_COOKIE_NAMES).join(", ")} cookies!`
      );
    }
    this.cookies = entries;
    this.cookieHeader = cookiesToHeader(entries);
    await this.validateCookie();
  }

  private async validateCookie() {
    const data = parseLocationData((await getServerResponse(this.cookieHeader)).text);
    const authField = data?.[6];
    if (authField === "GgA=") {
      throw new InvalidCookies("Does not seem we have a valid session.");
    }
  }

  private async getData(): Promise<any> {
    const response = await getServerResponse(this.cookieHeader);

    if (!response.ok)
      throw new InvalidData(`Received invalid data: ${response.text}, cannot parse properly.`);

    return parseLocationData(response.text);
  }

  async getSharedPeople(): Promise<Person[]> {
    const output = await this.getData();
    const sharedEntries = output?.[0] ?? [];
    const people: Person[] = [];
    for (const info of sharedEntries) {
      try {
        people.push(parsePerson(info));
      } catch {
        // drop invalid
      }
    }
    return people;
  }
}
