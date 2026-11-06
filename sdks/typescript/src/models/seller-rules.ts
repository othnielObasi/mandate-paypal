import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type SellerRules = {
  verifiedOnly?: boolean;
  blocked?: string[];
};

export const sellerRulesSchema: Schema<SellerRules> = s.object<SellerRules>({
  verifiedOnly: s.optional(s.boolean()),
  blocked: s.optional(s.array(s.string())),
});
