import type { Currency, Policy } from "./policy";

export type MandateStatus = "active" | "paused" | "revoked";

export interface Mandate {
  id: string;
  userId: string;
  policy: Policy;
  status: MandateStatus;
}

/**
 * Where the decision to act came from.
 * - "agent": the agent's own plan, derived from the user's task.
 * - "untrusted_instruction": the agent is acting on text it read in an
 *   untrusted source (a product page, merchant message). Always blocked.
 */
export type IntentOrigin = "agent" | "untrusted_instruction";

export interface Intent {
  id: string;
  mandateId: string;
  action: "purchase";
  amountMinor: number;
  currency: Currency;
  merchantId: string;
  merchantVerified: boolean;
  category: string;
  itemTitle: string;
  origin: IntentOrigin;
}

export interface GateContext {
  now: Date;
  /** Money already captured in the current budget period. */
  spentMinor: number;
  /** Money held by issued, unused, unexpired permits. */
  reservedMinor: number;
  /** True when the user has explicitly approved this exact intent. */
  approved?: boolean;
}

export type Outcome = "allow" | "approve" | "block";

export type RuleId =
  | "ok"
  | "invalid_input"
  | "mandate_inactive"
  | "mandate_expired"
  | "currency"
  | "untrusted_instruction"
  | "category"
  | "seller"
  | "item_cap"
  | "budget"
  | "gate_error";

export interface Decision {
  outcome: Outcome;
  rule: RuleId;
  reason: string;
}
