import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createContainer } from "@/lib/server/container";
import { publicJwk } from "@/lib/ap2v2/es256";
import { verifyPurchase } from "@/lib/ap2v2/mandates";
import type { Policy } from "@/lib/gate/policy";
import { checkAp2Order } from "@/lib/ap2v2/check";
import { approvalCart } from "@/lib/core/governor";
import { approvalChallenge, spkiToJwk } from "@/lib/passkey/webauthn";
import { softAuthenticator } from "../support/authenticator";

const policy: Policy = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2099-12-31",
};

function order(c: ReturnType<typeof createContainer>, mandateId: string, sku: string) {
  const p = c.catalog.get(sku)!;
  return {
    mandateId,
    order: { mandateId, merchantId: p.merchantId, currency: "USD" as const, items: [{ sku: p.sku, title: p.title, unitMinor: p.unitMinor, qty: 1 }] },
    category: p.category,
    merchantVerified: p.merchantVerified,
    origin: "agent" as const,
  };
}

function keysFor(c: ReturnType<typeof createContainer>) {
  const k = c.credentials.ap2;
  return { root: (h: Record<string, unknown>) => k.byKid(h.kid)!, merchant: (id: string) => k.byKid(`merchant:${id}`), receiptIssuer: (iss: string) => k.byKid(iss) };
}

describe("AP2 v0.2 through the real purchase flow", () => {
  it("signing the rules issues AP2 open mandates; an agent purchase produces a full, verifiable AP2 bundle with receipts", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    expect(m.ap2).toMatchObject({ spec: "ap2/0.2", openCheckoutHash: expect.any(String) });

    const r = await c.governor.propose(order(c, m.id, "wul-500"));
    expect(r.status).toBe("paid");
    const rec = await c.stores.credentials.getByOrder((r as { paypalOrderId: string }).paypalOrderId);
    expect(rec?.ap2).toMatchObject({ mode: "human_not_present", checkoutReceipt: expect.any(String), paymentReceipt: expect.any(String) });

    const v = verifyPurchase(rec!.ap2!, keysFor(c), { context: rec!.ap2!.context });
    expect(v.checks.filter((x) => !x.ok)).toEqual([]);
    expect(v.amount).toEqual({ amount: 450, currency: "USD" });
  });

  it("a purchase the user approves is closed with the user's key (human present)", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    const asked = await c.governor.propose(order(c, m.id, "kettle"));
    expect(asked.status).toBe("pending_approval");
    const paid = await c.governor.decide((asked as { approvalId: string }).approvalId, "approve");
    expect(paid.status).toBe("paid");
    const rec = await c.stores.credentials.getByOrder((paid as { paypalOrderId: string }).paypalOrderId);
    const v = verifyPurchase(rec!.ap2!, keysFor(c));
    expect(v.mode).toBe("human_present");
    expect(v.ok).toBe(true);
  });

  it("with a registered passkey, approval needs the device's signature over this exact cart, and the evidence proves it", async () => {
    const c = createContainer({ APP_URL: "https://mandate.example" });
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    const dev = softAuthenticator({ origin: "https://mandate.example", rpId: "mandate.example" });
    const reg = dev.register("x");
    await c.stores.passkeys.add({ credentialId: dev.credentialId, userId: `demo-user/${m.id}`, publicKey: spkiToJwk(reg.publicKey), rpId: "mandate.example", label: "Phone", createdAt: new Date().toISOString() });

    const asked = (await c.governor.propose(order(c, m.id, "kettle"))) as { approvalId: string };
    const a = (await c.stores.approvals.get(asked.approvalId))!;
    await expect(c.governor.decide(a.id, "approve")).rejects.toThrow(/passkey/);
    await expect(c.governor.decide(a.id, "approve", { passkey: dev.sign("wrong-challenge") })).rejects.toThrow(/challenge/);
    await expect(c.governor.decide(a.id, "approve", { passkey: dev.sign(approvalChallenge(approvalCart(a)), { origin: "https://evil.example" }) })).rejects.toThrow(/origin/);
    expect((await c.stores.approvals.get(a.id))!.status).toBe("pending");

    const paid = (await c.governor.decide(a.id, "approve", { passkey: dev.sign(approvalChallenge(approvalCart(a))) })) as { status: string; paypalOrderId: string };
    expect(paid.status).toBe("paid");
    const v = await checkAp2Order({ credentials: c.stores.credentials, mandates: c.mandates, keys: c.credentials.ap2 }, paid.paypalOrderId);
    expect(v?.ok).toBe(true);
    expect(v?.checks.find((x) => x.id === "passkey_approval")).toMatchObject({ ok: true });

    // Tampering with the stored device signature is caught by anyone re-checking the evidence.
    const rec = (await c.stores.credentials.getByOrder(paid.paypalOrderId))!;
    await c.stores.credentials.setAp2(rec.paymentMandateId, { ...rec.ap2!, passkey: { ...rec.ap2!.passkey!, approvalId: "other" } });
    const v2 = await checkAp2Order({ credentials: c.stores.credentials, mandates: c.mandates, keys: c.credentials.ap2 }, paid.paypalOrderId);
    expect(v2?.ok).toBe(false);
    expect(v2?.checks.find((x) => x.id === "passkey_approval")).toMatchObject({ ok: false });
  });

  it.skipIf(!process.env.AP2_PYTHON)("the AP2 reference SDK accepts the evidence Mandate stored for a real purchase", async () => {
    const c = createContainer({});
    const m = await c.governor.createMandate({ userId: "demo-user", policy, rawText: "household basics" });
    const r = await c.governor.propose(order(c, m.id, "sponge-3"));
    const rec = await c.stores.credentials.getByOrder((r as { paypalOrderId: string }).paypalOrderId);
    const root = publicJwk(c.credentials.ap2.provider);
    const run = (req: unknown) => JSON.parse(spawnSync(process.env.AP2_PYTHON!, [join(__dirname, "interop/ref.py")], { input: JSON.stringify(req), encoding: "utf8" }).stdout);
    const ctx = { total_amount: rec!.ap2!.context.totalAmount, total_uses: rec!.ap2!.context.totalUses };
    expect(run({ op: "verify_payment", chain: rec!.ap2!.paymentChain, root_jwk: root, open_checkout_hash: m.ap2!.openCheckoutHash, context: ctx }).violations).toEqual([]);
    expect(run({ op: "verify_checkout", chain: rec!.ap2!.checkoutChain, root_jwk: root, checkout_jwt: rec!.ap2!.checkoutJwt }).violations).toEqual([]);
  });
});
