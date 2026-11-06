import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Money = {
  /** Minor units (cents) */
  amount?: number;
  currency?: string;
};

export const moneySchema: Schema<Money> = s.object<Money>({
  amount: s.optional(s.int()),
  currency: s.optional(s.string()),
});
