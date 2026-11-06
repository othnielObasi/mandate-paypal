import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { ap2EvidenceSchema, type Ap2Evidence } from "./ap2-evidence.js";
import { checkSchema, type Check } from "./check.js";
import { merchantRefSchema, type MerchantRef } from "./merchant-ref.js";
import { modeSchema, type Mode } from "./mode.js";
import { moneySchema, type Money } from "./money.js";

export type Ap2Verdict = {
  /** @default "ap2/0.2" */
  spec?: "ap2/0.2";
  paypalOrderId?: string;
  /** Safe to fulfil only when true */
  ok: boolean;
  mode?: Mode;
  /**
   * checkout_signed, checkout_chain, checkout_hash, checkout_constraints, payment_chain,
   * payment_matches_checkout, payment_constraints, checkout_receipt, payment_receipt, and
   * passkey_approval when the buyer approved on their device.
   */
  checks: Check[];
  amount?: Money;
  merchant?: MerchantRef;
  evidence: Ap2Evidence;
};

export const ap2VerdictSchema: Schema<Ap2Verdict> = s.object<Ap2Verdict>({
  spec: s.defaulted(s.literal("ap2/0.2"), "ap2/0.2"),
  paypalOrderId: s.optional(s.string()),
  ok: s.boolean(),
  mode: s.optional(s.lazy(() => modeSchema)),
  checks: s.array(s.lazy(() => checkSchema)),
  amount: s.optional(s.lazy(() => moneySchema)),
  merchant: s.optional(s.lazy(() => merchantRefSchema)),
  evidence: ap2EvidenceSchema,
});
