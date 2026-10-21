// Browser-safe: type-only imports, no node:crypto.
import type { Receipt } from "../gate/receipts";

export type Kind =
  | "mandate"
  | "allowed"
  | "needs approval"
  | "blocked"
  | "approval"
  | "permit"
  | "payment"
  | "payment pending"
  | "payment failed"
  | "refusal"
  | "tracking"
  | "dispute";

export interface LedgerRow {
  seq: number;
  time: string;
  type: Receipt["type"];
  kind: Kind;
  summary: string;
  hash: string;
}

export function kindOf(r: Receipt): Kind {
  if (r.type === "decision") {
    const outcome = (r.payload as { decision?: { outcome?: string } } | null)?.decision?.outcome;
    return outcome === "allow" ? "allowed" : outcome === "approve" ? "needs approval" : "blocked";
  }
  if (r.type === "approval_requested" || r.type === "approval_decided") return "approval";
  if (r.type === "payment_pending") return "payment pending";
  if (r.type === "payment_failed") return "payment failed";
  return r.type as Kind;
}

export function toRows(receipts: Receipt[]): LedgerRow[] {
  return receipts.map((r) => ({ seq: r.seq, time: r.createdAt, type: r.type, kind: kindOf(r), summary: r.summary, hash: r.hash }));
}

/**
 * The receipt log as the grid now shows it. Only the summary column is
 * editable, so only summaries are taken from the grid; everything else
 * comes from the original log. Verifying this copy shows whether anyone
 * edited a row.
 */
export function withEdits(receipts: Receipt[], rows: LedgerRow[]): Receipt[] {
  const bySeq = new Map(rows.map((r) => [r.seq, r]));
  return receipts.map((r) => {
    const row = bySeq.get(r.seq);
    return row && row.summary !== r.summary ? { ...r, summary: row.summary } : r;
  });
}

export function editedSeqs(receipts: Receipt[], rows: LedgerRow[]): number[] {
  const original = new Map(receipts.map((r) => [r.seq, r.summary]));
  return rows.filter((r) => original.has(r.seq) && original.get(r.seq) !== r.summary).map((r) => r.seq);
}

export const KIND_TONE: Record<Kind, "good" | "warn" | "bad" | "info"> = {
  mandate: "info",
  allowed: "good",
  "needs approval": "warn",
  blocked: "bad",
  approval: "warn",
  permit: "info",
  payment: "good",
  "payment pending": "warn",
  "payment failed": "bad",
  refusal: "bad",
  tracking: "info",
  dispute: "warn",
};
