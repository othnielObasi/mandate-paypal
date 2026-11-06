import { formatMoney } from "./policy";
import type { GateContext, Intent, Mandate } from "./types";

/**
 * One rule as the gate saw it, for people: what was checked, the value, and the result.
 * - pass: the rule was met
 * - ask / block: this rule decided (the gate stops at the first one)
 * - approved: over a soft limit, but the user approved this exact cart
 * - skip: not reached, because an earlier rule decided
 * - off: the mandate has no such rule
 */
export type TraceStatus = "pass" | "ask" | "block" | "approved" | "skip" | "off";
export type TraceRule = "mandate" | "source" | "category" | "seller" | "item_cap" | "market_price" | "budget";
export type TraceStep = { rule: TraceRule; label: string; value: string; status: TraceStatus };
export type GateTrace = { steps: TraceStep[]; outcome: "allow" | "approve" | "block" };

/** hard: always blocks. soft: asks or blocks per the mandate's overLimit, unless approved. ask: always asks, unless approved. */
type Kind = "hard" | "soft" | "ask";

/**
 * Every rule of the gate, in the order `evaluate` checks them, with its result. It explains the
 * decision; it never makes one (the governor still calls `evaluate`, and a test holds the two to
 * the same outcome).
 */
export function explain(mandate: Mandate, intent: Intent, ctx: GateContext): GateTrace {
  const p = mandate.policy;
  const money = (n: number) => formatMoney(n, p.currency);
  const steps: TraceStep[] = [];
  let decided: "approve" | "block" | null = null;

  const check = (rule: TraceRule, label: string, value: string, ok: boolean | "off", kind: Kind = "hard") => {
    if (decided) return void steps.push({ rule, label, value, status: "skip" });
    if (ok === "off") return void steps.push({ rule, label, value, status: "off" });
    if (ok) return void steps.push({ rule, label, value, status: "pass" });
    if (kind !== "hard" && ctx.approved) return void steps.push({ rule, label, value, status: "approved" });
    const outcome = kind === "ask" || (kind === "soft" && p.overLimit === "ask") ? "approve" : "block";
    decided = outcome;
    steps.push({ rule, label, value, status: outcome === "approve" ? "ask" : "block" });
  };

  const expired = ctx.now.getTime() > Date.parse(`${p.expires}T23:59:59.999Z`);
  const mandateValue = mandate.status !== "active" ? cap(mandate.status) : expired ? `Expired ${p.expires}` : intent.currency !== p.currency ? `Only spends ${p.currency}` : `Active until ${p.expires}`;
  check("mandate", "Mandate", mandateValue, mandate.status === "active" && !expired && intent.currency === p.currency);

  const injected = intent.origin === "untrusted_instruction";
  check("source", "Request came from", injected ? "Text on a web page, not your task" : "Your task", !injected);

  const category = intent.category.trim().toLowerCase();
  const inCategory = p.categories.includes(category);
  check("category", "Category", inCategory ? category : `${category} · allowed: ${p.categories.join(", ")}`, inCategory);

  const sellerBlocked = p.sellers.blocked.includes(intent.merchantId);
  const sellerOk = !sellerBlocked && (!p.sellers.verifiedOnly || intent.merchantVerified);
  check("seller", "Seller", sellerBlocked ? `${intent.merchantId} · on your blocked list` : `${intent.merchantId} · ${intent.merchantVerified ? "verified" : "not verified"}`, sellerOk);

  const overCap = intent.amountMinor > p.maxItemMinor;
  check("item_cap", "Item limit", `${money(intent.amountMinor)} ${overCap ? "is over" : "of"} ${money(p.maxItemMinor)}`, !overCap, "soft");

  const pct = p.maxPremiumPct;
  const ref = intent.marketReferenceMinor;
  if (pct === null || pct === undefined) check("market_price", "Market price", "No fair-price rule", "off");
  else if (ref === undefined) {
    const mode = p.marketUnavailable ?? "ask";
    if (mode === "allow") check("market_price", "Market price", "No market price found · you chose to buy anyway", true);
    else if (mode === "block") check("market_price", "Market price", "No market price found · you chose to block", false, "hard");
    else check("market_price", "Market price", "No market price found · you chose to be asked", false, "ask");
  } else {
    const above = intent.amountMinor * 100 > ref * (100 + pct);
    const diff = Math.round((intent.amountMinor / ref - 1) * 100);
    check("market_price", "Market price", `${money(intent.amountMinor)} vs ${money(ref)} market${diff > 0 ? ` · ${diff}% above` : ""} · limit ${pct}%`, !above, "soft");
  }

  const left = Math.max(0, p.budget.amountMinor - ctx.spentMinor - ctx.reservedMinor);
  const overBudget = ctx.spentMinor + ctx.reservedMinor + intent.amountMinor > p.budget.amountMinor;
  check("budget", `${cap(p.budget.period)}ly budget`, `${money(intent.amountMinor)} ${overBudget ? "is more than" : "of"} ${money(left)} left`, !overBudget, "soft");

  return { steps, outcome: decided ?? "allow" };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
