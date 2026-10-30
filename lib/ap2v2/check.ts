import type { CredentialStore } from "../ap2/store";
import type { MandateStore } from "../core/stores";
import type { Ap2Keys } from "./keys";
import { verifyPurchase, type PurchaseVerdict } from "./mandates";
import type { Ap2PurchaseRecord } from "./records";

export interface Ap2OrderCheck extends PurchaseVerdict {
  spec: "ap2/0.2";
  paypalOrderId: string;
  evidence: Ap2PurchaseRecord & { openCheckoutHash: string | null };
}

/**
 * AP2 v0.2 verification of a PayPal order, following the spec's dispute
 * rules: merchant-signed checkout, Checkout and Payment Mandate chains and
 * their constraints, and both receipts. Keys are resolved by kid from the
 * published JWKS, so anyone holding that JWKS can repeat the check.
 */
export async function checkAp2Order(d: { credentials: CredentialStore; mandates: MandateStore; keys: Ap2Keys }, paypalOrderId: string): Promise<Ap2OrderCheck | null> {
  const rec = await d.credentials.getByOrder(paypalOrderId);
  if (!rec?.ap2) return null;
  const mandate = await d.mandates.get(rec.mandateId);
  const verdict = verifyPurchase(
    rec.ap2,
    {
      root: (h) => d.keys.byKid(h.kid) ?? (() => { throw new Error(`Unknown signing key ${String(h.kid)}`); })(),
      merchant: (id) => d.keys.byKid(`merchant:${id}`),
      receiptIssuer: (iss) => d.keys.byKid(iss),
    },
    { context: rec.ap2.context },
  );
  return { spec: "ap2/0.2", paypalOrderId, ...verdict, evidence: { ...rec.ap2, openCheckoutHash: mandate?.ap2?.openCheckoutHash ?? null } };
}
