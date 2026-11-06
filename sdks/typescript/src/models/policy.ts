import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { budgetSchema, type Budget } from "./budget.js";
import { marketUnavailableSchema, type MarketUnavailable } from "./market-unavailable.js";
import { overLimitSchema, type OverLimit } from "./over-limit.js";
import { sellerRulesSchema, type SellerRules } from "./seller-rules.js";

/** The signed rules. Money is in minor units (cents). */
export type Policy = {
  categories?: string[];
  currency?: string;
  maxItemMinor?: number;
  budget?: Budget;
  sellers?: SellerRules;
  overLimit?: OverLimit;
  /** Fair-price limit, % above market */
  maxPremiumPct?: number | null;
  marketUnavailable?: MarketUnavailable;
  expires?: string;
};

export const policySchema: Schema<Policy> = s.object<Policy>({
  categories: s.optional(s.array(s.string())),
  currency: s.optional(s.string()),
  maxItemMinor: s.optional(s.int()),
  budget: s.optional(s.lazy(() => budgetSchema)),
  sellers: s.optional(s.lazy(() => sellerRulesSchema)),
  overLimit: s.optional(s.lazy(() => overLimitSchema)),
  maxPremiumPct: s.optionalNullable(s.int()),
  marketUnavailable: s.optional(s.lazy(() => marketUnavailableSchema)),
  expires: s.optional(s.dateOnly()),
});
