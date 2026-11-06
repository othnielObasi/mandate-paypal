import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type TrustedMerchant = {
  publicKey?: string;
  verified?: boolean;
  name?: string;
};

export const trustedMerchantSchema: Schema<TrustedMerchant> = s.object<TrustedMerchant>({
  publicKey: s.optional(s.string()),
  verified: s.optional(s.boolean()),
  name: s.optional(s.string()),
});
