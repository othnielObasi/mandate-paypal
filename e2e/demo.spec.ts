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
