import { Person, parsePerson } from "./types";
import {
  applySetCookiesToMap,
  cookiesToHeader,
  hasValidCookie,
  VALID_COOKIE_NAMES,
} from "./cookies";

export async function getGoogleMapsSharedPeople(
  cookies: Map<string, string>,
  authUser: number
): Promise<{ people: Person[]; newCookies: Map<string, string> }> {
  const { data, newCookies } = await getRawGoogleMapsAPIData(cookies, authUser);
  const sharedEntries = data?.[0] ?? [];

  let people: Person[] = [];
  for (const info of sharedEntries) {
    try {
      people.push(parsePerson(info));
    } catch {} // drop invalid
  }

  return { people, newCookies: newCookies };
}

async function getRawGoogleMapsAPIData(
  cookies: Map<string, string>,
  authUser: number
): Promise<{ data: any; newCookies: Map<string, string> }> {
  if (!hasValidCookie(cookies)) {
    throw new Error(
      `Invalid cookies: Missing either of ${Array.from(VALID_COOKIE_NAMES).join(", ")} cookies!`
    );
  }

  const response = await makeGoogleMapsAPICall(cookiesToHeader(cookies), authUser);

  // See https://github.com/costastf/locationsharinglib/issues/110 if you're having cookies issues.
  const newCookies = new Map(cookies);
  applySetCookiesToMap(newCookies, response.setCookieHeaderRaw);

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

  return { data, newCookies };
}

async function makeGoogleMapsAPICall(cookieHeader: string, authUser = 0) {
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

  const res = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  });

  const text = await res.text();
  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    text,
    setCookieHeaderRaw: res.headers.getSetCookie(),
  };
}
