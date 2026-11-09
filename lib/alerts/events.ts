import type { Receipt } from "../gate/receipts";

/**
 * What a person would want to hear about, from the signed decision log. Pure (no Node APIs),
 * so the app's Notifications page and every alert channel use the same events.
 */
export type AutomationEventName = "approval.needed" | "purchase.blocked" | "purchase.paid" | "payment.failed" | "mandate.status_changed";

export interface AutomationEvent {
  event: AutomationEventName;
  /** One line, ready for an SMS, email subject or Slack message. */
  message: string;
  mandateId: string;
  at: string;
  /** Where the user should go next. */
  link: string;
  receipt: { seq: number; hash: string };
  approvalId?: string;
  paypalOrderId?: string;
  rule?: string;
  status?: string;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** The event for a receipt, or null for log entries nobody needs to be told about (permits, tracking…). */
export function eventFor(r: Receipt, appUrl: string): AutomationEvent | null {
  const p = obj(r.payload);
  const base = { mandateId: r.mandateId, at: r.createdAt, receipt: { seq: r.seq, hash: r.hash } };
  const app = `${appUrl}/app`;
  switch (r.type) {
    case "approval_requested":
      return { ...base, event: "approval.needed", message: `Mandate: ${r.summary.replace(/^Asked you to approve/, "Approve")}`, link: app, approvalId: str(p.approvalId) };
    case "decision": {
      const d = obj(p.decision);
      if (d.outcome !== "block") return null;
      return { ...base, event: "purchase.blocked", message: `Mandate: ${r.summary}`, link: app, rule: str(d.rule) };
    }
    case "payment": {
      const id = str(p.paypalOrderId);
      // The readable seller check for this payment (the raw verdict is /api/verify/<id>, for programs).
      return { ...base, event: "purchase.paid", message: `Mandate: ${r.summary}`, link: id ? `${appUrl}/seller?order=${encodeURIComponent(id)}` : app, paypalOrderId: id };
    }
    case "payment_failed":
      return { ...base, event: "payment.failed", message: `Mandate: ${r.summary}`, link: app, paypalOrderId: str(p.paypalOrderId) };
    case "mandate": {
      const status = str(p.status);
      if (!status) return null; // creation, not a status change
      return { ...base, event: "mandate.status_changed", message: `Mandate: ${r.summary}`, link: app, status };
    }
    default:
      return null;
  }
}

/** Short headings for each kind of event. */
export const EVENT_TITLE: Record<AutomationEventName, string> = {
  "approval.needed": "Needs your approval",
  "purchase.blocked": "Blocked",
  "purchase.paid": "Paid",
  "payment.failed": "Payment failed",
  "mandate.status_changed": "Mandate changed",
};
