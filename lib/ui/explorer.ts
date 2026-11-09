import type { Receipt } from "../gate/receipts";
import { decisionRow, type DecisionRow } from "./insights";

/** The gate's rules, in the order it checks them, with column headings. */
export const RULE_COLUMNS = [
  ["mandate", "Mandate"],
  ["source", "Came from"],
  ["category", "Category"],
  ["seller", "Seller"],
  ["item_cap", "Item limit"],
  ["market_price", "Market price"],
  ["budget", "Budget"],
] as const;
export type RuleKey = (typeof RULE_COLUMNS)[number][0];

/** How one rule came out: passed, asked the user, blocked, approved by the user, not checked, or switched off. */
export type Check = "pass" | "ask" | "block" | "approved" | "skip" | "off" | null;

/** Rule results live in `rule_<name>` fields (a decision row already has a `source`). */
export type ExplorerRow = DecisionRow & { [K in RuleKey as `rule_${K}`]: Check };

const CHECKS = new Set(["pass", "ask", "block", "approved", "skip", "off"]);

/** A decision with each rule's result, from its signed receipt. Older receipts have no per-rule results (null). */
export function explorerRow(r: Receipt): ExplorerRow | null {
  const d = decisionRow(r);
  if (!d) return null;
  const raw = (r.payload && typeof r.payload === "object" ? (r.payload as { checks?: Record<string, unknown> }).checks : undefined) ?? {};
  const row = { ...d } as ExplorerRow;
  for (const [k] of RULE_COLUMNS) row[`rule_${k}`] = typeof raw[k] === "string" && CHECKS.has(raw[k] as string) ? (raw[k] as Check) : null;
  return row;
}
