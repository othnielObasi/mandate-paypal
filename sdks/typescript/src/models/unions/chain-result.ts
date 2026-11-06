import * as s from "../../core/validation/index.js";
import type { Schema } from "../../core/validation/schema.js";
import { chainBrokenSchema, type ChainBroken } from "../chain-broken.js";
import { chainIntactSchema, type ChainIntact } from "../chain-intact.js";

export type ChainResult = ChainIntact | ChainBroken;

export const chainResultSchema: Schema<ChainResult> = s.of<ChainResult>(
  s.union([s.lazy(() => chainIntactSchema), s.lazy(() => chainBrokenSchema)]),
);
