import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Budget already used in the period, for the budget constraint */
export type BudgetContext = {
  totalAmount?: number;
  totalUses?: number;
};

export const budgetContextSchema: Schema<BudgetContext> = s.object<BudgetContext>({
  totalAmount: s.optional(s.int()),
  totalUses: s.optional(s.int()),
});
