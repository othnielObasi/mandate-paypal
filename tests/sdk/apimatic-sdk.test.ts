// The APIMatic-generated TypeScript SDK (sdks/typescript, from public/openapi.yaml) driving the real
// route handlers in-process: proves the spec, the SDK and the API agree, end to end.
import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, setContainer } from "@/lib/server/container";
import { MandateApiClient, ServerEnvironment, ApiError } from "@/sdks/typescript/src/index";
import { GET as health } from "@/app/api/health/route";
import { GET as listMandates, POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as listApprovals } from "@/app/api/approvals/route";
import { POST as decideApproval } from "@/app/api/approvals/[id]/route";
import { GET as verifyOrder } from "@/app/api/verify/[orderId]/route";
import { GET as ap2Order } from "@/app/api/ap2/orders/[orderId]/route";
import { GET as jwks } from "@/app/api/ap2/jwks/route";
import { GET as trust } from "@/app/api/trust/route";
import { GET as seller } from "@/app/api/seller/route";
import { GET as receipts } from "@/app/api/receipts/route";
import { GET as verifyLog, POST as verifyLogCopy } from "@/app/api/receipts/verify/route";
import { POST as killSwitch } from "@/app/api/automation/kill-switch/route";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const ROUTES: Array<[method: string, pattern: RegExp, handler: Handler, param?: string]> = [
  ["GET", /^\/api\/health$/, health as Handler],
  ["GET", /^\/api\/mandates$/, listMandates as Handler],
  ["POST", /^\/api\/mandates$/, createMandate as Handler],
  ["POST", /^\/api\/agent\/run$/, runAgent as Handler],
  ["GET", /^\/api\/approvals$/, listApprovals as Handler],
  ["POST", /^\/api\/approvals\/([^/]+)$/, decideApproval as Handler, "id"],
  ["GET", /^\/api\/verify\/([^/]+)$/, verifyOrder as Handler, "orderId"],
  ["GET", /^\/api\/ap2\/orders\/([^/]+)$/, ap2Order as Handler, "orderId"],
  ["GET", /^\/api\/ap2\/jwks$/, jwks as Handler],
  ["GET", /^\/api\/trust$/, trust as Handler],
  ["GET", /^\/api\/seller$/, seller as Handler],
  ["GET", /^\/api\/receipts$/, receipts as Handler],
  ["GET", /^\/api\/receipts\/verify$/, verifyLog as Handler],
  ["POST", /^\/api\/receipts\/verify$/, verifyLogCopy as Handler],
  ["POST", /^\/api\/automation\/kill-switch$/, killSwitch as Handler],
];

/** A fetch that hands the SDK's Request straight to the matching Next route handler. */
const inProcessFetch: typeof fetch = async (input) => {
  const req = input as Request;
  const path = new URL(req.url).pathname;
  for (const [method, pattern, handler, param] of ROUTES) {
    const m = req.method === method && path.match(pattern);
    if (m) return handler(req, { params: Promise.resolve(param ? { [param]: decodeURIComponent(m[1]!) } : {}) });
  }
  return new Response(JSON.stringify({ error: `no route for ${req.method} ${path}` }), { status: 404 });
};

const client = () =>
  new MandateApiClient({
    serverEnvironment: ServerEnvironment.Local,
    serverOptions: { baseUrl: "http://localhost:3000" },
    fetch: inProcessFetch,
    retry: { maxRetries: 0 },
  });

beforeEach(() => setContainer(createContainer({ APP_URL: "http://localhost:3000", AUTOMATION_SECRET: "test-automation-secret-123" })));

describe("APIMatic TypeScript SDK against the Mandate API", () => {
  it("reports server status", async () => {
    const h = await client().demo.getHealth();
    expect(h.ok).toBe(true);
    expect(h.sandboxOnly).toBe(true);
  });

  it("signs rules, shops, and a seller verifies the payment under AP2 v0.2", async () => {
    const c = client();
    const mandate = await c.demo.createMandate({ body: { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" } });
    expect(mandate.status).toBe("active");
    expect(mandate.policy?.maxItemMinor).toBe(2500);

    const run = await c.demo.runAgent({ body: { mandateId: mandate.id!, task: "Buy washing-up liquid" } });
    const paid = run.events?.find((e) => e.name === "propose_purchase")?.result as { status: string; paypalOrderId: string };
    expect(paid.status).toBe("paid");

    const verdict = await c.verification.verifyOrder({ paypalOrderId: paid.paypalOrderId });
    expect(verdict.ok).toBe(true);
    expect(verdict.mode).toBe("human_not_present");
    expect(verdict.checks.every((k) => k.ok)).toBe(true);

    const ap2 = await c.verification.getAp2Evidence({ paypalOrderId: paid.paypalOrderId });
    expect(ap2.spec).toBe("ap2/0.2");
    expect(ap2.ok).toBe(true);
    expect(ap2.checks.map((k) => k.id)).toEqual(expect.arrayContaining(["checkout_signed", "payment_chain", "payment_receipt"]));

    const queue = await c.verification.listSellerPayments({ merchantId: "acme-supplies" });
    expect(queue.some((p) => p.paypalOrderId === paid.paypalOrderId && p.ok)).toBe(true);

    const keys = await c.keys.getAp2Jwks();
    expect(keys.keys.length).toBeGreaterThan(0);
    const t = await c.keys.getTrust();
    expect(t.merchants?.["acme-supplies"]?.verified).toBe(true);
  });

  it("approves an over-limit purchase through the SDK", async () => {
    const c = client();
    const m = await c.demo.createMandate({ body: { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" } });
    await c.demo.runAgent({ body: { mandateId: m.id!, task: "Buy an electric kettle" } });
    const [pending] = await c.demo.listApprovals({ mandateId: m.id! });
    expect(pending?.status).toBe("pending");
    const result = await c.demo.decideApproval({ id: pending!.id!, body: { choice: "approve" } });
    expect(result.status).toBe("paid");
    expect(result.decision?.reason).toBe("Approved by you.");
  });

  it("verifies the signed log, and names a tampered receipt", async () => {
    const c = client();
    const m = await c.demo.createMandate({ body: { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" } });
    await c.demo.runAgent({ body: { mandateId: m.id!, task: "Buy washing-up liquid" } });

    expect(await c.receipts.verifyServerLog()).toMatchObject({ ok: true });
    const log = await c.receipts.listReceipts();
    expect(await c.receipts.verifyLogCopy({ body: { receipts: log } })).toMatchObject({ ok: true, count: log.length });

    const edited = log.map((r, i) => (i === 1 ? { ...r, summary: "Paid $0.01" } : r));
    const broken = await c.receipts.verifyLogCopy({ body: { receipts: edited } });
    expect(broken).toMatchObject({ ok: false, brokenAt: log[1]!.seq });
  });

  it("surfaces API errors as typed SDK errors", async () => {
    const c = client();
    const missing = await c.verification.verifyOrder({ paypalOrderId: "NOT-A-REAL-ORDER" }).asApiResult();
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.status).toBe(404);

    await expect(c.automation.killSwitch({ body: { action: "pause" } })).rejects.toBeInstanceOf(ApiError);
    const authed = new MandateApiClient({ serverEnvironment: ServerEnvironment.Local, fetch: inProcessFetch, automationSecret: "test-automation-secret-123" });
    await authed.demo.createMandate({ body: { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" } });
    expect(await authed.automation.killSwitch({ body: { action: "pause" } })).toMatchObject({ ok: true, status: "paused" });
  });
});
