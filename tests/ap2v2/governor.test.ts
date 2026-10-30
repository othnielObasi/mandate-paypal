import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createContainer } from "@/lib/server/container";
import { publicJwk } from "@/lib/ap2v2/es256";
import { verifyPurchase } from "@/lib/ap2v2/mandates";
import type { Policy } from "@/lib/gate/policy";

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2099-12-31",
};

function order(c: ReturnType<typeof createContainer>, mandateId: string, sku: string) {
  const p = c.catalog.get(sku)!;
  return {
    mandateId,
    order: { mandateId, merchantId: p.merchantId, currency: "USD" as const, items: [{ sku: p.sku, title: p.title, unitMinor: p.unitMinor, qty: 1 }] },
    category: p.category,
    merchantVerified: p.merchantVerified,
    origin: "agent" as const,
  };
}

function keysFor(c: ReturnType<typeof createContainer>) {
  const k = c.credentials.ap2;
  return { root: (h: Record<string, unknown>) => k.byKid(h.kid)!, merchant: (id: string) => k.byKid(`merchant:${id}`), receiptIssuer: (iss: string) => k.byKid(iss) };
}

describe("AP2 v0.2 through the real purchase flow", () => {
  it("signing the rules issues AP2 open mandates; an agent purchase produces a full, verifiable AP2 bundle with receipts", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    expect(m.ap2).toMatchObject({ spec: "ap2/0.2", openCheckoutHash: expect.any(String) });

    const r = await c.governor.propose(order(c, m.id, "wul-500"));
    expect(r.status).toBe("paid");
    const rec = await c.stores.credentials.getByOrder((r as { paypalOrderId: string }).paypalOrderId);
    expect(rec?.ap2).toMatchObject({ mode: "human_not_present", checkoutReceipt: expect.any(String), paymentReceipt: expect.any(String) });

    const v = verifyPurchase(rec!.ap2!, keysFor(c), { context: rec!.ap2!.context });
    expect(v.checks.filter((x) => !x.ok)).toEqual([]);
    expect(v.amount).toEqual({ amount: 450, currency: "USD" });
  });

  it("a purchase the user approves is closed with the user's key (human present)", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    const asked = await c.governor.propose(order(c, m.id, "kettle"));
    expect(asked.status).toBe("pending_approval");
    const paid = await c.governor.decide((asked as { approvalId: string }).approvalId, "approve");
    expect(paid.status).toBe("paid");
    const rec = await c.stores.credentials.getByOrder((paid as { paypalOrderId: string }).paypalOrderId);
    const v = verifyPurchase(rec!.ap2!, keysFor(c));
    expect(v.mode).toBe("human_present");
    expect(v.ok).toBe(true);
  });

  it.skipIf(!process.env.AP2_PYTHON)("the AP2 reference SDK accepts the evidence Mandate stored for a real purchase", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    const r = await c.governor.propose(order(c, m.id, "sponge-3"));
    const rec = await c.stores.credentials.getByOrder((r as { paypalOrderId: string }).paypalOrderId);
    const root = publicJwk(c.credentials.ap2.provider);
    const run = (req: unknown) => JSON.parse(spawnSync(process.env.AP2_PYTHON!, [join(__dirname, "interop/ref.py")], { input: JSON.stringify(req), encoding: "utf8" }).stdout);
    const ctx = { total_amount: rec!.ap2!.context.totalAmount, total_uses: rec!.ap2!.context.totalUses };
    expect(run({ op: "verify_payment", chain: rec!.ap2!.paymentChain, root_jwk: root, open_checkout_hash: m.ap2!.openCheckoutHash, context: ctx }).violations).toEqual([]);
    expect(run({ op: "verify_checkout", chain: rec!.ap2!.checkoutChain, root_jwk: root, checkout_jwt: rec!.ap2!.checkoutJwt }).violations).toEqual([]);
  });
});
