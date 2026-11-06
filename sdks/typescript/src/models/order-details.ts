import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { ap2VerdictSchema, type Ap2Verdict } from "./ap2-verdict.js";
import { credentialChainSchema, type CredentialChain } from "./credential-chain.js";
import { modeSchema, type Mode } from "./mode.js";

export type OrderDetails = {
  paypalOrderId?: string;
  paymentMandateId?: string;
  mode?: Mode;
  merchant?: string;
  total?: string;
  items?: string[];
  createdAt?: Date;
  /** Mandate v1 credentials (Ed25519 JWS). Post them to `/api/verify` to re-check. */
  chain?: CredentialChain;
  ap2?: Ap2Verdict | null;
};

export const orderDetailsSchema: Schema<OrderDetails> = s.object<OrderDetails>({
  paypalOrderId: s.optional(s.string()),
  paymentMandateId: s.optional(s.string()),
  mode: s.optional(s.lazy(() => modeSchema)),
  merchant: s.optional(s.string()),
  total: s.optional(s.string()),
  items: s.optional(s.array(s.string())),
  createdAt: s.optional(s.dateTime()),
  chain: s.optional(s.lazy(() => credentialChainSchema)),
  ap2: s.optionalNullable(s.lazy(() => ap2VerdictSchema)),
});
