import { describe, it, expect, beforeEach, vi } from "vitest";
import { Fulfilment, type DisputeChannel, type TrackingChannel } from "@/lib/fulfilment/service";
import { SimulatedCarrier } from "@/lib/fulfilment/carrier";
import { MemoryOrderStore, MemoryDisputeStore } from "@/lib/fulfilment/stores";
import { generateSigner } from "@/lib/gate/keys";
import { ReceiptLog, verifyChain } from "@/lib/gate/receipts";
import type { LlmClient } from "@/lib/agent/runtime";
import type { OrderSpec } from "@/lib/gate/canonical";

const order: OrderSpec = {
  mandateId: "m1",
  merchantId: "acme-supplies",
  currency: "USD",
  items: [{ sku: "wul-500", title: "Eco washing-up liquid 500ml", unitMinor: 450, qty: 1 }],
};

const paid = { paypalOrderId: "5O1", captureId: "CAP-1", order, amountMinor: 450, permitId: "permit-1" };

const llmSaying = (text: string): LlmClient => ({ complete: async () => ({ stop: "end", content: [{ type: "text", text }] }) });
const goodText = (id = "5O1") =>
  `I paid for order ${id} but it never arrived. The carrier reported the parcel lost in transit and the seller has not sent a replacement. I am asking for a full refund of $4.50.`;

let t: number;
let receipts: ReceiptLog;
let signer: ReturnType<typeof generateSigner>;
let carrier: SimulatedCarrier;
let tracking: TrackingChannel & { attach: ReturnType<typeof vi.fn> };
let disputes: DisputeChannel;
let f: Fulfilment;

function build(over: { tracking?: TrackingChannel; disputes?: DisputeChannel } = {}) {
  return new Fulfilment({
    orders: new MemoryOrderStore(),
    disputes: new MemoryDisputeStore(),
    carrier,
    receipts,
    tracking: over.tracking ?? tracking,
    disputeChannel: over.disputes ?? disputes,
    publicKey: signer.publicKey,
    clock: () => new Date(t),
  });
}

beforeEach(async () => {
  t = Date.parse("2026-10-21T10:00:00Z");
  signer = generateSigner();
  receipts = new ReceiptLog(signer, () => new Date(t));
  // Seed the gate's own receipts for this order, as the governor and executor write them.
  await receipts.append({ mandateId: "m1", type: "decision", summary: "Allowed: washing-up liquid", payload: { digest: "d1", decision: { outcome: "allow" } } });
  await receipts.append({ mandateId: "m1", type: "permit", summary: "Issued permit", payload: { permitId: "permit-1", digest: "d1" } });
  await receipts.append({ mandateId: "m1", type: "payment", summary: "Paid $4.50", payload: { permitId: "permit-1", paypalOrderId: "5O1", captureId: "CAP-1" } });
  carrier = new SimulatedCarrier();
  tracking = { name: "spy", attach: vi.fn(async () => undefined) } as never;
  disputes = { name: "simulated", file: async () => ({ status: "filed" as const, paypalDisputeId: "PP-D-1" }), find: async () => null };
  f = build();
});

describe("fulfilment: shipping", () => {
  it("records the order, ships it and logs a tracking receipt", async () => {
    await f.onPaid(paid);
    const o = (await f.listOrders("m1"))[0]!;
    expect(o).toMatchObject({ id: "5O1", captureId: "CAP-1", amountMinor: 450, shipmentStatus: "IN_TRANSIT", problem: null });
    expect(o.trackingNumber).toMatch(/^SIM1Z/);
    expect((await receipts.list("m1")).at(-1)).toMatchObject({ type: "tracking" });
  });

  it("attaches the tracking number to the PayPal transaction", async () => {
    await f.onPaid(paid);
    const o = (await f.listOrders("m1"))[0]!;
    expect(tracking.attach).toHaveBeenCalledWith({ captureId: "CAP-1", trackingNumber: o.trackingNumber, status: "SHIPPED" });
    expect(o.paypalTracking).toBe("attached");
  });

  it("keeps the order if attaching tracking to PayPal fails", async () => {
    tracking.attach.mockRejectedValueOnce(new Error("422 carrier"));
    await f.onPaid(paid);
    const o = (await f.listOrders("m1"))[0]!;
    expect(o.paypalTracking).toBe("failed");
    expect(o.shipmentStatus).toBe("IN_TRANSIT");
  });

  it("is idempotent for the same PayPal order", async () => {
    await f.onPaid(paid);
    await f.onPaid(paid);
    expect(await f.listOrders("m1")).toHaveLength(1);
  });
});

describe("fulfilment: tracking and problem detection", () => {
  beforeEach(async () => {
    await f.onPaid(paid);
  });

  it("flags a lost parcel as not received", async () => {
    await f.simulate("5O1", "lost");
    const o = await f.refresh("5O1");
    expect(o).toMatchObject({ shipmentStatus: "LOST", problem: "not_received" });
    expect((await receipts.list("m1")).at(-1)!.summary).toMatch(/lost/i);
  });

  it("flags a parcel still in transit after its expected date", async () => {
    t += 4 * 864e5;
    expect(await f.refresh("5O1")).toMatchObject({ shipmentStatus: "IN_TRANSIT", problem: "not_received" });
  });

  it("does not flag a parcel in transit before its expected date", async () => {
    t += 864e5;
    expect(await f.refresh("5O1")).toMatchObject({ problem: null });
  });

  it("does not flag a delivered parcel, even after its expected date", async () => {
    await f.simulate("5O1", "delivered");
    t += 10 * 864e5;
    expect(await f.refresh("5O1")).toMatchObject({ shipmentStatus: "DELIVERED", problem: null });
  });

  it("updates PayPal tracking when a parcel is delivered", async () => {
    await f.simulate("5O1", "delivered");
    await f.refresh("5O1");
    expect(tracking.attach).toHaveBeenLastCalledWith(expect.objectContaining({ status: "DELIVERED" }));
  });

  it("logs a status change once, not on every refresh", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    const n = (await receipts.list("m1")).length;
    await f.refresh("5O1");
    await f.refreshAll("m1");
    expect(await receipts.list("m1")).toHaveLength(n);
  });

  it("rejects refresh of an unknown order", async () => {
    await expect(f.refresh("nope")).rejects.toThrow(/not found/i);
  });
});

describe("fulfilment: disputes", () => {
  beforeEach(async () => {
    await f.onPaid(paid);
  });

  it("will not draft a dispute for an order with no problem", async () => {
    await expect(f.draftDispute("5O1", llmSaying(goodText()))).rejects.toThrow(/no delivery problem/i);
  });

  it("drafts a dispute with an AI-written statement and a linked evidence bundle", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    const d = await f.draftDispute("5O1", llmSaying(goodText()));
    expect(d).toMatchObject({ orderId: "5O1", status: "draft", reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED", writer: "model" });
    expect(d.statement).toContain("5O1");
    const ev = d.evidence as { order: { captureId: string }; tracking: { status: string }; receipts: Array<{ type: string }>; publicKey: string };
    expect(ev.order.captureId).toBe("CAP-1");
    expect(ev.tracking.status).toBe("LOST");
    expect(ev.receipts.map((r) => r.type)).toEqual(expect.arrayContaining(["decision", "permit", "payment", "tracking"]));
    expect(ev.publicKey).toBe(signer.publicKey);
    expect(d.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect((await receipts.list("m1")).at(-1)).toMatchObject({ type: "dispute" });
    expect(verifyChain(await receipts.list(), signer.publicKey).ok).toBe(true);
  });

  it("falls back to a factual template if the model's statement doesn't cite the order", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    const d = await f.draftDispute("5O1", llmSaying("Please refund me, the seller is a scammer!!!"));
    expect(d.writer).toBe("template");
    expect(d.statement).toContain("5O1");
    expect(d.statement).toContain("$4.50");
  });

  it("falls back to the template if the model fails", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    const failing: LlmClient = { complete: async () => Promise.reject(new Error("timeout")) };
    expect((await f.draftDispute("5O1", failing)).writer).toBe("template");
  });

  it("redrafting replaces the draft rather than adding a second one", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    await f.draftDispute("5O1", llmSaying(goodText()));
    await f.draftDispute("5O1", llmSaying(goodText()));
    expect((await f.listOrders("m1"))[0]!.dispute).toMatchObject({ status: "draft" });
  });

  it("the buyer can edit the drafted statement before filing; the edit is signed into the log", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    await f.draftDispute("5O1", llmSaying(goodText()));
    const mine = "Order 5O1 for $4.50 never arrived; the carrier lost it. Please refund me in full.";
    const d = await f.editDisputeStatement("5O1", `  ${mine}  `);
    expect(d).toMatchObject({ statement: mine, writer: "user", status: "draft" });
    expect((await f.listOrders("m1"))[0]!.dispute).toMatchObject({ statement: mine, writer: "user" });
    expect((await receipts.list("m1")).at(-1)).toMatchObject({ type: "dispute", summary: expect.stringMatching(/edited the dispute statement/i) });
    expect(verifyChain(await receipts.list(), signer.publicKey).ok).toBe(true);
  });

  it("rejects an empty or oversized statement, and edits once filed", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    await expect(f.editDisputeStatement("5O1", "x")).rejects.toThrow(/draft the dispute first/i);
    await f.draftDispute("5O1", llmSaying(goodText()));
    await expect(f.editDisputeStatement("5O1", "   too short ")).rejects.toThrow(/at least/i);
    await expect(f.editDisputeStatement("5O1", "a".repeat(2001))).rejects.toThrow(/at most/i);
    await f.fileDispute("5O1", true);
    await expect(f.editDisputeStatement("5O1", "A perfectly reasonable statement about order 5O1.")).rejects.toThrow(/already filed/i);
  });

  it("filing needs explicit confirmation and an existing draft", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    await expect(f.fileDispute("5O1", false)).rejects.toThrow(/confirm/i);
    await expect(f.fileDispute("5O1", true)).rejects.toThrow(/draft/i);
  });

  it("files through the channel and records the PayPal dispute id", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    await f.draftDispute("5O1", llmSaying(goodText()));
    const d = await f.fileDispute("5O1", true);
    expect(d).toMatchObject({ status: "filed", paypalDisputeId: "PP-D-1" });
    await expect(f.fileDispute("5O1", true)).rejects.toThrow(/already/i);
    await expect(f.draftDispute("5O1", llmSaying(goodText()))).rejects.toThrow(/already/i);
  });

  it("hands over to the buyer when the channel cannot file by API", async () => {
    const manual: DisputeChannel = {
      name: "paypal-resolution-center",
      file: async () => ({ status: "awaiting_buyer_filing" as const, fileUrl: "https://www.sandbox.paypal.com/resolutioncenter" }),
      find: async () => ({ paypalDisputeId: "PP-D-9", state: "OPEN" }),
    };
    const g = build({ disputes: manual });
    await g.onPaid(paid);
    await g.simulate("5O1", "lost");
    await g.refresh("5O1");
    await g.draftDispute("5O1", llmSaying(goodText()));
    expect(await g.fileDispute("5O1", true)).toMatchObject({ status: "awaiting_buyer_filing", fileUrl: expect.stringContaining("resolutioncenter") });
    expect(await g.syncDispute("5O1")).toMatchObject({ status: "open", paypalDisputeId: "PP-D-9" });
  });

  it("links a dispute reported by PayPal (webhook) to the order by capture id", async () => {
    await f.simulate("5O1", "lost");
    await f.refresh("5O1");
    await f.draftDispute("5O1", llmSaying(goodText()));
    expect(await f.linkDispute("CAP-1", "PP-D-7", "RESOLVED")).toMatchObject({ status: "resolved", paypalDisputeId: "PP-D-7" });
    expect(await f.linkDispute("CAP-unknown", "PP-D-8", "OPEN")).toBeNull();
  });
});
