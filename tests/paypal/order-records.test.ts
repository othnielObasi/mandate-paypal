import { describe, expect, it } from "vitest";
import { ApiError } from "@paypal/paypal-server-sdk";
import { ServerSdkOrderRecords } from "@/lib/paypal/order-records";
import { createContainer, setContainer } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as verifyOrder } from "@/app/api/verify/[orderId]/route";

const BASE = "http://localhost:3000";

type GetOrder = ConstructorParameters<typeof ServerSdkOrderRecords>[0]["getOrder"];
const sdk = (impl: (id: string) => unknown) => new ServerSdkOrderRecords({ getOrder: (async ({ id }: { id: string }) => ({ result: await impl(id) })) as unknown as GetOrder });
const apiError = (statusCode: number) => Object.assign(Object.create(ApiError.prototype) as ApiError, { statusCode, message: `HTTP ${statusCode}` });

describe("PayPal Server SDK order records", () => {
  it("reads status, total and completed captures from PayPal's order", async () => {
    const r = await sdk(() => ({
      id: "5O1",
      status: "COMPLETED",
      purchaseUnits: [
        { amount: { currencyCode: "USD", value: "4.50" }, payments: { captures: [{ id: "CAP1", status: "COMPLETED" }, { id: "CAP0", status: "DECLINED" }] } },
        { amount: { currencyCode: "USD", value: "1.99" }, payments: { captures: [{ id: "CAP2", status: "COMPLETED" }] } },
      ],
    })).getOrderRecord("5O1");
    expect(r).toEqual({ status: "COMPLETED", currency: "USD", amountMinor: 649, captureIds: ["CAP1", "CAP2"] });
  });

  it("an approved but uncaptured order has no captures", async () => {
    const r = await sdk(() => ({ status: "APPROVED", purchaseUnits: [{ amount: { currencyCode: "USD", value: "32.00" } }] })).getOrderRecord("x");
    expect(r).toMatchObject({ status: "APPROVED", amountMinor: 3200, captureIds: [] });
  });

  it("an unknown order is null; other PayPal errors are raised", async () => {
    expect(
      await sdk(() => {
        throw apiError(404);
      }).getOrderRecord("nope"),
    ).toBeNull();
    await expect(
      sdk(() => {
        throw apiError(401);
      }).getOrderRecord("x"),
    ).rejects.toThrow();
  });

  it("is what the container uses with PayPal sandbox keys", () => {
    expect(createContainer({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b" }).orderRecords.source).toBe("PayPal Server SDK");
    expect(createContainer({}).orderRecords.source).toBe("Simulated PayPal");
  });
});

describe("seller check against PayPal's own record", () => {
  const post = (path: string, body: unknown) => new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  async function buy(env: Record<string, string> = {}) {
    const c = createContainer({ APP_URL: BASE, ...env });
    setContainer(c);
    const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
    const run = (await (await runAgent(post("/api/agent/run", { mandateId: m.id, task: "Buy washing-up liquid" }))).json()) as { events: Array<{ name?: string; result?: { paypalOrderId?: string } }> };
    const id = run.events.find((e) => e.name === "propose_purchase")!.result!.paypalOrderId!;
    const verdict = async () => (await (await verifyOrder(new Request(`${BASE}/api/verify/${id}`), { params: Promise.resolve({ orderId: id }) })).json()) as { ok: boolean; checks: Array<{ id: string; ok: boolean; detail: string }> };
    return { c, id, verdict };
  }
  const recordCheck = (v: { checks: Array<{ id: string; ok: boolean; detail: string }> }) => v.checks.find((x) => x.id === "paypal_order_record")!;

  it("passes when PayPal captured exactly the signed amount", async () => {
    const { verdict } = await buy();
    const v = await verdict();
    expect(v.ok).toBe(true);
    expect(recordCheck(v)).toMatchObject({ ok: true, detail: expect.stringMatching(/^Simulated PayPal: COMPLETED, USD 4\.50 captured/) });
  });

  it("fails when PayPal's amount differs from the signed checkout", async () => {
    const { c, verdict } = await buy();
    c.orderRecords = { source: "PayPal Server SDK", getOrderRecord: async () => ({ status: "COMPLETED", currency: "USD", amountMinor: 1, captureIds: ["C"] }) };
    const v = await verdict();
    expect(v.ok).toBe(false);
    expect(recordCheck(v).detail).toBe("PayPal Server SDK: PayPal says USD 0.01, the signed checkout says USD 4.50");
  });

  it("fails while the buyer has not approved in PayPal: do not ship yet", async () => {
    const { verdict } = await buy({ MANDATE_SIMULATED_MODE: "payer_action" });
    const v = await verdict();
    expect(v.ok).toBe(false);
    expect(recordCheck(v).detail).toMatch(/PAYER_ACTION_REQUIRED: not captured yet, so do not ship/);
  });

  it("fails closed when PayPal cannot be reached", async () => {
    const { c, verdict } = await buy();
    c.orderRecords = {
      source: "PayPal Server SDK",
      getOrderRecord: async () => {
        throw new Error("ETIMEDOUT");
      },
    };
    const v = await verdict();
    expect(v.ok).toBe(false);
    expect(recordCheck(v).detail).toBe("PayPal Server SDK: could not read the order (ETIMEDOUT)");
  });
});
