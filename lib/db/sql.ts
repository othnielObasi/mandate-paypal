/** The one thing every Postgres client here offers: node-postgres Pool and PGlite both fit. */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS mandates (
  id TEXT PRIMARY KEY, n BIGSERIAL, user_id TEXT NOT NULL, status TEXT NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, n BIGSERIAL, mandate_id TEXT NOT NULL, status TEXT NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS permits (
  id TEXT PRIMARY KEY, mandate_id TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS payments (
  paypal_order_id TEXT PRIMARY KEY, n BIGSERIAL, mandate_id TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS receipts (
  seq INTEGER PRIMARY KEY, mandate_id TEXT NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS pending_orders (
  paypal_order_id TEXT PRIMARY KEY, mandate_id TEXT NOT NULL, amount_minor INTEGER NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, n BIGSERIAL, mandate_id TEXT NOT NULL, capture_id TEXT NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS disputes (
  order_id TEXT PRIMARY KEY, status TEXT NOT NULL, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS parcels (
  tracking_number TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS credentials (
  payment_mandate_id TEXT PRIMARY KEY, n BIGSERIAL, mandate_id TEXT NOT NULL, paypal_order_id TEXT, data JSONB NOT NULL);
CREATE INDEX IF NOT EXISTS credentials_order ON credentials (paypal_order_id);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, received_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS receipts_mandate ON receipts (mandate_id, seq);
CREATE INDEX IF NOT EXISTS orders_capture ON orders (capture_id);
CREATE INDEX IF NOT EXISTS payments_mandate ON payments (mandate_id, captured_at);
CREATE INDEX IF NOT EXISTS permits_mandate ON permits (mandate_id) WHERE used_at IS NULL;
`;

/** Runs the idempotent schema once, then every query waits for it. */
export class PgDb {
  readonly ready: Promise<void>;
  constructor(private sql: Sql) {
    this.ready = (async () => {
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await sql.query(stmt);
    })();
  }

  async q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    await this.ready;
    return (await this.sql.query<T>(text, params)).rows;
  }
}

export const toJson = (v: unknown) => JSON.stringify(v);
