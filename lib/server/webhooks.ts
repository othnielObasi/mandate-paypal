import { z } from "zod";
import type { Container } from "./container";

export interface WebhookVerifier {
  verify(headers: Headers, event: unknown): Promise<boolean>;
}

export const WebhookEventSchema = z
  .object({
    id: z.string().min(1).max(200),
    event_type: z.string().min(1).max(200),
    resource: z.record(z.unknown()),
  })
  .passthrough();

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

const DisputeResource = z
  .object({
    dispute_id: z.string().min(1),
    status: z.string().min(1),
    disputed_transactions: z.array(z.object({ seller_transaction_id: z.string().optional() }).passthrough()).min(1),
  })
  .passthrough();

/**
 * Acts on a verified PayPal event. Every handler is idempotent, so a
 * redelivered event is safe even if it is processed twice.
 */
export async function handleWebhook(c: Container, e: WebhookEvent): Promise<{ handled: boolean; detail: string }> {
  switch (e.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      // The buyer approved in PayPal but may never return to our site: capture now.
      const id = typeof e.resource.id === "string" ? e.resource.id : null;
      if (!id) return { handled: false, detail: "no order id" };
      const r = await c.executor.completeBuyerApproval(id);
      return { handled: r.status !== "refused", detail: r.status === "refused" ? r.reason : r.status };
    }
    case "CUSTOMER.DISPUTE.CREATED":
    case "CUSTOMER.DISPUTE.UPDATED":
    case "CUSTOMER.DISPUTE.RESOLVED": {
      const d = DisputeResource.safeParse(e.resource);
      if (!d.success) return { handled: false, detail: "unrecognised dispute resource" };
      for (const t of d.data.disputed_transactions) {
        if (!t.seller_transaction_id) continue;
        const linked = await c.fulfilment.linkDispute(t.seller_transaction_id, d.data.dispute_id, d.data.status);
        if (linked) return { handled: true, detail: `dispute ${linked.status}` };
      }
      return { handled: false, detail: "no matching order" };
    }
    default:
      return { handled: false, detail: "event type not used" };
  }
}
