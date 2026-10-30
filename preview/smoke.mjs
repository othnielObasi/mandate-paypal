// Clicks through dist/mandate-preview.html from a file:// URL, with the network blocked, like a reviewer would.
import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = "file://" + join(root, "dist/mandate-preview.html");
const shots = process.argv[2];
const b = await chromium.launch();
const errs = [];
const fail = (m) => {
  throw new Error(m);
};

async function run(viewport, tag) {
  const ctx = await b.newContext({ viewport, ...(viewport.width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.route(/^https?:/, (r) => r.abort()); // prove it needs no network
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(`${tag}: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errs.push(`${tag}: ${m.text()}`));
  const shot = async (n) => {
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > viewport.width) errs.push(`${tag}: sideways scroll on ${n} (${sw}px)`);
    if (shots) await p.screenshot({ path: `${shots}/pv-${n}-${viewport.width}.png`, fullPage: true });
  };
  await p.goto(file);
  await p.getByRole("heading", { level: 1 }).waitFor();
  await shot("landing");
  await p.getByRole("link", { name: /Try the live demo/ }).first().click();
  await p.getByLabel("Your mandate").waitFor();
  await p.getByRole("button", { name: "Read my rules" }).click();
  await p.getByTestId("rules-editor").waitFor();
  await shot("check");
  await p.getByRole("button", { name: "Sign and activate" }).click();
  await p.getByTestId("rules").waitFor();
  for (const t of ["Buy washing-up liquid and sponges", "Buy an electric kettle", "Buy toilet roll"]) {
    await p.getByLabel("Task for the agent").fill(t);
    await p.getByRole("button", { name: "Run agent" }).click();
    await p.getByTestId("feed").locator("li").last().filter({ hasText: /Finished|couldn't find/ }).waitFor();
  }
  await p.getByRole("button", { name: "Compromised-agent drill" }).click();
  await p.getByTestId("feed").getByText("steered by untrusted content").first().waitFor();
  const budget = await p.getByTestId("budget").textContent();
  if (!budget.includes("$10.24 spent")) fail(`${tag}: budget wrong: ${budget}`);
  await shot("home");
  await p.getByTestId("approval").getByRole("button", { name: "Details", exact: true }).click();
  await p.getByRole("dialog", { name: "Approve a purchase" }).getByRole("button", { name: "Approve and sign" }).click();
  await p.getByRole("dialog").waitFor({ state: "detached" });
  if (!(await p.getByTestId("budget").textContent()).includes("$42.24 spent")) fail(`${tag}: approval not paid`);
  await p.getByRole("button", { name: /Platinum Deep-Clean Bundle, Blocked/ }).click();
  await p.getByRole("dialog", { name: "A purchase was stopped" }).getByText("SYSTEM NOTE").waitFor();
  if (shots) await p.screenshot({ path: `${shots}/pv-blocked-${viewport.width}.png` });
  await p.keyboard.press("Escape");
  await p.getByRole("link", { name: "Orders" }).first().click();
  await p.getByRole("button", { name: "Simulate lost parcel" }).first().click();
  await p.getByRole("button", { name: "Draft dispute" }).click();
  const d = p.getByTestId("dispute");
  await d.getByRole("button", { name: "Edit the statement" }).click();
  await d.getByLabel("Your statement to PayPal").fill("My order for $4.50 was lost by the carrier. Please refund me in full.");
  await d.getByRole("button", { name: "Save statement" }).click();
  await d.getByText("In your words.").waitFor();
  await d.getByRole("button", { name: "Confirm and file with PayPal" }).click();
  await d.getByText("Dispute filed with PayPal").waitFor();
  await shot("orders");
  await p.getByRole("link", { name: "Assistants" }).first().click();
  await p.getByRole("button", { name: "Create connection URL" }).click();
  await p.getByTestId("connection-url").waitFor();
  await shot("assistants");
  await p.getByRole("link", { name: "Receipts" }).first().click();
  await p.getByTestId("verify-result").filter({ hasText: "verified" }).waitFor();
  const cell = p.getByTestId("ledger").locator(".ag-row").filter({ hasText: "Payment" }).locator(".ag-cell[col-id='summary']").first();
  await cell.dblclick();
  await p.keyboard.press("ControlOrMeta+A");
  await p.keyboard.type("Paid $0.01 to acme-supplies");
  await p.keyboard.press("Enter");
  await p.getByRole("button", { name: "Verify chain" }).click();
  await p.getByTestId("verify-result").filter({ hasText: "Chain broken" }).waitFor();
  await shot("receipts");
  await p.getByRole("button", { name: "Undo edits" }).click();
  await p.getByRole("button", { name: "Verify chain" }).click();
  await p.getByTestId("verify-result").filter({ hasText: "verified" }).waitFor();
  if (viewport.width > 500) await p.getByRole("link", { name: "Seller view" }).click();
  else {
    await p.getByRole("link", { name: "Orders" }).last().click();
    await p.getByRole("link", { name: "Check as the seller" }).first().click();
  }
  await p.getByTestId("seller-grid").locator(".ag-row").first().click();
  await p.getByTestId("seller-detail").getByText("checks passed").waitFor();
  await shot("seller");
  await ctx.close();
}

try {
  await run({ width: 1280, height: 900 }, "desktop");
  await run({ width: 390, height: 844 }, "phone");
} finally {
  await b.close();
}
if (errs.length) {
  console.error(errs.join("\n"));
  process.exit(1);
}
console.log("preview smoke: landing → setup → agent → approve → drill → orders/dispute → assistants → receipts tamper → seller: OK (desktop + phone, offline)");
