import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** KERNEL cloud browser, or only the app's own /demo pages */
export const Web = {
  Kernel: "kernel",
  OwnPages: "own-pages",
} as const;
export type Web = (typeof Web)[keyof typeof Web] | (string & {});

export const webSchema: EnumSchema<Web> = s.enumOf<Web>(Web);
