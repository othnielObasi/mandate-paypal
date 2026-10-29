import { MemoryCredentialStore, type CredentialRecord, type CredentialStore } from "../ap2/store";
import { MemoryEventStore, MemoryPendingStore, type EventStore, type PendingPayment, type PendingStore } from "../core/pending";
import { MemoryPaymentStore, periodStart, type PaymentRecord, type PaymentStore, type Period } from "../core/spend";
import {
  MemoryApprovalStore,
  MemoryMandateStore,
  type ApprovalRecord,
  type ApprovalStatus,
  type ApprovalStore,
  type MandateRecord,
  type MandateStore,
} from "../core/stores";
import { MemoryParcelStore, type ParcelStore, type Tracking } from "../fulfilment/carrier";
import {
  MemoryDisputeStore,
  MemoryOrderStore,
  type DisputeRecord,
  type DisputeStatus,
  type DisputeStore,
  type OrderRecord,
  type OrderStore,
} from "../fulfilment/stores";
import { MemoryPermitStore, type Permit, type PermitStore } from "../gate/permits";
import { MemoryReceiptStore, type Receipt, type ReceiptStore } from "../gate/receipts";
import type { MandateStatus } from "../gate/types";
import { toJson, type PgDb } from "./sql";

export interface Stores {
  mandates: MandateStore;
  approvals: ApprovalStore;
  permits: PermitStore;
  payments: PaymentStore;
  receipts: ReceiptStore;
  pending: PendingStore;
  orders: OrderStore;
  disputes: DisputeStore;
  parcels: ParcelStore;
  events: EventStore;
  credentials: CredentialStore;
}

export function memoryStores(): Stores {
  return {
    mandates: new MemoryMandateStore(),
    approvals: new MemoryApprovalStore(),
    permits: new MemoryPermitStore(),
    payments: new MemoryPaymentStore(),
    receipts: new MemoryReceiptStore(),
    pending: new MemoryPendingStore(),
    orders: new MemoryOrderStore(),
    disputes: new MemoryDisputeStore(),
    parcels: new MemoryParcelStore(),
    events: new MemoryEventStore(),
    credentials: new MemoryCredentialStore(),
  };
}

type Doc<T> = { data: T };
const one = <T>(rows: Doc<T>[]) => rows[0]?.data;
const all = <T>(rows: Doc<T>[]) => rows.map((r) => r.data);

class PgMandates implements MandateStore {
  constructor(private db: PgDb) {}
  async save(m: MandateRecord) {
    await this.db.q(
      `INSERT INTO mandates (id, user_id, status, data) VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, status = EXCLUDED.status, data = EXCLUDED.data`,
      [m.id, m.userId, m.status, toJson(m)],
    );
  }
  async get(id: string) {
    return one(await this.db.q<Doc<MandateRecord>>(`SELECT data FROM mandates WHERE id = $1`, [id]));
  }
  async list(userId?: string) {
    return all(
      userId
        ? await this.db.q<Doc<MandateRecord>>(`SELECT data FROM mandates WHERE user_id = $1 ORDER BY n`, [userId])
        : await this.db.q<Doc<MandateRecord>>(`SELECT data FROM mandates ORDER BY n`),
    );
  }
  async setStatus(id: string, status: MandateStatus) {
    const rows = await this.db.q(
      `UPDATE mandates SET status = $2, data = jsonb_set(data, '{status}', to_jsonb($2::text)) WHERE id = $1 RETURNING id`,
      [id, status],
    );
    if (rows.length === 0) throw new Error("mandate not found");
  }
}

class PgApprovals implements ApprovalStore {
  constructor(private db: PgDb) {}
  async save(a: ApprovalRecord) {
    await this.db.q(
      `INSERT INTO approvals (id, mandate_id, status, data) VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`,
      [a.id, a.mandateId, a.status, toJson(a)],
    );
  }
  async get(id: string) {
    return one(await this.db.q<Doc<ApprovalRecord>>(`SELECT data FROM approvals WHERE id = $1`, [id]));
  }
  async list(mandateId?: string) {
    return all(
      mandateId
        ? await this.db.q<Doc<ApprovalRecord>>(`SELECT data FROM approvals WHERE mandate_id = $1 ORDER BY n`, [mandateId])
        : await this.db.q<Doc<ApprovalRecord>>(`SELECT data FROM approvals ORDER BY n`),
    );
  }
  async transition(id: string, from: ApprovalStatus, to: ApprovalStatus) {
    const rows = await this.db.q(
      `UPDATE approvals SET status = $3, data = jsonb_set(data, '{status}', to_jsonb($3::text))
       WHERE id = $1 AND status = $2 RETURNING id`,
      [id, from, to],
    );
    return rows.length === 1;
  }
}

class PgPermits implements PermitStore {
  constructor(private db: PgDb) {}
  async save(p: Permit) {
    await this.db.q(`INSERT INTO permits (id, mandate_id, amount_minor, expires_at, data) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)`, [
      p.id,
      p.mandateId,
      p.amountMinor,
      p.expiresAt,
      toJson(p),
    ]);
  }
  async get(id: string) {
    return one(await this.db.q<Doc<Permit>>(`SELECT data FROM permits WHERE id = $1`, [id]));
  }
  async consume(id: string) {
    const rows = await this.db.q(`UPDATE permits SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id`, [id]);
    return rows.length === 1;
  }
  async reservedMinor(mandateId: string, now: Date) {
    const rows = await this.db.q<{ s: string | number | null }>(
      `SELECT COALESCE(SUM(amount_minor), 0) AS s FROM permits WHERE mandate_id = $1 AND used_at IS NULL AND expires_at >= $2::timestamptz`,
      [mandateId, now.toISOString()],
    );
    return Number(rows[0]?.s ?? 0);
  }
}

class PgPayments implements PaymentStore {
  constructor(private db: PgDb) {}
  async record(p: PaymentRecord) {
    await this.db.q(
      `INSERT INTO payments (paypal_order_id, mandate_id, amount_minor, captured_at, data) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
       ON CONFLICT (paypal_order_id) DO NOTHING`,
      [p.paypalOrderId, p.mandateId, p.amountMinor, p.capturedAt, toJson(p)],
    );
  }
  async spentMinor(mandateId: string, period: Period, now: Date) {
    const rows = await this.db.q<{ s: string | number | null }>(
      `SELECT COALESCE(SUM(amount_minor), 0) AS s FROM payments
       WHERE mandate_id = $1 AND captured_at >= $2::timestamptz AND captured_at <= $3::timestamptz`,
      [mandateId, periodStart(period, now).toISOString(), now.toISOString()],
    );
    return Number(rows[0]?.s ?? 0);
  }
  async list(mandateId?: string) {
    return all(
      mandateId
        ? await this.db.q<Doc<PaymentRecord>>(`SELECT data FROM payments WHERE mandate_id = $1 ORDER BY n`, [mandateId])
        : await this.db.q<Doc<PaymentRecord>>(`SELECT data FROM payments ORDER BY n`),
    );
  }
}

class PgReceipts implements ReceiptStore {
  constructor(private db: PgDb) {}
  /** seq is the primary key: a second writer at the same position fails instead of forking the chain. */
  async append(r: Receipt) {
    await this.db.q(`INSERT INTO receipts (seq, mandate_id, data) VALUES ($1, $2, $3::jsonb)`, [r.seq, r.mandateId, toJson(r)]);
  }
  async last() {
    return one(await this.db.q<Doc<Receipt>>(`SELECT data FROM receipts ORDER BY seq DESC LIMIT 1`));
  }
  async list(mandateId?: string) {
    return all(
      mandateId
        ? await this.db.q<Doc<Receipt>>(`SELECT data FROM receipts WHERE mandate_id = $1 ORDER BY seq`, [mandateId])
        : await this.db.q<Doc<Receipt>>(`SELECT data FROM receipts ORDER BY seq`),
    );
  }
}

class PgPending implements PendingStore {
  constructor(private db: PgDb) {}
  async put(id: string, p: PendingPayment) {
    await this.db.q(
      `INSERT INTO pending_orders (paypal_order_id, mandate_id, amount_minor, data) VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (paypal_order_id) DO UPDATE SET data = EXCLUDED.data`,
      [id, p.mandateId, p.amountMinor, toJson(p)],
    );
  }
  async claim(id: string) {
    return one(await this.db.q<Doc<PendingPayment>>(`DELETE FROM pending_orders WHERE paypal_order_id = $1 RETURNING data`, [id])) ?? null;
  }
  async sumFor(mandateId: string) {
    const rows = await this.db.q<{ s: string | number | null }>(`SELECT COALESCE(SUM(amount_minor), 0) AS s FROM pending_orders WHERE mandate_id = $1`, [mandateId]);
    return Number(rows[0]?.s ?? 0);
  }
}

class PgOrders implements OrderStore {
  constructor(private db: PgDb) {}
  async insertIfAbsent(o: OrderRecord) {
    const rows = await this.db.q(
      `INSERT INTO orders (id, mandate_id, capture_id, data) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [o.id, o.mandateId, o.captureId, toJson(o)],
    );
    return rows.length === 1;
  }
  async get(id: string) {
    return one(await this.db.q<Doc<OrderRecord>>(`SELECT data FROM orders WHERE id = $1`, [id]));
  }
  async getByCapture(captureId: string) {
    return one(await this.db.q<Doc<OrderRecord>>(`SELECT data FROM orders WHERE capture_id = $1`, [captureId]));
  }
  async list(mandateId?: string) {
    return all(
      mandateId
        ? await this.db.q<Doc<OrderRecord>>(`SELECT data FROM orders WHERE mandate_id = $1 ORDER BY n`, [mandateId])
        : await this.db.q<Doc<OrderRecord>>(`SELECT data FROM orders ORDER BY n`),
    );
  }
  async update(o: OrderRecord) {
    const rows = await this.db.q(`UPDATE orders SET capture_id = $2, data = $3::jsonb WHERE id = $1 RETURNING id`, [o.id, o.captureId, toJson(o)]);
    if (rows.length === 0) throw new Error("order not found");
  }
}

class PgDisputes implements DisputeStore {
  constructor(private db: PgDb) {}
  async get(orderId: string) {
    return one(await this.db.q<Doc<DisputeRecord>>(`SELECT data FROM disputes WHERE order_id = $1`, [orderId]));
  }
  async put(d: DisputeRecord) {
    await this.db.q(
      `INSERT INTO disputes (order_id, status, data) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`,
      [d.orderId, d.status, toJson(d)],
    );
  }
  async transition(orderId: string, from: DisputeStatus, patch: Partial<DisputeRecord>) {
    const to = patch.status ?? from;
    const rows = await this.db.q(
      `UPDATE disputes SET status = $3, data = data || $4::jsonb WHERE order_id = $1 AND status = $2 RETURNING order_id`,
      [orderId, from, to, toJson(patch)],
    );
    return rows.length === 1;
  }
}

class PgParcels implements ParcelStore {
  constructor(private db: PgDb) {}
  async get(n: string) {
    return one(await this.db.q<Doc<Tracking>>(`SELECT data FROM parcels WHERE tracking_number = $1`, [n]));
  }
  async put(n: string, t: Tracking) {
    await this.db.q(
      `INSERT INTO parcels (tracking_number, data) VALUES ($1, $2::jsonb) ON CONFLICT (tracking_number) DO UPDATE SET data = EXCLUDED.data`,
      [n, toJson(t)],
    );
  }
}

class PgEvents implements EventStore {
  constructor(private db: PgDb) {}
  async firstSeen(id: string) {
    const rows = await this.db.q(`INSERT INTO webhook_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`, [id]);
    return rows.length === 1;
  }
}

class PgCredentials implements CredentialStore {
  constructor(private db: PgDb) {}
  async put(r: CredentialRecord) {
    await this.db.q(`INSERT INTO credentials (payment_mandate_id, mandate_id, paypal_order_id, data) VALUES ($1, $2, $3, $4::jsonb)`, [
      r.paymentMandateId,
      r.mandateId,
      r.paypalOrderId,
      toJson(r),
    ]);
  }
  async attachOrder(id: string, paypalOrderId: string) {
    const rows = await this.db.q(
      `UPDATE credentials SET paypal_order_id = $2, data = jsonb_set(data, '{paypalOrderId}', to_jsonb($2::text)) WHERE payment_mandate_id = $1 RETURNING payment_mandate_id`,
      [id, paypalOrderId],
    );
    if (rows.length === 0) throw new Error("payment mandate not found");
  }
  async getByOrder(paypalOrderId: string) {
    return one(await this.db.q<Doc<CredentialRecord>>(`SELECT data FROM credentials WHERE paypal_order_id = $1`, [paypalOrderId]));
  }
  async list(mandateId?: string) {
    return all(
      mandateId
        ? await this.db.q<Doc<CredentialRecord>>(`SELECT data FROM credentials WHERE mandate_id = $1 ORDER BY n`, [mandateId])
        : await this.db.q<Doc<CredentialRecord>>(`SELECT data FROM credentials ORDER BY n`),
    );
  }
}

export function pgStores(db: PgDb): Stores {
  return {
    mandates: new PgMandates(db),
    approvals: new PgApprovals(db),
    permits: new PgPermits(db),
    payments: new PgPayments(db),
    receipts: new PgReceipts(db),
    pending: new PgPending(db),
    orders: new PgOrders(db),
    disputes: new PgDisputes(db),
    parcels: new PgParcels(db),
    events: new PgEvents(db),
    credentials: new PgCredentials(db),
  };
}
