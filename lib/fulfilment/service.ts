import { writeDisputeStatement } from "../agent/dispute-writer";
import type { LlmClient } from "../agent/runtime";
import type { PaidOrder } from "../core/executor";
import { canonicalJson, sha256Hex } from "../gate/canonical";
import { formatMoney } from "../gate/policy";
import type { Receipt, ReceiptLog } from "../gate/receipts";
import type { Carrier, ShipmentStatus } from "./carrier";
import type { DisputeRecord, DisputeStore, OrderRecord, OrderStore } from "./stores";

/** Mirrors shipment status onto the PayPal transaction (seller-side tracking). */
export interface TrackingChannel {
  readonly name: string;
  attach(t: { captureId: string; trackingNumber: string; status: "SHIPPED" | "DELIVERED" }): Promise<void>;
}

export type FileOutcome = { status: "filed"; paypalDisputeId: string } | { status: "awaiting_buyer_filing"; fileUrl: string };

/** Where disputes are filed and looked up. */
export interface DisputeChannel {
  readonly name: string;
  file(d: DisputeRecord, o: OrderRecord): Promise<FileOutcome>;
  find(captureId: string): Promise<{ paypalDisputeId: string; state: string } | null>;
}

interface Deps {
  orders: OrderStore;
  disputes: DisputeStore;
  carrier: Carrier;
  receipts: ReceiptLog;
  tracking: TrackingChannel | null;
  disputeChannel: DisputeChannel;
  publicKey: string;
  clock: () => Date;
  /** The AP2 credential chain behind a payment, with its verification, for dispute evidence. */
  ap2Evidence?: (paypalOrderId: string) => Promise<unknown>;
}

export type OrderView = OrderRecord & { dispute: DisputeRecord | null };

const day = (iso: string) => iso.slice(0, 10);

/** Follows each paid order to delivery, and drafts and files disputes when one goes wrong. */
export class Fulfilment {
  constructor(private d: Deps) {}

  get carrierSimulated() {
    return this.d.carrier.simulated;
  }

  async onPaid(p: PaidOrder): Promise<void> {
    if (await this.d.orders.get(p.paypalOrderId)) return;
    const now = this.d.clock();
    const shipped = await this.d.carrier.ship(p.paypalOrderId, now);
    const track = await this.d.carrier.track(shipped.trackingNumber);
    const order: OrderRecord = {
      id: p.paypalOrderId,
      mandateId: p.order.mandateId,
      merchantId: p.order.merchantId,
      items: p.order.items,
      amountMinor: p.amountMinor,
      currency: p.order.currency,
      captureId: p.captureId,
      permitId: p.permitId,
      paidAt: now.toISOString(),
      carrier: this.d.carrier.name,
      trackingNumber: shipped.trackingNumber,
      expectedBy: shipped.expectedBy,
      shipmentStatus: track.status,
      trackingEvents: track.events,
      paypalTracking: this.d.tracking ? "failed" : "not_applicable",
      problem: null,
    };
    if (!(await this.d.orders.insertIfAbsent(order))) return;

    if (this.d.tracking) {
      try {
        await this.d.tracking.attach({ captureId: p.captureId, trackingNumber: shipped.trackingNumber, status: "SHIPPED" });
        order.paypalTracking = "attached";
      } catch (e) {
        order.paypalTracking = "failed";
        console.error("PayPal tracking attach failed", e);
      }
      await this.d.orders.update(order);
    }

    await this.d.receipts.append({
      mandateId: order.mandateId,
      type: "tracking",
      summary: `Shipped order ${order.id} with ${order.carrier}, tracking ${order.trackingNumber}, expected by ${day(order.expectedBy)}${order.paypalTracking === "attached" ? "; tracking added to PayPal" : ""}`,
      payload: { orderId: order.id, trackingNumber: order.trackingNumber, expectedBy: order.expectedBy, paypalTracking: order.paypalTracking },
    });
  }

  async listOrders(mandateId?: string): Promise<OrderView[]> {
    const orders = await this.d.orders.list(mandateId);
    return Promise.all(orders.map(async (o) => ({ ...o, dispute: (await this.d.disputes.get(o.id)) ?? null })));
  }

  /** Demo control: only available with a simulated carrier. */
  async simulate(orderId: string, event: "lost" | "delivered") {
    const o = await this.require(orderId);
    const c = this.d.carrier;
    if (!c.simulated || !c.markLost || !c.markDelivered) throw new Error("Simulation is only available with the simulated carrier.");
    if (event === "lost") await c.markLost(o.trackingNumber, this.d.clock());
    else await c.markDelivered(o.trackingNumber, this.d.clock());
  }

  async refresh(orderId: string): Promise<OrderRecord> {
    const o = await this.require(orderId);
    const t = await this.d.carrier.track(o.trackingNumber);
    const now = this.d.clock();
    const overdue = t.status !== "DELIVERED" && now.getTime() > Date.parse(t.expectedBy);
    const problem: OrderRecord["problem"] = t.status === "LOST" || overdue ? "not_received" : null;
    const statusChanged = t.status !== o.shipmentStatus;
    const problemChanged = problem !== o.problem;
    if (!statusChanged && !problemChanged && t.events.length === o.trackingEvents.length) return o;

    const prev: ShipmentStatus = o.shipmentStatus;
    o.shipmentStatus = t.status;
    o.trackingEvents = t.events;
    o.expectedBy = t.expectedBy;
    o.problem = problem;
    await this.d.orders.update(o);

    if (statusChanged && t.status === "DELIVERED" && this.d.tracking) {
      try {
        await this.d.tracking.attach({ captureId: o.captureId, trackingNumber: o.trackingNumber, status: "DELIVERED" });
      } catch (e) {
        console.error("PayPal tracking update failed", e);
      }
    }

    if (statusChanged || problemChanged) {
      const what =
        t.status === "LOST"
          ? "carrier reports the parcel lost in transit"
          : t.status === "DELIVERED"
            ? "delivered"
            : overdue
              ? `still ${t.status.toLowerCase().replace("_", " ")} after the expected date ${day(t.expectedBy)}`
              : t.status.toLowerCase().replace("_", " ");
      await this.d.receipts.append({
        mandateId: o.mandateId,
        type: "tracking",
        summary: `Order ${o.id}: ${what}${problem ? ". Flagged: not received" : ""}`,
        payload: { orderId: o.id, from: prev, to: t.status, problem },
      });
    }
    return o;
  }

  async refreshAll(mandateId?: string): Promise<OrderView[]> {
    for (const o of await this.d.orders.list(mandateId)) {
      if (o.shipmentStatus !== "DELIVERED") await this.refresh(o.id);
    }
    return this.listOrders(mandateId);
  }

  async draftDispute(orderId: string, llm: LlmClient): Promise<DisputeRecord> {
    const o = await this.require(orderId);
    const existing = await this.d.disputes.get(orderId);
    if (existing && existing.status !== "draft") throw new Error(`A dispute is already ${existing.status.replace(/_/g, " ")} for this order.`);
    if (o.problem !== "not_received") throw new Error("This order has no delivery problem to dispute.");

    const money = formatMoney(o.amountMinor, o.currency);
    const facts = {
      paypalOrderId: o.id,
      merchantId: o.merchantId,
      items: o.items.map((i) => (i.qty > 1 ? `${i.qty} x ${i.title}` : i.title)).join(", "),
      amount: money,
      paidAt: day(o.paidAt),
      carrierStatus: o.shipmentStatus,
      expectedBy: day(o.expectedBy),
    };
    const { statement, writer } = await writeDisputeStatement(facts, llm);
    const linked = await this.linkedReceipts(o);
    const evidence = {
      reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      order: { paypalOrderId: o.id, captureId: o.captureId, merchantId: o.merchantId, items: o.items, amount: money, paidAt: o.paidAt },
      tracking: { carrier: o.carrier, trackingNumber: o.trackingNumber, expectedBy: o.expectedBy, status: o.shipmentStatus, events: o.trackingEvents },
      receipts: linked.map((r) => ({ seq: r.seq, type: r.type, summary: r.summary, createdAt: r.createdAt, hash: r.hash, signature: r.signature })),
      publicKey: this.d.publicKey,
      ap2: this.d.ap2Evidence ? await this.d.ap2Evidence(o.id) : null,
    };
    const dispute: DisputeRecord = {
      orderId: o.id,
      mandateId: o.mandateId,
      reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      statement,
      writer,
      evidence,
      evidenceDigest: sha256Hex(canonicalJson(evidence)),
      status: "draft",
      paypalDisputeId: null,
      fileUrl: null,
      createdAt: this.d.clock().toISOString(),
      filedAt: null,
    };
    await this.d.disputes.put(dispute);
    await this.d.receipts.append({
      mandateId: o.mandateId,
      type: "dispute",
      summary: `Drafted a not-received dispute for order ${o.id} (${money}) with ${linked.length} signed receipts as evidence; waiting for your confirmation`,
      payload: { orderId: o.id, evidenceDigest: dispute.evidenceDigest, writer },
    });
    return dispute;
  }

  /** The buyer rewrites the drafted statement in their own words before filing. */
  async editDisputeStatement(orderId: string, statement: string): Promise<DisputeRecord> {
    const o = await this.require(orderId);
    const draft = await this.d.disputes.get(orderId);
    if (!draft) throw new Error("Draft the dispute first.");
    if (draft.status !== "draft") throw new Error(`This dispute is already filed (${draft.status.replace(/_/g, " ")}); it can't be edited.`);
    const text = statement.trim();
    if (text.length < 20) throw new Error("The statement needs at least 20 characters.");
    if (text.length > 2000) throw new Error("The statement can be at most 2,000 characters.");
    if (!(await this.d.disputes.transition(orderId, "draft", { statement: text, writer: "user" }))) throw new Error("This dispute was already filed; it can't be edited.");
    await this.d.receipts.append({
      mandateId: o.mandateId,
      type: "dispute",
      summary: `You edited the dispute statement for order ${o.id} before filing`,
      payload: { orderId: o.id, statementHash: sha256Hex(text), evidenceDigest: draft.evidenceDigest },
    });
    return (await this.d.disputes.get(orderId))!;
  }

  async fileDispute(orderId: string, confirm: boolean): Promise<DisputeRecord> {
    if (!confirm) throw new Error("Filing a dispute needs your explicit confirmation.");
    const o = await this.require(orderId);
    const draft = await this.d.disputes.get(orderId);
    if (!draft) throw new Error("Draft the dispute first.");
    if (draft.status !== "draft") throw new Error(`This dispute is already ${draft.status.replace(/_/g, " ")}.`);

    const outcome = await this.d.disputeChannel.file(draft, o);
    const patch: Partial<DisputeRecord> =
      outcome.status === "filed"
        ? { status: "filed", paypalDisputeId: outcome.paypalDisputeId, filedAt: this.d.clock().toISOString() }
        : { status: "awaiting_buyer_filing", fileUrl: outcome.fileUrl };
    if (!(await this.d.disputes.transition(orderId, "draft", patch))) throw new Error("This dispute was already filed.");
    await this.d.receipts.append({
      mandateId: o.mandateId,
      type: "dispute",
      summary:
        outcome.status === "filed"
          ? `You confirmed; dispute ${outcome.paypalDisputeId} filed for order ${o.id} via ${this.d.disputeChannel.name}`
          : `You confirmed; open PayPal's Resolution Center to file the claim for order ${o.id} with the drafted statement`,
      payload: { orderId: o.id, outcome, evidenceDigest: draft.evidenceDigest },
    });
    return (await this.d.disputes.get(orderId))!;
  }

  /** Look the dispute up on PayPal (after the buyer files it there). */
  async syncDispute(orderId: string): Promise<DisputeRecord | null> {
    const o = await this.require(orderId);
    const found = await this.d.disputeChannel.find(o.captureId);
    if (!found) return (await this.d.disputes.get(orderId)) ?? null;
    return this.applyDispute(o, found.paypalDisputeId, found.state);
  }

  /** From a PayPal webhook: attach a dispute to the order that owns the capture. */
  async linkDispute(captureId: string, paypalDisputeId: string, state: string): Promise<DisputeRecord | null> {
    const o = await this.d.orders.getByCapture(captureId);
    if (!o) return null;
    return this.applyDispute(o, paypalDisputeId, state);
  }

  private async applyDispute(o: OrderRecord, paypalDisputeId: string, state: string): Promise<DisputeRecord> {
    const status = /RESOLVED|CLOSED/i.test(state) ? "resolved" : "open";
    const existing = await this.d.disputes.get(o.id);
    const base: DisputeRecord = existing ?? {
      orderId: o.id,
      mandateId: o.mandateId,
      reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      statement: "",
      writer: "template",
      evidence: null,
      evidenceDigest: "",
      status: "open",
      paypalDisputeId: null,
      fileUrl: null,
      createdAt: this.d.clock().toISOString(),
      filedAt: null,
    };
    if (base.status === status && base.paypalDisputeId === paypalDisputeId) return base;
    const next: DisputeRecord = { ...base, status, paypalDisputeId, filedAt: base.filedAt ?? this.d.clock().toISOString() };
    await this.d.disputes.put(next);
    await this.d.receipts.append({
      mandateId: o.mandateId,
      type: "dispute",
      summary: `PayPal dispute ${paypalDisputeId} for order ${o.id} is ${state.toLowerCase().replace(/_/g, " ")}`,
      payload: { orderId: o.id, paypalDisputeId, state },
    });
    return next;
  }

  /** The signed receipts that prove this purchase: its decision, permit, payment, and tracking. */
  private async linkedReceipts(o: OrderRecord): Promise<Receipt[]> {
    const all = await this.d.receipts.list(o.mandateId);
    const p = (r: Receipt) => (r.payload ?? {}) as Record<string, unknown>;
    const permit = all.find((r) => r.type === "permit" && p(r).permitId === o.permitId);
    const digest = permit ? p(permit).digest : undefined;
    return all.filter((r) => {
      const x = p(r);
      if (r.type === "payment") return x.paypalOrderId === o.id;
      if (r.type === "permit") return x.permitId === o.permitId;
      if (r.type === "decision") return digest !== undefined && x.digest === digest;
      if (r.type === "tracking") return x.orderId === o.id;
      return false;
    });
  }

  private async require(orderId: string) {
    const o = await this.d.orders.get(orderId);
    if (!o) throw new Error("Order not found.");
    return o;
  }
}
