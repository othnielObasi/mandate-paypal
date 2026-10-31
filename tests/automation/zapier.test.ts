import { afterEach, describe, expect, it, vi } from "vitest";
import { bearerMatches, eventFor, ZapierHook, type AutomationEvent } from "@/lib/automation/zapier";
import { generateSigner } from "@/lib/gate/keys";
import { ReceiptLog, verifyChain, type Receipt } from "@/lib/gate/receipts";
import { createContainer, setContainer } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { POST as killSwitch } from "@/app/api/automation/kill-switch/route";
import { GET as health } from "@/app/api/health/route";

const BASE = "http://localhost:3000";
const HOOK = "https://hooks.zapier.com/hooks/catch/123/abc/";
const SECRET = "s3cret-for-the-kill-switch";

const receipt = (over: Partial<Receipt>): Receipt => ({
  seq: 7,
  mandateId: "m1",
  type: "decision",
  summary: "",
  payload: {},
  payloadHash: "ph",
  createdAt: "2026-10-31T10:00:00.000Z",
  prevHash: "p",
  hash: "h7",
  signature: "sig",
  ...over,
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

afterEach(() => vi.unstubAllGlobals());

describe("Zapier events from the decision log", () => {
  it("an approval request becomes approval.needed, with the receipt it came from", () => {
    const e = eventFor(receipt({ type: "approval_requested", summary: "Asked you to approve Electric kettle 1.7L for $32.00 from Acme Supplies: $32.00 is over the item limit of $25.00.", payload: { approvalId: "a1" } }), BASE);
    expect(e).toEqual({
      event: "approval.needed",
      message: "Mandate: Approve Electric kettle 1.7L for $32.00 from Acme Supplies: $32.00 is over the item limit of $25.00.",
      mandateId: "m1",
      at: "2026-10-31T10:00:00.000Z",
      link: `${BASE}/app`,
      receipt: { seq: 7, hash: "h7" },
      approvalId: "a1",
    });
  });

  it("a blocked decision becomes purchase.blocked with the rule; allowed decisions are not sent", () => {
    const blocked = eventFor(receipt({ summary: "Blocked: Gift card", payload: { decision: { outcome: "block", rule: "untrusted_instruction" } } }), BASE);
    expect(blocked).toMatchObject({ event: "purchase.blocked", rule: "untrusted_instruction" });
    expect(eventFor(receipt({ payload: { decision: { outcome: "allow", rule: "ok" } } }), BASE)).toBeNull();
  });

  it("a payment links to its public verdict", () => {
    const e = eventFor(receipt({ type: "payment", summary: "Paid $4.50 to acme-supplies", payload: { paypalOrderId: "5O19/0" } }), BASE);
    expect(e).toMatchObject({ event: "purchase.paid", paypalOrderId: "5O19/0", link: `${BASE}/api/verify/5O19%2F0` });
  });

  it("status changes are sent; creating a mandate, permits and tracking are not", () => {
    expect(eventFor(receipt({ type: "mandate", summary: "Mandate paused", payload: { status: "paused" } }), BASE)).toMatchObject({ event: "mandate.status_changed", status: "paused" });
    expect(eventFor(receipt({ type: "mandate", payload: { policy: {} } }), BASE)).toBeNull();
    for (const type of ["permit", "tracking", "passkey", "refusal"] as const) expect(eventFor(receipt({ type }), BASE)).toBeNull();
  });

  it("ignores malformed payloads instead of throwing", () => {
    expect(eventFor(receipt({ type: "decision", payload: null }), BASE)).toBeNull();
    expect(eventFor(receipt({ type: "approval_requested", payload: "x" }), BASE)).toMatchObject({ event: "approval.needed", approvalId: undefined });
  });
});

describe("ZapierHook", () => {
  it("only posts to https", () => {
    expect(() => new ZapierHook({ url: "http://hooks.zapier.com/x", appUrl: BASE })).toThrow(/https/);
  });

  it("posts the event as JSON", async () => {
    const fetch = vi.fn(async () => new Response("ok"));
    const hook = new ZapierHook({ url: HOOK, appUrl: BASE, fetch });
    expect(await hook.notify(receipt({ type: "payment", payload: { paypalOrderId: "X1" } }))).toBe(true);
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(HOOK);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ event: "purchase.paid", paypalOrderId: "X1" });
  });

  it("never throws when Zapier is down or refuses", async () => {
    const onError = vi.fn();
    const down = new ZapierHook({ url: HOOK, appUrl: BASE, fetch: async () => Promise.reject(new Error("ECONNREFUSED")), onError });
    const refuses = new ZapierHook({ url: HOOK, appUrl: BASE, fetch: async () => new Response("no", { status: 410 }), onError });
    const r = receipt({ type: "payment", payload: {} });
    expect(await down.notify(r)).toBe(false);
    expect(await refuses.notify(r)).toBe(false);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it("sends nothing for entries nobody needs to hear about", async () => {
    const fetch = vi.fn(async () => new Response("ok"));
    expect(await new ZapierHook({ url: HOOK, appUrl: BASE, fetch }).notify(receipt({ type: "permit" }))).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("receipt listeners", () => {
  it("a failing listener cannot fail or change the log", async () => {
    const signer = generateSigner();
    const log = new ReceiptLog(signer);
    log.subscribe(() => {
      throw new Error("listener broke");
    });
    log.subscribe(async () => Promise.reject(new Error("async listener broke")));
    const r = await log.append({ mandateId: "m1", type: "mandate", summary: "Mandate paused", payload: { status: "paused" } });
    expect(r.seq).toBe(1);
    expect(verifyChain(await log.list(), signer.publicKey)).toEqual({ ok: true, count: 1 });
  });
});

describe("end to end: alerts and kill switch", () => {
  function setup(env: Record<string, string>, fetchImpl: typeof fetch) {
    vi.stubGlobal("fetch", fetchImpl);
    setContainer(createContainer({ APP_URL: BASE, ...env }));
  }

  async function mandate() {
    const res = await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }));
    return ((await res.json()) as { id: string }).id;
  }

  async function run(mandateId: string, task: string, drill = false) {
    const res = await runAgent(post("/api/agent/run", { mandateId, task, drill }));
    const body = (await res.json()) as { events: Array<{ name?: string; result?: { status: string } }> };
    return body.events.filter((e) => e.name === "propose_purchase").map((e) => e.result!.status);
  }

  it("sends approval, block and payment alerts to the Zap", async () => {
    const sent: AutomationEvent[] = [];
    setup({ ZAPIER_HOOK_URL: HOOK }, (async (_u: unknown, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response("ok");
    }) as typeof fetch);
    const id = await mandate();
    expect(await run(id, "Buy washing-up liquid")).toEqual(["paid"]);
    expect(await run(id, "Buy an electric kettle")).toEqual(["pending_approval"]);
    expect(await run(id, "Buy a cleaning spray", true)).toContain("blocked");
    await vi.waitFor(() => expect(sent.map((e) => e.event)).toEqual(expect.arrayContaining(["purchase.paid", "approval.needed", "purchase.blocked"])));
    expect(sent.every((e) => e.mandateId === id && e.receipt.seq > 0)).toBe(true);
    expect(await (await health()).json()).toMatchObject({ automation: { alerts: "zapier", killSwitch: "off" } });
  });

  it("purchases still go through when Zapier is down", async () => {
    setup({ ZAPIER_HOOK_URL: HOOK }, (async () => Promise.reject(new Error("down"))) as typeof fetch);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await run(await mandate(), "Buy washing-up liquid")).toEqual(["paid"]);
  });

  it("the kill switch is refused unless configured and authorised", async () => {
    setup({}, fetch);
    expect((await killSwitch(post("/api/automation/kill-switch", { action: "pause" }, { authorization: `Bearer ${SECRET}` }))).status).toBe(503);
    setup({ AUTOMATION_SECRET: "too-short" }, fetch);
    expect((await killSwitch(post("/api/automation/kill-switch", { action: "pause" }, { authorization: "Bearer too-short" }))).status).toBe(503);
    setup({ AUTOMATION_SECRET: SECRET }, fetch);
    expect((await killSwitch(post("/api/automation/kill-switch", { action: "pause" }))).status).toBe(401);
    expect((await killSwitch(post("/api/automation/kill-switch", { action: "pause" }, { authorization: "Bearer wrong-secret-of-length" }))).status).toBe(401);
    expect((await killSwitch(post("/api/automation/kill-switch", { action: "approve" }, { authorization: `Bearer ${SECRET}` }))).status).toBe(400);
  });

  it("pausing from a Zap stops every agent; resuming lets them buy again; it is logged as automation", async () => {
    const sent: AutomationEvent[] = [];
    setup({ AUTOMATION_SECRET: SECRET, ZAPIER_HOOK_URL: HOOK }, (async (_u: unknown, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response("ok");
    }) as typeof fetch);
    const a = await mandate();
    const b = await mandate();
    const auth = { authorization: `Bearer ${SECRET}` };

    const paused = await killSwitch(post("/api/automation/kill-switch", { action: "pause" }, auth));
    expect(await paused.json()).toMatchObject({ ok: true, status: "paused", changed: expect.arrayContaining([a, b]) });
    expect(await run(a, "Buy washing-up liquid")).toEqual(["blocked"]);

    const resumed = await killSwitch(post("/api/automation/kill-switch", { action: "resume", mandateId: a }, auth));
    expect(await resumed.json()).toMatchObject({ changed: [a] });
    expect(await run(a, "Buy washing-up liquid")).toEqual(["paid"]);
    expect(await run(b, "Buy washing-up liquid")).toEqual(["blocked"]);

    await vi.waitFor(() => expect(sent.filter((e) => e.event === "mandate.status_changed").length).toBe(3));
    expect(sent.find((e) => e.status === "paused")?.message).toBe("Mandate: Mandate paused (via automation)");

    expect((await killSwitch(post("/api/automation/kill-switch", { action: "revoke", mandateId: "nope" }, auth))).status).toBe(404);
  });
});
