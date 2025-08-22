import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { getGoogleMapsSharedPeople, parseNetscapeCookieString } from "../src";

async function main() {
  const [cookiesFile] = process.argv.slice(2);
  if (!cookiesFile) {
    console.error("Usage: tsx examples/demo.ts <cookies-file>");
    process.exit(1);
  }
  if (!fs.existsSync(cookiesFile)) {
    console.error(`Cookies file not found: ${cookiesFile}`);
    process.exit(1);
  }

  const netscapeCookieData = await readFile(cookiesFile, "utf8");
  const cookies = parseNetscapeCookieString(netscapeCookieData);

  const { people } = await getGoogleMapsSharedPeople(cookies, 0);
  console.log(`Fetched ${people.length} people`);
  console.log(people);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
