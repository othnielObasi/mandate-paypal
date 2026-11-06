import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Mandate v1 credentials (Ed25519 JWS). Post them to `/api/verify` to re-check. */
export type CredentialChain = {
  intent?: Record<string, unknown>;
  cart?: Record<string, unknown>;
  payment?: Record<string, unknown>;
};

export const credentialChainSchema: Schema<CredentialChain> = s.object<CredentialChain>({
  intent: s.optional(s.record(s.string(), s.unknown())),
  cart: s.optional(s.record(s.string(), s.unknown())),
  payment: s.optional(s.record(s.string(), s.unknown())),
});
