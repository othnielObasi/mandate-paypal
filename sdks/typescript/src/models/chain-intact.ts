import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ChainIntact = {
  /** Always true for an intact chain */
  ok: boolean;
  count: number;
};

export const chainIntactSchema: Schema<ChainIntact> = s.object<ChainIntact>({
  ok: s.boolean(),
  count: s.int(),
});
