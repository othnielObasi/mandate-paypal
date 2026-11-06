import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { jwksSchema, type Jwks } from "./jwks.js";
import { trustedMerchantSchema, type TrustedMerchant } from "./trusted-merchant.js";

export type Trust = {
  users?: Record<string, string>;
  merchants?: Record<string, TrustedMerchant>;
  /** Ed25519 PEM */
  platform?: string;
  ap2?: Jwks;
};

export const trustSchema: Schema<Trust> = s.object<Trust>({
  users: s.optional(s.record(s.string(), s.string())),
  merchants: s.optional(
    s.record(
      s.string(),
      s.lazy(() => trustedMerchantSchema),
    ),
  ),
  platform: s.optional(s.string()),
  ap2: s.optional(s.lazy(() => jwksSchema)),
});
