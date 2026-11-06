import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { algSchema, type Alg } from "./alg.js";
import { useSchema, type Use } from "./use.js";

export type Jwk = {
  /** @default "EC" */
  kty?: "EC";
  /** @default "P-256" */
  crv?: "P-256";
  x: string;
  y: string;
  kid: string;
  alg?: Alg;
  use?: Use;
};

export const jwkSchema: Schema<Jwk> = s.object<Jwk>({
  kty: s.defaulted(s.literal("EC"), "EC"),
  crv: s.defaulted(s.literal("P-256"), "P-256"),
  x: s.string(),
  y: s.string(),
  kid: s.string(),
  alg: s.optional(s.lazy(() => algSchema)),
  use: s.optional(s.lazy(() => useSchema)),
});
