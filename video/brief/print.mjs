// Prints video/brief/brief.html to a PDF (and a PNG preview of each page) with headless Chromium.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? join(here, "..", "out", "Mandate-judges-brief.pdf");

const b = await chromium.launch();
const page = await b.newPage();
await page.goto(pathToFileURL(join(here, "brief.html")).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await b.close();
console.log(`pdf: ${out}`);
