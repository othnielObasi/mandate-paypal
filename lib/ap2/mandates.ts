/**
 * AP2-aligned mandates. Field names follow the AP2 spec's examples
 * (ap2-protocol.org); `x_mandate` carries Mandate's machine-enforceable
 * extension. Signatures are compact Ed25519 JWS over the SHA-256 of the
 * canonical contents. Aligned with AP2, not certified against it.
 */
import { randomBytes } from "node:crypto";
import { canonicalJson, sha256Hex } from "../gate/canonical";
import type { Signer } from "../gate/keys";
import type { Currency, Policy } from "../gate/policy";
import { signJws } from "./jws";

export const CART_TTL_MS = 15 * 60_000;

export interface Amount {
  currency: string;
  value: string;
}
export interface DisplayItem {
  label: string;
  amount: Amount;
  pending: boolean;
}

export interface IntentMandateContents {
  natural_language_description: string;
  /** false: the agent may buy without the user present, within the constraints. */
  user_cart_confirmation_required: boolean;
  merchants: string[] | null;
  skus: string[] | null;
  required_refundability: boolean;
  intent_expiry: string;
  x_mandate: { mandate_id: string; user_id: string; policy: Policy; issued_at: string };
}
export interface IntentMandate {
  contents: IntentMandateContents;
  user_authorization: string;
}

export interface CartLine {
  sku: string;
  title: string;
  unitMinor: number;
  qty: number;
}
export interface CartContents {
  id: string;
  user_signature_required: boolean;
  payment_request: {
    method_data: Array<{ supported_methods: string; data: Record<string, unknown> }>;
    details: { id: string; displayItems: DisplayItem[]; total: DisplayItem };
    options: { requestPayerName: boolean; requestPayerEmail: boolean; requestPayerPhone: boolean; requestShipping: boolean };
  };
  cart_expiry: string;
  merchant_name: string;
  x_mandate: { merchant_id: string; category: string; currency: Currency; lines: CartLine[] };
}
export interface CartMandate {
  contents: CartContents;
  merchant_signature: string;
  timestamp: string;
}

export type PaymentMode = "human_not_present" | "human_present";
export interface PaymentMandateContents {
  payment_mandate_id: string;
  payment_details_id: string;
  payment_details_total: DisplayItem & { refund_period: number };
  payment_response: {
    request_id: string;
    method_name: string;
    details: Record<string, unknown>;
    shipping_address: null;
    shipping_option: null;
    payer_name: null;
    payer_email: null;
    payer_phone: null;
  };
  merchant_agent: string;
  timestamp: string;
  x_mandate: { mode: PaymentMode; intent_hash: string; cart_hash: string };
}
export interface PaymentMandate {
  payment_mandate_contents: PaymentMandateContents;
  user_authorization: string;
}

export const mandateHash = (x: unknown) => sha256Hex(canonicalJson(x));
export const decimal = (minor: number) => (minor / 100).toFixed(2);
const id = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}`;
export const cartTotalMinor = (lines: CartLine[]) => lines.reduce((s, l) => s + l.unitMinor * l.qty, 0);

export function signIntentMandate(
  i: { mandateId: string; userId: string; description: string; policy: Policy; now: Date },
  userKey: Signer,
): IntentMandate {
  const contents: IntentMandateContents = {
    natural_language_description: i.description,
    user_cart_confirmation_required: false,
    merchants: null,
    skus: null,
    required_refundability: false,
    intent_expiry: `${i.policy.expires}T23:59:59.999Z`,
    x_mandate: { mandate_id: i.mandateId, user_id: i.userId, policy: i.policy, issued_at: i.now.toISOString() },
  };
  const user_authorization = signJws({ typ: "ap2.intent_mandate", sub: i.userId, hash: mandateHash(contents), iat: i.now.toISOString() }, userKey);
  return { contents, user_authorization };
}

export function signCartMandate(
  c: { merchantId: string; merchantName: string; currency: Currency; category: string; lines: CartLine[]; now: Date; ttlMs?: number },
  merchantKey: Signer,
): CartMandate {
  const cartId = id("cart");
  const total = cartTotalMinor(c.lines);
  const contents: CartContents = {
    id: cartId,
    user_signature_required: false,
    payment_request: {
      method_data: [{ supported_methods: "PAYPAL", data: {} }],
      details: {
        id: cartId,
        displayItems: c.lines.map((l) => ({
          label: l.qty > 1 ? `${l.qty} × ${l.title}` : l.title,
          amount: { currency: c.currency, value: decimal(l.unitMinor * l.qty) },
          pending: false,
        })),
        total: { label: "Total", amount: { currency: c.currency, value: decimal(total) }, pending: false },
      },
      options: { requestPayerName: false, requestPayerEmail: false, requestPayerPhone: false, requestShipping: true },
    },
    cart_expiry: new Date(c.now.getTime() + (c.ttlMs ?? CART_TTL_MS)).toISOString(),
    merchant_name: c.merchantName,
    x_mandate: { merchant_id: c.merchantId, category: c.category, currency: c.currency, lines: c.lines },
  };
  const merchant_signature = signJws({ typ: "ap2.cart_mandate", sub: c.merchantId, hash: mandateHash(contents), iat: c.now.toISOString() }, merchantKey);
  return { contents, merchant_signature, timestamp: c.now.toISOString() };
}

/**
 * Human-not-present: signed by the Mandate gateway, attesting the cart
 * satisfies the user-signed intent. Human-present: signed by the user, who
 * approved this exact cart.
 */
export function signPaymentMandate(p: { intent: IntentMandate; cart: CartMandate; mode: PaymentMode; now: Date }, signer: Signer): PaymentMandate {
  const total = p.cart.contents.payment_request.details.total;
  const contents: PaymentMandateContents = {
    payment_mandate_id: id("pm"),
    payment_details_id: p.cart.contents.id,
    payment_details_total: { ...total, refund_period: 30 },
    payment_response: {
      request_id: p.cart.contents.id,
      method_name: "PAYPAL",
      details: {},
      shipping_address: null,
      shipping_option: null,
      payer_name: null,
      payer_email: null,
      payer_phone: null,
    },
    merchant_agent: p.cart.contents.x_mandate.merchant_id,
    timestamp: p.now.toISOString(),
    x_mandate: { mode: p.mode, intent_hash: mandateHash(p.intent.contents), cart_hash: mandateHash(p.cart.contents) },
  };
  const user_authorization = signJws({ typ: "ap2.payment_mandate", mode: p.mode, hash: mandateHash(contents), iat: p.now.toISOString() }, signer);
  return { payment_mandate_contents: contents, user_authorization };
}

/** Short reference carried on the PayPal order (item description, max 127 chars). */
export function paymentFingerprint(pm: PaymentMandate): string {
  return `AP2 mandate ${pm.payment_mandate_contents.payment_mandate_id} #${mandateHash(pm.payment_mandate_contents).slice(0, 16)}`;
}
