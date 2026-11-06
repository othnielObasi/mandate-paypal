import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { outcomeSchema, type Outcome } from "./outcome.js";

export type Decision = {
  outcome?: Outcome;
  rule?: string;
  reason?: string;
};

export const decisionSchema: Schema<Decision> = s.object<Decision>({
  outcome: s.optional(s.lazy(() => outcomeSchema)),
  rule: s.optional(s.string()),
  reason: s.optional(s.string()),
});
