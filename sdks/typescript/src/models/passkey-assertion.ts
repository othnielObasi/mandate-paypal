import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** A WebAuthn assertion over the approval's challenge (base64url fields). */
export type PasskeyAssertion = {
  credentialId: string;
  clientDataJson: string;
  authenticatorData: string;
  signature: string;
};

export const passkeyAssertionSchema: Schema<PasskeyAssertion> = s.object<PasskeyAssertion>({
  credentialId: s.string(),
  clientDataJson: s.string(),
  authenticatorData: s.string(),
  signature: s.string(),
  _keysMap: {
    clientDataJson: "clientDataJSON",
  },
});
