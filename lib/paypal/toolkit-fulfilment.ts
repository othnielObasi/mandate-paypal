import { randomBytes } from "node:crypto";
import type { DisputeChannel, FileOutcome, TrackingChannel } from "../fulfilment/service";

type ToolLike = { execute: (args: never, opts: never) => Promise<unknown> };
const OPTS = { toolCallId: "mandate-fulfilment", messages: [] } as never;

export const SANDBOX_RESOLUTION_CENTER = "https://www.sandbox.paypal.com/resolutioncenter";
/** Sandbox placeholder: PayPal requires a known carrier code; the parcel itself is simulated. */
const SANDBOX_CARRIER = "UPS";

function parse(raw: unknown, what: string): Record<string, unknown> {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      throw new Error(`${what}: unparseable toolkit output`);
    }
  }
  const o = (v ?? {}) as Record<string, unknown>;
  if (o.error) throw new Error(`${what}: ${JSON.stringify(o.error).slice(0, 300)}`);
  return (o.response && typeof o.response === "object" ? o.response : o) as Record<string, unknown>;
}

/** Adds and updates tracking on the PayPal capture via the Agent Toolkit. */
export class ToolkitTracking implements TrackingChannel {
  readonly name = "paypal-agent-toolkit";
  constructor(private tools: { create_shipment_tracking: ToolLike; update_shipment_tracking: ToolLike }) {}

  async attach(t: { captureId: string; trackingNumber: string; status: "SHIPPED" | "DELIVERED" }) {
    const args = { transaction_id: t.captureId, tracking_number: t.trackingNumber, status: t.status, carrier: SANDBOX_CARRIER };
    if (t.status === "SHIPPED") parse(await this.tools.create_shipment_tracking.execute(args as never, OPTS), "create_shipment_tracking");
    else parse(await this.tools.update_shipment_tracking.execute(args as never, OPTS), "update_shipment_tracking");
  }
}

/**
 * PayPal disputes are opened by the buyer in the Resolution Center; there is
 * no buyer-side API. Mandate drafts the claim, the buyer files it there, and
 * the dispute is then found on the capture with list_disputes (or a webhook).
 */
export class ToolkitDisputes implements DisputeChannel {
  readonly name = "paypal-resolution-center";
  constructor(private tools: { list_disputes: ToolLike }) {}

  async file(): Promise<FileOutcome> {
    return { status: "awaiting_buyer_filing", fileUrl: SANDBOX_RESOLUTION_CENTER };
  }

  async find(captureId: string) {
    const r = parse(await this.tools.list_disputes.execute({ disputed_transaction_id: captureId } as never, OPTS), "list_disputes");
    const first = (r.items as Array<{ dispute_id?: string; status?: string }> | undefined)?.[0];
    if (!first?.dispute_id) return null;
    return { paypalDisputeId: first.dispute_id, state: String(first.status ?? "OPEN") };
  }
}

/** Simulated channel: files instantly with a fake id. Used without PayPal keys. */
export class SimulatedDisputes implements DisputeChannel {
  readonly name = "simulated";
  async file(): Promise<FileOutcome> {
    return { status: "filed", paypalDisputeId: `SIM-PP-D-${randomBytes(5).toString("hex").toUpperCase()}` };
  }
  async find() {
    return null;
  }
}
