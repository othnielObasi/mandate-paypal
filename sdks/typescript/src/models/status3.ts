import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Status3 = {
  Paid: "paid",
  AwaitingBuyer: "awaiting_buyer",
  PendingApproval: "pending_approval",
  Blocked: "blocked",
  Declined: "declined",
  Failed: "failed",
} as const;
export type Status3 = (typeof Status3)[keyof typeof Status3] | (string & {});

export const status3Schema: EnumSchema<Status3> = s.enumOf<Status3>(Status3);
