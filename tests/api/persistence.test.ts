import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { createContainer, setContainer } from "@/lib/server/container";
import { exportPrivatePem, generateSigner } from "@/lib/gate/keys";
import type { Sql } from "@/lib/db/sql";
import { GET as health } from "@/app/api/health/route";
import { GET as listMandates, POST as createMandate } from "@/app/api/mandates/route";
import { GET as getMandate } from "@/app/api/mandates/[id]/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as listApprovals } from "@/app/api/approvals/route";
import { POST as decideApproval } from "@/app/api/approvals/[id]/route";
import { GET as verifyStored } from "@/app/api/receipts/verify/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { POST as simulateOrder } from "@/app/api/orders/[id]/simulate/route";
import { POST as dispute } from "@/app/api/orders/[id]/dispute/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown) => new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = (path: string) => new Request(`${BASE}${path}`);
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function pglite(): Sql {
  const pg = new PGlite();
  return { query: (text, p) => pg.query(text, p) as never };
}

describe("persistence across a restart (Postgres)", () => {
  it("refuses to use a database without a fixed signing key", () => {
    expect(() => createContainer({ APP_URL: BASE }, { sql: pglite() })).toThrow(/MANDATE_SIGNING_KEY/);
  });

  const TEST_DB = process.env.TEST_DATABASE_URL;
  const backends: Array<[string, () => Promise<{ first: Sql; second: Sql; done: () => Promise<void> }>, boolean]> = [
    ["PGlite", async () => { const s = pglite(); return { first: s, second: s, done: async () => undefined }; }, false],
    [
      "real Postgres, separate pools",
      async () => {
        const a = new Pool({ connectionString: TEST_DB, max: 5 });
        await a.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
        const b = new Pool({ connectionString: TEST_DB, max: 5 });
        return { first: a as unknown as Sql, second: b as unknown as Sql, done: async () => { await a.end(); await b.end(); } };
      },
      !TEST_DB,
    ],
  ];

  it.each(backends.filter(([, , skip]) => !skip))("keeps mandates, budget, approvals, orders, disputes and a verifiable chain (%s)", async (_name, make) => {

    const { first, second, done } = await make();
    const sql = first;
    const env = { APP_URL: BASE, MANDATE_SIGNING_KEY: exportPrivatePem(generateSigner()) };

    // --- first process ---
    setContainer(createContainer(env, { sql }));
    expect(await (await health()).json()).toMatchObject({ storage: "postgres", signingKey: "configured" });
    const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
    await runAgent(post("/api/agent/run", { mandateId: m.id, task: "Buy washing-up liquid" }));
    await runAgent(post("/api/agent/run", { mandateId: m.id, task: "Buy an electric kettle" }));
    const [order] = (await (await listOrders(get(`/api/orders?mandateId=${m.id}`))).json()) as Array<{ id: string }>;
    await simulateOrder(post(`/api/orders/${order!.id}/simulate`, { event: "lost" }), params(order!.id));
    await dispute(post(`/api/orders/${order!.id}/dispute`, { action: "draft" }), params(order!.id));

    // --- restart: a brand-new container (and, for real Postgres, a new pool) on the same database ---
    setContainer(createContainer(env, { sql: second }));

    expect(((await (await listMandates()).json()) as unknown[]).length).toBe(1);
    expect(await (await getMandate(get(`/api/mandates/${m.id}`), params(m.id))).json()).toMatchObject({ spentMinor: 450 });

    const approvals = (await (await listApprovals(get(`/api/approvals?mandateId=${m.id}`))).json()) as Array<{ id: string }>;
    expect(approvals).toHaveLength(1);
    expect(await (await decideApproval(post(`/api/approvals/${approvals[0]!.id}`, { choice: "approve" }), params(approvals[0]!.id))).json()).toMatchObject({ status: "paid" });

    const orders = (await (await listOrders(get(`/api/orders?mandateId=${m.id}`))).json()) as Array<{ id: string; shipmentStatus: string; dispute: { status: string } | null }>;
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({ shipmentStatus: "LOST", dispute: { status: "draft" } });
    expect(await (await dispute(post(`/api/orders/${order!.id}/dispute`, { action: "file", confirm: true }), params(order!.id))).json()).toMatchObject({ status: "filed" });

    // Receipts written before and after the restart form one unbroken, verifiable chain.
    const v = (await (await verifyStored()).json()) as { ok: boolean; count: number };
    expect(v.ok).toBe(true);
    expect(v.count).toBeGreaterThan(10);
    await done();
  });
});
