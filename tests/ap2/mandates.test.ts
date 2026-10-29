import { describe, it, expect } from "vitest";
import { generateSigner } from "@/lib/gate/keys";
import { deriveSigner } from "@/lib/ap2/keys";
import { signIntentMandate, signCartMandate, signPaymentMandate, mandateHash, paymentFingerprint, type CartLine } from "@/lib/ap2/mandates";
import { verifyPaymentChain, type TrustStore } from "@/lib/ap2/verify";
import type { Policy } from "@/lib/gate/policy";

const root = generateSigner();
const user = deriveSigner(root, "user:u1");
const merchant = deriveSigner(root, "merchant:acme-supplies");
const platform = root;
const now = new Date("2026-10-29T10:00:00Z");

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: ["shady-shop"] },
  overLimit: "ask",
  expires: "2026-12-31",
};

const trust: TrustStore = {
  users: { u1: user.publicKey },
  merchants: { "acme-supplies": { publicKey: merchant.publicKey, verified: true, name: "Acme Supplies" } },
  platform: platform.publicKey,
};

const intent = signIntentMandate({ mandateId: "m1", userId: "u1", description: "household basics", policy, now }, user);
const line = (unitMinor = 450, qty = 1): CartLine => ({ sku: "wul-500", title: "Eco washing-up liquid", unitMinor, qty });
const cart = (lines = [line()], category = "household") =>
  signCartMandate({ merchantId: "acme-supplies", merchantName: "Acme Supplies", currency: "USD", category, lines, now }, merchant);

describe("Intent Mandate (AP2 shape)", () => {
  it("carries AP2 fields plus Mandate's machine-enforceable limits, signed by the user", () => {
    expect(intent.contents).toMatchObject({
      natural_language_description: "household basics",
      user_cart_confirmation_required: false,
      required_refundability: false,
      intent_expiry: "2026-12-31T23:59:59.999Z",
      x_mandate: { mandate_id: "m1", user_id: "u1", policy },
    });
    expect(intent.user_authorization.split(".")).toHaveLength(3);
  });
});

describe("Cart Mandate (AP2 shape)", () => {
  it("is a PaymentRequest-style cart signed by the merchant", () => {
    const c = cart([line(450, 2)]);
    expect(c.contents.payment_request.details.displayItems).toEqual([{ label: "2 × Eco washing-up liquid", amount: { currency: "USD", value: "9.00" }, pending: false }]);
    expect(c.contents.payment_request.details.total).toEqual({ label: "Total", amount: { currency: "USD", value: "9.00" }, pending: false });
    expect(c.contents.payment_request.method_data).toEqual([{ supported_methods: "PAYPAL", data: {} }]);
    expect(c.merchant_signature.split(".")).toHaveLength(3);
  });
});

describe("payment chain verification (merchant side, public keys only)", () => {
  it("accepts a human-not-present payment within the signed intent", () => {
    const c = cart();
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_not_present", now }, platform);
    const r = verifyPaymentChain({ intent, cart: c, payment: pm }, trust, now);
    expect(r.ok).toBe(true);
    expect(r.checks.every((x) => x.ok)).toBe(true);
    expect(r.checks.map((x) => x.id)).toEqual(
      expect.arrayContaining(["intent_signed_by_user", "cart_signed_by_merchant", "payment_authorised", "payment_matches_cart", "within_intent", "intent_unexpired"]),
    );
  });

  it("accepts a human-present payment the user signed after an over-limit approval", () => {
    const c = cart([line(3200)]);
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_present", now }, user);
    const r = verifyPaymentChain({ intent, cart: c, payment: pm }, trust, now);
    expect(r.ok).toBe(true);
    expect(r.checks.find((x) => x.id === "within_intent")).toMatchObject({ ok: true, detail: expect.stringMatching(/approved by the user/i) });
  });

  it("rejects a human-not-present payment over the signed item limit", () => {
    const c = cart([line(3200)]);
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_not_present", now }, platform);
    const r = verifyPaymentChain({ intent, cart: c, payment: pm }, trust, now);
    expect(r.ok).toBe(false);
    expect(r.checks.find((x) => x.id === "within_intent")).toMatchObject({ ok: false });
  });

  it("rejects a category outside the signed intent, and a blocked or unverified seller", () => {
    const off = cart([line()], "gift-cards");
    expect(verifyPaymentChain({ intent, cart: off, payment: signPaymentMandate({ intent, cart: off, mode: "human_not_present", now }, platform) }, trust, now).ok).toBe(false);
    const unverified: TrustStore = { ...trust, merchants: { "acme-supplies": { ...trust.merchants["acme-supplies"]!, verified: false } } };
    const c = cart();
    expect(verifyPaymentChain({ intent, cart: c, payment: signPaymentMandate({ intent, cart: c, mode: "human_not_present", now }, platform) }, unverified, now).ok).toBe(false);
  });

  it("rejects an intent the user did not sign (limits raised by someone else)", () => {
    const forged = { ...intent, contents: { ...intent.contents, x_mandate: { ...intent.contents.x_mandate, policy: { ...policy, maxItemMinor: 99999 } } } };
    const c = cart([line(3200)]);
    const r = verifyPaymentChain({ intent: forged, cart: c, payment: signPaymentMandate({ intent: forged, cart: c, mode: "human_not_present", now }, platform) }, trust, now);
    expect(r.checks.find((x) => x.id === "intent_signed_by_user")).toMatchObject({ ok: false });
    expect(r.ok).toBe(false);
  });

  it("rejects a cart whose price was changed after the merchant signed it", () => {
    const c = cart();
    const tampered = { ...c, contents: { ...c.contents, payment_request: { ...c.contents.payment_request, details: { ...c.contents.payment_request.details, total: { label: "Total", amount: { currency: "USD", value: "0.01" }, pending: false } } } } };
    const r = verifyPaymentChain({ intent, cart: tampered, payment: signPaymentMandate({ intent, cart: tampered, mode: "human_not_present", now }, platform) }, trust, now);
    expect(r.checks.find((x) => x.id === "cart_signed_by_merchant")).toMatchObject({ ok: false });
  });

  it("rejects a payment mandate that points at a different cart", () => {
    const pm = signPaymentMandate({ intent, cart: cart(), mode: "human_not_present", now }, platform);
    const other = cart([line(199)]);
    expect(verifyPaymentChain({ intent, cart: other, payment: pm }, trust, now).checks.find((x) => x.id === "payment_matches_cart")).toMatchObject({ ok: false });
  });

  it("rejects a human-present payment not signed by the user", () => {
    const c = cart([line(3200)]);
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_present", now }, platform);
    expect(verifyPaymentChain({ intent, cart: c, payment: pm }, trust, now).checks.find((x) => x.id === "payment_authorised")).toMatchObject({ ok: false });
  });

  it("rejects a payment made after the intent expired", () => {
    const later = new Date("2027-01-02T00:00:00Z");
    const c = signCartMandate({ merchantId: "acme-supplies", merchantName: "Acme", currency: "USD", category: "household", lines: [line()], now: later }, merchant);
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_not_present", now: later }, platform);
    expect(verifyPaymentChain({ intent, cart: c, payment: pm }, trust, later).checks.find((x) => x.id === "intent_unexpired")).toMatchObject({ ok: false });
  });

  it("rejects an unknown merchant or user", () => {
    const c = cart();
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_not_present", now }, platform);
    expect(verifyPaymentChain({ intent, cart: c, payment: pm }, { ...trust, merchants: {} }, now).ok).toBe(false);
    expect(verifyPaymentChain({ intent, cart: c, payment: pm }, { ...trust, users: {} }, now).ok).toBe(false);
  });

  it("never throws on garbage", () => {
    expect(verifyPaymentChain({ intent: null, cart: {}, payment: 5 } as never, trust, now).ok).toBe(false);
  });
});

describe("fingerprints", () => {
  it("hashes are stable and the PayPal fingerprint fits a PayPal item description", () => {
    const c = cart();
    const pm = signPaymentMandate({ intent, cart: c, mode: "human_not_present", now }, platform);
    expect(mandateHash(c)).toBe(mandateHash(structuredClone(c)));
    const fp = paymentFingerprint(pm);
    expect(fp.length).toBeLessThanOrEqual(127);
    expect(fp).toContain(pm.payment_mandate_contents.payment_mandate_id);
  });
});
