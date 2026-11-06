import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { budgetContextSchema, type BudgetContext } from "./budget-context.js";
import { specSchema, type Spec } from "./spec.js";

export type Ap2Evidence = {
  spec?: Spec;
  mode?: string;
  /** Merchant-signed UCP checkout (ES256 JWT) */
  checkoutJwt?: string;
  /** Checkout Mandate SD-JWT chain */
  checkoutChain?: string;
  /** Payment Mandate SD-JWT chain */
  paymentChain?: string;
  /** Budget already used in the period, for the budget constraint */
  context?: BudgetContext;
  /** Merchant receipt (ES256 JWT) */
  checkoutReceipt?: string;
  /** Payment gateway receipt with PayPal order and capture IDs (ES256 JWT) */
  paymentReceipt?: string;
  openCheckoutHash?: string;
  /** WebAuthn assertion, present when the buyer approved on their device */
  passkey?: Record<string, unknown>;
};

export const ap2EvidenceSchema: Schema<Ap2Evidence> = s.object<Ap2Evidence>({
  spec: s.optional(s.lazy(() => specSchema)),
  mode: s.optional(s.string()),
  checkoutJwt: s.optional(s.string()),
  checkoutChain: s.optional(s.string()),
  paymentChain: s.optional(s.string()),
  context: s.optional(s.lazy(() => budgetContextSchema)),
  checkoutReceipt: s.optional(s.string()),
  paymentReceipt: s.optional(s.string()),
  openCheckoutHash: s.optional(s.string()),
  passkey: s.optional(s.record(s.string(), s.unknown())),
});
