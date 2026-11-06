import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Use = {
  Sig: "sig",
} as const;
export type Use = (typeof Use)[keyof typeof Use] | (string & {});

export const useSchema: EnumSchema<Use> = s.enumOf<Use>(Use);
