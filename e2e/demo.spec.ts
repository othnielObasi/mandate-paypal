import { test, expect, type Page } from "@playwright/test";

const MANDATE = "Household basics, up to $80 a month, nothing over $25, verified sellers only";

async function newMandate(page: Page, edit?: (page: Page) => Promise<void>, text = MANDATE) {
  await page.goto("/app/setup");
  await page.getByLabel("Your mandate").fill(text);
  await page.getByRole("button", { name: "Read my rules" }).click();
  await expect(page.getByTestId("rules-editor")).toBeVisible();
  if (edit) await edit(page);
  await page.getByRole("button", { name: "Sign and activate" }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByTestId("rules")).toBeVisible();
}

async function runAgent(page: Page, task: string) {
  await page.getByLabel("Task for the agent").fill(task);
  await page.getByRole("button", { name: "Run agent" }).click();
  await expect(page.getByTestId("feed").locator("li").last()).toContainText(/Finished|couldn't find/);
}

const feed = (page: Page) => page.getByTestId("feed");

test.describe("landing page", () => {
  test("explains the product and leads into the app", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Let AI shop for you");
    for (const h of ["One sentence becomes rules", "Pays, asks you, or never happens", "Know an agent", "Use the AI you already have"]) {
      await expect(page.getByRole("heading", { name: new RegExp(h) }).first()).toBeVisible();
    }
    await page.getByRole("link", { name: /Try the live demo/ }).first().click();
    await expect(page).toHaveURL(/\/app\/setup$/);
    await expect(page.getByRole("heading", { name: "What may your agents buy for you?" })).toBeVisible();
  });

  test("an empty account is guided to write a mandate", async ({ page, request }) => {
    const ms = (await (await request.get("/api/mandates")).json()) as unknown[];
    test.skip(ms.length > 0, "only meaningful on a fresh server");
    await page.goto("/app");
    await expect(page.getByRole("link", { name: "Write my mandate" })).toBeVisible();
  });
});

test("the AI reads the rules, the user edits them before signing", async ({ page }) => {
  await newMandate(page, async (p) => {
    await p.getByLabel("Most they can spend on one order").fill("30");
  });
  await expect(page.getByTestId("rules")).toContainText("Up to $30.00 per order");
  await expect(page.getByTestId("rules")).toContainText("$80.00 per month in total");
});

test("an impossible edit is caught before signing", async ({ page }) => {
  await page.goto("/app/setup");
  await page.getByRole("button", { name: "Read my rules" }).click();
  await page.getByLabel("Most they can spend on one order").fill("500");
  await page.getByRole("button", { name: "Sign and activate" }).click();
  await expect(page.getByText("can't be more than the budget")).toBeVisible();
  await expect(page).toHaveURL(/\/app\/setup$/);
});

test("in-policy purchases are paid and counted against the budget", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid and sponges");
  await expect(feed(page).getByText("Paid", { exact: true })).toHaveCount(2);
  await expect(page.getByTestId("budget")).toContainText("$6.49 spent");
  await expect(page.getByTestId("activity")).toContainText("Eco washing-up liquid 500ml");
});

test("guided first run ticks off steps; a paid purchase opens its AP2 proof", async ({ page }) => {
  await newMandate(page);
  const tour = page.getByTestId("try-it");
  await expect(tour).toContainText("0 of 3");
  await tour.getByRole("button", { name: "Buy washing-up liquid" }).click();
  await expect(tour).toContainText("1 of 3");
  await page.getByTestId("activity").getByRole("button", { name: /Eco washing-up liquid 500ml, Paid/ }).click();
  const proof = page.getByRole("dialog", { name: "Proof of purchase" });
  await expect(proof).toContainText("Verified · AP2 v0.2");
  await expect(proof).toContainText("Within the limits you signed");
  await expect(proof.getByRole("link", { name: "Download evidence" })).toBeVisible();
  await page.keyboard.press("Escape");
  await tour.getByRole("button", { name: "Run the drill" }).click();
  await expect(tour).toContainText("2 of 3");
  await tour.getByRole("button", { name: "Hide" }).click();
  await expect(tour).toHaveCount(0);
});

test("over the item limit asks the user; approving pays", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy an electric kettle");
  const card = page.getByTestId("approval");
  await expect(card).toContainText("$32.00 is over the item limit of $25.00");
  await card.getByRole("button", { name: "Approve and sign" }).click();
  await expect(card).toHaveCount(0);
  await expect(feed(page).getByText("Approved by you.")).toBeVisible();
  await expect(page.getByTestId("budget")).toContainText("$32.00 spent");
});

test("the approval sheet shows why, and approving from it pays", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy an electric kettle");
  await page.getByTestId("approval").getByRole("button", { name: "Details", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Approve a purchase" });
  await expect(sheet).toContainText("Per-item limit");
  await expect(sheet).toContainText("Electric kettle 1.7L");
  await sheet.getByRole("button", { name: "Approve and sign" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByTestId("budget")).toContainText("$32.00 spent");
});

test("an unverified seller is blocked", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy toilet roll");
  await expect(feed(page)).toContainText("corner-mart is not a verified seller");
  await expect(page.getByTestId("budget")).toContainText("$0.00 spent");
});

test("compromised-agent drill: injected purchases are blocked, and the page text is shown", async ({ page }) => {
  await newMandate(page);
  await page.getByRole("button", { name: "Compromised-agent drill" }).click();
  await expect(feed(page).getByText("steered by untrusted content")).toHaveCount(2);
  await expect(feed(page).getByText("Paid", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: /Platinum Deep-Clean Bundle, Blocked/ }).click();
  const sheet = page.getByRole("dialog", { name: "A purchase was stopped" });
  await expect(sheet).toContainText("A shop's page tried to make your agent buy something");
  await expect(sheet).toContainText("SYSTEM NOTE");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
});

test("pausing the mandate stops the agent", async ({ page }) => {
  await newMandate(page);
  await page.getByRole("button", { name: "Pause all agents" }).click();
  await expect(page.getByRole("button", { name: "Resume agents" })).toBeVisible();
  await expect(page.getByLabel("Task for the agent")).toBeDisabled();
  await page.getByRole("button", { name: "Resume agents" }).click();
  await expect(page.getByLabel("Task for the agent")).toBeEnabled();
});

test("lost parcel → AI-drafted dispute → edited → filed after confirmation", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid");
  await page.getByRole("link", { name: "Orders" }).first().click();
  await page.getByRole("button", { name: "Simulate lost parcel" }).click();
  await expect(page.getByText("Not received", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Draft dispute" }).click();
  const dispute = page.getByTestId("dispute");
  await expect(dispute).toContainText("Your dispute is drafted");
  await expect(dispute.locator("blockquote")).toContainText("$4.50");
  await expect(dispute).toContainText(/\d+ signed receipts/);

  await dispute.getByRole("button", { name: "Edit the statement" }).click();
  const mine = "My order for $4.50 was lost by the carrier and never arrived. Please refund me in full.";
  await dispute.getByLabel("Your statement to PayPal").fill(mine);
  await dispute.getByRole("button", { name: "Save statement" }).click();
  await expect(dispute.locator("blockquote")).toHaveText(mine);
  await expect(dispute).toContainText("In your words.");

  await dispute.getByRole("button", { name: "Confirm and file with PayPal" }).click();
  await expect(dispute).toContainText("Dispute filed with PayPal");
  await expect(dispute).toContainText("SIM-PP-D-");
});

test("ledger: verified on load; editing a receipt is detected, undoing restores trust", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid");
  await page.goto("/app/receipts");
  const ledger = page.getByTestId("ledger");
  await expect(page.getByTestId("verify-result")).toContainText("verified");

  const paymentCell = ledger.locator(".ag-row").filter({ hasText: "Payment" }).locator(".ag-cell[col-id='summary']").first();
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

test("works at phone width: no sideways scrolling, tab bar navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await newMandate(page);
  await runAgent(page, "Buy sponges");
  for (const path of ["/", "/app", "/app/orders", "/app/assistants", "/app/receipts", "/seller"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `sideways scroll on ${path}`).toBeLessThanOrEqual(0);
  }
  await page.goto("/app");
  const tabs = page.getByRole("navigation", { name: "Main" }).last();
  await tabs.getByRole("link", { name: "Receipts" }).click();
  await expect(page).toHaveURL(/\/app\/receipts$/);
  const header = page.getByTestId("ledger").locator(".ag-header-cell[col-id='summary']");
  await header.scrollIntoViewIfNeeded();
  expect((await header.boundingBox())!.x).toBeLessThan(390 - 100);
});

test("the mandate is signed by the user (AP2 Intent Mandate)", async ({ page }) => {
  await newMandate(page);
  await expect(page.getByText(/Signed by you · Intent Mandate/)).toBeVisible();
});

test("seller view: an agent payment is verified under AP2 v0.2 and backed by the buyer's signed mandate", async ({ page }) => {
  await newMandate(page);
  await runAgent(page, "Buy washing-up liquid");
  await page.goto("/app/orders");
  await page.getByRole("link", { name: "Check as the seller" }).first().click();
  const detail = page.getByTestId("seller-detail");
  await expect(detail).toContainText("Safe to fulfil");
  await expect(detail).toContainText("AP2 v0.2");
  for (const check of ["Checkout signed by the merchant", "Checkout Mandate chain verifies", "Payment within the user's open Payment Mandate", "Merchant's checkout receipt", "Payment receipt from the payment gateway"]) {
    await expect(detail).toContainText(check);
  }
  // The original Mandate v1 chain still verifies alongside.
  for (const check of ["Intent Mandate signed by the user", "PayPal order carries this payment mandate"]) {
    await expect(detail).toContainText(check);
  }
  await expect(detail.getByRole("link", { name: "Download AP2 evidence pack" })).toHaveAttribute("href", /\/api\/ap2\/orders\//);
  await expect(page.getByTestId("seller-grid")).toContainText("Safe to fulfil");
});

test("market-price rule: an above-market price goes to the user", async ({ page }) => {
  await page.goto("/app/setup");
  await page.getByLabel("Your mandate").fill("Office supplies, $100 a month, nothing over $30, never more than 10% above market price");
  await page.getByRole("button", { name: "Read my rules" }).click();
  await expect(page.getByLabel("Fair price")).toHaveValue("10");
  await page.getByRole("button", { name: "Sign and activate" }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByTestId("rules")).toContainText("Never more than 10% above market price");
  await runAgent(page, "Buy black ink");
  await expect(page.getByTestId("approval")).toContainText("15% above the market price of $19.99");
});

test("an outside AI assistant connects over MCP and can only buy through the mandate", async ({ page, request }) => {
  await newMandate(page);
  await page.goto("/app/assistants");
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

  await page.goto("/app");
  await expect(page.getByTestId("activity")).toContainText("E2E Agent");

  // Revoke: the assistant is cut off.
  await page.goto("/app/assistants");
  await page.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  const after = await request.post(url, { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  expect(after.status()).toBe(401);
});
