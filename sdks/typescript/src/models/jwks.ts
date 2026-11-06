import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { jwkSchema, type Jwk } from "./jwk.js";

export type Jwks = {
  keys: Jwk[];
};

export const jwksSchema: Schema<Jwks> = s.object<Jwks>({
  keys: s.array(s.lazy(() => jwkSchema)),
});
