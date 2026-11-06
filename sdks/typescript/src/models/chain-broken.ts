import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { reasonSchema, type Reason } from "./reason.js";

export type ChainBroken = {
  /** Always false for a broken chain */
  ok: boolean;
  /** seq of the first altered receipt */
  brokenAt: number;
  reason: Reason;
};

export const chainBrokenSchema: Schema<ChainBroken> = s.object<ChainBroken>({
  ok: s.boolean(),
  brokenAt: s.int(),
  reason: reasonSchema,
});
