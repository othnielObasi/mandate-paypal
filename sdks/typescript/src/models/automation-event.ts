import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { eventSchema, type Event } from "./event.js";
import { receiptRefSchema, type ReceiptRef } from "./receipt-ref.js";
import { statusSchema, type Status } from "./status.js";

/**
 * What Mandate posts to the Zapier Catch Hook. Flat, so every field maps straight into a Zap step.
 */
export type AutomationEvent = {
  event: Event;
  /** One line for an SMS, email subject or Slack message */
  message: string;
  mandateId: string;
  at: Date;
  /** Where to act (the app), or the payment's public verdict */
  link: string;
  /** The signed log entry an event reports */
  receipt: ReceiptRef;
  approvalId?: string;
  paypalOrderId?: string;
  /** The rule that blocked the purchase */
  rule?: string;
  status?: Status;
};

export const automationEventSchema: Schema<AutomationEvent> = s.object<AutomationEvent>({
  event: eventSchema,
  message: s.string(),
  mandateId: s.string(),
  at: s.dateTime(),
  link: s.string(),
  receipt: receiptRefSchema,
  approvalId: s.optional(s.string()),
  paypalOrderId: s.optional(s.string()),
  rule: s.optional(s.string()),
  status: s.optional(s.lazy(() => statusSchema)),
});
