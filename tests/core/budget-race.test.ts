import { describe, it, expect } from "vitest";
import { Pool } from "pg";
import { createContainer } from "@/lib/server/container";
import { exportPrivatePem, generateSigner } from "@/lib/gate/keys";
import type { Policy } from "@/lib/gate/policy";
import type { Sql } from "@/lib/db/sql";
import { verifyChain } from "@/lib/gate/receipts";

// $50 a month, $25 an item: two $24.99 bundles fit, a third must not.
const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 5000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2099-12-31",
};

type C = ReturnType<typeof createContainer>;
const bundle = (c: C, mandateId: string) => {
  const p = c.catalog.get("platinum-bundle")!;
  return {
    mandateId,
    order: { mandateId, merchantId: p.merchantId, currency: "USD" as const, items: [{ sku: p.sku, title: p.title, unitMinor: p.unitMinor, qty: 1 }] },
    category: p.category,
    merchantVerified: p.merchantVerified,
    origin: "agent" as const,
  };
};

async function race(processes: C[], mandateId: string, n = 8) {
  const results = await Promise.all(Array.from({ length: n }, (_, i) => processes[i % processes.length]!.governor.propose(bundle(processes[0]!, mandateId))));
  const paid = results.filter((r) => r.status === "paid").length;
  const status = await processes[0]!.governor.budgetStatus(mandateId);
  // Over budget is not paid: it goes to the user (overLimit "ask") under the budget rule.
  const others = results.filter((r) => r.status !== "paid").map((r) => `${r.status}:${(r as { decision: { rule: string } }).decision.rule}`);
  return { paid, spent: status!.spentMinor, reserved: status!.reservedMinor, others };
}

describe("budget under concurrent agents", () => {
  it("never authorises more than the signed budget when agents buy at the same time (one process)", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "u", policy, rawText: "x" });
    const r = await race([c], m.id);
    expect(r.paid).toBe(2);
    expect(r.spent).toBe(4998);
    expect(r.spent + r.reserved).toBeLessThanOrEqual(5000);
    expect(new Set(r.others)).toEqual(new Set(["pending_approval:budget"]));
  });

  const TEST_DB = process.env.TEST_DATABASE_URL;
  it.skipIf(!TEST_DB)("holds across separate server processes sharing one Postgres", async () => {
    const a = new Pool({ connectionString: TEST_DB, max: 5 });
    await a.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    const b = new Pool({ connectionString: TEST_DB, max: 5 });
    try {
      const env = { MANDATE_SIGNING_KEY: exportPrivatePem(generateSigner()) };
      const p1 = createContainer(env, { sql: a as unknown as Sql });
      const m = await p1.governor.createMandate({ userId: "u", policy, rawText: "x" });
      const p2 = createContainer(env, { sql: b as unknown as Sql });
      await p2.governor.budgetStatus(m.id); // second process is up (schema already exists)
      const r = await race([p1, p2], m.id, 10);
      expect(r.paid).toBe(2);
      expect(r.spent + r.reserved).toBeLessThanOrEqual(5000);
      // Both processes wrote to one receipt chain; it is still a single, unbroken chain.
      expect(verifyChain(await p2.receipts.list(), p1.signer.publicKey)).toMatchObject({ ok: true });
    } finally {
      await a.end();
      await b.end();
    }
  });
});
