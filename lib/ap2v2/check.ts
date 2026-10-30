import type { CredentialStore } from "../ap2/store";
import type { MandateStore } from "../core/stores";
import type { Ap2Keys } from "./keys";
import { verifyPurchase, type PurchaseVerdict } from "./mandates";
import type { Ap2PurchaseRecord } from "./records";
import { verifyPasskeyApproval } from "../passkey/webauthn";

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
  if (rec.ap2.passkey) {
    const why = verifyPasskeyApproval(rec.ap2.passkey, rec.ap2.checkoutJwt);
    verdict.checks.push({
      id: "passkey_approval",
      label: "Approved on the user's device (passkey)",
      ok: why === null,
      detail: why ?? `WebAuthn assertion from ${rec.ap2.passkey.rpId} over this exact cart, user verified`,
    });
    if (why) verdict.ok = false;
  }
  return { spec: "ap2/0.2", paypalOrderId, ...verdict, evidence: { ...rec.ap2, openCheckoutHash: mandate?.ap2?.openCheckoutHash ?? null } };
}
