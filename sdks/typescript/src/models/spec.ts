import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Spec = {
  Ap202: "ap2/0.2",
} as const;
export type Spec = (typeof Spec)[keyof typeof Spec] | (string & {});

export const specSchema: EnumSchema<Spec> = s.enumOf<Spec>(Spec);
