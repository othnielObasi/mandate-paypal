import { randomBytes } from "node:crypto";
import { orderTotalMinor, type OrderSpec } from "../gate/canonical";
import type { OrderRecords, PayPalOrderRecord } from "./order-records";
import { PaymentError, type CaptureResult, type CreateResult, type PaymentProvider, type ReturnUrls } from "./provider";

/**
 * Deterministic stand-in for tests and for running the demo without
 * PayPal credentials. Clearly labelled as simulated in the UI. It also
 * answers the seller check's "what does PayPal's record say?" question.
 */
export class FakeProvider implements PaymentProvider, OrderRecords {
  readonly name = "simulated";
  readonly source = "Simulated PayPal";
  calls = { create: 0, capture: 0 };
  failNext = false;
  private seq = 0;
  private orders = new Map<string, { status: string; captureId?: string; note: string | null; currency: string; amountMinor: number }>();

  constructor(private mode: "auto_complete" | "payer_action" = "auto_complete") {}

  async createOrder(order: OrderSpec, _urls: ReturnUrls, meta: { note?: string } = {}): Promise<CreateResult> {
    this.calls.create += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new PaymentError("Simulated PayPal failure");
    }
    // Unique across restarts, like real PayPal ids: a counter alone would repeat after a restart.
    const id = `SIM-${randomBytes(5).toString("hex").toUpperCase()}${String(++this.seq).padStart(3, "0")}`;
    const note = meta.note ? meta.note.slice(0, 127) : null;
    const money = { currency: order.currency, amountMinor: orderTotalMinor(order) };
    if (this.mode === "payer_action") {
      this.orders.set(id, { status: "PAYER_ACTION_REQUIRED", note, ...money });
      return { paypalOrderId: id, status: "PAYER_ACTION_REQUIRED", approveUrl: `https://mandate.local/simulated-approve?token=${id}` };
    }
    const captureId = `SIMCAP-${randomBytes(6).toString("hex").toUpperCase()}`;
    this.orders.set(id, { status: "COMPLETED", captureId, note, ...money });
    return { paypalOrderId: id, status: "COMPLETED", captureId };
  }

  /** Paid from a saved wallet: completes at once whatever the mode, like a real vaulted payment. */
  async chargeSaved(order: OrderSpec, meta: { note?: string } = {}): Promise<CreateResult> {
    this.calls.create += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new PaymentError("Simulated PayPal failure");
    }
    const id = `SIM-${randomBytes(5).toString("hex").toUpperCase()}${String(++this.seq).padStart(3, "0")}`;
    const captureId = `SIMCAP-${randomBytes(6).toString("hex").toUpperCase()}`;
    this.orders.set(id, { status: "COMPLETED", captureId, note: meta.note ? meta.note.slice(0, 127) : null, currency: order.currency, amountMinor: orderTotalMinor(order) });
    return { paypalOrderId: id, status: "COMPLETED", captureId };
  }

  async captureOrder(paypalOrderId: string): Promise<CaptureResult> {
    this.calls.capture += 1;
    const o = this.orders.get(paypalOrderId);
    if (!o) throw new PaymentError("Unknown order");
    if (o.status === "COMPLETED") throw new PaymentError("Order already captured");
    o.status = "COMPLETED";
    o.captureId = `SIMCAP-${paypalOrderId}`;
    return { paypalOrderId, status: "COMPLETED", captureId: o.captureId };
  }

  async getOrderStatus(paypalOrderId: string) {
    return this.orders.get(paypalOrderId)?.status ?? "UNKNOWN";
  }

  async getOrderNote(paypalOrderId: string) {
    return this.orders.get(paypalOrderId)?.note ?? null;
  }

  async getOrderRecord(paypalOrderId: string): Promise<PayPalOrderRecord | null> {
    const o = this.orders.get(paypalOrderId);
    if (!o) return null;
    return { status: o.status, currency: o.currency, amountMinor: o.amountMinor, captureIds: o.captureId && o.status === "COMPLETED" ? [o.captureId] : [] };
  }
}
