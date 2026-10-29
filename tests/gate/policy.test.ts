import { describe, it, expect } from "vitest";
import { parsePolicy, PolicySchema } from "@/lib/gate/policy";

const valid = {
  categories: ["household"],
  currency: "GBP",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2026-12-31",
};

describe("policy schema", () => {
  it("accepts a well-formed policy", () => {
    const r = parsePolicy(valid);
    expect(r.ok).toBe(true);
  });

  it("rejects an empty category list", () => {
    expect(parsePolicy({ ...valid, categories: [] }).ok).toBe(false);
  });

  it("rejects fractional or non-positive money amounts", () => {
    expect(parsePolicy({ ...valid, maxItemMinor: 25.5 }).ok).toBe(false);
    expect(parsePolicy({ ...valid, maxItemMinor: 0 }).ok).toBe(false);
    expect(parsePolicy({ ...valid, budget: { amountMinor: -1, period: "month" } }).ok).toBe(false);
  });

  it("rejects an item cap larger than the period budget", () => {
    expect(parsePolicy({ ...valid, maxItemMinor: 9000 }).ok).toBe(false);
  });

  it("rejects unknown currencies, periods and overLimit modes", () => {
    expect(parsePolicy({ ...valid, currency: "BTC" }).ok).toBe(false);
    expect(parsePolicy({ ...valid, budget: { amountMinor: 8000, period: "decade" } }).ok).toBe(false);
    expect(parsePolicy({ ...valid, overLimit: "maybe" }).ok).toBe(false);
  });

  it("rejects unknown fields so a model cannot smuggle in extra powers", () => {
    expect(parsePolicy({ ...valid, allowAnything: true }).ok).toBe(false);
  });

  it("rejects an invalid expiry date", () => {
    expect(parsePolicy({ ...valid, expires: "not-a-date" }).ok).toBe(false);
  });

  it("accepts an optional market-price premium between 0 and 200%", () => {
    expect(parsePolicy({ ...valid, maxPremiumPct: 10 }).ok).toBe(true);
    expect(parsePolicy({ ...valid, maxPremiumPct: 0 }).ok).toBe(true);
    expect(parsePolicy({ ...valid, maxPremiumPct: null }).ok).toBe(true);
    expect(parsePolicy({ ...valid, maxPremiumPct: -1 }).ok).toBe(false);
    expect(parsePolicy({ ...valid, maxPremiumPct: 201 }).ok).toBe(false);
    expect(parsePolicy({ ...valid, maxPremiumPct: 2.5 }).ok).toBe(false);
  });

  it("normalises category names to lower case", () => {
    const r = PolicySchema.parse({ ...valid, categories: ["Household", " OFFICE "] });
    expect(r.categories).toEqual(["household", "office"]);
  });
});
