import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, setContainer } from "@/lib/server/container";
import { GET as health } from "@/app/api/health/route";
import { GET as listMandates, POST as createMandate } from "@/app/api/mandates/route";
import { POST as previewMandate } from "@/app/api/mandates/preview/route";
import { GET as getMandate, PATCH as patchMandate } from "@/app/api/mandates/[id]/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as listApprovals } from "@/app/api/approvals/route";
import { POST as decideApproval } from "@/app/api/approvals/[id]/route";
import { GET as listReceipts } from "@/app/api/receipts/route";
import { GET as verifyStored, POST as verifyGiven } from "@/app/api/receipts/verify/route";
import { GET as paypalReturn } from "@/app/api/paypal/return/route";
import { GET as paypalCancel } from "@/app/api/paypal/cancel/route";
import { GET as catalog } from "@/app/api/catalog/route";
import { GET as publicKey } from "@/app/api/public-key/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { POST as checkOrders } from "@/app/api/orders/check/route";
import { POST as simulateOrder } from "@/app/api/orders/[id]/simulate/route";
import { POST as dispute } from "@/app/api/orders/[id]/dispute/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const patch = (path: string, body: unknown) =>
  new Request(`${BASE}${path}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = (path: string) => new Request(`${BASE}${path}`);
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const MANDATE_TEXT = "Household basics, up to $80 a month, nothing over $25, verified sellers only";

async function newMandate(): Promise<string> {
  const res = await createMandate(post("/api/mandates", { text: MANDATE_TEXT }));
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function run(mandateId: string, task: string, extra: Record<string, unknown> = {}) {
  const res = await runAgent(post("/api/agent/run", { mandateId, task, ...extra }));
  expect(res.status).toBe(200);
  return (await res.json()) as { events: Array<{ kind: string; name?: string; result?: Record<string, unknown> }>; final: string };
}

const purchases = (r: Awaited<ReturnType<typeof run>>) =>
  r.events.filter((e) => e.kind === "tool" && e.name === "propose_purchase").map((e) => e.result as { status: string; decision?: { rule: string } });

beforeEach(() => {
  setContainer(createContainer({ APP_URL: BASE }));
});

describe("API: health and config", () => {
  it("reports the offline, simulated, sandbox-only configuration", async () => {
    const res = await health();
    expect(await res.json()).toMatchObject({ ok: true, provider: "simulated", model: "offline-planner", signingKey: "ephemeral", sandboxOnly: true });
  });

  it("refuses to start against PayPal production", () => {
    expect(() => createContainer({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b", PAYPAL_ENVIRONMENT: "PRODUCTION" })).toThrow(/sandbox/i);
  });

  it("uses the PayPal Agent Toolkit when sandbox credentials are set", () => {
    const c = createContainer({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b" });
    expect(c.providerName).toBe("paypal-agent-toolkit");
  });

  it("publishes the receipt public key and the catalogue", async () => {
    expect(await (await publicKey()).text()).toMatch(/BEGIN PUBLIC KEY/);
    const items = (await (await catalog()).json()) as Array<{ sku: string }>;
    expect(items.map((i) => i.sku)).toContain("wul-500");
  });
});

describe("API: mandates", () => {
  it("creates a mandate from plain English", async () => {
    const res = await createMandate(post("/api/mandates", { text: MANDATE_TEXT }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ status: "active", policy: { maxItemMinor: 2500, budget: { amountMinor: 8000 } } });
    expect(((await (await listMandates()).json()) as unknown[]).length).toBe(1);
  });

  it("previews the parsed rules without saving anything", async () => {
    const res = await previewMandate(post("/api/mandates/preview", { text: MANDATE_TEXT }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ policy: { maxItemMinor: 2500, budget: { amountMinor: 8000, period: "month" } } });
    expect(await (await listMandates()).json()).toEqual([]);
    expect((await previewMandate(post("/api/mandates/preview", { text: "" }))).status).toBe(422);
  });

  it("saves the rules exactly as the user edited them", async () => {
    const preview = (await (await previewMandate(post("/api/mandates/preview", { text: MANDATE_TEXT }))).json()) as { policy: Record<string, unknown> };
    const edited = { ...preview.policy, maxItemMinor: 4000, categories: ["household", "office"] };
    const res = await createMandate(post("/api/mandates", { text: MANDATE_TEXT, policy: edited }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ policy: { maxItemMinor: 4000, categories: ["household", "office"] } });
  });

  it("rejects edited rules that break the schema or have expired", async () => {
    const preview = (await (await previewMandate(post("/api/mandates/preview", { text: MANDATE_TEXT }))).json()) as { policy: Record<string, unknown> };
    expect((await createMandate(post("/api/mandates", { text: "x", policy: { ...preview.policy, maxItemMinor: 999_999 } }))).status).toBe(422);
    expect((await createMandate(post("/api/mandates", { text: "x", policy: { ...preview.policy, expires: "2020-01-01" } }))).status).toBe(422);
    expect((await createMandate(post("/api/mandates", { text: "x", policy: { ...preview.policy, admin: true } }))).status).toBe(422);
  });

  it("rejects bad input with 400 and an unusable mandate with 422", async () => {
    expect((await createMandate(new Request(`${BASE}/api/mandates`, { method: "POST", body: "not json" }))).status).toBe(400);
    expect((await createMandate(post("/api/mandates", { nope: 1 }))).status).toBe(400);
    expect((await createMandate(post("/api/mandates", { text: "   " }))).status).toBe(422);
  });

  it("rejects oversized bodies with 413", async () => {
    expect((await createMandate(post("/api/mandates", { text: "x".repeat(20_000) }))).status).toBe(413);
  });

  it("pauses and revokes; a revoked mandate blocks purchases", async () => {
    const id = await newMandate();
    expect((await patchMandate(patch(`/api/mandates/${id}`, { status: "revoked" }), params(id))).status).toBe(200);
    const r = await run(id, "Buy washing-up liquid");
    expect(purchases(r)[0]).toMatchObject({ status: "blocked", decision: { rule: "mandate_inactive" } });
    expect((await patchMandate(patch(`/api/mandates/${id}`, { status: "active" }), params(id))).status).toBe(409);
  });

  it("reports budget spent and remaining for a mandate", async () => {
    const id = await newMandate();
    await run(id, "Buy washing-up liquid and sponges"); // $4.50 + $1.99
    const res = await getMandate(get(`/api/mandates/${id}`), params(id));
    expect(await res.json()).toMatchObject({ mandate: { id }, spentMinor: 649, reservedMinor: 0, remainingMinor: 8000 - 649 });
    expect((await getMandate(get(`/api/mandates/nope`), params("nope"))).status).toBe(404);
  });

  it("404s an unknown mandate", async () => {
    expect((await patchMandate(patch(`/api/mandates/nope`, { status: "paused" }), params("nope"))).status).toBe(404);
    expect((await runAgent(post("/api/agent/run", { mandateId: "nope", task: "x" }))).status).toBe(404);
  });
});

describe("API: the three trust moments", () => {
  it("pays for in-policy items", async () => {
    const id = await newMandate();
    const r = await run(id, "Buy washing-up liquid and sponges");
    expect(purchases(r).map((p) => p.status)).toEqual(["paid", "paid"]);
  });

  it("compromised-agent drill: injected purchases are blocked, the real one is paid", async () => {
    const id = await newMandate();
    const r = await run(id, "Buy a cleaning spray", { drill: true });
    const ps = purchases(r);
    expect(ps[0]).toMatchObject({ status: "paid" });
    expect(ps.slice(1).every((p) => p.status === "blocked" && p.decision?.rule === "untrusted_instruction")).toBe(true);
    expect(ps).toHaveLength(3);
  });

  it("asks for approval over the item cap, then pays when approved", async () => {
    const id = await newMandate();
    const r = await run(id, "Buy an electric kettle");
    expect(purchases(r)[0]).toMatchObject({ status: "pending_approval" });
    const pending = (await (await listApprovals(get(`/api/approvals?mandateId=${id}`))).json()) as Array<{ id: string; status: string }>;
    expect(pending).toHaveLength(1);
    const res = await decideApproval(post(`/api/approvals/${pending[0]!.id}`, { choice: "approve" }), params(pending[0]!.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "paid" });
    const again = await decideApproval(post(`/api/approvals/${pending[0]!.id}`, { choice: "approve" }), params(pending[0]!.id));
    expect(again.status).toBe(409);
  });
});

describe("API: receipts", () => {
  it("lists a mandate's receipts and verifies the stored chain", async () => {
    const id = await newMandate();
    await run(id, "Buy washing-up liquid");
    const rs = (await (await listReceipts(get(`/api/receipts?mandateId=${id}`))).json()) as Array<{ type: string }>;
    expect(rs.map((r) => r.type)).toEqual(["mandate", "decision", "permit", "payment", "tracking"]);
    expect(await (await verifyStored()).json()).toMatchObject({ ok: true, count: 5 });
  });

  it("verifies a copy the client sends, and flags an edited row", async () => {
    const id = await newMandate();
    await run(id, "Buy washing-up liquid");
    const rs = (await (await listReceipts(get(`/api/receipts`))).json()) as Array<Record<string, unknown>>;
    expect(await (await verifyGiven(post("/api/receipts/verify", { receipts: rs }))).json()).toMatchObject({ ok: true });
    const edited = rs.map((r) => (r.seq === 4 ? { ...r, summary: "Paid $0.01" } : r));
    expect(await (await verifyGiven(post("/api/receipts/verify", { receipts: edited }))).json()).toMatchObject({ ok: false, brokenAt: 4 });
  });
});

describe("API: delivery follow-through and disputes", () => {
  async function paidOrder() {
    const id = await newMandate();
    await run(id, "Buy washing-up liquid");
    const orders = (await (await listOrders(get(`/api/orders?mandateId=${id}`))).json()) as Array<{ id: string; shipmentStatus: string; trackingNumber: string }>;
    expect(orders).toHaveLength(1);
    return { mandateId: id, order: orders[0]! };
  }

  it("ships every paid order with tracking", async () => {
    const { order } = await paidOrder();
    expect(order).toMatchObject({ shipmentStatus: "IN_TRANSIT", trackingNumber: expect.stringMatching(/^SIM1Z/) });
  });

  it("lost parcel → flagged → AI-drafted dispute → filed after you confirm", async () => {
    const { mandateId, order } = await paidOrder();
    expect((await simulateOrder(post(`/api/orders/${order.id}/simulate`, { event: "lost" }), params(order.id))).status).toBe(200);
    const checked = (await (await checkOrders(post(`/api/orders/check`, { mandateId }))).json()) as Array<{ problem: string }>;
    expect(checked[0]).toMatchObject({ problem: "not_received" });

    const draft = await dispute(post(`/api/orders/${order.id}/dispute`, { action: "draft" }), params(order.id));
    expect(draft.status).toBe(200);
    expect(await draft.json()).toMatchObject({ status: "draft", statement: expect.stringContaining(order.id) });

    expect((await dispute(post(`/api/orders/${order.id}/dispute`, { action: "file" }), params(order.id))).status).toBe(400);
    const filed = await dispute(post(`/api/orders/${order.id}/dispute`, { action: "file", confirm: true }), params(order.id));
    expect(await filed.json()).toMatchObject({ status: "filed", paypalDisputeId: expect.stringMatching(/^SIM-PP-D-/) });
    expect((await dispute(post(`/api/orders/${order.id}/dispute`, { action: "file", confirm: true }), params(order.id))).status).toBe(409);
  });

  it("refuses to draft a dispute for a parcel with no problem", async () => {
    const { order } = await paidOrder();
    expect((await dispute(post(`/api/orders/${order.id}/dispute`, { action: "draft" }), params(order.id))).status).toBe(409);
  });

  it("404s an unknown order", async () => {
    expect((await simulateOrder(post(`/api/orders/nope/simulate`, { event: "lost" }), params("nope"))).status).toBe(404);
    expect((await dispute(post(`/api/orders/nope/dispute`, { action: "draft" }), params("nope"))).status).toBe(404);
  });
});

describe("API: PayPal buyer approval round trip", () => {
  beforeEach(() => {
    setContainer(createContainer({ APP_URL: BASE, MANDATE_SIMULATED_MODE: "payer_action" }));
  });

  it("captures on return from PayPal, once", async () => {
    const id = await newMandate();
    const r = await run(id, "Buy washing-up liquid");
    const p = purchases(r)[0] as unknown as { status: string; paypalOrderId: string; approveUrl: string };
    expect(p.status).toBe("awaiting_buyer");
    const res = await paypalReturn(get(`/api/paypal/return?token=${p.paypalOrderId}`));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${BASE}/?payment=paid`);
    const again = await paypalReturn(get(`/api/paypal/return?token=${p.paypalOrderId}`));
    expect(again.headers.get("location")).toBe(`${BASE}/?payment=unknown_order`);
  });

  it("releases the reservation when the buyer cancels", async () => {
    const id = await newMandate();
    const r = await run(id, "Buy washing-up liquid");
    const p = purchases(r)[0] as unknown as { paypalOrderId: string };
    const res = await paypalCancel(get(`/api/paypal/cancel?token=${p.paypalOrderId}`));
    expect(res.headers.get("location")).toBe(`${BASE}/?payment=cancelled`);
  });

  it("ignores a return with no token", async () => {
    const res = await paypalReturn(get(`/api/paypal/return`));
    expect(res.headers.get("location")).toBe(`${BASE}/?payment=unknown_order`);
  });
});
