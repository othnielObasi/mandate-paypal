import type { OrderSpec } from "../gate/canonical";
import { PaymentError, minorToDecimal, type CaptureResult, type CreateResult, type PaymentProvider, type ReturnUrls } from "./provider";

type ToolLike = { execute: (args: never, opts: never) => Promise<unknown> };

/** The subset of @paypal/agent-toolkit tools the executor uses. */
export interface ToolkitTools {
  create_order: ToolLike;
  pay_order: ToolLike;
  get_order: ToolLike;
}

// The toolkit's create_order schema only accepts USD (toolkit v1.11).
const TOOLKIT_CURRENCIES = new Set(["USD"]);

const OPTS = { toolCallId: "mandate-executor", messages: [] } as never;

function parse(raw: unknown, what: string): Record<string, unknown> {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new PaymentError(`${what}: PayPal toolkit returned unparseable output`, raw);
    }
  }
  if (!value || typeof value !== "object") throw new PaymentError(`${what}: empty response`, raw);
  const obj = value as Record<string, unknown>;
  if (obj.error) throw new PaymentError(`${what}: ${JSON.stringify(obj.error).slice(0, 300)}`, obj.error);
  // The toolkit wraps some successful responses as {"status":"error","response":{...}}.
  if (obj.response && typeof obj.response === "object") return obj.response as Record<string, unknown>;
  return obj;
}

/**
 * Executes payments through the official PayPal Agent Toolkit, called
 * programmatically by the executor. The toolkit's tools are never handed
 * to the model, so every payment still passes the gate.
 */
export class ToolkitProvider implements PaymentProvider {
  readonly name = "paypal-agent-toolkit";
  constructor(private tools: ToolkitTools) {}

  async createOrder(order: OrderSpec, urls: ReturnUrls): Promise<CreateResult> {
    if (!TOOLKIT_CURRENCIES.has(order.currency))
      throw new PaymentError(`The PayPal Agent Toolkit only creates orders in USD; got ${order.currency}.`);
    const args = {
      currencyCode: order.currency,
      items: order.items.map((i) => ({
        name: i.title,
        quantity: i.qty,
        itemCost: minorToDecimal(i.unitMinor),
        itemTotal: minorToDecimal(i.unitMinor * i.qty),
        taxPercent: 0,
      })),
      returnUrl: urls.returnUrl,
      cancelUrl: urls.cancelUrl,
    };
    const res = parse(await this.tools.create_order.execute(args as never, OPTS), "create_order");
    const id = typeof res.id === "string" ? res.id : undefined;
    const status = res.status;
    if (!id) throw new PaymentError("create_order: no order id", res);
    if (status === "PAYER_ACTION_REQUIRED") {
      const links = Array.isArray(res.links) ? (res.links as Array<{ rel?: string; href?: string }>) : [];
      const link = links.find((l) => l.rel === "payer-action" || l.rel === "approve");
      if (!link?.href) throw new PaymentError("create_order: approval link missing", res);
      return { paypalOrderId: id, status, approveUrl: link.href };
    }
    if (status === "COMPLETED") return { paypalOrderId: id, status, captureId: captureIdOf(res) };
    if (status === "CREATED" || status === "APPROVED") return { paypalOrderId: id, status };
    throw new PaymentError(`create_order: unexpected status ${String(status)}`, res);
  }

  async captureOrder(paypalOrderId: string): Promise<CaptureResult> {
    const res = parse(await this.tools.pay_order.execute({ id: paypalOrderId } as never, OPTS), "pay_order");
    if (res.status !== "COMPLETED") throw new PaymentError(`Capture not completed (${String(res.status ?? res.name ?? "unknown")})`, res);
    return { paypalOrderId: String(res.id ?? paypalOrderId), status: "COMPLETED", captureId: captureIdOf(res) };
  }

  async getOrderStatus(paypalOrderId: string): Promise<string> {
    const res = parse(await this.tools.get_order.execute({ id: paypalOrderId } as never, OPTS), "get_order");
    return String(res.status ?? "UNKNOWN");
  }
}

function captureIdOf(res: Record<string, unknown>): string {
  const units = res.purchase_units as Array<{ payments?: { captures?: Array<{ id?: string }> } }> | undefined;
  const id = units?.[0]?.payments?.captures?.[0]?.id;
  if (!id) throw new PaymentError("No capture id in PayPal response", res);
  return id;
}
