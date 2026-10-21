import { describe, it, expect, beforeEach } from "vitest";
import { Executor } from "@/lib/core/executor";
import { MemoryPaymentStore } from "@/lib/core/spend";
import { FakeProvider } from "@/lib/paypal/fake-provider";
import { orderDigest, type OrderSpec } from "@/lib/gate/canonical";
import { generateSigner } from "@/lib/gate/keys";
import { issuePermit, MemoryPermitStore } from "@/lib/gate/permits";
import { ReceiptLog, verifyChain } from "@/lib/gate/receipts";

const order: OrderSpec = {
  mandateId: "m1",
  merchantId: "acme-supplies",
  currency: "USD",
  items: [{ sku: "wul-500", title: "Washing-up liquid", unitMinor: 450, qty: 1 }],
};
const now = new Date("2026-10-21T10:00:00Z");
const urls = { returnUrl: "https://mandate.test/r", cancelUrl: "https://mandate.test/c" };

let signer: ReturnType<typeof generateSigner>;
let permits: MemoryPermitStore;
let payments: MemoryPaymentStore;
let receipts: ReceiptLog;
let provider: FakeProvider;
let executor: Executor;

function permitFor(o: OrderSpec, amountMinor = 450, s = signer) {
  return issuePermit({ intentId: "i1", mandateId: o.mandateId, digest: orderDigest(o), amountMinor, currency: o.currency, now }, s);
}

beforeEach(() => {
  signer = generateSigner();
  permits = new MemoryPermitStore();
  payments = new MemoryPaymentStore();
  receipts = new ReceiptLog(signer, () => now);
  provider = new FakeProvider("auto_complete");
  executor = new Executor({ provider, permits, payments, receipts, publicKey: signer.publicKey, clock: () => now, urls });
});

describe("executor: the only path to PayPal", () => {
  it("pays with a valid permit and records the spend and a receipt", async () => {
    const p = permitFor(order);
    await permits.save(p);
    const r = await executor.pay(p.id, order);
    expect(r).toMatchObject({ status: "paid", amountMinor: 450 });
    expect(provider.calls.create).toBe(1);
    expect(await payments.spentMinor("m1", "month", now)).toBe(450);
    const log = await receipts.list();
    expect(log.map((x) => x.type)).toEqual(["payment"]);
    expect(verifyChain(log, signer.publicKey).ok).toBe(true);
  });

  it("refuses an unknown permit and never calls PayPal", async () => {
    const r = await executor.pay("missing", order);
    expect(r).toMatchObject({ status: "refused", reason: "no_permit" });
    expect(provider.calls.create).toBe(0);
  });

  it("refuses a permit that was not saved by the gate, even if correctly signed", async () => {
    const p = permitFor(order);
    const r = await executor.pay(p.id, order);
    expect(r).toMatchObject({ status: "refused", reason: "no_permit" });
    expect(provider.calls.create).toBe(0);
  });

  it("refuses to pay for a different order than the permit covers", async () => {
    const p = permitFor(order);
    await permits.save(p);
    const swapped: OrderSpec = { ...order, items: [{ sku: "gc-100", title: "Gift card", unitMinor: 450, qty: 1 }] };
    expect(await executor.pay(p.id, swapped)).toMatchObject({ status: "refused", reason: "digest_mismatch" });
    expect(provider.calls.create).toBe(0);
  });

  it("refuses when the order total and permit amount disagree", async () => {
    const p = permitFor(order, 100);
    await permits.save(p);
    expect(await executor.pay(p.id, order)).toMatchObject({ status: "refused", reason: "amount_mismatch" });
    expect(provider.calls.create).toBe(0);
  });

  it("refuses a permit signed by another key", async () => {
    const p = permitFor(order, 450, generateSigner());
    await permits.save(p);
    expect(await executor.pay(p.id, order)).toMatchObject({ status: "refused", reason: "bad_signature" });
    expect(provider.calls.create).toBe(0);
  });

  it("refuses an expired permit", async () => {
    const p = permitFor(order);
    await permits.save(p);
    const late = new Executor({ provider, permits, payments, receipts, publicKey: signer.publicKey, clock: () => new Date(now.getTime() + 6 * 60_000), urls });
    expect(await late.pay(p.id, order)).toMatchObject({ status: "refused", reason: "expired" });
    expect(provider.calls.create).toBe(0);
  });

  it("refuses to replay a permit", async () => {
    const p = permitFor(order);
    await permits.save(p);
    expect((await executor.pay(p.id, order)).status).toBe("paid");
    expect(await executor.pay(p.id, order)).toMatchObject({ status: "refused", reason: "permit_used" });
    expect(provider.calls.create).toBe(1);
  });

  it("pays once when the same permit is raced", async () => {
    const p = permitFor(order);
    await permits.save(p);
    const results = await Promise.all(Array.from({ length: 10 }, () => executor.pay(p.id, order)));
    expect(results.filter((r) => r.status === "paid")).toHaveLength(1);
    expect(provider.calls.create).toBe(1);
  });

  it("records a failed payment and does not count it as spend", async () => {
    provider.failNext = true;
    const p = permitFor(order);
    await permits.save(p);
    expect(await executor.pay(p.id, order)).toMatchObject({ status: "failed" });
    expect(await payments.spentMinor("m1", "month", now)).toBe(0);
    expect((await receipts.list()).map((x) => x.type)).toEqual(["payment_failed"]);
  });

  it("returns the approval link when PayPal needs the buyer, then completes only that order", async () => {
    const p2 = new FakeProvider("payer_action");
    const ex = new Executor({ provider: p2, permits, payments, receipts, publicKey: signer.publicKey, clock: () => now, urls });
    const p = permitFor(order);
    await permits.save(p);
    const r = await ex.pay(p.id, order);
    expect(r).toMatchObject({ status: "awaiting_buyer" });
    if (r.status !== "awaiting_buyer") throw new Error("unreachable");
    expect(r.approveUrl).toMatch(/^https:\/\//);
    expect(await payments.spentMinor("m1", "month", now)).toBe(0);

    expect(await ex.completeBuyerApproval("not-ours")).toMatchObject({ status: "refused", reason: "unknown_order" });
    expect(await ex.completeBuyerApproval(r.paypalOrderId)).toMatchObject({ status: "paid" });
    expect(await ex.completeBuyerApproval(r.paypalOrderId)).toMatchObject({ status: "refused", reason: "unknown_order" });
    expect(await payments.spentMinor("m1", "month", now)).toBe(450);
  });

  it("counts money awaiting buyer approval as reserved", async () => {
    const p2 = new FakeProvider("payer_action");
    const ex = new Executor({ provider: p2, permits, payments, receipts, publicKey: signer.publicKey, clock: () => now, urls });
    const p = permitFor(order);
    await permits.save(p);
    await ex.pay(p.id, order);
    expect(ex.pendingMinor("m1")).toBe(450);
    expect(ex.pendingMinor("m2")).toBe(0);
  });
});
