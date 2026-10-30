import type { PasskeyApproval } from "../passkey/webauthn";

/** Stored AP2 v0.2 artefacts (all strings are compact SD-JWTs / JWTs). Browser-safe: types only. */

export interface Ap2OpenRecord {
  spec: "ap2/0.2";
  checkoutOpen: string;
  paymentOpen: string;
  /** sd_hash of the open checkout token, as named by payment.reference. */
  openCheckoutHash: string;
}

export interface Ap2PurchaseRecord {
  spec: "ap2/0.2";
  mode: "human_present" | "human_not_present";
  /** Merchant-signed UCP checkout (ES256 JWT). */
  checkoutJwt: string;
  checkoutChain: string;
  paymentChain: string;
  /** Spend in the period before this purchase (minor units) and prior uses: the budget context. */
  context: { totalAmount: number; totalUses: number };
  checkoutReceipt?: string;
  paymentReceipt?: string;
  /** When the user approved on their device: the WebAuthn assertion over this exact cart. */
  passkey?: PasskeyApproval;
}
