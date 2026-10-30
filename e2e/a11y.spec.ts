import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const MANDATE = "Household basics, up to $80 a month, nothing over $25, verified sellers only";

const found: string[] = [];
async function scan(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude(".ag-root-wrapper").analyze();
  const summary = r.violations.map((v) => `${name}: ${v.id} (${v.impact}) ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  found.push(...summary);
}

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`every page passes in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await scan(page, "landing");
      await page.goto("/developers");
      await scan(page, "developers");
      await page.goto("/app/setup");
      await page.getByLabel("Your mandate").fill(MANDATE);
      await page.getByRole("button", { name: "Read my rules" }).click();
      await page.getByTestId("rules-editor").waitFor();
      await scan(page, "setup");
      await page.getByRole("button", { name: "Sign and activate" }).click();
      await page.waitForURL(/\/app$/);
      for (const t of ["Buy washing-up liquid and sponges", "Buy an electric kettle"]) {
        await page.getByLabel("Task for the agent").fill(t);
        await page.getByRole("button", { name: "Run agent" }).click();
        await expect(page.getByTestId("feed").locator("li").last()).toContainText(/Finished|couldn't find/);
      }
      await scan(page, "home");
      await page.getByTestId("approval").getByRole("button", { name: "Details", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await scan(page, "approval sheet");
      await page.keyboard.press("Escape");
      await page.getByTestId("activity").getByRole("button", { name: /Paid/ }).first().click();
      await page.getByRole("dialog", { name: "Proof of purchase" }).getByText(/Verified/).waitFor();
      await scan(page, "proof sheet");
      await page.keyboard.press("Escape");
      for (const p of ["/app/orders", "/app/assistants", "/app/receipts", "/seller"]) {
        await page.goto(p);
        await page.waitForLoadState("networkidle");
        await scan(page, p);
      }
      expect(found, found.join("\n")).toEqual([]);
      found.length = 0;
    });
  }
});
