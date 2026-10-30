import { describe, it, expect } from "vitest";
import { policyToForm, formToPolicy } from "@/lib/ui/policy-form";
import type { Policy } from "@/lib/gate/policy";

const policy: Policy = {
  categories: ["household", "office"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: ["shady-shop"] },
  overLimit: "ask",
  expires: "2027-01-19",
};

describe("policy form", () => {
  it("shows money in dollars and lists as comma text", () => {
    expect(policyToForm(policy)).toEqual({
      categories: "household, office",
      maxItem: "25.00",
      budget: "80.00",
      period: "month",
      verifiedOnly: true,
      blocked: "shady-shop",
      overLimit: "ask",
      expires: "2027-01-19",
      maxPremium: "",
      marketUnavailable: "ask",
    });
  });

  it("signs the no-market-price choice only with a market rule", () => {
    expect(formToPolicy({ ...policyToForm(policy), maxPremium: "10", marketUnavailable: "block" }, "USD")).toMatchObject({ ok: true, policy: { maxPremiumPct: 10, marketUnavailable: "block" } });
    const off = formToPolicy({ ...policyToForm(policy), maxPremium: "", marketUnavailable: "block" }, "USD");
    expect(off.ok && "marketUnavailable" in off.policy).toBe(false);
  });

  it("edits the market-price premium; blank means no market rule", () => {
    expect(formToPolicy({ ...policyToForm(policy), maxPremium: "10" }, "USD")).toMatchObject({ ok: true, policy: { maxPremiumPct: 10 } });
    expect(formToPolicy({ ...policyToForm(policy), maxPremium: " " }, "USD")).toMatchObject({ ok: true, policy: { maxPremiumPct: null } });
    expect(formToPolicy({ ...policyToForm(policy), maxPremium: "ten" }, "USD")).toMatchObject({ ok: false, error: expect.stringMatching(/market/i) });
    expect(policyToForm({ ...policy, maxPremiumPct: 15 }).maxPremium).toBe("15");
  });

  it("round-trips", () => {
    expect(formToPolicy(policyToForm(policy), "USD")).toEqual({ ok: true, policy: { ...policy, maxPremiumPct: null } });
  });

  it("parses edited dollar amounts to whole cents", () => {
    const r = formToPolicy({ ...policyToForm(policy), maxItem: "40", budget: "$120.5" }, "USD");
    expect(r).toMatchObject({ ok: true, policy: { maxItemMinor: 4000, budget: { amountMinor: 12050 } } });
  });

  it("rejects bad amounts, empty categories and an item cap above the budget", () => {
    expect(formToPolicy({ ...policyToForm(policy), maxItem: "abc" }, "USD")).toMatchObject({ ok: false, error: expect.stringMatching(/per-item/i) });
    expect(formToPolicy({ ...policyToForm(policy), budget: "0" }, "USD")).toMatchObject({ ok: false, error: expect.stringMatching(/budget/i) });
    expect(formToPolicy({ ...policyToForm(policy), maxItem: "1.234" }, "USD").ok).toBe(false);
    expect(formToPolicy({ ...policyToForm(policy), categories: " , " }, "USD")).toMatchObject({ ok: false, error: expect.stringMatching(/categor/i) });
    expect(formToPolicy({ ...policyToForm(policy), maxItem: "90" }, "USD")).toMatchObject({ ok: false, error: expect.stringMatching(/budget/i) });
  });

  it("drops empty blocked-seller entries", () => {
    expect(formToPolicy({ ...policyToForm(policy), blocked: " , a ,," }, "USD")).toMatchObject({ ok: true, policy: { sellers: { blocked: ["a"] } } });
  });
});
