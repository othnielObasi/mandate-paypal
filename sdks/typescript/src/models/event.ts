import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Event = {
  ApprovalNeeded: "approval.needed",
  PurchaseBlocked: "purchase.blocked",
  PurchasePaid: "purchase.paid",
  PaymentFailed: "payment.failed",
  MandateStatusChanged: "mandate.status_changed",
} as const;
export type Event = (typeof Event)[keyof typeof Event] | (string & {});

export const eventSchema: EnumSchema<Event> = s.enumOf<Event>(Event);
