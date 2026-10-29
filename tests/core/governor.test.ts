import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { Governor } from "@/lib/core/governor";
import { Executor } from "@/lib/core/executor";
import { MemoryPaymentStore } from "@/lib/core/spend";
import { MemoryMandateStore, MemoryApprovalStore } from "@/lib/core/stores";
import { FakeProvider } from "@/lib/paypal/fake-provider";
import type { OrderSpec } from "@/lib/gate/canonical";
import { generateSigner } from "@/lib/gate/keys";
import { MemoryPermitStore } from "@/lib/gate/permits";
import type { Policy } from "@/lib/gate/policy";
import { ReceiptLog, verifyChain } from "@/lib/gate/receipts";
import { Credentials } from "@/lib/ap2/credentials";
import { MemoryCredentialStore } from "@/lib/ap2/store";
import { EchoMerchants } from "../helpers/echo-merchants";

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2026-12-31",
};

function build(providerMode: "auto_complete" | "payer_action" = "auto_complete") {
  let t = Date.parse("2026-10-21T10:00:00Z");
  const clock = () => new Date(t);
  const advance = (ms: number) => {
    t += ms;
  };
  const signer = generateSigner();
  const permits = new MemoryPermitStore();
  const payments = new MemoryPaymentStore();
  const receipts = new ReceiptLog(signer, clock);
  const provider = new FakeProvider(providerMode);
  const executor = new Executor({
    provider,
    permits,
    payments,
    receipts,
    publicKey: signer.publicKey,
    clock,
    urls: { returnUrl: "https://m.test/r", cancelUrl: "https://m.test/c" },
  });
  const governor = new Governor({
    mandates: new MemoryMandateStore(),
    approvals: new MemoryApprovalStore(),
    permits,
    payments,
    receipts,
    executor,
    signer,
    clock,
    credentials: new Credentials(signer),
    merchants: new EchoMerchants(signer),
    credentialStore: new MemoryCredentialStore(),
  });
  return { governor, receipts, provider, payments, signer, advance, clock };
}

const orderOf = (mandateId: string, unitMinor: number, sku = "wul-500", title = "Washing-up liquid"): OrderSpec => ({
  mandateId,
  merchantId: "acme-supplies",
  currency: "USD",
  items: [{ sku, title, unitMinor, qty: 1 }],
});

const proposal = (mandateId: string, unitMinor: number, over: Record<string, unknown> = {}) => ({
  mandateId,
  order: orderOf(mandateId, unitMinor),
  category: "household",
  merchantVerified: true,
  origin: "agent" as const,
  ...over,
});

describe("governor: end to end through the gate", () => {
  let env: ReturnType<typeof build>;
  let mandateId: string;

  beforeEach(async () => {
    env = build();
    const m = await env.governor.createMandate({ userId: "u1", policy, rawText: "household basics" });
    mandateId = m.id;
  });

  it("rejects a malformed policy", async () => {
    await expect(env.governor.createMandate({ userId: "u1", policy: { ...policy, categories: [] } as Policy, rawText: "" })).rejects.toThrow();
  });

  it("pays for an in-policy purchase and leaves a verifiable trail", async () => {
    const r = await env.governor.propose(proposal(mandateId, 450));
    expect(r.status).toBe("paid");
    const log = await env.receipts.list(mandateId);
    expect(log.map((x) => x.type)).toEqual(["mandate", "decision", "permit", "payment"]);
    expect(verifyChain(await env.receipts.list(), env.signer.publicKey).ok).toBe(true);
  });

  it("blocks an out-of-mandate category without touching PayPal", async () => {
    const r = await env.governor.propose(proposal(mandateId, 450, { category: "gift-cards" }));
    expect(r).toMatchObject({ status: "blocked", decision: { rule: "category" } });
    expect(env.provider.calls.create).toBe(0);
    expect((await env.receipts.list(mandateId)).at(-1)).toMatchObject({ type: "decision" });
  });

  it("blocks an order whose mandate id does not match", async () => {
    const r = await env.governor.propose({ ...proposal(mandateId, 450), order: orderOf("other", 450) });
    expect(r.status).toBe("blocked");
    expect(env.provider.calls.create).toBe(0);
  });

  it("blocks an unknown mandate", async () => {
    const r = await env.governor.propose(proposal("nope", 450));
    expect(r).toMatchObject({ status: "blocked", decision: { rule: "invalid_input" } });
  });

  it("blocks an order with no items or a non-integer quantity", async () => {
    const empty = { ...proposal(mandateId, 450), order: { ...orderOf(mandateId, 450), items: [] } };
    expect((await env.governor.propose(empty)).status).toBe("blocked");
    const frac = { ...proposal(mandateId, 450), order: { ...orderOf(mandateId, 450), items: [{ sku: "a", title: "a", unitMinor: 450, qty: 0.5 }] } };
    expect((await env.governor.propose(frac)).status).toBe("blocked");
    expect(env.provider.calls.create).toBe(0);
  });

  it("asks for approval over the item cap, and pays once approved", async () => {
    const r = await env.governor.propose(proposal(mandateId, 3200));
    expect(r.status).toBe("pending_approval");
    if (r.status !== "pending_approval") throw new Error("unreachable");
    expect(env.provider.calls.create).toBe(0);
    const d = await env.governor.decide(r.approvalId, "approve");
    expect(d.status).toBe("paid");
    expect((await env.receipts.list(mandateId)).map((x) => x.type)).toEqual([
      "mandate",
      "decision",
      "approval_requested",
      "approval_decided",
      "decision",
      "permit",
      "payment",
    ]);
  });

  it("a declined approval pays nothing", async () => {
    const r = await env.governor.propose(proposal(mandateId, 3200));
    if (r.status !== "pending_approval") throw new Error("expected approval");
    expect(await env.governor.decide(r.approvalId, "decline")).toMatchObject({ status: "declined" });
    expect(env.provider.calls.create).toBe(0);
  });

  it("an approval can only be decided once", async () => {
    const r = await env.governor.propose(proposal(mandateId, 3200));
    if (r.status !== "pending_approval") throw new Error("expected approval");
    await env.governor.decide(r.approvalId, "approve");
    await expect(env.governor.decide(r.approvalId, "approve")).rejects.toThrow(/already/);
    expect(env.provider.calls.create).toBe(1);
  });

  it("an approval expires after 15 minutes", async () => {
    const r = await env.governor.propose(proposal(mandateId, 3200));
    if (r.status !== "pending_approval") throw new Error("expected approval");
    env.advance(15 * 60_000 + 1);
    await expect(env.governor.decide(r.approvalId, "approve")).rejects.toThrow(/expired/);
    expect(env.provider.calls.create).toBe(0);
  });

  it("rejects an unknown approval", async () => {
    await expect(env.governor.decide("nope", "approve")).rejects.toThrow(/not found/);
  });

  it("re-checks hard rules at approval time: pausing in between blocks the payment", async () => {
    const r = await env.governor.propose(proposal(mandateId, 3200));
    if (r.status !== "pending_approval") throw new Error("expected approval");
    await env.governor.setStatus(mandateId, "paused");
    expect(await env.governor.decide(r.approvalId, "approve")).toMatchObject({ status: "blocked", decision: { rule: "mandate_inactive" } });
    expect(env.provider.calls.create).toBe(0);
  });

  it("enforces the period budget across purchases", async () => {
    for (let i = 0; i < 3; i++) expect((await env.governor.propose(proposal(mandateId, 2500))).status).toBe("paid");
    expect((await env.governor.propose(proposal(mandateId, 500))).status).toBe("paid"); // 8000 exactly
    expect((await env.governor.propose(proposal(mandateId, 1))).status).toBe("pending_approval");
  });

  it("counts orders awaiting buyer approval against the budget", async () => {
    const e = build("payer_action");
    const m = await e.governor.createMandate({ userId: "u1", policy, rawText: "" });
    for (let i = 0; i < 3; i++) expect((await e.governor.propose(proposal(m.id, 2500))).status).toBe("awaiting_buyer");
    expect((await e.governor.propose(proposal(m.id, 600))).status).toBe("pending_approval");
  });

  it("revoking stops all further purchases", async () => {
    await env.governor.setStatus(mandateId, "revoked");
    expect(await env.governor.propose(proposal(mandateId, 100))).toMatchObject({ status: "blocked", decision: { rule: "mandate_inactive" } });
  });

  it("a revoked mandate cannot be reactivated", async () => {
    await env.governor.setStatus(mandateId, "revoked");
    await expect(env.governor.setStatus(mandateId, "active")).rejects.toThrow(/revoked/);
  });

  it("blocks purchases steered by untrusted content", async () => {
    const r = await env.governor.propose(proposal(mandateId, 450, { origin: "untrusted_instruction" }));
    expect(r).toMatchObject({ status: "blocked", decision: { rule: "untrusted_instruction" } });
  });
});

describe("governor: properties", () => {
  it("without approvals, total spend never exceeds the budget", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer({ min: 1, max: 4000 }), { minLength: 1, maxLength: 25 }), async (amounts) => {
        const env = build();
        const m = await env.governor.createMandate({ userId: "u1", policy, rawText: "" });
        for (const a of amounts) await env.governor.propose(proposal(m.id, a));
        const spent = await env.payments.spentMinor(m.id, "month", env.clock());
        expect(spent).toBeLessThanOrEqual(policy.budget.amountMinor);
      }),
      { numRuns: 60 },
    );
  });

  it("every PayPal call is preceded by an allow decision and a permit in the log", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer({ min: 1, max: 4000 }), { minLength: 1, maxLength: 15 }), async (amounts) => {
        const env = build();
        const m = await env.governor.createMandate({ userId: "u1", policy, rawText: "" });
        for (const a of amounts) await env.governor.propose(proposal(m.id, a));
        const log = await env.receipts.list(m.id);
        const payments = log.filter((r) => r.type === "payment").length;
        const permitsIssued = log.filter((r) => r.type === "permit").length;
        expect(payments).toBe(env.provider.calls.create);
        expect(permitsIssued).toBe(payments);
      }),
      { numRuns: 40 },
    );
  });
});
