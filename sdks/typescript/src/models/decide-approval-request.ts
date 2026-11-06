import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { choiceSchema, type Choice } from "./choice.js";
import { passkeyAssertionSchema, type PasskeyAssertion } from "./passkey-assertion.js";

export type DecideApprovalRequest = {
  choice: Choice;
  /** A WebAuthn assertion over the approval's challenge (base64url fields). */
  passkey?: PasskeyAssertion;
};

export const decideApprovalRequestSchema: Schema<DecideApprovalRequest> = s.object<DecideApprovalRequest>({
  choice: choiceSchema,
  passkey: s.optional(s.lazy(() => passkeyAssertionSchema)),
});
