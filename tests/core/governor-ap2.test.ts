import { describe, it, expect, beforeEach } from "vitest";
import { Governor } from "@/lib/core/governor";
import { Executor } from "@/lib/core/executor";
import { MemoryPaymentStore } from "@/lib/core/spend";
import { MemoryMandateStore, MemoryApprovalStore } from "@/lib/core/stores";
import { FakeProvider } from "@/lib/paypal/fake-provider";
import { generateSigner } from "@/lib/gate/keys";
import { MemoryPermitStore } from "@/lib/gate/permits";
import { ReceiptLog } from "@/lib/gate/receipts";
import type { Policy } from "@/lib/gate/policy";
import { Credentials } from "@/lib/ap2/credentials";
import { MemoryCredentialStore } from "@/lib/ap2/store";
import { verifyPaymentChain } from "@/lib/ap2/verify";
import { verifyJws } from "@/lib/ap2/jws";
import { mandateHash, paymentFingerprint } from "@/lib/ap2/mandates";
import { CatalogMerchants, DEMO_MERCHANTS } from "@/lib/merchant/merchants";
import { Catalog, DEMO_CATALOG } from "@/lib/merchant/catalog";
import { EchoMerchants } from "../helpers/echo-merchants";
import type { PriceOracle } from "@/lib/market/oracle";

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2026-12-31",
};

function build(kind: "catalog" | "echo" = "catalog", market?: PriceOracle) {
  const now = new Date("2026-10-29T10:00:00Z");
  const clock = () => now;
  const root = generateSigner();
  const permits = new MemoryPermitStore();
  const payments = new MemoryPaymentStore();
  const receipts = new ReceiptLog(root, clock);
  const provider = new FakeProvider();
  const executor = new Executor({ provider, permits, payments, receipts, publicKey: root.publicKey, clock, urls: { returnUrl: "r", cancelUrl: "c" } });
  const mandates = new MemoryMandateStore();
  const credentials = new Credentials(root);
  const credentialStore = new MemoryCredentialStore();
  const merchants = kind === "catalog" ? new CatalogMerchants(root, new Catalog(DEMO_CATALOG), DEMO_MERCHANTS) : new EchoMerchants(root);
  const governor = new Governor({ mandates, approvals: new MemoryApprovalStore(), permits, payments, receipts, executor, signer: root, clock, credentials, merchants, credentialStore, market });
  return { governor, mandates, credentials, credentialStore, merchants, provider, now, root, receipts };
}

const prop = (mandateId: string, sku: string, merchantId = "acme-supplies", over: Record<string, unknown> = {}) => ({
  mandateId,
  // Prices and categories here are ignored: the merchant quotes and signs the cart.
  order: { mandateId, merchantId, currency: "USD" as const, items: [{ sku, title: "anything", unitMinor: 1, qty: 1 }] },
  category: "whatever",
  merchantVerified: true,
  origin: "agent" as const,
  ...over,
});

describe("governor with AP2-style credentials", () => {
  let env: ReturnType<typeof build>;
  let mandateId: string;

  beforeEach(async () => {
    env = build();
    mandateId = (await env.governor.createMandate({ userId: "u1", policy, rawText: "household basics" })).id;
  });

  it("signs an Intent Mandate with the user's key when the mandate is created", async () => {
    const m = (await env.mandates.get(mandateId))!;
    expect(m.intentMandate?.contents.x_mandate).toMatchObject({ mandate_id: mandateId, user_id: "u1", policy });
    const v = verifyJws(m.intentMandate!.user_authorization, env.credentials.userKey("u1").publicKey);
    expect(v.ok && v.payload.hash).toBe(mandateHash(m.intentMandate!.contents));
  });

  it("prices from the merchant's signed cart, not from the agent's proposal", async () => {
    const r = await env.governor.propose(prop(mandateId, "wul-500"));
    expect(r).toMatchObject({ status: "paid", amountMinor: 450 });
  });

  it("stores a verifiable chain for each payment and puts its fingerprint on the PayPal order", async () => {
    const r = await env.governor.propose(prop(mandateId, "wul-500"));
    if (r.status !== "paid") throw new Error(r.status);
    const rec = (await env.credentialStore.getByOrder(r.paypalOrderId))!;
    expect(rec.payment.payment_mandate_contents.x_mandate.mode).toBe("human_not_present");
    const m = (await env.mandates.get(mandateId))!;
    const trust = env.credentials.trust(env.merchants, ["u1"]);
    expect(verifyPaymentChain({ intent: m.intentMandate!, cart: rec.cart, payment: rec.payment }, trust, env.now).ok).toBe(true);
    expect(await env.provider.getOrderNote(r.paypalOrderId)).toBe(paymentFingerprint(rec.payment));
  });

  it("an approved over-limit purchase is signed by the user (human present)", async () => {
    const r = await env.governor.propose(prop(mandateId, "kettle"));
    if (r.status !== "pending_approval") throw new Error(r.status);
    const paid = await env.governor.decide(r.approvalId, "approve");
    if (paid.status !== "paid") throw new Error(paid.status);
    const rec = (await env.credentialStore.getByOrder(paid.paypalOrderId))!;
    expect(rec.payment.payment_mandate_contents.x_mandate.mode).toBe("human_present");
    const m = (await env.mandates.get(mandateId))!;
    expect(verifyPaymentChain({ intent: m.intentMandate!, cart: rec.cart, payment: rec.payment }, env.credentials.trust(env.merchants, ["u1"]), env.now).ok).toBe(true);
  });

  it("blocks when the limits on file no longer match what the user signed", async () => {
    const m = (await env.mandates.get(mandateId))!;
    await env.mandates.save({ ...m, policy: { ...m.policy, maxItemMinor: 8000 } }); // someone raised the limit in the database
    const r = await env.governor.propose(prop(mandateId, "kettle"));
    expect(r).toMatchObject({ status: "blocked", decision: { rule: "credentials" } });
    expect(env.provider.calls.create).toBe(0);
  });

  it("blocks a mandate with no signed intent", async () => {
    const m = (await env.mandates.get(mandateId))!;
    await env.mandates.save({ ...m, intentMandate: undefined });
    expect(await env.governor.propose(prop(mandateId, "wul-500"))).toMatchObject({ status: "blocked", decision: { rule: "credentials" } });
  });

  it("takes the seller's verified status from the merchant registry, not from the agent", async () => {
    const r = await env.governor.propose(prop(mandateId, "toilet-roll", "corner-mart", { merchantVerified: true }));
    expect(r).toMatchObject({ status: "blocked", decision: { rule: "seller" } });
  });

  it("blocks when the merchant will not quote (unknown product or wrong merchant)", async () => {
    expect((await env.governor.propose(prop(mandateId, "nope"))).status).toBe("blocked");
    expect((await env.governor.propose(prop(mandateId, "printer-paper", "acme-supplies"))).status).toBe("blocked");
  });

  it("takes the category from the merchant's catalogue", async () => {
    expect(await env.governor.propose(prop(mandateId, "printer-paper", "office-hub", { category: "household" }))).toMatchObject({ status: "blocked", decision: { rule: "category" } });
  });
});

describe("governor: market-price rule", () => {
  const ref = (referenceMinor: number | null): PriceOracle => ({
    name: "stub",
    reference: async () => (referenceMinor === null ? null : { referenceMinor, currency: "USD", products: 6, source: "stub" }),
  });

  it("asks the user when the merchant's price is too far above the market, and records the market data", async () => {
    const env = build("catalog", ref(300)); // washing-up liquid is $4.50; market says $3.00
    const m = await env.governor.createMandate({ userId: "u1", policy: { ...policy, maxPremiumPct: 10 }, rawText: "" });
    const r = await env.governor.propose(prop(m.id, "wul-500"));
    expect(r).toMatchObject({ status: "pending_approval", decision: { rule: "market_price" } });
    const d = (await env.receipts.list(m.id)).find((x) => x.type === "decision")!;
    expect(d.payload).toMatchObject({ market: { referenceMinor: 300, source: "stub", products: 6 } });
  });

  it("scales the market reference by quantity", async () => {
    const env = build("catalog", ref(440));
    const m = await env.governor.createMandate({ userId: "u1", policy: { ...policy, maxPremiumPct: 10 }, rawText: "" });
    const r = await env.governor.propose({ ...prop(m.id, "wul-500"), order: { mandateId: m.id, merchantId: "acme-supplies", currency: "USD", items: [{ sku: "wul-500", title: "x", unitMinor: 1, qty: 3 }] } });
    expect(r.status).toBe("paid"); // 3 × $4.50 = $13.50 vs 3 × $4.40 market: +2%
  });

  it("with no market data, does what the user signed: asks by default, blocks or buys if they chose so", async () => {
    const env = build("catalog", ref(null));
    const asked = await env.governor.createMandate({ userId: "u1", policy: { ...policy, maxPremiumPct: 10 }, rawText: "" });
    expect(await env.governor.propose(prop(asked.id, "wul-500"))).toMatchObject({ status: "pending_approval", decision: { rule: "market_price" } });
    const d = (await env.receipts.list(asked.id)).find((x) => x.type === "decision")!;
    expect(d.payload).toMatchObject({ market: null });
    const blocked = await env.governor.createMandate({ userId: "u1", policy: { ...policy, maxPremiumPct: 10, marketUnavailable: "block" }, rawText: "" });
    expect(await env.governor.propose(prop(blocked.id, "wul-500"))).toMatchObject({ status: "blocked", decision: { rule: "market_price" } });
    const allowed = await env.governor.createMandate({ userId: "u1", policy: { ...policy, maxPremiumPct: 10, marketUnavailable: "allow" }, rawText: "" });
    expect((await env.governor.propose(prop(allowed.id, "wul-500"))).status).toBe("paid");
  });

  it("does not look up prices when the mandate has no market rule", async () => {
    let calls = 0;
    const env = build("catalog", { name: "count", reference: async () => (calls++, null) });
    const m = await env.governor.createMandate({ userId: "u1", policy, rawText: "" });
    await env.governor.propose(prop(m.id, "wul-500"));
    expect(calls).toBe(0);
  });
});
