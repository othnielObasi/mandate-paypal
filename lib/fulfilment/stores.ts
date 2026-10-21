import type { OrderItem } from "../gate/canonical";
import type { Currency } from "../gate/policy";
import type { ShipmentStatus, TrackingEvent } from "./carrier";

export interface OrderRecord {
  id: string; // PayPal order id
  mandateId: string;
  merchantId: string;
  items: OrderItem[];
  amountMinor: number;
  currency: Currency;
  captureId: string;
  permitId: string;
  paidAt: string;
  carrier: string;
  trackingNumber: string;
  expectedBy: string;
  shipmentStatus: ShipmentStatus;
  trackingEvents: TrackingEvent[];
  paypalTracking: "attached" | "failed" | "not_applicable";
  problem: "not_received" | null;
}

export type DisputeStatus = "draft" | "awaiting_buyer_filing" | "filed" | "open" | "resolved";

export interface DisputeRecord {
  orderId: string;
  mandateId: string;
  reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED";
  statement: string;
  writer: "model" | "template";
  evidence: unknown;
  evidenceDigest: string;
  status: DisputeStatus;
  paypalDisputeId: string | null;
  fileUrl: string | null;
  createdAt: string;
  filedAt: string | null;
}

export interface OrderStore {
  insertIfAbsent(o: OrderRecord): Promise<boolean>;
  get(id: string): Promise<OrderRecord | undefined>;
  getByCapture(captureId: string): Promise<OrderRecord | undefined>;
  list(mandateId?: string): Promise<OrderRecord[]>;
  update(o: OrderRecord): Promise<void>;
}

export interface DisputeStore {
  get(orderId: string): Promise<DisputeRecord | undefined>;
  put(d: DisputeRecord): Promise<void>;
  /** Atomic: set status only if currently `from`. */
  transition(orderId: string, from: DisputeStatus, patch: Partial<DisputeRecord>): Promise<boolean>;
}

export class MemoryOrderStore implements OrderStore {
  private rows = new Map<string, OrderRecord>();
  async insertIfAbsent(o: OrderRecord) {
    if (this.rows.has(o.id)) return false;
    this.rows.set(o.id, structuredClone(o));
    return true;
  }
  async get(id: string) {
    const o = this.rows.get(id);
    return o ? structuredClone(o) : undefined;
  }
  async getByCapture(captureId: string) {
    for (const o of this.rows.values()) if (o.captureId === captureId) return structuredClone(o);
    return undefined;
  }
  async list(mandateId?: string) {
    return [...this.rows.values()].filter((o) => !mandateId || o.mandateId === mandateId).map((o) => structuredClone(o));
  }
  async update(o: OrderRecord) {
    if (!this.rows.has(o.id)) throw new Error("order not found");
    this.rows.set(o.id, structuredClone(o));
  }
}

export class MemoryDisputeStore implements DisputeStore {
  private rows = new Map<string, DisputeRecord>();
  async get(orderId: string) {
    const d = this.rows.get(orderId);
    return d ? structuredClone(d) : undefined;
  }
  async put(d: DisputeRecord) {
    this.rows.set(d.orderId, structuredClone(d));
  }
  async transition(orderId: string, from: DisputeStatus, patch: Partial<DisputeRecord>) {
    const d = this.rows.get(orderId);
    if (!d || d.status !== from) return false;
    Object.assign(d, structuredClone(patch));
    return true;
  }
}
