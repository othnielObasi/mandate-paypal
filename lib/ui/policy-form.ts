// Browser-safe: no zod or node imports, so it can run in the client bundle.
import type { Currency, Policy } from "../gate/policy";

export interface PolicyForm {
  categories: string;
  maxItem: string;
  budget: string;
  period: "week" | "month";
  verifiedOnly: boolean;
  blocked: string;
  overLimit: "ask" | "block";
  expires: string;
  /** Max % above the market price; blank = no market rule. */
  maxPremium: string;
}

const dollars = (minor: number) => (minor / 100).toFixed(2);

export function policyToForm(p: Policy): PolicyForm {
  return {
    categories: p.categories.join(", "),
    maxItem: dollars(p.maxItemMinor),
    budget: dollars(p.budget.amountMinor),
    period: p.budget.period,
    verifiedOnly: p.sellers.verifiedOnly,
    blocked: p.sellers.blocked.join(", "),
    overLimit: p.overLimit,
    expires: p.expires,
    maxPremium: p.maxPremiumPct === null || p.maxPremiumPct === undefined ? "" : String(p.maxPremiumPct),
  };
}

function toMinor(s: string): number | null {
  const t = s.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const minor = Math.round(Number(t) * 100);
  return minor > 0 ? minor : null;
}

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Client-side check for fast feedback. The server validates again with the full schema. */
export function formToPolicy(f: PolicyForm, currency: Currency): { ok: true; policy: Policy } | { ok: false; error: string } {
  const categories = list(f.categories).map((c) => c.toLowerCase());
  if (categories.length === 0) return { ok: false, error: "Add at least one category." };
  const maxItemMinor = toMinor(f.maxItem);
  if (maxItemMinor === null) return { ok: false, error: "The per-item limit must be an amount like 25 or 25.00." };
  const amountMinor = toMinor(f.budget);
  if (amountMinor === null) return { ok: false, error: "The budget must be an amount like 80 or 80.00." };
  if (maxItemMinor > amountMinor) return { ok: false, error: "The per-item limit can't be more than the budget." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.expires)) return { ok: false, error: "Pick an expiry date." };
  const premium = f.maxPremium.trim().replace(/%$/, "");
  if (premium && !(/^\d{1,3}$/.test(premium) && Number(premium) <= 200)) return { ok: false, error: "The market-price limit must be a whole percentage from 0 to 200, or blank." };
  return {
    ok: true,
    policy: {
      categories,
      currency,
      maxItemMinor,
      budget: { amountMinor, period: f.period },
      sellers: { verifiedOnly: f.verifiedOnly, blocked: list(f.blocked) },
      overLimit: f.overLimit,
      expires: f.expires,
      maxPremiumPct: premium ? Number(premium) : null,
    },
  };
}
