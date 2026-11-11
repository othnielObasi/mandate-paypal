// Records the live app for the demo video, clip by clip, through Chrome's screencast (crisp 1920x1080 JPEGs).
// A visible cursor and click ripples are drawn into the page (headless has none). Recording pauses
// while the model or PayPal is working, so waits don't become dead air.
//
//   node video/capture.mjs                 all clips, in order (one workspace)
//   node video/capture.mjs drill real      re-record some clips, reusing the saved workspace
//
// Writes video/footage/<clip>/NNNNN.jpg and video/footage/<clip>/index.json ([{ f, t }], t in seconds).
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "footage");
const STATE = join(OUT, "state.json");
const BASE = process.env.MANDATE_URL ?? "https://mandate-e13m.onrender.com";
const MANDATE_TEXT = "Household and kitchen basics, up to $80 a month, nothing over $25";

const env = Object.fromEntries(
  readFileSync(join(here, "..", ".env.render"), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^PAYPAL_SANBOX_(EMAIL|PASSWORD)=.+/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CURSOR = () => {
  const add = () => {
    if (document.getElementById("__cur")) return;
    const st = document.createElement("style");
    st.textContent = "@keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.7);opacity:0}}";
    document.head.appendChild(st);
    const c = document.createElement("div");
    c.id = "__cur";
    c.style.cssText = "position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px)";
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 22 22"><path d="M3 2l14 8.2-6.2 1.5L7.6 18z" fill="#111827" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const pos = JSON.parse(sessionStorage.getItem("__cur") || "null");
    const Z = () => parseFloat(document.documentElement.style.zoom || "1") || 1;
    if (pos) c.style.transform = `translate(${pos[0] / Z() - 3}px,${pos[1] / Z() - 2}px)`;
    document.addEventListener("mousemove", (e) => {
      c.style.transform = `translate(${e.clientX / Z() - 3}px,${e.clientY / Z() - 2}px)`;
      sessionStorage.setItem("__cur", JSON.stringify([e.clientX, e.clientY]));
    }, true);
    document.addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      r.style.cssText = `position:fixed;left:${e.clientX / Z() - 20}px;top:${e.clientY / Z() - 20}px;width:40px;height:40px;border-radius:50%;border:3px solid rgba(29,78,216,.85);z-index:2147483646;pointer-events:none;animation:__rip .55s ease-out forwards`;
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 650);
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
};

class Recorder {
  constructor(cdp) {
    this.cdp = cdp;
    this.clip = null;
    cdp.on("Page.screencastFrame", async (e) => {
      cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
      if (!this.clip || this.paused) return;
      const now = e.metadata.timestamp;
      const t = now - this.clip.start - this.clip.pausedFor;
      const f = String(this.clip.frames.length).padStart(5, "0") + ".jpg";
      writeFileSync(join(this.clip.dir, f), Buffer.from(e.data, "base64"));
      this.clip.frames.push({ f, t: Math.max(0, +t.toFixed(3)) });
    });
  }
  async start(name) {
    const dir = join(OUT, name);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    this.clip = { name, dir, frames: [], marks: {}, start: Date.now() / 1000, pausedFor: 0 };
    this.paused = false;
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    console.log(`● ${name}`);
  }
  pause() {
    this.paused = true;
    this.pausedAt = Date.now() / 1000;
  }
  async resume(page) {
    this.clip.pausedFor += Date.now() / 1000 - this.pausedAt;
    this.paused = false;
    // Force a repaint so the first frame after the pause shows what changed meanwhile.
    const p = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__cur") || "[960,540]")).catch(() => [960, 540]);
    await page.mouse.move(p[0] + 1, p[1]);
    await sleep(120);
  }
  /** Remember where an element is on screen, and when, so the video can zoom into it. */
  async mark(name, ...locs) {
    const boxes = (await Promise.all(locs.map((l) => l.boundingBox().catch(() => null)))).filter(Boolean);
    if (!boxes.length || !this.clip) return;
    const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
    const r = Math.max(...boxes.map((b) => b.x + b.width)), btm = Math.max(...boxes.map((b) => b.y + b.height));
    const t = Date.now() / 1000 - this.clip.start - this.clip.pausedFor;
    this.clip.marks[name] = { t: +t.toFixed(3), x: Math.round(x), y: Math.round(y), w: Math.round(r - x), h: Math.round(btm - y) };
  }
  async stop() {
    await sleep(300);
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    const c = this.clip;
    writeFileSync(join(c.dir, "index.json"), JSON.stringify({ frames: c.frames, marks: c.marks }));
    console.log(`  ${c.name}: ${c.frames.length} frames, ${(c.frames.at(-1)?.t ?? 0).toFixed(1)}s`);
    this.clip = null;
  }
}

/** Glide the cursor to the element, then click it. */
async function glideClick(page, loc, { dbl = false } = {}) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  const to = [b.x + b.width / 2, b.y + b.height / 2];
  const from = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__cur") || "[960,700]")).catch(() => [960, 700]);
  const steps = 22;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
    await sleep(16);
  }
  await sleep(180);
  if (dbl) await page.mouse.dblclick(to[0], to[1]);
  else await page.mouse.click(to[0], to[1]);
}

/** Glide the cursor onto the element without clicking. */
async function glideTo(page, loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  const to = [b.x + b.width / 2, b.y + b.height / 2];
  const from = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__cur") || "[960,700]")).catch(() => [960, 700]);
  for (let i = 1; i <= 22; i++) {
    const k = i / 22;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
    await sleep(16);
  }
  await sleep(180);
}

/** Smooth scroll so the element sits near the top (or centre) of the screen. */
async function scrollTo(page, loc, block = "start", margin = 16) {
  await loc.evaluate((el, [block, margin]) => {
    el.style.scrollMarginTop = `${margin}px`;
    el.scrollIntoView({ behavior: "smooth", block });
  }, [block, margin]);
  await sleep(1000);
}

async function typeInto(page, loc, text, delay = 38) {
  await glideClick(page, loc);
  await page.keyboard.type(text, { delay });
}

/** Wait for the agent's turn to finish, with the recording paused. */
async function agentTurn(page, rec, before) {
  await sleep(1400); // show it starting to work
  rec.pause();
  await page.waitForFunction((n) => !document.querySelector(".note-working") && document.querySelectorAll(".msg-agent").length > n, before, { timeout: 180000 });
  await sleep(600);
  await rec.resume(page);
}

const CLIPS = {
  async setup(page, rec) {
    await page.goto(`${BASE}/app/setup`, { waitUntil: "networkidle" });
    await sleep(500);
    await rec.start("setup");
    await sleep(700);
    // The box starts with an example: replace it.
    await glideClick(page, page.getByLabel("Your mandate"));
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type(MANDATE_TEXT, { delay: 34 });
    await sleep(500);
    await glideClick(page, page.getByRole("button", { name: "Read my rules" }));
    await sleep(900);
    rec.pause();
    await page.getByTestId("rules-editor").waitFor({ timeout: 120000 });
    await sleep(400);
    await rec.resume(page);
    await rec.mark("rules", page.getByTestId("rules-editor"));
    await sleep(1600);
    // Sam adjusts what the AI read: one more category, and a fair-price limit.
    await glideClick(page, page.locator("#f-cat"));
    await page.keyboard.press("End");
    await page.keyboard.type(", cleaning", { delay: 70 });
    await sleep(500);
    await typeInto(page, page.locator("#f-market"), "15", 160);
    await sleep(700);
    const none = page.locator("#f-market-none");
    await glideTo(page, none);
    await none.selectOption("allow");
    await sleep(900);
    await rec.mark("signing", page.locator(".card-night").first());
    await sleep(1500);
    await glideClick(page, page.getByRole("button", { name: "Sign and activate" }));
    rec.pause();
    await page.waitForURL(/\/app$/, { timeout: 60000 });
    await page.getByTestId("rules").waitFor();
    await sleep(600);
    await rec.resume(page);
    await sleep(2500);
    await rec.stop();
  },

  async connect(page, rec) {
    await rec.start("connect");
    await sleep(600);
    await glideClick(page, page.getByTestId("wallet").getByRole("button", { name: "Connect PayPal" }));
    rec.pause();
    await page.waitForURL(/paypal\.com/, { timeout: 60000 });
    const email = page.locator("#email");
    await email.waitFor({ timeout: 60000 });
    await sleep(800);
    await rec.resume(page);
    await sleep(500);
    await typeInto(page, email, env.PAYPAL_SANBOX_EMAIL, 28);
    await glideClick(page, page.getByRole("button", { name: "Next", exact: true }));
    rec.pause();
    await page.locator("input[type=password]:visible").first().waitFor({ state: "visible" });
    await sleep(1300);
    await rec.resume(page);
    for (let i = 0; i < 3; i++) {
      const box = page.locator("input[type=password]:visible").first();
      await glideClick(page, box);
      await box.fill("");
      await page.keyboard.type(env.PAYPAL_SANBOX_PASSWORD, { delay: 30 });
      if ((await box.inputValue()).length === env.PAYPAL_SANBOX_PASSWORD.length) break;
      await sleep(800);
    }
    await glideClick(page, page.getByRole("button", { name: /^Log ?In$/i }));
    rec.pause();
    const agree = page.getByRole("button", { name: /Agree and Continue|Agree & Continue|Agree/i }).first();
    await agree.waitFor({ timeout: 90000 });
    await sleep(1500);
    await rec.resume(page);
    await sleep(1800);
    await glideClick(page, agree);
    rec.pause();
    await page.waitForURL(/onrender\.com\/app/, { timeout: 90000 });
    await page.getByTestId("wallet").getByText("PayPal connected").waitFor({ timeout: 60000 });
    await page.getByTestId("wallet").scrollIntoViewIfNeeded();
    await sleep(500);
    await rec.resume(page);
    await sleep(3000);
    await rec.stop();
  },

  async buy(page, rec) {
    const chat = page.locator("section.chat");
    await chat.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await rec.start("buy");
    await sleep(600);
    const before = await page.locator(".msg-agent").count();
    await typeInto(page, page.getByLabel("Task for the agent"), "Buy washing-up liquid", 45);
    await glideClick(page, page.getByRole("button", { name: "Run agent" }));
    await agentTurn(page, rec, before);
    await page.locator(".pcard").last().scrollIntoViewIfNeeded();
    await sleep(300);
    await rec.mark("paid", page.locator(".pcard").last());
    await sleep(1900);
    await glideClick(page, page.locator(".pcard .trail").last());
    await sleep(3200);
    await rec.stop();
  },

  async ask(page, rec) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(800);
    await rec.start("ask");
    await sleep(800);
    // An outside assistant asks for an over-limit item (not through this page's chat).
    await page.evaluate(async () => {
      const ms = await (await fetch("/api/mandates")).json();
      void fetch("/api/agent/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId: ms.at(-1).id, task: "Buy an electric kettle" }) });
    });
    rec.pause();
    await page.locator(".live-toast").waitFor({ timeout: 120000 });
    await rec.resume(page);
    await sleep(2600);
    await glideClick(page, page.locator(".live-toast").getByRole("link", { name: "Review" }));
    await sleep(1200);
    const card = page.getByTestId("approval").first();
    await card.scrollIntoViewIfNeeded();
    await sleep(300);
    await rec.mark("approval", card);
    await sleep(3200);
    await rec.stop();
    // The video shows Sam approving from Telegram; approve here, off camera, so the payment happens.
    await card.getByRole("button", { name: /Approve/ }).first().click();
    await page.waitForFunction(async () => {
      const ms = await (await fetch("/api/mandates")).json();
      const rs = await (await fetch(`/api/receipts?mandateId=${ms.at(-1).id}`)).json();
      return (Array.isArray(rs) ? rs : []).some((r) => /Paid \$32\.00/.test(r.summary));
    }, null, { timeout: 120000, polling: 2000 });
    const kettle = await page.evaluate(async () => {
      const ms = await (await fetch("/api/mandates")).json();
      const os = await (await fetch(`/api/orders?mandateId=${ms.at(-1).id}`)).json();
      return os.find((o) => o.items?.some((i) => i.sku === "kettle"))?.id ?? null;
    });
    writeFileSync(join(OUT, "kettle.json"), JSON.stringify({ order: kettle }));
    console.log(`  kettle order: ${kettle}`);
  },

  async drill(page, rec) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    const chat = page.locator("section.chat");
    const fresh = chat.getByRole("button", { name: "New chat" });
    if (await fresh.isVisible().catch(() => false)) await fresh.click();
    await sleep(500);
    await scrollTo(page, chat, "start", 12);
    await sleep(500);
    await rec.start("drill");
    await sleep(400);
    const before = await page.locator(".msg-agent").count();
    await glideClick(page, page.getByRole("button", { name: /Compromised-agent drill/ }));
    await agentTurn(page, rec, before);
    const blocked = page.locator(".pcard-block").last();
    await scrollTo(page, blocked, "center");
    await rec.mark("blocked", blocked.locator(".pcard-main"), blocked.locator(".pcard-foot"));
    await sleep(4500);
    await rec.stop();
  },

  async page(page, rec) {
    // The attacker's page: a normal-looking review blog with a note planted for AI agents.
    await page.goto(`${BASE}/demo/deals`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    await rec.start("page");
    await sleep(1800);
    const note = page.getByRole("complementary", { name: "Sponsored note" });
    await scrollTo(page, note, "center");
    await rec.mark("note", note);
    await page.mouse.move(1500, 960, { steps: 18 });
    await sleep(5000);
    await rec.stop();
  },

  async why(page, rec) {
    const gift = page.locator(".pcard-block").last();
    await scrollTo(page, gift, "start", 12);
    await rec.start("why");
    await sleep(700);
    await glideClick(page, gift.locator(".trail"));
    await sleep(500);
    const graph = gift.locator(".graph");
    await scrollTo(page, graph, "center");
    await rec.mark("graph", graph);
    await sleep(6500);
    await rec.stop();
  },

  async notify(page, rec) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    await rec.start("notify");
    await sleep(500);
    await glideClick(page, page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: /Notifications/ }));
    rec.pause();
    await page.getByTestId("notifications").waitFor({ timeout: 60000 });
    await page.getByTestId("alert-channels").waitFor({ timeout: 60000 });
    await sleep(800);
    await rec.resume(page);
    await rec.mark("list", page.getByTestId("notifications"));
    await sleep(3000);
    await scrollTo(page, page.getByTestId("alert-channels"), "start", 12);
    await rec.mark("channels", page.getByTestId("alert-channels"));
    await sleep(3200);
    await rec.stop();
  },

  async insights(page, rec) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    await rec.start("insights");
    await sleep(500);
    await glideClick(page, page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Insights" }));
    rec.pause();
    await page.getByTestId("decision-explorer").waitFor({ timeout: 90000 });
    await sleep(4000); // charts draw
    await rec.resume(page);
    await sleep(3200);
    const ex = page.getByTestId("decision-explorer");
    await scrollTo(page, ex, "start", 12);
    await sleep(800);
    await glideClick(page, ex.getByRole("button", { name: "Hijack attempts" }));
    await sleep(700);
    await rec.mark("explorer", ex);
    await sleep(3500);
    await rec.stop();
  },

  async devs(page, rec) {
    await page.goto(`${BASE}/developers`, { waitUntil: "networkidle" });
    await sleep(800);
    await rec.start("devs");
    await sleep(1800);
    await scrollTo(page, page.locator("#try"), "start", 12);
    await rec.mark("code", page.locator("#try .dev-two"));
    await sleep(3200);
    rec.pause();
    await page.goto(`${BASE}/docs/api/openapi/verification/verifyOrder`, { waitUntil: "networkidle" });
    await sleep(1500);
    await rec.resume(page);
    await sleep(1400);
    const tabs = page.getByRole("tab");
    await glideClick(page, tabs.filter({ hasText: /^Python$/ }).first());
    await sleep(400);
    await rec.mark("sdk", tabs.filter({ hasText: /^Python$/ }).first(), tabs.filter({ hasText: /^cURL$/ }).first(), page.locator("pre").first());
    await sleep(1800);
    await glideClick(page, tabs.filter({ hasText: /^C#$/ }).first());
    await sleep(1600);
    await glideClick(page, tabs.filter({ hasText: /^TypeScript$/ }).first());
    await sleep(2200);
    await rec.stop();
  },

  async real(page, rec) {
    const chat = page.locator("section.chat");
    await chat.scrollIntoViewIfNeeded();
    await rec.start("real");
    await sleep(500);
    const before = await page.locator(".msg-agent").count();
    await typeInto(page, page.getByLabel("Task for the agent"), "Buy Mrs. Meyer's dish soap", 42);
    await glideClick(page, page.getByRole("button", { name: "Run agent" }));
    await agentTurn(page, rec, before);
    await page.locator(".pcard").last().scrollIntoViewIfNeeded();
    await sleep(300);
    await rec.mark("product", page.locator(".pcard").last());
    await sleep(4200);
    await rec.stop();
  },

  async schedule(page, rec) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await rec.start("schedule");
    await sleep(500);
    await glideClick(page, page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Schedule" }));
    rec.pause();
    await page.getByTestId("schedule-calendar").locator(".b-calendar").waitFor({ timeout: 60000 });
    await sleep(1200);
    await rec.resume(page);
    await sleep(800);
    const form = page.getByTestId("schedule-form");
    const what = form.getByLabel("What to buy");
    await glideClick(page, what);
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Buy sponges", { delay: 50 });
    await sleep(400);
    await glideClick(page, form.getByRole("button", { name: /Schedule it/ }));
    await page.getByTestId("schedule-list").waitFor();
    await sleep(2200);
    await glideClick(page, page.getByTestId("schedule-list").getByRole("button", { name: "Run now" }).first());
    rec.pause();
    await page.getByTestId("schedule-list").getByText(/Last:/).first().waitFor({ timeout: 120000 });
    await sleep(500);
    await rec.resume(page);
    await sleep(3000);
    await rec.stop();
  },

  async proof(page, rec) {
    const order = await page.evaluate(async () => {
      const ms = await (await fetch("/api/mandates")).json();
      const os = await (await fetch(`/api/orders?mandateId=${ms.at(-1).id}`)).json();
      return os.at(-1)?.id ?? os[0]?.id;
    });
    await page.goto(`${BASE}/seller?order=${encodeURIComponent(order)}`, { waitUntil: "networkidle" });
    await sleep(1200);
    await rec.start("proof");
    await sleep(1200);
    const detail = page.locator("#seller-detail");
    if (await detail.count()) await detail.scrollIntoViewIfNeeded();
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 140);
      await sleep(450);
    }
    await sleep(2200);
    rec.pause();
    await page.goto(`${BASE}/app/receipts`, { waitUntil: "networkidle" });
    await page.getByTestId("verify-result").getByText("verified").waitFor({ timeout: 60000 }).catch(() => {});
    await page.getByTestId("ledger").locator(".ag-row").first().waitFor({ timeout: 60000 });
    await sleep(800);
    await rec.resume(page);
    await sleep(1200);
    const ledger = page.getByTestId("ledger");
    const cell = ledger.locator(".ag-row").filter({ hasText: "Payment" }).locator(".ag-cell[col-id='summary']").first();
    await glideClick(page, cell, { dbl: true });
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Paid $0.01 to acme-supplies", { delay: 45 });
    await page.keyboard.press("Enter");
    await sleep(600);
    await glideClick(page, ledger.getByRole("button", { name: "Verify chain" }));
    await sleep(700);
    await rec.mark("broken", page.getByTestId("verify-result"), ledger.locator(".ag-row.row-broken").first());
    await sleep(3100);
    await rec.stop();
  },
};

const ORDER = ["setup", "connect", "buy", "ask", "drill", "why", "real", "schedule", "notify", "insights", "proof", "devs"];
const want = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({
  // A full-HD viewport with the page zoomed to 150%: crisp 1920x1080 frames, app as large as on a 1280px screen.
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  ...(want.length && existsSync(STATE) ? { storageState: STATE } : {}),
});
await ctx.addInitScript(CURSOR);
await ctx.addInitScript(() => {
  const z = () => document.documentElement && (document.documentElement.style.zoom = "1.5");
  if (document.documentElement) z();
  document.addEventListener("DOMContentLoaded", z);
});
const page = await ctx.newPage();
page.setDefaultTimeout(90000);
const cdp = await ctx.newCDPSession(page);
const rec = new Recorder(cdp);
await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
await page.mouse.move(960, 700);

for (const name of want.length ? want : ORDER) {
  try {
    await CLIPS[name](page, rec);
    await ctx.storageState({ path: STATE });
  } catch (e) {
    console.log(`✕ ${name}: ${e.message.split("\n")[0]}`);
    if (rec.clip) await rec.stop();
    await page.screenshot({ path: join(OUT, `error-${name}.png`) }).catch(() => {});
    break;
  }
}
await b.close();
