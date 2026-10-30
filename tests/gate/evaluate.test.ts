import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluate } from "@/lib/gate/evaluate";
import type { Policy } from "@/lib/gate/policy";
import type { Intent, Mandate, GateContext } from "@/lib/gate/types";

const policy: Policy = {
  categories: ["household"],
  currency: "GBP",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: ["shady-shop"] },
  overLimit: "ask",
  expires: "2026-12-31",
};

const mandate: Mandate = { id: "m1", userId: "u1", policy, status: "active" };

const intent: Intent = {
  id: "i1",
  mandateId: "m1",
  action: "purchase",
  amountMinor: 450,
  currency: "GBP",
  merchantId: "acme-supplies",
  merchantVerified: true,
  category: "household",
  itemTitle: "Washing-up liquid",
  origin: "agent",
};

const ctx: GateContext = { now: new Date("2026-10-21T10:00:00Z"), spentMinor: 0, reservedMinor: 0 };

describe("policy gate: decisions", () => {
  it("allows an in-policy purchase", () => {
    const d = evaluate(mandate, intent, ctx);
    expect(d.outcome).toBe("allow");
    expect(d.rule).toBe("ok");
  });

  it("blocks when the mandate is paused or revoked", () => {
    expect(evaluate({ ...mandate, status: "paused" }, intent, ctx)).toMatchObject({ outcome: "block", rule: "mandate_inactive" });
    expect(evaluate({ ...mandate, status: "revoked" }, intent, ctx)).toMatchObject({ outcome: "block", rule: "mandate_inactive" });
  });

  it("blocks after the mandate expires (end of the expiry day, UTC)", () => {
    const lateOnExpiryDay = { ...ctx, now: new Date("2026-12-31T23:59:00Z") };
    expect(evaluate(mandate, intent, lateOnExpiryDay).outcome).toBe("allow");
    const dayAfter = { ...ctx, now: new Date("2027-01-01T00:00:01Z") };
    expect(evaluate(mandate, intent, dayAfter)).toMatchObject({ outcome: "block", rule: "mandate_expired" });
  });

  it("blocks an intent for a different mandate", () => {
    expect(evaluate(mandate, { ...intent, mandateId: "other" }, ctx)).toMatchObject({ outcome: "block", rule: "invalid_input" });
  });

  it("blocks a currency mismatch", () => {
    expect(evaluate(mandate, { ...intent, currency: "USD" }, ctx)).toMatchObject({ outcome: "block", rule: "currency" });
  });

  it("blocks anything the agent was told to do by untrusted content, even if in policy", () => {
    const d = evaluate(mandate, { ...intent, origin: "untrusted_instruction" }, ctx);
    expect(d).toMatchObject({ outcome: "block", rule: "untrusted_instruction" });
  });

  it("blocks a category outside the mandate, case-insensitively", () => {
    expect(evaluate(mandate, { ...intent, category: "gift-cards" }, ctx)).toMatchObject({ outcome: "block", rule: "category" });
    expect(evaluate(mandate, { ...intent, category: "Household" }, ctx).outcome).toBe("allow");
  });

  it("blocks unverified and blocklisted sellers", () => {
    expect(evaluate(mandate, { ...intent, merchantVerified: false }, ctx)).toMatchObject({ outcome: "block", rule: "seller" });
    expect(evaluate(mandate, { ...intent, merchantId: "shady-shop" }, ctx)).toMatchObject({ outcome: "block", rule: "seller" });
  });

  it("allows unverified sellers when the mandate does not require verification", () => {
    const relaxed: Mandate = { ...mandate, policy: { ...policy, sellers: { verifiedOnly: false, blocked: [] } } };
    expect(evaluate(relaxed, { ...intent, merchantVerified: false }, ctx).outcome).toBe("allow");
  });

  it("asks for approval above the item cap when overLimit is 'ask'", () => {
    const d = evaluate(mandate, { ...intent, amountMinor: 3200 }, ctx);
    expect(d).toMatchObject({ outcome: "approve", rule: "item_cap" });
    expect(d.reason).toMatch(/£25\.00/);
  });

  it("blocks above the item cap when overLimit is 'block'", () => {
    const strict: Mandate = { ...mandate, policy: { ...policy, overLimit: "block" } };
    expect(evaluate(strict, { ...intent, amountMinor: 3200 }, ctx)).toMatchObject({ outcome: "block", rule: "item_cap" });
  });

  it("treats exactly the item cap as within policy", () => {
    expect(evaluate(mandate, { ...intent, amountMinor: 2500 }, ctx).outcome).toBe("allow");
  });

  it("counts both spent and reserved money against the period budget", () => {
    expect(evaluate(mandate, intent, { ...ctx, spentMinor: 7550 }).outcome).toBe("allow"); // 7550 + 450 = 8000
    expect(evaluate(mandate, intent, { ...ctx, spentMinor: 7551 })).toMatchObject({ outcome: "approve", rule: "budget" });
    expect(evaluate(mandate, intent, { ...ctx, spentMinor: 7000, reservedMinor: 600 })).toMatchObject({ outcome: "approve", rule: "budget" });
  });

  it("an approval converts 'approve' to 'allow' but never overrides a block", () => {
    const approved = { ...ctx, approved: true };
    expect(evaluate(mandate, { ...intent, amountMinor: 3200 }, approved).outcome).toBe("allow");
    expect(evaluate(mandate, { ...intent, category: "gift-cards" }, approved).outcome).toBe("block");
    expect(evaluate({ ...mandate, status: "paused" }, intent, approved).outcome).toBe("block");
  });
});

describe("policy gate: market-price rule", () => {
  const withRule: Mandate = { ...mandate, policy: { ...policy, maxPremiumPct: 10 } };

  it("allows a price up to the allowed premium over the market reference", () => {
    expect(evaluate(withRule, { ...intent, amountMinor: 440, marketReferenceMinor: 400 }, ctx).outcome).toBe("allow"); // exactly +10%
  });

  it("asks above the allowed premium, and says by how much", () => {
    const d = evaluate(withRule, { ...intent, amountMinor: 460, marketReferenceMinor: 400 }, ctx);
    expect(d).toMatchObject({ outcome: "approve", rule: "market_price" });
    expect(d.reason).toMatch(/15% above the market price of £4\.00/);
  });

  it("blocks above the premium when the mandate refuses rather than asks", () => {
    const strict: Mandate = { ...withRule, policy: { ...withRule.policy, overLimit: "block" } };
    expect(evaluate(strict, { ...intent, amountMinor: 460, marketReferenceMinor: 400 }, ctx)).toMatchObject({ outcome: "block", rule: "market_price" });
  });

  it("does not apply when the mandate has no market rule", () => {
    expect(evaluate(mandate, { ...intent, amountMinor: 460, marketReferenceMinor: 400 }, ctx).outcome).toBe("allow");
    expect(evaluate(mandate, { ...intent, amountMinor: 460 }, ctx).outcome).toBe("allow");
  });

  it("without market data the signed rule is never silently skipped: ask by default, or block, or allow as signed", () => {
    const withMode = (marketUnavailable?: "ask" | "block" | "allow"): Mandate => ({ ...withRule, policy: { ...withRule.policy, ...(marketUnavailable ? { marketUnavailable } : {}) } });
    expect(evaluate(withMode(), { ...intent, amountMinor: 460 }, ctx)).toMatchObject({ outcome: "approve", rule: "market_price", reason: expect.stringMatching(/No market price/) });
    expect(evaluate(withMode("ask"), { ...intent, amountMinor: 460 }, ctx)).toMatchObject({ outcome: "approve", rule: "market_price" });
    expect(evaluate(withMode("block"), { ...intent, amountMinor: 460 }, ctx)).toMatchObject({ outcome: "block", rule: "market_price" });
    expect(evaluate(withMode("block"), { ...intent, amountMinor: 460 }, { ...ctx, approved: true })).toMatchObject({ outcome: "block" });
    expect(evaluate(withMode("allow"), { ...intent, amountMinor: 460 }, ctx).outcome).toBe("allow");
    expect(evaluate(withMode("ask"), { ...intent, amountMinor: 460 }, { ...ctx, approved: true }).outcome).toBe("allow");
  });

  it("a user approval lets an above-market purchase through", () => {
    expect(evaluate(withRule, { ...intent, amountMinor: 460, marketReferenceMinor: 400 }, { ...ctx, approved: true }).outcome).toBe("allow");
  });
});

describe("policy gate: fails closed", () => {
  it("blocks non-positive, fractional or non-finite amounts", () => {
    for (const amountMinor of [0, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(evaluate(mandate, { ...intent, amountMinor }, ctx).outcome).toBe("block");
    }
  });

  it("blocks when the stored policy is malformed", () => {
    const broken = { ...mandate, policy: { ...policy, maxItemMinor: "lots" } } as unknown as Mandate;
    expect(evaluate(broken, intent, ctx)).toMatchObject({ outcome: "block", rule: "invalid_input" });
  });

  it("blocks on garbage input instead of throwing", () => {
    expect(evaluate(null as unknown as Mandate, intent, ctx).outcome).toBe("block");
    expect(evaluate(mandate, {} as Intent, ctx).outcome).toBe("block");
    expect(evaluate(mandate, intent, { now: new Date("nope"), spentMinor: 0, reservedMinor: 0 }).outcome).toBe("block");
  });
});

describe("policy gate: properties", () => {
  const arbIntent = fc.record({
    amountMinor: fc.oneof(fc.integer({ min: -5000, max: 20000 }), fc.double()),
    category: fc.constantFrom("household", "office", "gift-cards", "HOUSEHOLD"),
    merchantVerified: fc.boolean(),
    merchantId: fc.constantFrom("acme-supplies", "shady-shop", "corner-store"),
    origin: fc.constantFrom("agent", "untrusted_instruction"),
    currency: fc.constantFrom("GBP", "USD"),
  });
  const arbCtx = fc.record({
    spentMinor: fc.integer({ min: 0, max: 10000 }),
    reservedMinor: fc.integer({ min: 0, max: 10000 }),
  });
  const arbStatus = fc.constantFrom("active", "paused", "revoked") as fc.Arbitrary<Mandate["status"]>;

  it("never throws, whatever it is given", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (m, i) => {
        const d = evaluate(m as Mandate, i as Intent, ctx);
        expect(["allow", "approve", "block"]).toContain(d.outcome);
      }),
    );
  });

  it("an 'allow' without approval always satisfies every limit", () => {
    fc.assert(
      fc.property(arbIntent, arbCtx, arbStatus, (i, c, status) => {
        const d = evaluate({ ...mandate, status }, { ...intent, ...i } as Intent, { ...ctx, ...c });
        if (d.outcome === "allow") {
          expect(status).toBe("active");
          expect(i.origin).toBe("agent");
          expect(i.currency).toBe("GBP");
          expect(i.category.toLowerCase()).toBe("household");
          expect(i.merchantVerified).toBe(true);
          expect(i.merchantId).not.toBe("shady-shop");
          expect(Number.isInteger(i.amountMinor) && i.amountMinor > 0).toBe(true);
          expect(i.amountMinor).toBeLessThanOrEqual(policy.maxItemMinor);
          expect(c.spentMinor + c.reservedMinor + i.amountMinor).toBeLessThanOrEqual(policy.budget.amountMinor);
        }
      }),
    );
  });

  it("an approval never lets through an intent that breaks a hard rule", () => {
    fc.assert(
      fc.property(arbIntent, arbCtx, arbStatus, (i, c, status) => {
        const d = evaluate({ ...mandate, status }, { ...intent, ...i } as Intent, { ...ctx, ...c, approved: true });
        if (d.outcome === "allow") {
          expect(status).toBe("active");
          expect(i.origin).toBe("agent");
          expect(i.category.toLowerCase()).toBe("household");
          expect(i.merchantVerified && i.merchantId !== "shady-shop").toBe(true);
        }
      }),
    );
  });
});
