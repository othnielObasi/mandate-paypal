import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, setContainer } from "@/lib/server/container";
import type { WebhookVerifier } from "@/lib/server/webhooks";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as previewMandate } from "@/app/api/mandates/preview/route";
import { GET as getMandate } from "@/app/api/mandates/[id]/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { GET as paypalReturn } from "@/app/api/paypal/return/route";
import { POST as webhook } from "@/app/api/paypal/webhooks/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const get = (path: string) => new Request(`${BASE}${path}`);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const TEXT = "Household basics, up to $80 a month, nothing over $25, verified sellers only";

/** Stand-in for PayPal's signature check: valid only with the test header. */
const verifier: WebhookVerifier = { verify: async (h) => h.get("x-test-signature") === "valid" };
const signed = { "x-test-signature": "valid" };

async function mandate() {
  return ((await (await createMandate(post("/api/mandates", { text: TEXT }))).json()) as { id: string }).id;
}

describe("PayPal webhooks", () => {
  it("are refused when no webhook is configured", async () => {
    setContainer(createContainer({ APP_URL: BASE }));
    expect((await webhook(post("/api/paypal/webhooks", { id: "WH-1", event_type: "X", resource: {} }, signed))).status).toBe(503);
  });

  describe("with a verifier", () => {
    beforeEach(() => {
      setContainer(createContainer({ APP_URL: BASE, MANDATE_SIMULATED_MODE: "payer_action" }, { webhookVerifier: verifier }));
    });

    it("rejects an unsigned or badly signed event and changes nothing", async () => {
      const id = await mandate();
      const r = (await (await runAgent(post("/api/agent/run", { mandateId: id, task: "Buy washing-up liquid" }))).json()) as { events: Array<{ name?: string; result?: { paypalOrderId?: string } }> };
      const orderId = r.events.find((e) => e.name === "propose_purchase")!.result!.paypalOrderId!;
      const res = await webhook(post("/api/paypal/webhooks", { id: "WH-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: orderId } }));
      expect(res.status).toBe(401);
      expect(await (await getMandate(get(`/api/mandates/${id}`), params(id))).json()).toMatchObject({ spentMinor: 0, reservedMinor: 450 });
    });

    it("rejects a malformed body", async () => {
      expect((await webhook(post("/api/paypal/webhooks", "{not json", signed))).status).toBe(400);
      expect((await webhook(post("/api/paypal/webhooks", { nope: true }, signed))).status).toBe(400);
    });

    it("captures an order the buyer approved even if they never came back to the site, exactly once", async () => {
      const id = await mandate();
      const r = (await (await runAgent(post("/api/agent/run", { mandateId: id, task: "Buy washing-up liquid" }))).json()) as { events: Array<{ name?: string; result?: { paypalOrderId?: string } }> };
      const orderId = r.events.find((e) => e.name === "propose_purchase")!.result!.paypalOrderId!;
      const event = { id: "WH-APPROVED-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: orderId } };

      const first = await webhook(post("/api/paypal/webhooks", event, signed));
      expect(await first.json()).toMatchObject({ handled: true });
      const dup = await webhook(post("/api/paypal/webhooks", event, signed));
      expect(await dup.json()).toMatchObject({ duplicate: true });
      const late = await paypalReturn(get(`/api/paypal/return?token=${orderId}`));
      expect(late.headers.get("location")).toContain("unknown_order");

      expect(await (await getMandate(get(`/api/mandates/${id}`), params(id))).json()).toMatchObject({ spentMinor: 450, reservedMinor: 0 });
      expect(((await (await listOrders(get(`/api/orders?mandateId=${id}`))).json()) as unknown[]).length).toBe(1);
    });

    it("links buyer disputes to the order by capture id, and follows them to resolution", async () => {
      setContainer(createContainer({ APP_URL: BASE }, { webhookVerifier: verifier }));
      const id = await mandate();
      await runAgent(post("/api/agent/run", { mandateId: id, task: "Buy washing-up liquid" }));
      const [order] = (await (await listOrders(get(`/api/orders?mandateId=${id}`))).json()) as Array<{ id: string; captureId: string }>;
      const resource = (status: string) => ({ dispute_id: "PP-D-77", status, disputed_transactions: [{ seller_transaction_id: order!.captureId }] });

      await webhook(post("/api/paypal/webhooks", { id: "WH-D1", event_type: "CUSTOMER.DISPUTE.CREATED", resource: resource("OPEN") }, signed));
      type O = { dispute: { status: string; paypalDisputeId: string } };
      const first = (await (await listOrders(get(`/api/orders?mandateId=${id}`))).json()) as O[];
      expect(first[0]!.dispute).toMatchObject({ status: "open", paypalDisputeId: "PP-D-77" });

      await webhook(post("/api/paypal/webhooks", { id: "WH-D2", event_type: "CUSTOMER.DISPUTE.RESOLVED", resource: resource("RESOLVED") }, signed));
      const after = (await (await listOrders(get(`/api/orders?mandateId=${id}`))).json()) as O[];
      expect(after[0]!.dispute).toMatchObject({ status: "resolved" });
    });

    it("acknowledges event types it does not act on", async () => {
      const res = await webhook(post("/api/paypal/webhooks", { id: "WH-X", event_type: "BILLING.PLAN.CREATED", resource: {} }, signed));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ handled: false });
    });
  });
});

describe("rate limits on model-backed routes", () => {
  beforeEach(() => {
    setContainer(createContainer({ APP_URL: BASE, RATE_LIMIT_PER_MINUTE: "2", RATE_LIMIT_PER_HOUR: "100" }));
  });

  const from = (ip: string, path: string, body: unknown) => post(path, body, { "x-forwarded-for": ip });

  it("limits each client and says when to retry", async () => {
    expect((await previewMandate(from("203.0.113.1", "/api/mandates/preview", { text: TEXT }))).status).toBe(200);
    expect((await previewMandate(from("203.0.113.1", "/api/mandates/preview", { text: TEXT }))).status).toBe(200);
    const third = await previewMandate(from("203.0.113.1", "/api/mandates/preview", { text: TEXT }));
    expect(third.status).toBe(429);
    expect(Number(third.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await previewMandate(from("203.0.113.2", "/api/mandates/preview", { text: TEXT }))).status).toBe(200);
  });

  it("applies to agent runs", async () => {
    const id = await mandate();
    const run = () => runAgent(from("203.0.113.5", "/api/agent/run", { mandateId: id, task: "Buy sponges" }));
    expect((await run()).status).toBe(200);
    expect((await run()).status).toBe(200);
    expect((await run()).status).toBe(429);
  });

  it("saving rules the user already reviewed costs no model call and is not limited", async () => {
    const policy = ((await (await previewMandate(from("203.0.113.9", "/api/mandates/preview", { text: TEXT }))).json()) as { policy: unknown }).policy;
    for (let i = 0; i < 4; i++) expect((await createMandate(from("203.0.113.9", "/api/mandates", { text: TEXT, policy }))).status).toBe(201);
  });
});
