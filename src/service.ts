import { InvalidCookies, InvalidData } from "./errors";
import { parsePerson } from "./person";
import { Person } from "./types";
import {
  parseNetscapeCookieFile,
  hasValidCookie,
  cookiesToHeader,
  VALID_COOKIE_NAMES,
} from "./cookies";
import { request } from "undici";

async function getServerResponse(cookieHeader: string, authuser = "0") {
  const url = "https://www.google.com/maps/rpc/locationsharing/read";
  const params = new URLSearchParams();
  params.set("authuser", authuser);
  params.set("hl", "en");
  params.set("gl", "us");
  params.set(
    "pb",
    "!1m7!8m6!1m3!1i14!2i8413!3i5385!2i6!3x4095!2m3!1e0!2sm!3i407105169!3m7!2sen!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e1!5m4!1e4!8m2!1e0!1e1!6m9!1e12!2i2!26m1!4b1!30m1!1f1.3953487873077393!39b1!44e1!50e0!23i4111425"
  );
  const res = await request(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  });

  // TODO: Maybe use set-cookies res header?

  const text = await res.body.text();
  return { status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text };
}

function parseLocationData(text: string): any {
  try {
    const jsonStr = text.split("'", 2)[1];
    const data = JSON.parse(jsonStr);
    return data;
  } catch {
    throw new InvalidData(`Received invalid data: ${text}, cannot parse properly.`);
  }
}

export class Service {
  private cookieHeader: string;
  private authuser: string;

  constructor(netscapeCookieData: string, authuser: string) {
    const entries = parseNetscapeCookieFile(netscapeCookieData);
    if (!hasValidCookie(entries)) {
      throw new InvalidCookies(
        `Missing either of ${Array.from(VALID_COOKIE_NAMES).join(", ")} cookies!`
      );
    }
    this.cookieHeader = cookiesToHeader(entries);
    this.authuser = authuser;
  }

  public async validateCookie() {
    const response = await getServerResponse(this.cookieHeader, this.authuser);
    const data = parseLocationData(response.text);
    const authField = data?.[6];
    if (authField === "GgA=") {
      throw new InvalidCookies("Does not seem we have a valid session.");
    }
  }

  private async getData(): Promise<any> {
    const response = await getServerResponse(this.cookieHeader, this.authuser);

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
