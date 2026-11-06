import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { decisionSchema, type Decision } from "./decision.js";
import { status3Schema, type Status3 } from "./status3.js";

export type ProposeResult = {
  status: Status3;
  decision?: Decision;
  paypalOrderId?: string;
  amountMinor?: number;
  paymentMandateId?: string;
  approvalId?: string;
  /** PayPal buyer approval link (sandbox mode) */
  approveUrl?: string;
  error?: string;
};

export const proposeResultSchema: Schema<ProposeResult> = s.object<ProposeResult>({
  status: status3Schema,
  decision: s.optional(s.lazy(() => decisionSchema)),
  paypalOrderId: s.optional(s.string()),
  amountMinor: s.optional(s.int()),
  paymentMandateId: s.optional(s.string()),
  approvalId: s.optional(s.string()),
  approveUrl: s.optional(s.string()),
  error: s.optional(s.string()),
});
