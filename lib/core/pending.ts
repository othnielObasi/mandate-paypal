import type { OrderSpec } from "../gate/canonical";
import type { Currency } from "../gate/policy";

/** An order created in PayPal that is waiting for the buyer to approve it there. */
export interface PendingPayment {
  mandateId: string;
  amountMinor: number;
  currency: Currency;
  order: OrderSpec;
  permitId: string;
}

export interface PendingStore {
  put(paypalOrderId: string, p: PendingPayment): Promise<void>;
  /** Atomically remove and return. Only the first caller gets it. */
  claim(paypalOrderId: string): Promise<PendingPayment | null>;
  sumFor(mandateId: string): Promise<number>;
}

export class MemoryPendingStore implements PendingStore {
  private rows = new Map<string, PendingPayment>();
  async put(id: string, p: PendingPayment) {
    this.rows.set(id, structuredClone(p));
  }
  async claim(id: string) {
    const p = this.rows.get(id);
    if (!p) return null;
    this.rows.delete(id); // synchronous check-and-delete
    return p;
  }
  async sumFor(mandateId: string) {
    let s = 0;
    for (const p of this.rows.values()) if (p.mandateId === mandateId) s += p.amountMinor;
    return s;
  }
}

/** Webhook delivery ids we have already processed (PayPal retries deliveries). */
export interface EventStore {
  firstSeen(id: string): Promise<boolean>;
}

export class MemoryEventStore implements EventStore {
  private seen = new Set<string>();
  async firstSeen(id: string) {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    return true;
  }
}
