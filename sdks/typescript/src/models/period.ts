import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Period = {
  Week: "week",
  Month: "month",
} as const;
export type Period = (typeof Period)[keyof typeof Period] | (string & {});

export const periodSchema: EnumSchema<Period> = s.enumOf<Period>(Period);
