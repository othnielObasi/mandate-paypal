import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { periodSchema, type Period } from "./period.js";

export type Budget = {
  amountMinor?: number;
  period?: Period;
};

export const budgetSchema: Schema<Budget> = s.object<Budget>({
  amountMinor: s.optional(s.int()),
  period: s.optional(s.lazy(() => periodSchema)),
});
