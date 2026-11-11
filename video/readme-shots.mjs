// Captures README screenshots of public pages (landing, Mandate Map, developers) from the live site.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out", "readme");
const BASE = "https://mandate-e13m.onrender.com";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: "light" });
const page = await ctx.newPage();
page.setDefaultTimeout(90000);
for (const [name, path] of [["landing", "/"], ["mandate-map", "/how-it-works"], ["developers", "/developers"]]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(name);
}
await b.close();
