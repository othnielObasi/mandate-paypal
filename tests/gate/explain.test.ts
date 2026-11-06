import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluate } from "@/lib/gate/evaluate";
import { explain } from "@/lib/gate/explain";
import type { Policy } from "@/lib/gate/policy";
import type { Intent, Mandate, GateContext } from "@/lib/gate/types";

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: ["shady-shop"] },
  overLimit: "ask",
  expires: "2026-12-31",
};
const mandate: Mandate = { id: "m1", userId: "u1", policy, status: "active" };
const intent: Intent = { id: "i1", mandateId: "m1", action: "purchase", amountMinor: 450, currency: "USD", merchantId: "acme-supplies", merchantVerified: true, category: "household", itemTitle: "Washing-up liquid", origin: "agent" };
const ctx: GateContext = { now: new Date("2026-10-21T10:00:00Z"), spentMinor: 0, reservedMinor: 0 };

describe("gate trace (explain)", () => {
  it("lists every rule in the gate's order", () => {
    const t = explain(mandate, intent, ctx);
    expect(t.steps.map((s) => s.rule)).toEqual(["mandate", "source", "category", "seller", "item_cap", "market_price", "budget"]);
    expect(t.outcome).toBe("allow");
    expect(t.steps.find((s) => s.rule === "market_price")!.status).toBe("off");
  });

  it("stops at the first rule that decides; later rules are not reached", () => {
    const t = explain(mandate, { ...intent, merchantId: "corner-mart", merchantVerified: false }, ctx);
    expect(t.outcome).toBe("block");
    expect(t.steps.map((s) => s.status)).toEqual(["pass", "pass", "pass", "block", "skip", "skip", "skip"]);
  });

  it("an injected purchase is stopped at its source", () => {
    const t = explain(mandate, { ...intent, origin: "untrusted_instruction" }, ctx);
    expect(t.steps[1]).toMatchObject({ rule: "source", status: "block" });
  });

  it("an over-limit item asks, and shows as approved once the user approves it", () => {
    const over = { ...intent, amountMinor: 3200 };
    expect(explain(mandate, over, ctx).steps[4]).toMatchObject({ status: "ask", value: "$32.00 is over $25.00" });
    const ok = explain(mandate, over, { ...ctx, approved: true });
    expect(ok.outcome).toBe("allow");
    expect(ok.steps[4]!.status).toBe("approved");
  });

  it("always reaches the same outcome as the gate itself", () => {
    const arb = fc.record({
      status: fc.constantFrom("active", "paused", "revoked"),
      overLimit: fc.constantFrom("ask", "block"),
      verifiedOnly: fc.boolean(),
      pct: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
      unavailable: fc.constantFrom("ask", "block", "allow", undefined),
      expired: fc.boolean(),
      amount: fc.integer({ min: 1, max: 12_000 }),
      ref: fc.option(fc.integer({ min: 1, max: 12_000 }), { nil: undefined }),
      verified: fc.boolean(),
      merchant: fc.constantFrom("acme-supplies", "shady-shop", "corner-mart"),
      category: fc.constantFrom("household", "electronics"),
      origin: fc.constantFrom("agent", "untrusted_instruction"),
      currency: fc.constantFrom("USD", "GBP"),
      spent: fc.integer({ min: 0, max: 9000 }),
      reserved: fc.integer({ min: 0, max: 3000 }),
      approved: fc.boolean(),
    });
    fc.assert(
      fc.property(arb, (a) => {
        const m: Mandate = {
          ...mandate,
          status: a.status as Mandate["status"],
          policy: {
            ...policy,
            overLimit: a.overLimit as Policy["overLimit"],
            sellers: { verifiedOnly: a.verifiedOnly, blocked: ["shady-shop"] },
            ...(a.pct !== undefined ? { maxPremiumPct: a.pct } : {}),
            ...(a.unavailable ? { marketUnavailable: a.unavailable as Policy["marketUnavailable"] } : {}),
          },
        };
        const i: Intent = { ...intent, amountMinor: a.amount, merchantId: a.merchant, merchantVerified: a.verified, category: a.category, origin: a.origin as Intent["origin"], currency: a.currency as Intent["currency"], ...(a.ref !== undefined ? { marketReferenceMinor: a.ref } : {}) };
        const c: GateContext = { now: a.expired ? new Date("2027-02-01T00:00:00Z") : ctx.now, spentMinor: a.spent, reservedMinor: a.reserved, approved: a.approved };
        const d = evaluate(m, i, c);
        const t = explain(m, i, c);
        expect(t.outcome).toBe(d.outcome);
        // Exactly one rule decides a non-allow outcome, and everything after it is unreached.
        const deciding = t.steps.findIndex((s) => s.status === "ask" || s.status === "block");
        if (d.outcome === "allow") expect(deciding).toBe(-1);
        else expect(t.steps.slice(deciding + 1).every((s) => s.status === "skip")).toBe(true);
      }),
      { numRuns: 4000 },
    );
  });
});
