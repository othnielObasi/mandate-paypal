import { describe, it, expect, beforeEach } from "vitest";
import { Governor } from "@/lib/core/governor";
import { Executor } from "@/lib/core/executor";
import { MemoryPaymentStore } from "@/lib/core/spend";
import { MemoryMandateStore, MemoryApprovalStore } from "@/lib/core/stores";
import { FakeProvider } from "@/lib/paypal/fake-provider";
import { generateSigner } from "@/lib/gate/keys";
import { MemoryPermitStore } from "@/lib/gate/permits";
import type { Policy } from "@/lib/gate/policy";
import { ReceiptLog } from "@/lib/gate/receipts";
import { Credentials } from "@/lib/ap2/credentials";
import { MemoryCredentialStore } from "@/lib/ap2/store";
import { toActivity, ruleLabel } from "@/lib/ui/activity";
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

function build(mode: "auto_complete" | "payer_action" = "auto_complete") {
  let t = Date.parse("2026-10-21T10:00:00Z");
  const clock = () => new Date((t += 1000));
  const signer = generateSigner();
  const permits = new MemoryPermitStore();
  const payments = new MemoryPaymentStore();
  const receipts = new ReceiptLog(signer, clock);
  const executor = new Executor({ provider: new FakeProvider(mode), permits, payments, receipts, publicKey: signer.publicKey, clock, urls: { returnUrl: "https://m.test/r", cancelUrl: "https://m.test/c" } });
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
  return { governor, receipts };
}

const buy = (mandateId: string, unitMinor: number, title: string, over: Record<string, unknown> = {}) => ({
  mandateId,
  order: { mandateId, merchantId: "acme-supplies", currency: "USD" as const, items: [{ sku: title.toLowerCase().replace(/\W+/g, "-"), title, unitMinor, qty: 1 }] },
  category: "household",
  merchantVerified: true,
  origin: "agent" as const,
  ...over,
});

describe("activity feed from the receipt log", () => {
  let env: ReturnType<typeof build>;
  let id: string;

  beforeEach(async () => {
    env = build();
    id = (await env.governor.createMandate({ userId: "u", policy, rawText: "household" })).id;
  });

  it("shows a paid purchase once, with its PayPal order", async () => {
    const r = await env.governor.propose(buy(id, 450, "Soap"));
    const [row, ...rest] = toActivity(await env.receipts.list(id));
    expect(rest).toHaveLength(0);
    expect(row).toMatchObject({ title: "Soap", amountMinor: 450, status: "paid", agent: "Mandate agent", injected: false });
    expect(row!.paypalOrderId).toBe((r as { paypalOrderId: string }).paypalOrderId);
  });

  it("marks a purchase steered by page content as blocked and injected", async () => {
    await env.governor.propose(buy(id, 2499, "Bundle", { origin: "untrusted_instruction" }));
    const [row] = toActivity(await env.receipts.list(id));
    expect(row).toMatchObject({ status: "blocked", injected: true, rule: "untrusted_instruction" });
    expect(ruleLabel(row!.rule)).toBe("Not something you asked for");
  });

  it("a pending approval is 'asked' and carries its approval id", async () => {
    const r = (await env.governor.propose(buy(id, 3200, "Kettle"))) as { approvalId: string };
    const [row] = toActivity(await env.receipts.list(id));
    expect(row).toMatchObject({ status: "asked", approvalId: r.approvalId, rule: "item_cap" });
  });

  it("an approved purchase appears once, as paid", async () => {
    const r = (await env.governor.propose(buy(id, 3200, "Kettle"))) as { approvalId: string };
    await env.governor.decide(r.approvalId, "approve");
    const rows = toActivity(await env.receipts.list(id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Kettle", status: "paid", reason: "Approved by you." });
  });

  it("a declined purchase stays, marked declined", async () => {
    const r = (await env.governor.propose(buy(id, 3200, "Kettle"))) as { approvalId: string };
    await env.governor.decide(r.approvalId, "decline");
    expect(toActivity(await env.receipts.list(id))).toMatchObject([{ title: "Kettle", status: "declined" }]);
  });

  it("names the outside assistant that proposed it, newest first", async () => {
    await env.governor.propose(buy(id, 199, "Sponges"));
    await env.governor.propose(buy(id, 375, "Spray", { via: "Claude Desktop" }));
    const rows = toActivity(await env.receipts.list(id));
    expect(rows.map((r) => [r.title, r.agent])).toEqual([
      ["Spray", "Claude Desktop"],
      ["Sponges", "Mandate agent"],
    ]);
  });

  it("a payment waiting on the buyer in PayPal shows as pending", async () => {
    env = build("payer_action");
    id = (await env.governor.createMandate({ userId: "u", policy, rawText: "household" })).id;
    await env.governor.propose(buy(id, 450, "Soap"));
    expect(toActivity(await env.receipts.list(id))[0]).toMatchObject({ status: "pending" });
  });
});
