import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { PgDb, type Sql } from "@/lib/db/sql";
import { pgStores, memoryStores, type Stores } from "@/lib/db/stores";
import { generateSigner } from "@/lib/gate/keys";
import { issuePermit } from "@/lib/gate/permits";
import { ReceiptLog, verifyChain } from "@/lib/gate/receipts";
import type { Policy } from "@/lib/gate/policy";
import type { OrderRecord } from "@/lib/fulfilment/stores";

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2026-12-31",
};
const now = new Date("2026-10-21T10:00:00Z");

const order = (id: string, captureId = `CAP-${id}`): OrderRecord => ({
  id,
  mandateId: "m1",
  merchantId: "acme",
  items: [{ sku: "a", title: "A", unitMinor: 450, qty: 1 }],
  amountMinor: 450,
  currency: "USD",
  captureId,
  permitId: "p1",
  paidAt: now.toISOString(),
  carrier: "Simulated carrier",
  trackingNumber: `T-${id}`,
  expectedBy: "2026-10-24T10:00:00.000Z",
  shipmentStatus: "IN_TRANSIT",
  trackingEvents: [{ at: now.toISOString(), status: "IN_TRANSIT", note: "x" }],
  paypalTracking: "not_applicable",
  problem: null,
});

/** Same assertions against every implementation. */
function contract(name: string, setup: () => Promise<{ fresh: () => Promise<Stores> }>, skip = false) {
  describe.skipIf(skip)(`store contract: ${name}`, () => {
    let fresh: () => Promise<Stores>;
    let s: Stores;
    beforeAll(async () => {
      fresh = (await setup()).fresh;
    });
    beforeEach(async () => {
      s = await fresh();
    });

    it("mandates: save, get, list in insertion order, set status", async () => {
      for (const id of ["a", "b", "c"]) await s.mandates.save({ id, userId: "u", policy, status: "active", rawText: id, createdAt: now.toISOString() });
      await s.mandates.save({ id: "x", userId: "other", policy, status: "active", rawText: "", createdAt: now.toISOString() });
      expect((await s.mandates.list("u")).map((m) => m.id)).toEqual(["a", "b", "c"]);
      await s.mandates.setStatus("b", "paused");
      expect(await s.mandates.get("b")).toMatchObject({ status: "paused", policy });
      expect(await s.mandates.get("nope")).toBeUndefined();
      await expect(s.mandates.setStatus("nope", "paused")).rejects.toThrow();
    });

    it("approvals: transition is compare-and-set, once", async () => {
      await s.approvals.save({
        id: "ap1",
        mandateId: "m1",
        proposal: { mandateId: "m1", order: { mandateId: "m1", merchantId: "a", currency: "USD", items: [] }, category: "x", merchantVerified: true, origin: "agent" },
        decision: { outcome: "approve", rule: "item_cap", reason: "r" },
        summary: "s",
        createdAt: now.toISOString(),
        expiresAt: now.toISOString(),
        status: "pending",
      });
      const results = await Promise.all(Array.from({ length: 10 }, () => s.approvals.transition("ap1", "pending", "approved")));
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await s.approvals.get("ap1")).toMatchObject({ status: "approved" });
      expect((await s.approvals.list("m1")).length).toBe(1);
      expect(await s.approvals.transition("nope", "pending", "approved")).toBe(false);
    });

    it("permits: single use under concurrency, and reserved money", async () => {
      const signer = generateSigner();
      const mk = (amountMinor: number, at = now) => issuePermit({ intentId: "i", mandateId: "m1", digest: "d".repeat(64), amountMinor, currency: "USD", now: at }, signer);
      const p = mk(100);
      const expired = mk(700, new Date(now.getTime() - 10 * 60_000));
      await s.permits.save(p);
      await s.permits.save(mk(200));
      await s.permits.save(expired);
      expect(await s.permits.get(p.id)).toEqual(p);
      const wins = await Promise.all(Array.from({ length: 20 }, () => s.permits.consume(p.id)));
      expect(wins.filter(Boolean)).toHaveLength(1);
      expect(await s.permits.consume("nope")).toBe(false);
      expect(await s.permits.reservedMinor("m1", now)).toBe(200);
      await expect(s.permits.save(p)).rejects.toThrow();
    });

    it("payments: idempotent per PayPal order, summed per period", async () => {
      await s.payments.record({ mandateId: "m1", amountMinor: 1000, capturedAt: "2026-09-30T23:59:59.000Z", paypalOrderId: "a" });
      await s.payments.record({ mandateId: "m1", amountMinor: 450, capturedAt: "2026-10-01T00:00:00.000Z", paypalOrderId: "b" });
      await s.payments.record({ mandateId: "m1", amountMinor: 450, capturedAt: "2026-10-02T00:00:00.000Z", paypalOrderId: "b" });
      await s.payments.record({ mandateId: "m2", amountMinor: 999, capturedAt: "2026-10-20T00:00:00.000Z", paypalOrderId: "c" });
      expect(await s.payments.spentMinor("m1", "month", now)).toBe(450);
      expect((await s.payments.list("m1")).length).toBe(2);
    });

    it("receipts: a chain written through the store still verifies after a round trip", async () => {
      const signer = generateSigner();
      const log = new ReceiptLog(signer, () => now, s.receipts);
      await log.append({ mandateId: "m1", type: "decision", summary: "Allowed £4.50 ✓", payload: { n: 450, f: 4.5, nested: { b: [1, "x", null], a: true } } });
      await log.append({ mandateId: "m2", type: "payment", summary: "Paid", payload: null });
      await log.append({ mandateId: "m1", type: "payment", summary: "Paid", payload: { id: "5O1" } });
      const reread = new ReceiptLog(signer, () => now, s.receipts);
      expect(verifyChain(await reread.list(), signer.publicKey)).toEqual({ ok: true, count: 3 });
      expect((await reread.list("m1")).map((r) => r.seq)).toEqual([1, 3]);
      expect((await s.receipts.last())?.seq).toBe(3);
    });

    it("receipts: a second writer cannot fork the chain at the same sequence number", async () => {
      const signer = generateSigner();
      const a = new ReceiptLog(signer, () => now, s.receipts);
      const r = await a.append({ mandateId: "m1", type: "decision", summary: "x", payload: {} });
      await expect(s.receipts.append({ ...r, summary: "fork" })).rejects.toThrow();
    });

    it("pending buyer approvals: claimed exactly once, summed per mandate", async () => {
      const spec = { mandateId: "m1", merchantId: "a", currency: "USD" as const, items: [{ sku: "a", title: "A", unitMinor: 450, qty: 1 }] };
      await s.pending.put("PP1", { mandateId: "m1", amountMinor: 450, currency: "USD", order: spec, permitId: "p1" });
      await s.pending.put("PP2", { mandateId: "m2", amountMinor: 100, currency: "USD", order: { ...spec, mandateId: "m2" }, permitId: "p2" });
      expect(await s.pending.sumFor("m1")).toBe(450);
      const claims = await Promise.all(Array.from({ length: 10 }, () => s.pending.claim("PP1")));
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect(claims.find(Boolean)).toMatchObject({ order: spec, permitId: "p1" });
      expect(await s.pending.sumFor("m1")).toBe(0);
    });

    it("orders: insert once, look up by capture, update", async () => {
      expect(await s.orders.insertIfAbsent(order("o1"))).toBe(true);
      expect(await s.orders.insertIfAbsent(order("o1"))).toBe(false);
      await s.orders.insertIfAbsent(order("o2"));
      expect((await s.orders.getByCapture("CAP-o2"))?.id).toBe("o2");
      await s.orders.update({ ...order("o1"), shipmentStatus: "LOST", problem: "not_received" });
      expect(await s.orders.get("o1")).toMatchObject({ shipmentStatus: "LOST", problem: "not_received" });
      expect((await s.orders.list("m1")).map((o) => o.id)).toEqual(["o1", "o2"]);
      await expect(s.orders.update(order("nope"))).rejects.toThrow();
    });

    it("disputes: put, get, transition once", async () => {
      const d = {
        orderId: "o1",
        mandateId: "m1",
        reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" as const,
        statement: "s",
        writer: "model" as const,
        evidence: { receipts: [{ seq: 1 }] },
        evidenceDigest: "e",
        status: "draft" as const,
        paypalDisputeId: null,
        fileUrl: null,
        createdAt: now.toISOString(),
        filedAt: null,
      };
      await s.disputes.put(d);
      expect(await s.disputes.get("o1")).toEqual(d);
      const wins = await Promise.all(Array.from({ length: 5 }, () => s.disputes.transition("o1", "draft", { status: "filed", paypalDisputeId: "PP-D" })));
      expect(wins.filter(Boolean)).toHaveLength(1);
      expect(await s.disputes.get("o1")).toMatchObject({ status: "filed", paypalDisputeId: "PP-D", statement: "s" });
    });

    it("parcels: put and get", async () => {
      await s.parcels.put("T1", { status: "IN_TRANSIT", expectedBy: "x", events: [] });
      expect(await s.parcels.get("T1")).toEqual({ status: "IN_TRANSIT", expectedBy: "x", events: [] });
      expect(await s.parcels.get("nope")).toBeUndefined();
    });

    it("credentials: store a payment mandate, attach its PayPal order, look it up", async () => {
      const rec = {
        paymentMandateId: "pm_1",
        mandateId: "m1",
        paypalOrderId: null,
        cart: { contents: { id: "cart_1" }, merchant_signature: "a.b.c", timestamp: now.toISOString() },
        payment: { payment_mandate_contents: { payment_mandate_id: "pm_1" }, user_authorization: "a.b.c" },
        fingerprint: "AP2 mandate pm_1 #00",
        createdAt: now.toISOString(),
      } as never;
      await s.credentials.put(rec);
      await expect(s.credentials.put(rec)).rejects.toThrow();
      expect(await s.credentials.getByOrder("PP-1")).toBeUndefined();
      await s.credentials.attachOrder("pm_1", "PP-1");
      expect(await s.credentials.getByOrder("PP-1")).toMatchObject({ paymentMandateId: "pm_1", paypalOrderId: "PP-1", cart: { contents: { id: "cart_1" } } });
      expect((await s.credentials.list("m1")).length).toBe(1);
      await expect(s.credentials.attachOrder("nope", "x")).rejects.toThrow();
    });

    it("connections: look up by token hash, list, revoke once", async () => {
      const r = { id: "c1", mandateId: "m1", label: "Claude", tokenHash: "h1", createdAt: now.toISOString(), revokedAt: null };
      await s.connections.put(r);
      await s.connections.put({ ...r, id: "c2", tokenHash: "h2", mandateId: "m2" });
      expect(await s.connections.getByHash("h1")).toEqual(r);
      expect(await s.connections.getByHash("nope")).toBeUndefined();
      expect((await s.connections.list("m1")).map((x) => x.id)).toEqual(["c1"]);
      const wins = await Promise.all(Array.from({ length: 5 }, () => s.connections.revoke("c1", now.toISOString())));
      expect(wins.filter(Boolean)).toHaveLength(1);
      expect((await s.connections.getByHash("h1"))?.revokedAt).toBe(now.toISOString());
    });

    it("webhook events: each id is accepted once", async () => {
      expect(await s.events.firstSeen("WH-1")).toBe(true);
      expect(await s.events.firstSeen("WH-1")).toBe(false);
    });
  });
}

contract("memory", async () => ({ fresh: async () => memoryStores() }));

const TRUNCATE = "TRUNCATE mandates, approvals, permits, payments, receipts, pending_orders, orders, disputes, parcels, webhook_events, credentials, connections RESTART IDENTITY";

contract("postgres (PGlite)", async () => {
  const pg = new PGlite();
  const sql: Sql = { query: (text, params) => pg.query(text, params) as never };
  const db = new PgDb(sql);
  await db.ready;
  return {
    fresh: async () => {
      await sql.query(TRUNCATE);
      return pgStores(db);
    },
  };
});

/**
 * Real Postgres through node-postgres with a 10-connection pool, so the
 * concurrency assertions race across separate connections.
 * Runs when TEST_DATABASE_URL is set (CI provides a postgres service).
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
contract(
  "postgres (node-postgres pool)",
  async () => {
    const pool = new Pool({ connectionString: TEST_DB, max: 10 });
    const sql = pool as unknown as Sql;
    const db = new PgDb(sql);
    await db.ready;
    afterAll(() => pool.end());
    return {
      fresh: async () => {
        await sql.query(TRUNCATE);
        return pgStores(db);
      },
    };
  },
  !TEST_DB,
);
