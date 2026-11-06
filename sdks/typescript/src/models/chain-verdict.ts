import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { checkSchema, type Check } from "./check.js";

export type ChainVerdict = {
  ok: boolean;
  checks: Check[];
  notes?: string[];
};

export const chainVerdictSchema: Schema<ChainVerdict> = s.object<ChainVerdict>({
  ok: s.boolean(),
  checks: s.array(s.lazy(() => checkSchema)),
  notes: s.optional(s.array(s.string())),
});
