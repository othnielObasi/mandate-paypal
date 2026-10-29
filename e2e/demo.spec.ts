import { test, expect, type Page } from "@playwright/test";

const MANDATE = "Household basics, up to $80 a month, nothing over $25, verified sellers only";

async function newMandate(page: Page, edit?: (page: Page) => Promise<void>) {
  await page.goto("/");
  const readButton = page.getByRole("button", { name: /Read (my|new) rules/ });
  await page.getByLabel("Mandate in plain English").fill(MANDATE);
  await readButton.click();
  await expect(page.getByTestId("rules-editor")).toBeVisible();
  if (edit) await edit(page);
  await page.getByRole("button", { name: "Save mandate" }).click();
  await expect(page.getByTestId("rules")).toBeVisible();
}

async function runAgent(page: Page, task: string) {
  await page.getByLabel("Task for the agent").fill(task);
  await page.getByRole("button", { name: "Run agent" }).click();
  await expect(page.getByTestId("feed").locator("li").last()).toContainText(/Finished|couldn't find/);
}

const feed = (page: Page) => page.getByTestId("feed");

test("the AI reads the rules, the user edits them before saving", async ({ page }) => {
  await newMandate(page, async (p) => {
    await p.getByLabel("Per-item limit ($)").fill("30");
  });
  await expect(page.getByTestId("rules")).toContainText("up to $30.00");
  await expect(page.getByTestId("rules")).toContainText("$80.00 per month");
});

test("an impossible edit is caught before saving", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Read (my|new) rules/ }).click();
  await page.getByLabel("Per-item limit ($)").fill("500");
  await page.getByRole("button", { name: "Save mandate" }).click();
  await expect(page.getByText("can't be more than the budget")).toBeVisible();
});

test("in-policy purchases are paid and counted against the budget", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid and sponges");
  await expect(feed(page).getByText("Paid", { exact: true })).toHaveCount(2);
  await expect(page.getByTestId("budget")).toContainText("$6.49 spent");
});

test("over the item limit asks the user; approving pays", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy an electric kettle");
  const card = page.getByTestId("approval");
  await expect(card).toContainText("$32.00 is over the item limit of $25.00");
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toHaveCount(0);
  await expect(feed(page).getByText("Approved by you.")).toBeVisible();
  await expect(page.getByTestId("budget")).toContainText("$32.00 spent");
});

test("an unverified seller is blocked", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy toilet roll");
  await expect(feed(page)).toContainText("corner-mart is not a verified seller");
  await expect(page.getByTestId("budget")).toContainText("$0.00 spent");
});

test("compromised-agent drill: injected purchases are blocked", async ({ page }) => {
  await newMandate(page);
  await page.getByRole("button", { name: "Compromised-agent drill" }).click();
  await expect(feed(page).getByText("steered by untrusted content")).toHaveCount(2);
  await expect(feed(page).getByText("Paid", { exact: true })).toHaveCount(1);
});

test("pausing the mandate stops the agent", async ({ page }) => {
  await newMandate(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await runAgent(page, "Buy sponges");
  await expect(feed(page)).toContainText("The mandate is paused");
});

test("lost parcel → AI-drafted dispute → filed after confirmation", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid");
  await page.getByRole("button", { name: "Simulate lost parcel" }).click();
  await expect(page.getByText("Not received", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Draft dispute" }).click();
  const dispute = page.getByTestId("dispute");
  await expect(dispute).toContainText("draft");
  await expect(dispute.locator("blockquote")).toContainText("$4.50");
  await expect(dispute).toContainText(/Evidence: \d+ signed receipts/);
  await dispute.getByRole("button", { name: "Confirm and file dispute" }).click();
  await expect(dispute).toContainText("filed");
  await expect(dispute).toContainText("SIM-PP-D-");
});

test("ledger: editing a receipt in the grid is detected, undoing restores trust", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid");
  const ledger = page.getByTestId("ledger");
  await ledger.getByRole("button", { name: "Verify chain" }).click();
  await expect(page.getByTestId("verify-result")).toContainText("verified");

  const paymentCell = ledger.locator(".ag-row").filter({ hasText: "payment" }).locator(".ag-cell[col-id='summary']").first();
  await paymentCell.dblclick();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Paid $0.01 to acme-supplies");
  await page.keyboard.press("Enter");
  await ledger.getByRole("button", { name: "Verify chain" }).click();
  await expect(page.getByTestId("verify-result")).toContainText(/Chain broken at receipt #\d+/);
  await expect(ledger.locator(".ag-row.row-broken")).toHaveCount(1);

  await ledger.getByRole("button", { name: "Undo edits" }).click();
  await ledger.getByRole("button", { name: "Verify chain" }).click();
  await expect(page.getByTestId("verify-result")).toContainText("verified");
});

test("works at phone width without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await newMandate(page);
  await runAgent(page, "Buy sponges");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // The ledger's key column starts on screen, not hidden behind a sideways scroll.
  const header = page.getByTestId("ledger").locator(".ag-header-cell[col-id='summary']");
  await header.scrollIntoViewIfNeeded();
  const box = await header.boundingBox();
  expect(box!.x).toBeLessThan(390 - 100);
});

test("the mandate is signed by the user (AP2 Intent Mandate)", async ({ page }) => {
  await newMandate(page);
  await expect(page.getByTestId("rules")).toContainText("✓ by you (AP2 Intent Mandate)");
});

test("seller view: an agent payment is shown as backed by the buyer's signed mandate", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid");
  await page.getByRole("link", { name: "check as the seller →" }).first().click();
  const detail = page.getByTestId("seller-detail");
  await expect(detail).toContainText("Safe to fulfil");
  for (const check of ["Intent Mandate signed by the user", "Cart Mandate signed by the merchant", "Payment attested by the Mandate gateway", "PayPal order carries this payment mandate"]) {
    await expect(detail).toContainText(check);
  }
  await expect(page.getByTestId("seller-grid")).toContainText("Backed by signed mandate");
});

test("market-price rule: an above-market price goes to the user", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Mandate in plain English").fill("Office supplies, $100 a month, nothing over $30, never more than 10% above market price");
  await page.getByRole("button", { name: /Read (my|new) rules/ }).click();
  await expect(page.getByLabel("Max above market (%)")).toHaveValue("10");
  await page.getByRole("button", { name: "Save mandate" }).click();
  await expect(page.getByTestId("rules")).toContainText("at most 10% above market");
  await runAgent(page, "Buy black ink");
  await expect(page.getByTestId("approval")).toContainText("15% above the market price of $19.99");
});

test("an outside AI assistant connects over MCP and can only buy through the mandate", async ({ page, request, baseURL }) => {
  await newMandate(page);
  await page.getByLabel("Assistant name").fill("E2E Agent");
  await page.getByRole("button", { name: "Create connection URL" }).click();
  const url = (await page.getByTestId("connection-url").locator("code").first().textContent())!.trim();
  expect(url).toMatch(/\/api\/mcp\/mdt_/);

  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const client = new Client({ name: "e2e-agent", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  await client.callTool({ name: "search_products", arguments: { query: "sponges" } });
  const paid = (await client.callTool({ name: "buy", arguments: { sku: "sponge-3", qty: 1 } })) as { content: Array<{ text: string }> };
  expect(paid.content[0]!.text).toMatch(/^Paid \$1\.99/);
  const blocked = (await client.callTool({ name: "buy", arguments: { sku: "gift-card-50", qty: 1 } })) as { content: Array<{ text: string }> };
  expect(blocked.content[0]!.text).toMatch(/^Blocked/);
  await client.close();

  await page.reload();
  await expect(page.getByTestId("ledger")).toContainText("via E2E Agent");

  // Revoke: the assistant is cut off.
  await page.getByTestId("connections").getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByTestId("connections")).toContainText("revoked");
  const after = await request.post(url, { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  expect(after.status()).toBe(401);
  void baseURL;
});
