import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { checkSchema, type Check } from "./check.js";

export type SellerPayment = {
  ok: boolean;
  checks: Check[];
  notes?: string[];
  paypalOrderId?: string;
  paymentMandateId?: string;
  mode?: string;
  merchant?: string;
  total?: string;
  items?: string[];
  createdAt?: Date;
  /** AP2 v0.2 verdict, null if no AP2 evidence */
  ap2?: boolean | null;
};

export const sellerPaymentSchema: Schema<SellerPayment> = s.object<SellerPayment>({
  ok: s.boolean(),
  checks: s.array(s.lazy(() => checkSchema)),
  notes: s.optional(s.array(s.string())),
  paypalOrderId: s.optional(s.string()),
  paymentMandateId: s.optional(s.string()),
  mode: s.optional(s.string()),
  merchant: s.optional(s.string()),
  total: s.optional(s.string()),
  items: s.optional(s.array(s.string())),
  createdAt: s.optional(s.dateTime()),
  ap2: s.optionalNullable(s.boolean()),
});
