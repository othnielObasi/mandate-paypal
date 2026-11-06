import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const SigningKey = {
  Configured: "configured",
  Ephemeral: "ephemeral",
} as const;
export type SigningKey = (typeof SigningKey)[keyof typeof SigningKey] | (string & {});

export const signingKeySchema: EnumSchema<SigningKey> = s.enumOf<SigningKey>(SigningKey);
