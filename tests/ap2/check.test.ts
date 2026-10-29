import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, setContainer, getContainer } from "@/lib/server/container";
import { checkPayment } from "@/lib/ap2/check";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as listApprovals } from "@/app/api/approvals/route";
import { POST as decideApproval } from "@/app/api/approvals/[id]/route";
import { GET as verifyOrder } from "@/app/api/verify/[orderId]/route";
import { POST as verifyChainBody } from "@/app/api/verify/route";
import { GET as trust } from "@/app/api/trust/route";
import { GET as seller } from "@/app/api/seller/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { POST as simulateOrder } from "@/app/api/orders/[id]/simulate/route";
import { POST as dispute } from "@/app/api/orders/[id]/dispute/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown) => new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = (path: string) => new Request(`${BASE}${path}`);
const params = <K extends string>(k: K, v: string) => ({ params: Promise.resolve({ [k]: v } as Record<K, string>) });

type Check = { id: string; ok: boolean; detail: string };
type Verdict = { ok: boolean; checks: Check[]; chain: { intent: unknown; cart: { contents: { payment_request: { details: { total: { amount: { value: string } } } } } }; payment: unknown } };

async function buy(task: string) {
  const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
  const r = (await (await runAgent(post("/api/agent/run", { mandateId: m.id, task }))).json()) as { events: Array<{ name?: string; result?: { paypalOrderId?: string; status?: string } }> };
  return { mandateId: m.id, result: r.events.find((e) => e.name === "propose_purchase")!.result! };
}

beforeEach(() => setContainer(createContainer({ APP_URL: BASE })));

describe("merchant-side check of an agent payment", () => {
  it("confirms a human-not-present payment is backed by the user's signed mandate, including the fingerprint on the PayPal order", async () => {
    const { result } = await buy("Buy washing-up liquid");
    const res = await verifyOrder(get(`/api/verify/${result.paypalOrderId}`), params("orderId", result.paypalOrderId!));
    const v = (await res.json()) as Verdict & { mode: string; merchant: string };
    expect(v.ok).toBe(true);
    expect(v.mode).toBe("human_not_present");
    expect(v.checks.map((c) => c.id)).toEqual(expect.arrayContaining(["intent_signed_by_user", "cart_signed_by_merchant", "payment_authorised", "within_intent", "paypal_order_fingerprint"]));
    expect(v.checks.every((c) => c.ok)).toBe(true);
  });

  it("confirms an approved over-limit payment was signed by the user", async () => {
    const { mandateId } = await buy("Buy an electric kettle");
    const [a] = (await (await listApprovals(get(`/api/approvals?mandateId=${mandateId}`))).json()) as Array<{ id: string }>;
    const paid = (await (await decideApproval(post(`/api/approvals/${a!.id}`, { choice: "approve" }), params("id", a!.id))).json()) as { paypalOrderId: string };
    const v = (await (await verifyOrder(get(`/api/verify/${paid.paypalOrderId}`), params("orderId", paid.paypalOrderId))).json()) as Verdict & { mode: string };
    expect(v).toMatchObject({ ok: true, mode: "human_present" });
  });

  it("404s an order with no mandate behind it", async () => {
    expect((await verifyOrder(get(`/api/verify/nope`), params("orderId", "nope"))).status).toBe(404);
  });

  it("lets anyone re-verify a chain offline with the published keys, and catches a changed price", async () => {
    const { result } = await buy("Buy washing-up liquid");
    const v = (await (await verifyOrder(get(`/api/verify/${result.paypalOrderId}`), params("orderId", result.paypalOrderId!))).json()) as Verdict;
    expect(await (await verifyChainBody(post("/api/verify", v.chain))).json()).toMatchObject({ ok: true });

    const tampered = structuredClone(v.chain);
    tampered.cart.contents.payment_request.details.total.amount.value = "0.01";
    const bad = (await (await verifyChainBody(post("/api/verify", tampered))).json()) as Verdict;
    expect(bad.ok).toBe(false);
    expect(bad.checks.find((c) => c.id === "cart_signed_by_merchant")).toMatchObject({ ok: false });

    expect((await verifyChainBody(post("/api/verify", { nonsense: true }))).status).toBe(400);
  });

  it("publishes the trust keys: gateway, merchants with verified status, and users", async () => {
    const t = (await (await trust()).json()) as { platform: string; merchants: Record<string, { verified: boolean; publicKey: string }>; users: Record<string, string> };
    expect(t.platform).toMatch(/BEGIN PUBLIC KEY/);
    expect(t.merchants["acme-supplies"]).toMatchObject({ verified: true });
    expect(t.merchants["corner-mart"]).toMatchObject({ verified: false });
    expect(Object.values(t.users)[0]).toMatch(/BEGIN PUBLIC KEY/);
  });

  it("shows a seller their agent payments with a verdict on each", async () => {
    await buy("Buy washing-up liquid and sponges");
    const rows = (await (await seller(get(`/api/seller?merchantId=acme-supplies`))).json()) as Array<{ paypalOrderId: string; ok: boolean; total: string; mode: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.ok && r.mode === "human_not_present")).toBe(true);
    expect((await (await seller(get(`/api/seller?merchantId=office-hub`))).json()) as unknown[]).toHaveLength(0);
  });

  it("flags a PayPal order that does not carry the payment mandate's fingerprint", async () => {
    const { result } = await buy("Buy washing-up liquid");
    const c = getContainer();
    const v = await checkPayment(
      { ...c, executor: { orderNote: async () => "something else" } as never },
      result.paypalOrderId!,
      new Date(),
    );
    expect(v?.ok).toBe(false);
    expect(v?.checks.find((x) => x.id === "paypal_order_fingerprint")).toMatchObject({ ok: false });
  });

  it("puts the verified credential chain into the dispute evidence", async () => {
    const { mandateId } = await buy("Buy washing-up liquid");
    const [o] = (await (await listOrders(get(`/api/orders?mandateId=${mandateId}`))).json()) as Array<{ id: string }>;
    await simulateOrder(post(`/api/orders/${o!.id}/simulate`, { event: "lost" }), params("id", o!.id));
    const d = (await (await dispute(post(`/api/orders/${o!.id}/dispute`, { action: "draft" }), params("id", o!.id))).json()) as {
      evidence: { ap2: { verification: { ok: boolean }; payment_mandate: { payment_mandate_contents: { payment_mandate_id: string } } } };
    };
    expect(d.evidence.ap2.verification.ok).toBe(true);
    expect(d.evidence.ap2.payment_mandate.payment_mandate_contents.payment_mandate_id).toMatch(/^pm_/);
  });
});
