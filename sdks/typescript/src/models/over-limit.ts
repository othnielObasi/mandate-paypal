import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const OverLimit = {
  Ask: "ask",
  Block: "block",
} as const;
export type OverLimit = (typeof OverLimit)[keyof typeof OverLimit] | (string & {});

export const overLimitSchema: EnumSchema<OverLimit> = s.enumOf<OverLimit>(OverLimit);
