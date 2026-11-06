import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const StoppedBy = {
  End: "end",
  StepLimit: "step_limit",
  ModelError: "model_error",
} as const;
export type StoppedBy = (typeof StoppedBy)[keyof typeof StoppedBy] | (string & {});

export const stoppedBySchema: EnumSchema<StoppedBy> = s.enumOf<StoppedBy>(StoppedBy);
