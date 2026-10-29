import { z } from "zod";

export const CURRENCIES = ["GBP", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

const positiveMinor = z.number().int().positive().max(100_000_000);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "invalid date");

/**
 * A mandate's policy. Strict: unknown keys are rejected so that a model
 * parsing free text cannot add fields the gate would then ignore.
 * Money is held in minor units (pence/cents) as integers.
 */
export const PolicySchema = z
  .object({
    categories: z
      .array(z.string().trim().min(1).max(40).transform((s) => s.toLowerCase()))
      .min(1)
      .max(20),
    currency: z.enum(CURRENCIES),
    maxItemMinor: positiveMinor,
    budget: z
      .object({
        amountMinor: positiveMinor,
        period: z.enum(["week", "month"]),
      })
      .strict(),
    sellers: z
      .object({
        verifiedOnly: z.boolean(),
        blocked: z.array(z.string().trim().min(1)).max(100),
      })
      .strict(),
    overLimit: z.enum(["ask", "block"]),
    expires: isoDate,
    /** Optional: never pay more than this % above the market reference price. */
    maxPremiumPct: z.number().int().min(0).max(200).nullable().optional(),
  })
  .strict()
  .refine((p) => p.maxItemMinor <= p.budget.amountMinor, {
    message: "item cap cannot exceed the period budget",
    path: ["maxItemMinor"],
  });

export type Policy = z.infer<typeof PolicySchema>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parsePolicy(input: unknown): ParseResult<Policy> {
  const r = PolicySchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".") || "policy"}: ${i.message}`).join("; ") };
}

const SYMBOLS: Record<Currency, string> = { GBP: "£", USD: "$", EUR: "€" };

export function formatMoney(amountMinor: number, currency: Currency): string {
  return `${SYMBOLS[currency]}${(amountMinor / 100).toFixed(2)}`;
}
