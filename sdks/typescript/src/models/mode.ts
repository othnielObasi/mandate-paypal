import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Mode = {
  HumanNotPresent: "human_not_present",
  HumanPresent: "human_present",
} as const;
export type Mode = (typeof Mode)[keyof typeof Mode] | (string & {});

export const modeSchema: EnumSchema<Mode> = s.enumOf<Mode>(Mode);
