// Browser-safe: type-only imports.
import type { Receipt } from "../gate/receipts";
import type { RuleId } from "../gate/types";

export type ActivityStatus = "paid" | "pending" | "failed" | "asked" | "declined" | "blocked" | "allowed";

export interface Activity {
  seq: number;
  time: string;
  title: string;
  amountMinor: number;
  merchantId: string;
  /** Who proposed it: an outside assistant's name, or the built-in agent. */
  agent: string;
  status: ActivityStatus;
  reason: string;
  rule: string;
  /** Present when the purchase was steered by untrusted page content. */
  injected: boolean;
  paypalOrderId: string | null;
  approvalId: string | null;
}

type DecisionPayload = {
  intent?: { itemTitle?: string; amountMinor?: number; merchantId?: string; origin?: string };
  decision?: { outcome?: "allow" | "approve" | "block"; rule?: string; reason?: string };
  digest?: string;
};

const BUILT_IN = "Mandate agent";

/**
 * One row per purchase the agents attempted, newest first, with its final
 * state. An approval that the user later approved is folded into the paid
 * row that follows it, so each purchase appears once.
 */
export function toActivity(receipts: Receipt[]): Activity[] {
  const byDigest = new Map<string, Receipt[]>();
  const add = (k: string | undefined, r: Receipt) => {
    if (!k) return;
    const list = byDigest.get(k) ?? [];
    list.push(r);
    byDigest.set(k, list);
  };
  const decidedById = new Map<string, "approve" | "decline">();
  const paymentByPermit = new Map<string, Receipt>();

  for (const r of receipts) {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    if (r.type === "permit" || r.type === "approval_requested") add(p.digest as string | undefined, r);
    if (r.type === "approval_decided" && typeof p.approvalId === "string") decidedById.set(p.approvalId, p.choice === "approve" ? "approve" : "decline");
    if ((r.type === "payment" || r.type === "payment_pending" || r.type === "payment_failed") && typeof p.permitId === "string") paymentByPermit.set(p.permitId, r);
  }

  const out: Activity[] = [];
  for (const r of receipts) {
    if (r.type !== "decision") continue;
    const p = (r.payload ?? {}) as DecisionPayload;
    const outcome = p.decision?.outcome;
    const related = (p.digest && byDigest.get(p.digest)) || [];
    const via = /\(via ([^)]+)\)/.exec(r.summary)?.[1];
    const base: Activity = {
      seq: r.seq,
      time: r.createdAt,
      title: p.intent?.itemTitle ?? "Purchase",
      amountMinor: p.intent?.amountMinor ?? 0,
      merchantId: p.intent?.merchantId ?? "",
      agent: via ?? BUILT_IN,
      status: "blocked",
      reason: p.decision?.reason ?? "",
      rule: p.decision?.rule ?? "",
      injected: p.intent?.origin === "untrusted_instruction" || p.decision?.rule === "untrusted_instruction",
      paypalOrderId: null,
      approvalId: null,
    };

    if (outcome === "block") {
      out.push(base);
      continue;
    }
    if (outcome === "approve") {
      const req = related.find((x) => x.type === "approval_requested" && x.seq > r.seq);
      const approvalId = req ? String((req.payload as { approvalId?: string }).approvalId ?? "") || null : null;
      const choice = approvalId ? decidedById.get(approvalId) : undefined;
      if (choice === "approve") continue; // the paid row that follows tells the story
      out.push({ ...base, status: choice === "decline" ? "declined" : "asked", approvalId });
      continue;
    }
    // allow: follow the permit to the payment
    const permit = related.find((x) => x.type === "permit" && x.seq > r.seq);
    const permitId = permit ? (permit.payload as { permitId?: string }).permitId : undefined;
    const pay = permitId ? paymentByPermit.get(permitId) : undefined;
    const orderId = pay ? ((pay.payload as { paypalOrderId?: string }).paypalOrderId ?? null) : null;
    const status: ActivityStatus = !pay ? "allowed" : pay.type === "payment" ? "paid" : pay.type === "payment_pending" ? "pending" : "failed";
    out.push({ ...base, status, paypalOrderId: orderId });
  }
  return out.sort((a, b) => b.seq - a.seq);
}

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  paid: "Paid",
  pending: "Awaiting PayPal",
  failed: "Failed",
  asked: "Asked you",
  declined: "Declined",
  blocked: "Blocked",
  allowed: "Allowed",
};

export const STATUS_TONE: Record<ActivityStatus, "allow" | "ask" | "block" | "info"> = {
  paid: "allow",
  pending: "ask",
  failed: "block",
  asked: "ask",
  declined: "info",
  blocked: "block",
  allowed: "allow",
};

/** Plain-English labels for gate rules, for people rather than engineers. */
export const RULE_LABEL: Record<RuleId, string> = {
  ok: "Within every rule",
  invalid_input: "Invalid request",
  mandate_inactive: "Mandate paused or revoked",
  mandate_expired: "Mandate expired",
  currency: "Currency",
  untrusted_instruction: "Not something you asked for",
  category: "Category",
  seller: "Seller",
  item_cap: "Per-item limit",
  budget: "Budget",
  market_price: "Fair price",
  credentials: "Signed mandate",
  gate_error: "Safety check",
};

export const ruleLabel = (rule: string) => RULE_LABEL[rule as RuleId] ?? "Rule";
