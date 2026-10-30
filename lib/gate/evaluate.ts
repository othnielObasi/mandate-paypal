import { z } from "zod";
import { CURRENCIES, PolicySchema, formatMoney } from "./policy";
import type { Decision, GateContext, Intent, Mandate } from "./types";

const IntentSchema = z.object({
  id: z.string().min(1),
  mandateId: z.string().min(1),
  action: z.literal("purchase"),
  amountMinor: z.number().int().positive().max(100_000_000),
  currency: z.enum(CURRENCIES),
  merchantId: z.string().min(1),
  merchantVerified: z.boolean(),
  category: z.string().min(1),
  itemTitle: z.string(),
  origin: z.enum(["agent", "untrusted_instruction"]),
  marketReferenceMinor: z.number().int().positive().optional(),
});

const MandateSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  policy: PolicySchema,
  status: z.enum(["active", "paused", "revoked"]),
});

const CtxSchema = z.object({
  now: z.date().refine((d) => !Number.isNaN(d.getTime())),
  spentMinor: z.number().int().nonnegative(),
  reservedMinor: z.number().int().nonnegative(),
  approved: z.boolean().optional(),
});

const block = (rule: Decision["rule"], reason: string): Decision => ({ outcome: "block", rule, reason });

/**
 * The policy gate. Pure and deterministic: the model proposes, this decides.
 * Hard rules always block. Soft limits (item cap, budget) ask the user
 * or block, depending on the mandate. Any error blocks (fails closed).
 */
export function evaluate(mandateIn: Mandate, intentIn: Intent, ctxIn: GateContext): Decision {
  try {
    const m = MandateSchema.safeParse(mandateIn);
    if (!m.success) return block("invalid_input", "The mandate is missing or malformed.");
    const i = IntentSchema.safeParse(intentIn);
    if (!i.success) return block("invalid_input", "The purchase request is malformed.");
    const c = CtxSchema.safeParse(ctxIn);
    if (!c.success) return block("invalid_input", "The gate context is malformed.");

    const mandate = m.data;
    const intent = i.data;
    const ctx = c.data;
    const p = mandate.policy;
    const money = (n: number) => formatMoney(n, p.currency);

    if (intent.mandateId !== mandate.id) return block("invalid_input", "The request belongs to a different mandate.");

    // Hard rules: no approval can override these.
    if (mandate.status !== "active") return block("mandate_inactive", `The mandate is ${mandate.status}.`);

    const expiresAt = Date.parse(`${p.expires}T23:59:59.999Z`);
    if (ctx.now.getTime() > expiresAt) return block("mandate_expired", `The mandate expired on ${p.expires}.`);

    if (intent.currency !== p.currency) return block("currency", `The mandate only spends ${p.currency}.`);

    if (intent.origin === "untrusted_instruction")
      return block("untrusted_instruction", "The agent was steered by untrusted content, not by your task.");

    const category = intent.category.trim().toLowerCase();
    if (!p.categories.includes(category))
      return block("category", `"${category}" is outside the mandate (allowed: ${p.categories.join(", ")}).`);

    if (p.sellers.blocked.includes(intent.merchantId)) return block("seller", `${intent.merchantId} is on your blocked list.`);
    if (p.sellers.verifiedOnly && !intent.merchantVerified)
      return block("seller", `${intent.merchantId} is not a verified seller.`);

    // Soft limits: ask or block per mandate; a user approval lets them through.
    const soft = (rule: "item_cap" | "budget" | "market_price", reason: string): Decision | null => {
      if (ctx.approved) return null;
      return { outcome: p.overLimit === "ask" ? "approve" : "block", rule, reason };
    };

    if (intent.amountMinor > p.maxItemMinor) {
      const d = soft("item_cap", `${money(intent.amountMinor)} is over the item limit of ${money(p.maxItemMinor)}.`);
      if (d) return d;
    }

    // Integer maths: amount × 100 > reference × (100 + pct) means "more than pct% above market".
    const pct = p.maxPremiumPct;
    const ref = intent.marketReferenceMinor;
    // No reference price means the signed fair-price rule can't be checked. Fail closed unless the
    // user signed "buy anyway": ask them (default) or block, as they chose.
    if (pct !== null && pct !== undefined && ref === undefined) {
      const mode = p.marketUnavailable ?? "ask";
      const why = `No market price was found to check your ${pct}% fair-price limit.`;
      if (mode === "block") return block("market_price", `${why} You chose to block in that case.`);
      if (mode === "ask" && !ctx.approved) return { outcome: "approve", rule: "market_price", reason: `${why} You chose to be asked.` };
    }
    if (pct !== null && pct !== undefined && ref !== undefined && intent.amountMinor * 100 > ref * (100 + pct)) {
      const over = Math.round((intent.amountMinor / ref - 1) * 100);
      const d = soft("market_price", `${money(intent.amountMinor)} is ${over}% above the market price of ${money(ref)} (your limit is ${pct}%).`);
      if (d) return d;
    }

    const committed = ctx.spentMinor + ctx.reservedMinor + intent.amountMinor;
    if (committed > p.budget.amountMinor) {
      const left = Math.max(0, p.budget.amountMinor - ctx.spentMinor - ctx.reservedMinor);
      const d = soft("budget", `${money(intent.amountMinor)} exceeds the ${money(left)} left in this ${p.budget.period}'s budget.`);
      if (d) return d;
    }

    return {
      outcome: "allow",
      rule: "ok",
      reason: ctx.approved ? "Approved by you." : "Within every rule of the mandate.",
    };
  } catch {
    return block("gate_error", "The gate hit an internal error, so it refused.");
  }
}
