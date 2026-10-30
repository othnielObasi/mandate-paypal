/**
 * Interop with Google's AP2 reference SDK (github.com/google-agentic-commerce/AP2).
 * Runs when AP2_PYTHON points at a Python with the `ap2` package installed
 * (CI installs it; see .github/workflows/ci.yml). Skipped otherwise.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { generateEs256, publicJwk } from "@/lib/ap2v2/es256";
import { issueRoot, present, verifyChain, sd } from "@/lib/ap2v2/sdjwt";
import { openMandatesFor, merchantCheckout, closeAutonomous } from "@/lib/ap2v2/mandates";

const PY = process.env.AP2_PYTHON;
const ref = (req: unknown) => {
  const r = spawnSync(PY!, [join(__dirname, "interop/ref.py")], { input: JSON.stringify(req), encoding: "utf8" });
  if (r.status !== 0) throw new Error(`reference SDK failed: ${r.stderr}`);
  return JSON.parse(r.stdout) as Record<string, unknown>;
};

describe.skipIf(!PY)("interop with the AP2 reference SDK", () => {
  it("the reference SDK verifies a Mandate-issued open+closed payment chain with no violations", () => {
    const provider = generateEs256("mandate-provider");
    const agent = generateEs256();
    const open = issueRoot(
      {
        vct: "mandate.payment.open.1",
        constraints: [
          { type: "payment.amount_range", currency: "USD", min: 0, max: 2500 },
          { type: "payment.allowed_payees", allowed: [sd({ id: "acme-supplies", name: "Acme Supplies" })] },
          { type: "payment.reference", conditional_transaction_id: "open-checkout-hash" },
        ],
        cnf: { jwk: publicJwk(agent) },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      provider,
    );
    const chain = present(open, agent, { vct: "mandate.payment.1", transaction_id: "tx1", payee: { id: "acme-supplies", name: "Acme Supplies" }, payment_amount: { amount: 450, currency: "USD" }, payment_instrument: { id: "paypal-wallet", type: "paypal" } }, { aud: "paypal", nonce: "n1" });
    const out = ref({ op: "verify_payment", chain, root_jwk: publicJwk(provider), open_checkout_hash: "open-checkout-hash" });
    expect(out.violations).toEqual([]);
    expect((out.payloads as Array<Record<string, unknown>>)[1]).toMatchObject({ vct: "mandate.payment.1", payment_amount: { amount: 450, currency: "USD" } });
  });

  it("the reference SDK reports a violation when the amount exceeds the open mandate", () => {
    const provider = generateEs256("p");
    const agent = generateEs256();
    const open = issueRoot({ vct: "mandate.payment.open.1", constraints: [{ type: "payment.amount_range", currency: "USD", max: 2500 }], cnf: { jwk: publicJwk(agent) } }, provider);
    const chain = present(open, agent, { vct: "mandate.payment.1", transaction_id: "tx", payee: { id: "a", name: "A" }, payment_amount: { amount: 3200, currency: "USD" }, payment_instrument: { id: "pp", type: "paypal" } }, { aud: "paypal", nonce: "n" });
    const out = ref({ op: "verify_payment", chain, root_jwk: publicJwk(provider) });
    expect((out.violations as string[]).join(" ")).toMatch(/exceeds maximum/);
  });

  it("a full Mandate purchase (policy → open mandates → merchant checkout → agent-closed mandates) passes the reference SDK's checkout and payment verification", () => {
    const provider = generateEs256("mandate-provider");
    const agent = generateEs256("mandate-agent");
    const merchantKey = generateEs256("acme-supplies");
    const now = Math.floor(Date.now() / 1000);
    const open = openMandatesFor(
      { categories: ["household"], currency: "USD", maxItemMinor: 2500, budget: { amountMinor: 8000, period: "month" }, sellers: { verifiedOnly: true, blocked: [] }, overLimit: "ask", expires: "2099-01-31" },
      [{ id: "acme-supplies", name: "Acme Supplies", verified: true }],
      { providerKey: provider, agentKey: agent, now },
    );
    const checkout = merchantCheckout({ id: "cart_1", merchant: { id: "acme-supplies", name: "Acme Supplies" }, currency: "USD", items: [{ sku: "wul-500", title: "Eco washing-up liquid 500ml", unitMinor: 450, qty: 1 }] }, merchantKey);
    const closed = closeAutonomous(open, checkout, { agentKey: agent, payee: { id: "acme-supplies", name: "Acme Supplies" }, now, nonce: "n1" });

    const pay = ref({ op: "verify_payment", chain: closed.paymentChain, root_jwk: publicJwk(provider), open_checkout_hash: open.openCheckoutHash, context: { total_amount: 1000, total_uses: 2 } });
    expect(pay.violations).toEqual([]);
    const co = ref({ op: "verify_checkout", chain: closed.checkoutChain, root_jwk: publicJwk(provider), checkout_jwt: checkout.jwt });
    expect(co.violations).toEqual([]);

    // Over budget for the period: the reference SDK agrees it must fail.
    const over = ref({ op: "verify_payment", chain: closed.paymentChain, root_jwk: publicJwk(provider), open_checkout_hash: open.openCheckoutHash, context: { total_amount: 7600, total_uses: 9 } });
    expect((over.violations as string[]).join(" ")).toMatch(/budget/i);
  });

  it("Mandate verifies a chain produced by the reference SDK", () => {
    const made = ref({ op: "make_payment" }) as { chain: string; root_jwk: Record<string, string> };
    const [open, closed] = verifyChain(made.chain, () => ({ ...(made.root_jwk as never) }), {});
    expect(open).toMatchObject({ vct: "mandate.payment.open.1" });
    expect(closed).toMatchObject({ vct: "mandate.payment.1", transaction_id: "tx-ref", payment_amount: { amount: 450 } });
  });
});
