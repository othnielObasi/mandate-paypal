import type { MandateStore } from "../core/stores";
import type { Merchants } from "../merchant/merchants";
import type { Credentials } from "./credentials";
import { decimal, paymentFingerprint, type CartMandate, type IntentMandate, type PaymentMandate, type PaymentMode } from "./mandates";
import type { CredentialStore } from "./store";
import { verifyPaymentChain, type ChainResult } from "./verify";

export interface CheckDeps {
  stores: { credentials: CredentialStore };
  mandates: MandateStore;
  credentials: Credentials;
  merchants: Merchants;
  executor: { orderNote(paypalOrderId: string): Promise<string | null> };
}

export interface PaymentCheck extends ChainResult {
  paypalOrderId: string;
  paymentMandateId: string;
  mode: PaymentMode;
  merchant: string;
  total: string;
  items: string[];
  createdAt: string;
  chain: { intent: IntentMandate | null; cart: CartMandate; payment: PaymentMandate };
}

/**
 * What a merchant (or PayPal, or a dispute reviewer) asks before shipping:
 * is this agent payment backed by a mandate the buyer actually signed, and
 * does the PayPal order carry that mandate's fingerprint?
 */
export async function checkPayment(d: CheckDeps, paypalOrderId: string, now: Date): Promise<PaymentCheck | null> {
  const rec = await d.stores.credentials.getByOrder(paypalOrderId);
  if (!rec) return null;
  const mandate = await d.mandates.get(rec.mandateId);
  const intent = mandate?.intentMandate ?? null;

  const base: ChainResult = intent
    ? verifyPaymentChain({ intent, cart: rec.cart, payment: rec.payment }, d.credentials.trust(d.merchants, [mandate!.userId]), now)
    : { ok: false, checks: [{ id: "intent_signed_by_user", label: "Intent Mandate signed by the user", ok: false, detail: "no signed intent on file" }], notes: [] };

  // Recompute from the payment mandate itself rather than trusting the stored fingerprint.
  const expected = paymentFingerprint(rec.payment);
  let note: string | null = null;
  try {
    note = await d.executor.orderNote(paypalOrderId);
  } catch {
    note = null;
  }
  const fpOk = note === expected;
  const checks = [
    ...base.checks,
    {
      id: "paypal_order_fingerprint",
      label: "PayPal order carries this payment mandate",
      ok: fpOk,
      detail: fpOk ? `PayPal order ${paypalOrderId}: "${note}"` : note ? `PayPal order says "${note}"` : "fingerprint not found on the PayPal order",
    },
  ];
  const cx = rec.cart.contents.x_mandate;
  return {
    ok: base.ok && fpOk,
    checks,
    notes: base.notes,
    paypalOrderId,
    paymentMandateId: rec.paymentMandateId,
    mode: rec.payment.payment_mandate_contents.x_mandate.mode,
    merchant: rec.cart.contents.merchant_name,
    total: `${cx.currency} ${decimal(cx.lines.reduce((s, l) => s + l.unitMinor * l.qty, 0))}`,
    items: rec.cart.contents.payment_request.details.displayItems.map((i) => i.label),
    createdAt: rec.createdAt,
    chain: { intent, cart: rec.cart, payment: rec.payment },
  };
}
