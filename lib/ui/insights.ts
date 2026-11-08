import type { Receipt } from "../gate/receipts";

/**
 * Flat rows for the Insights dashboard (AG Studio), built from the signed decision log and the
 * recorded payments. Every row points back to the receipt it came from (`seq`), so a chart can
 * always be traced to signed evidence.
 */

export interface DecisionRow {
  /** Always 1: summed to count rows. */
  n: 1;
  seq: number;
  at: string;
  day: string;
  outcome: "Allowed" | "Asked you" | "Blocked";
  rule: string;
  item: string;
  category: string;
  merchant: string;
  amount: number;
  /** Who started it: Mandate's agent, an outside assistant, or a page that steered the agent. */
  source: string;
}

export interface PaymentRow {
  n: 1;
  at: string;
  day: string;
  amount: number;
  merchant: string;
  paypalOrderId: string;
  /** Captured, or created in PayPal and waiting for the buyer to approve it. */
  status: "Paid" | "Waiting for PayPal";
  /** Amount and count if captured, else 0: summed for the "paid" figures. */
  paid: number;
  paidN: 0 | 1;
  /** Amount if waiting, else 0. */
  waiting: number;
}

export interface Insights {
  decisions: DecisionRow[];
  payments: PaymentRow[];
}

const OUTCOME = { allow: "Allowed", approve: "Asked you", block: "Blocked" } as const;

/** Plain-English names for the gate's rules. */
export const RULE_LABEL: Record<string, string> = {
  ok: "Within your rules",
  item_cap: "Over the item limit",
  budget: "Over the budget",
  market_price: "Above market price",
  category: "Outside your categories",
  seller: "Seller not allowed",
  untrusted_instruction: "Injected by a page",
  mandate_inactive: "Mandate paused or revoked",
  mandate_expired: "Mandate expired",
  currency: "Wrong currency",
  invalid_input: "Malformed request",
  gate_error: "Gate error",
};

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const dollars = (minor: unknown) => (typeof minor === "number" && Number.isFinite(minor) ? Math.round(minor) / 100 : 0);

export function decisionRow(r: Receipt): DecisionRow | null {
  if (r.type !== "decision") return null;
  const p = obj(r.payload);
  const d = obj(p.decision);
  const outcome = OUTCOME[d.outcome as keyof typeof OUTCOME];
  if (!outcome) return null;
  const intent = obj(p.intent);
  const rule = str(d.rule, "unknown");
  // The summary is "Allowed: <item> $4.50 from <merchant> (via <assistant>). <reason>"; "via" names an outside assistant.
  const via = /\(via ([^)]+)\)/.exec(r.summary)?.[1];
  const steered = intent.origin === "untrusted_instruction" || rule === "untrusted_instruction";
  return {
    n: 1,
    seq: r.seq,
    at: r.createdAt,
    day: r.createdAt.slice(0, 10),
    outcome,
    rule: RULE_LABEL[rule] ?? rule,
    item: str(intent.itemTitle, /^Blocked: ([^.]+)\./.exec(r.summary)?.[1] ?? "Unknown item"),
    category: str(intent.category, "unknown"),
    merchant: str(intent.merchantId, "unknown"),
    amount: dollars(intent.amountMinor),
    source: steered ? "A web or product page" : via ? `Outside assistant: ${via}` : "Mandate's agent",
  };
}

export function buildInsights(
  receipts: Receipt[],
  payments: Array<{ amountMinor: number; capturedAt: string; paypalOrderId: string; merchant?: string }>,
  waiting: Array<{ amountMinor: number; paypalOrderId: string; merchant?: string }> = [],
): Insights {
  // When each waiting order was created: its "payment_pending" receipt.
  const createdAt = new Map<string, string>();
  for (const r of receipts) {
    const id = obj(r.payload).paypalOrderId;
    if (r.type === "payment_pending" && typeof id === "string") createdAt.set(id, r.createdAt);
  }
  const paidIds = new Set(payments.map((p) => p.paypalOrderId));
  return {
    decisions: receipts.map(decisionRow).filter((r): r is DecisionRow => r !== null),
    payments: [
      ...payments.map((p) => {
        const amount = dollars(p.amountMinor);
        return { n: 1 as const, at: p.capturedAt, day: p.capturedAt.slice(0, 10), amount, merchant: p.merchant ?? "unknown", paypalOrderId: p.paypalOrderId, status: "Paid" as const, paid: amount, paidN: 1 as const, waiting: 0 };
      }),
      ...waiting
        .filter((w) => !paidIds.has(w.paypalOrderId))
        .map((w) => {
          const at = createdAt.get(w.paypalOrderId) ?? new Date().toISOString();
          const amount = dollars(w.amountMinor);
          return { n: 1 as const, at, day: at.slice(0, 10), amount, merchant: w.merchant ?? "unknown", paypalOrderId: w.paypalOrderId, status: "Waiting for PayPal" as const, paid: 0, paidN: 0 as const, waiting: amount };
        }),
    ],
  };
}
