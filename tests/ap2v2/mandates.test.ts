import { describe, it, expect } from "vitest";
import { generateEs256, publicJwk, decodeJws } from "@/lib/ap2v2/es256";
import {
  openMandatesFor,
  merchantCheckout,
  closeAutonomous,
  closeApproved,
  checkoutReceipt,
  paymentReceipt,
  verifyPurchase,
  checkPaymentConstraints,
  checkCheckoutConstraints,
  type Purchase,
} from "@/lib/ap2v2/mandates";
import type { Policy } from "@/lib/gate/policy";

const NOW = 1_800_000_000;
const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2027-01-31",
};

const provider = generateEs256("mandate-provider");
const agent = generateEs256("mandate-agent");
const merchant = generateEs256("acme-supplies");
const gateway = generateEs256("mandate-gateway");

function setup() {
  const open = openMandatesFor(policy, { providerKey: provider, agentKey: agent, now: NOW });
  const checkout = merchantCheckout({ id: "cart_1", merchant: { id: "acme-supplies", name: "Acme Supplies" }, currency: "USD", items: [{ sku: "wul-500", title: "Eco washing-up liquid 500ml", unitMinor: 450, qty: 1 }] }, merchant);
  return { open, checkout };
}

function keys() {
  return {
    root: (h: Record<string, unknown>) => (h.kid === "mandate-provider" ? publicJwk(provider) : publicJwk(generateEs256())),
    merchant: (id: string) => (id === "acme-supplies" ? publicJwk(merchant) : undefined),
    receiptIssuer: (iss: string) => (iss === "acme-supplies" ? publicJwk(merchant) : iss === "mandate-gateway" ? publicJwk(gateway) : undefined),
  };
}

describe("AP2 v0.2 mandates from a Mandate policy", () => {
  it("maps the policy's fixed limits onto standard open mandates bound to the agent key", () => {
    const { open } = setup();
    expect(open.checkoutOpen.mandate).toMatchObject({ vct: "mandate.checkout.open.1", cnf: { jwk: publicJwk(agent) }, constraints: [] });
    expect(open.paymentOpen.mandate.constraints).toEqual([
      { type: "payment.amount_range", currency: "USD", min: 0, max: 2500 },
      { type: "payment.budget", currency: "USD", max: 80 },
      { type: "payment.agent_recurrence", frequency: "MONTHLY" },
      { type: "payment.reference", conditional_transaction_id: open.openCheckoutHash },
    ]);
    // Seller rules depend on the live registry, so they are enforced by the gate, not frozen into the mandate.
    expect(JSON.stringify(open.paymentOpen.mandate)).not.toContain("allowed_payees");
    expect(open.paymentOpen.mandate.exp).toBe(Math.floor(Date.parse("2027-01-31T23:59:59Z") / 1000));
  });

  it("an explicit merchant list becomes allowed_merchants and allowed_payees constraints", () => {
    const open = openMandatesFor(policy, { providerKey: provider, agentKey: agent, now: NOW, allowedMerchants: [{ id: "acme-supplies", name: "Acme Supplies" }] });
    expect(open.checkoutOpen.mandate.constraints).toEqual([{ type: "checkout.allowed_merchants", allowed: [{ id: "acme-supplies", name: "Acme Supplies" }] }]);
    expect(open.paymentOpen.mandate.constraints).toContainEqual({ type: "payment.allowed_payees", allowed: [{ id: "acme-supplies", name: "Acme Supplies" }] });
  });

  it("the merchant's checkout is a UCP-shaped, ES256-signed JWT", () => {
    const { checkout } = setup();
    const { header, payload } = decodeJws(checkout.jwt);
    expect(header).toMatchObject({ alg: "ES256", kid: "acme-supplies" });
    expect(payload).toMatchObject({ id: "cart_1", status: "ready_for_complete", currency: "USD", totals: [{ type: "total", amount: 450 }] });
    expect(checkout.hash).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("autonomous purchase: the agent closes both mandates; the full bundle verifies like a dispute reviewer would", () => {
    const { open, checkout } = setup();
    const closed = closeAutonomous(open, checkout, { agentKey: agent, payee: { id: "acme-supplies", name: "Acme Supplies" }, now: NOW, nonce: "n1" });
    const purchase: Purchase = {
      ...closed,
      checkoutJwt: checkout.jwt,
      checkoutReceipt: checkoutReceipt(closed.checkoutChain, { orderId: "5O1", issuer: "acme-supplies", key: merchant, now: NOW }),
      paymentReceipt: paymentReceipt(closed.paymentChain, { paypalOrderId: "5O1", captureId: "CAP1", issuer: "mandate-gateway", key: gateway, now: NOW }),
    };
    const r = verifyPurchase(purchase, keys(), { now: NOW, context: { totalAmount: 0, totalUses: 0 } });
    expect(r.checks.filter((c) => !c.ok)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("human_not_present");
    expect(r.amount).toEqual({ amount: 450, currency: "USD" });
  });

  it("approved purchase (human present): closed mandates signed directly with the user's key", () => {
    const { checkout } = setup();
    const user = generateEs256("user-demo");
    const closed = closeApproved(checkout, { userKey: user, payee: { id: "acme-supplies", name: "Acme Supplies" }, now: NOW });
    const r = verifyPurchase({ ...closed, checkoutJwt: checkout.jwt }, { ...keys(), root: (h) => (h.kid === "user-demo" ? publicJwk(user) : publicJwk(provider)) }, { now: NOW });
    expect(r.mode).toBe("human_present");
    expect(r.ok).toBe(true);
  });

  it("an amount over the open mandate's cap fails, naming the constraint", () => {
    const { open } = setup();
    const kettle = merchantCheckout({ id: "cart_2", merchant: { id: "acme-supplies", name: "Acme Supplies" }, currency: "USD", items: [{ sku: "kettle", title: "Kettle", unitMinor: 3200, qty: 1 }] }, merchant);
    const closed = closeAutonomous(open, kettle, { agentKey: agent, payee: { id: "acme-supplies", name: "Acme Supplies" }, now: NOW, nonce: "n" });
    const r = verifyPurchase({ ...closed, checkoutJwt: kettle.jwt }, keys(), { now: NOW, context: { totalAmount: 0, totalUses: 0 } });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === "payment_constraints")).toMatchObject({ ok: false, detail: expect.stringMatching(/exceeds maximum 2500/) });
  });

  it("a merchant not in an explicit allowed list fails the checkout constraints", () => {
    const open = openMandatesFor(policy, { providerKey: provider, agentKey: agent, now: NOW, allowedMerchants: [{ id: "acme-supplies", name: "Acme Supplies" }] });
    const other = generateEs256("corner-mart");
    const c = merchantCheckout({ id: "cart_3", merchant: { id: "corner-mart", name: "Corner Mart" }, currency: "USD", items: [{ sku: "t", title: "Toilet roll", unitMinor: 649, qty: 1 }] }, other);
    const closed = closeAutonomous(open, c, { agentKey: agent, payee: { id: "corner-mart", name: "Corner Mart" }, now: NOW, nonce: "n" });
    const r = verifyPurchase({ ...closed, checkoutJwt: c.jwt }, { ...keys(), merchant: (id) => (id === "corner-mart" ? publicJwk(other) : undefined) }, { now: NOW, context: { totalAmount: 0, totalUses: 0 } });
    expect(r.checks.find((c2) => c2.id === "checkout_constraints")).toMatchObject({ ok: false });
  });

  it("detects a swapped checkout: the payment no longer matches what the merchant signed", () => {
    const { open, checkout } = setup();
    const closed = closeAutonomous(open, checkout, { agentKey: agent, payee: { id: "acme-supplies", name: "Acme Supplies" }, now: NOW, nonce: "n" });
    const other = merchantCheckout({ id: "cart_9", merchant: { id: "acme-supplies", name: "Acme Supplies" }, currency: "USD", items: [{ sku: "x", title: "X", unitMinor: 450, qty: 1 }] }, merchant);
    const r = verifyPurchase({ ...closed, checkoutJwt: other.jwt }, keys(), { now: NOW, context: { totalAmount: 0, totalUses: 0 } });
    expect(r.checks.find((c) => c.id === "checkout_hash")).toMatchObject({ ok: false });
  });

  it("budget: past spend in the period counts (reference SDK semantics: max in major units)", () => {
    const { open } = setup();
    const closedPayment = { vct: "mandate.payment.1", transaction_id: "t", payee: { id: "acme-supplies", name: "Acme Supplies" }, payment_amount: { amount: 2000, currency: "USD" }, payment_instrument: { id: "paypal-wallet", type: "paypal" } };
    expect(checkPaymentConstraints(open.paymentOpen.mandate, closedPayment, { openCheckoutHash: open.openCheckoutHash, context: { totalAmount: 6000, totalUses: 3 } })).toEqual([]);
    expect(checkPaymentConstraints(open.paymentOpen.mandate, closedPayment, { openCheckoutHash: open.openCheckoutHash, context: { totalAmount: 6001, totalUses: 3 } }).join()).toMatch(/budget/i);
  });

  it("unknown constraints fail closed, as the spec requires", () => {
    expect(checkCheckoutConstraints({ vct: "mandate.checkout.open.1", constraints: [{ type: "dev.example.mystery" }] }, { merchant: { id: "a", name: "A" }, line_items: [] })).toEqual([expect.stringMatching(/unknown constraint/i)]);
  });

  it("receipts reference the hash of the closed mandate JWT", () => {
    const { open, checkout } = setup();
    const closed = closeAutonomous(open, checkout, { agentKey: agent, payee: { id: "acme-supplies", name: "Acme Supplies" }, now: NOW, nonce: "n" });
    const rc = checkoutReceipt(closed.checkoutChain, { orderId: "O1", issuer: "acme-supplies", key: merchant, now: NOW });
    const tampered = rc.replace(/\.[^.]+$/, ".AAAA");
    const r = verifyPurchase({ ...closed, checkoutJwt: checkout.jwt, checkoutReceipt: tampered }, keys(), { now: NOW, context: { totalAmount: 0, totalUses: 0 } });
    expect(r.checks.find((c) => c.id === "checkout_receipt")).toMatchObject({ ok: false });
  });
});
