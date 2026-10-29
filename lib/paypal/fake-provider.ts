import { randomBytes } from "node:crypto";
import type { OrderSpec } from "../gate/canonical";
import { PaymentError, type CaptureResult, type CreateResult, type PaymentProvider, type ReturnUrls } from "./provider";

/**
 * Deterministic stand-in for tests and for running the demo without
 * PayPal credentials. Clearly labelled as simulated in the UI.
 */
export class FakeProvider implements PaymentProvider {
  readonly name = "simulated";
  calls = { create: 0, capture: 0 };
  failNext = false;
  private seq = 0;
  private orders = new Map<string, { status: string; captureId?: string; note: string | null }>();

  constructor(private mode: "auto_complete" | "payer_action" = "auto_complete") {}

  async createOrder(_order: OrderSpec, _urls: ReturnUrls, meta: { note?: string } = {}): Promise<CreateResult> {
    this.calls.create += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new PaymentError("Simulated PayPal failure");
    }
    // Unique across restarts, like real PayPal ids: a counter alone would repeat after a restart.
    const id = `SIM-${randomBytes(5).toString("hex").toUpperCase()}${String(++this.seq).padStart(3, "0")}`;
    const note = meta.note ? meta.note.slice(0, 127) : null;
    if (this.mode === "payer_action") {
      this.orders.set(id, { status: "PAYER_ACTION_REQUIRED", note });
      return { paypalOrderId: id, status: "PAYER_ACTION_REQUIRED", approveUrl: `https://mandate.local/simulated-approve?token=${id}` };
    }
    const captureId = `SIMCAP-${randomBytes(6).toString("hex").toUpperCase()}`;
    this.orders.set(id, { status: "COMPLETED", captureId, note });
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
}
