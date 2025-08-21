import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { Service, personToString } from "../src";

async function main() {
  const [cookiesFile, query] = process.argv.slice(2);
  if (!cookiesFile) {
    console.error("Usage: tsx examples/demo.ts <cookies-file> [nickname-or-name]");
    process.exit(1);
  }
  if (!fs.existsSync(cookiesFile)) {
    console.error(`Cookies file not found: ${cookiesFile}`);
    process.exit(1);
  }

  const netscapeCookieData = await readFile(cookiesFile, "utf8");

  const svc = new Service(netscapeCookieData, "0");

  const people = await svc.getSharedPeople();
  console.log(`Fetched ${people.length} people`);
  console.log(people);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
