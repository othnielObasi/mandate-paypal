import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, setContainer, type Container } from "@/lib/server/container";
import { RestVault } from "@/lib/paypal/vault";
import { PayPalAuth } from "@/lib/paypal/webhook-verifier";
import { GET as listMandates, POST as createMandate } from "@/app/api/mandates/route";
import { PATCH as patchMandate } from "@/app/api/mandates/[id]/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as walletStatus, POST as startWallet, DELETE as dropWallet } from "@/app/api/wallet/route";
import { GET as walletReturn } from "@/app/api/paypal/wallet/return/route";
import { DELETE as signOut } from "@/app/api/session/route";

const BASE = "http://localhost:3000";
const ALICE = "a".repeat(43);
const BOB = "b".repeat(43);
const RULES = "Household basics, up to $80 a month, nothing over $25, verified sellers only";

const req = (path: string, init: { method?: string; body?: unknown; who?: string } = {}) =>
  new Request(`${BASE}${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json", ...(init.who ? { cookie: `other=1; mandate_session=${init.who}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

let c: Container;
beforeEach(() => {
  // Without a saved wallet every purchase waits for the buyer in PayPal.
  c = createContainer({ APP_URL: BASE, MANDATE_SIMULATED_MODE: "payer_action" });
  setContainer(c);
});

async function mandate(who?: string) {
  const res = await createMandate(req("/api/mandates", { body: { text: RULES }, who }));
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; userId: string };
}
async function buy(mandateId: string, who?: string) {
  const res = await runAgent(req("/api/agent/run", { body: { mandateId, task: "Buy washing-up liquid" }, who }));
  return { status: res.status, body: (await res.json()) as { events: Array<{ name?: string; result?: { status?: string } }> } };
}
const paidStatus = (r: Awaited<ReturnType<typeof buy>>) => r.body.events.find((e) => e.name === "propose_purchase")?.result?.status;

async function connect(who: string) {
  const start = await startWallet(req("/api/wallet", { body: {}, who }));
  expect(start.status).toBe(201);
  const { approveUrl } = (await start.json()) as { approveUrl: string };
  const back = new URL(approveUrl);
  return walletReturn(req(back.pathname + back.search, { who }));
}

describe("private workspaces", () => {
  it("each browser sees only its own mandates; no cookie is the shared demo workspace", async () => {
    const a = await mandate(ALICE);
    await mandate(BOB);
    await mandate();
    const mine = (await (await listMandates(req("/api/mandates", { who: ALICE }))).json()) as Array<{ id: string }>;
    expect(mine.map((m) => m.id)).toEqual([a.id]);
    expect(a.userId).toMatch(/^u-[0-9a-f]{32}$/);
    expect(a.userId).not.toContain(ALICE);
    expect(((await (await listMandates(req("/api/mandates"))).json()) as unknown[]).length).toBe(1);
  });

  it("another workspace can't run the agent on, or change, your mandate", async () => {
    const a = await mandate(ALICE);
    expect((await buy(a.id, BOB)).status).toBe(403);
    expect((await buy(a.id)).status).toBe(403);
    expect((await patchMandate(req(`/api/mandates/${a.id}`, { method: "PATCH", body: { status: "revoked" }, who: BOB }), { params: Promise.resolve({ id: a.id }) })).status).toBe(403);
    expect((await buy(a.id, ALICE)).status).toBe(200);
    // The shared demo workspace stays open, as the API and SDK expect.
    const shared = await mandate();
    expect((await buy(shared.id, BOB)).status).toBe(200);
  });
});

describe("connect PayPal once", () => {
  it("without a wallet the buyer approves in PayPal; with one, purchases inside the rules are paid at once", async () => {
    const a = await mandate(ALICE);
    expect(paidStatus(await buy(a.id, ALICE))).toBe("awaiting_buyer");

    const back = await connect(ALICE);
    expect(back.status).toBe(303);
    expect(back.headers.get("location")).toBe(`${BASE}/app?wallet=connected`);
    expect(await (await walletStatus(req("/api/wallet", { who: ALICE }))).json()).toMatchObject({ available: true, connected: true, email: "buyer@example.com" });

    const r = await buy(a.id, ALICE);
    expect(paidStatus(r)).toBe("paid");
    const receipts = await c.receipts.list();
    expect(receipts.some((x) => x.type === "wallet" && x.mandateId === a.id)).toBe(true);
    expect(receipts.some((x) => x.type === "payment" && /saved PayPal/.test(x.summary))).toBe(true);
  });

  it("the wallet never pays for a purchase the rules block", async () => {
    const a = await mandate(ALICE);
    await connect(ALICE);
    const res = await runAgent(req("/api/agent/run", { body: { mandateId: a.id, task: "Buy a $50 gift card" }, who: ALICE }));
    const body = (await res.json()) as { events: Array<{ name?: string; result?: { status?: string } }> };
    for (const e of body.events.filter((x) => x.name === "propose_purchase")) expect(e.result?.status).not.toBe("paid");
  });

  it("only the workspace that started the PayPal approval can finish it", async () => {
    await mandate(ALICE);
    const start = await startWallet(req("/api/wallet", { body: {}, who: ALICE }));
    const back = new URL(((await start.json()) as { approveUrl: string }).approveUrl);
    const stolen = await walletReturn(req(back.pathname + back.search, { who: BOB }));
    expect(stolen.headers.get("location")).toContain("wallet=unknown");
    expect(await c.stores.wallets.get((await mandate(BOB)).userId)).toBeUndefined();
    // And the token is spent: Alice can't replay it either.
    expect((await walletReturn(req(back.pathname + back.search, { who: ALICE }))).headers.get("location")).toContain("wallet=unknown");
  });

  it("the shared demo workspace can't save a wallet", async () => {
    expect((await startWallet(req("/api/wallet", { body: {} }))).status).toBe(403);
    expect(await (await walletStatus(req("/api/wallet"))).json()).toMatchObject({ available: false, connected: false });
  });

  it("disconnecting goes back to one PayPal approval per purchase", async () => {
    const a = await mandate(ALICE);
    await connect(ALICE);
    expect(await (await dropWallet(req("/api/wallet", { method: "DELETE", who: ALICE }))).json()).toEqual({ disconnected: true });
    expect(paidStatus(await buy(a.id, ALICE))).toBe("awaiting_buyer");
  });
});

describe("sign out", () => {
  it("disconnects PayPal, pauses the agents and clears the cookie", async () => {
    const a = await mandate(ALICE);
    await connect(ALICE);
    const res = await signOut(req("/api/session", { method: "DELETE", who: ALICE }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/^mandate_session=; Path=\/; Max-Age=0; HttpOnly; SameSite=Lax/);
    expect(await c.stores.wallets.get(a.userId)).toBeUndefined();
    expect((await c.mandates.get(a.id))?.status).toBe("paused");
  });
});

describe("PayPal Vault over REST", () => {
  it("pays an order from the saved wallet and reads the capture", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "T", expires_in: 3600 });
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return Response.json({ id: "ORDER1", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP1", status: "COMPLETED" }] } }] }, { status: 201 });
    }) as typeof fetch;
    const v = new RestVault({ auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: fetchImpl }), fetch: fetchImpl });
    const r = await v.pay({ mandateId: "m", merchantId: "acme", currency: "USD", items: [{ sku: "wul-500", title: "Washing-up liquid", unitMinor: 450, qty: 2 }] }, "TOKEN9", { note: "pm:abc" });
    expect(r).toEqual({ paypalOrderId: "ORDER1", status: "COMPLETED", captureId: "CAP1" });
    expect(calls[0]!.url).toMatch(/\/v2\/checkout\/orders$/);
    expect(calls[0]!.body).toMatchObject({
      intent: "CAPTURE",
      payment_source: { paypal: { vault_id: "TOKEN9" } },
      purchase_units: [{ amount: { currency_code: "USD", value: "9.00" }, items: [{ quantity: "2", unit_amount: { value: "4.50" }, description: "pm:abc" }] }],
    });
  });

  it("a declined capture is a failure, not a payment", async () => {
    const fetchImpl = (async (url: string) =>
      url.endsWith("/token")
        ? Response.json({ access_token: "T", expires_in: 3600 })
        : Response.json({ id: "O2", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "C2", status: "DECLINED" }] } }] })) as typeof fetch;
    const v = new RestVault({ auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: fetchImpl }), fetch: fetchImpl });
    await expect(v.pay({ mandateId: "m", merchantId: "acme", currency: "USD", items: [{ sku: "x", title: "X", unitMinor: 100, qty: 1 }] }, "T")).rejects.toThrow(/declined/i);
  });
});
