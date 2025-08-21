import { parsePerson } from "./person";
import { Person } from "./types";
import {
  parseNetscapeCookieFile,
  hasValidCookie,
  VALID_COOKIE_NAMES,
  cookieEntriesToMap,
  cookieMapToHeader,
  applySetCookiesToMap,
} from "./cookies";
import { request } from "undici";

// https://github.com/costastf/locationsharinglib/issues/110

async function getServerResponse(cookieHeader: string, authUser = 0) {
  const url = "https://www.google.com/maps/rpc/locationsharing/read";
  const params = new URLSearchParams();
  params.set("authuser", authUser.toString());
  params.set("hl", "en");
  params.set("gl", "us");
  params.set(
    "pb",
    // pd holds the information about the rendering of the map and
    // it is irrelevant with the location sharing capabilities.
    // the below info points to google's headquarters.
    "!1m7!8m6!1m3!1i14!2i8413!3i5385!2i6!3x4095!2m3!1e0!2sm!3i407105169!3m7!2sen!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e1!5m4!1e4!8m2!1e0!1e1!6m9!1e12!2i2!26m1!4b1!30m1!1f1.3953487873077393!39b1!44e1!50e0!23i4111425"
  );
  const res = await request(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  });

  // TODO: UPDATE COOKIE HEADER BASED ON SET-COOKIES HEADER
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;

  const text = await res.body.text();
  return {
    status: res.statusCode,
    ok: res.statusCode >= 200 && res.statusCode < 300,
    text,
    setCookie,
  };
}

export class Service {
  private cookies: Map<string, string>;
  private authUser: number;

  constructor(netscapeCookieData: string, authUser: number) {
    const entries = parseNetscapeCookieFile(netscapeCookieData);
    if (!hasValidCookie(entries)) {
      throw new Error(
        `Invalid cookies: Missing either of ${Array.from(VALID_COOKIE_NAMES).join(", ")} cookies!`
      );
    }
    this.cookies = cookieEntriesToMap(entries);
    this.authUser = authUser;
  }

  private async getRawData(): Promise<any> {
    const response = await getServerResponse(cookieMapToHeader(this.cookies), this.authUser);
    // Update the in-memory cookies for subsequent requests
    applySetCookiesToMap(this.cookies, response.setCookie);

    if (!response.ok)
      throw new Error(`Received invalid data: ${response.text}, cannot parse properly.`);

    let data;
    try {
      data = JSON.parse(response.text.split("'", 2)[1]);
    } catch {
      throw new Error(`Received invalid data: ${response.text}, cannot parse properly.`);
    }

    // Validate quickly for errors.
    const authField = data?.[6];
    if (authField === "GgA=") {
      throw new Error("Invalid cookies: Does not seem we have a valid session.");
    }

    return data;
  }

  async getSharedPeople(): Promise<Person[]> {
    const data = await this.getRawData();
    const sharedEntries = data?.[0] ?? [];

    let people: Person[] = [];
    for (const info of sharedEntries) {
      try {
        people.push(parsePerson(info));
      } catch {} // drop invalid
    }

    return people;
  }
}
