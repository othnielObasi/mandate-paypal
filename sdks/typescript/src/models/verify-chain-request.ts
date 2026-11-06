import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type VerifyChainRequest = {
  /** Intent Mandate as returned in `chain.intent` */
  intent: Record<string, unknown>;
  /** Cart Mandate as returned in `chain.cart` */
  cart: Record<string, unknown>;
  /** Payment Mandate as returned in `chain.payment` */
  payment: Record<string, unknown>;
};

export const verifyChainRequestSchema: Schema<VerifyChainRequest> = s.object<VerifyChainRequest>({
  intent: s.record(s.string(), s.unknown()),
  cart: s.record(s.string(), s.unknown()),
  payment: s.record(s.string(), s.unknown()),
});
