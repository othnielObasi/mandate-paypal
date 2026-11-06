import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Choice = {
  Approve: "approve",
  Decline: "decline",
} as const;
export type Choice = (typeof Choice)[keyof typeof Choice] | (string & {});

export const choiceSchema: EnumSchema<Choice> = s.enumOf<Choice>(Choice);
