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
  private orders = new Map<string, { status: string; captureId?: string }>();

  constructor(private mode: "auto_complete" | "payer_action" = "auto_complete") {}

  async createOrder(_order: OrderSpec, _urls: ReturnUrls): Promise<CreateResult> {
    this.calls.create += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new PaymentError("Simulated PayPal failure");
    }
    const id = `SIM-${String(++this.seq).padStart(6, "0")}`;
    if (this.mode === "payer_action") {
      this.orders.set(id, { status: "PAYER_ACTION_REQUIRED" });
      return { paypalOrderId: id, status: "PAYER_ACTION_REQUIRED", approveUrl: `https://mandate.local/simulated-approve?token=${id}` };
    }
    const captureId = `SIMCAP-${this.seq}`;
    this.orders.set(id, { status: "COMPLETED", captureId });
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
}
