import { randomUUID } from "node:crypto";
import type { Credentials } from "../ap2/credentials";
import { mandateHash, paymentFingerprint } from "../ap2/mandates";
import type { CredentialStore } from "../ap2/store";
import { publicJwk } from "../ap2v2/es256";
import { passkeyOwner, type PasskeyStore } from "../passkey/store";
import { approvalChallenge, clientOrigin, verifyAssertion, type ApprovalCart, type PasskeyApproval, type PasskeyAssertion } from "../passkey/webauthn";
import { checkoutReceipt, checkPaymentConstraints, closeApproved, closeAutonomous, merchantCheckout, openMandatesFor, paymentReceipt } from "../ap2v2/mandates";
import type { Ap2PurchaseRecord } from "../ap2v2/records";
import { verifyChain } from "../ap2v2/sdjwt";
import { orderDigest, orderTotalMinor } from "../gate/canonical";
import { evaluate } from "../gate/evaluate";
import type { Signer } from "../gate/keys";
import { issuePermit, type PermitStore } from "../gate/permits";
import { formatMoney, parsePolicy, type Policy } from "../gate/policy";
import type { ReceiptLog } from "../gate/receipts";
import type { Decision, Intent, MandateStatus } from "../gate/types";
import type { Merchants } from "../merchant/merchants";
import type { MarketQuote, PriceOracle } from "../market/oracle";
import { OrderSpecSchema, type Executor } from "./executor";
import type { PaymentStore } from "./spend";
import type { ApprovalStore, MandateRecord, MandateStore, Proposal } from "./stores";

export const APPROVAL_TTL_MS = 15 * 60_000;

export type ProposeResult =
  | { status: "paid"; decision: Decision; paypalOrderId: string; amountMinor: number; paymentMandateId: string }
  | { status: "awaiting_buyer"; decision: Decision; paypalOrderId: string; approveUrl: string; amountMinor: number; paymentMandateId: string }
  | { status: "pending_approval"; decision: Decision; approvalId: string }
  | { status: "blocked"; decision: Decision }
  | { status: "declined" }
  | { status: "failed"; decision: Decision; error: string };

interface Deps {
  mandates: MandateStore;
  approvals: ApprovalStore;
  permits: PermitStore;
  payments: PaymentStore;
  receipts: ReceiptLog;
  executor: Executor;
  signer: Signer;
  clock: () => Date;
  credentials: Credentials;
  merchants: Merchants;
  credentialStore: CredentialStore;
  /** Reference prices for the optional market-price rule. */
  market?: PriceOracle;
  /** Registered passkeys; when a user has one, approvals must be signed with it. */
  passkeys?: PasskeyStore;
  /** Origins a WebAuthn ceremony may come from (the app's own). */
  origins?: string[];
}

/** The cart a passkey approval covers, as the merchant will sign it. */
export const approvalCart = (a: { id: string; proposal: Proposal }): ApprovalCart => ({
  approvalId: a.id,
  merchantId: a.proposal.order.merchantId,
  currency: a.proposal.order.currency,
  totalMinor: a.proposal.order.items.reduce((s, i) => s + i.unitMinor * i.qty, 0),
  items: a.proposal.order.items.map((i) => ({ sku: i.sku, qty: i.qty })),
});

export class PasskeyError extends Error {}

const block = (rule: Decision["rule"], reason: string): Extract<ProposeResult, { status: "blocked" }> => ({
  status: "blocked",
  decision: { outcome: "block", rule, reason },
});

/**
 * Orchestrates one purchase: verify the user's signed intent → merchant
 * quotes and signs the cart → gate → (user approval) → payment mandate →
 * permit → executor. Every step is logged.
 */
export class Governor {
  constructor(private d: Deps) {}

  async createMandate(input: { userId: string; policy: Policy; rawText: string }): Promise<MandateRecord> {
    const parsed = parsePolicy(input.policy);
    if (!parsed.ok) throw new Error(`Invalid policy: ${parsed.error}`);
    const now = this.d.clock();
    const base = { id: randomUUID(), userId: input.userId, policy: parsed.value, status: "active" as const, rawText: input.rawText, createdAt: now.toISOString() };
    const keys = this.d.credentials.ap2;
    const open = openMandatesFor(parsed.value, { providerKey: keys.provider, agentKey: keys.agent, now: Math.floor(now.getTime() / 1000) });
    const m: MandateRecord = {
      ...base,
      intentMandate: this.d.credentials.signIntent(base, now),
      ap2: { spec: "ap2/0.2", checkoutOpen: open.checkoutOpen.token, paymentOpen: open.paymentOpen.token, openCheckoutHash: open.openCheckoutHash },
    };
    await this.d.mandates.save(m);
    const p = m.policy;
    await this.d.receipts.append({
      mandateId: m.id,
      type: "mandate",
      summary: `Mandate created and signed: ${p.categories.join(", ")}; up to ${formatMoney(p.maxItemMinor, p.currency)} per item, ${formatMoney(p.budget.amountMinor, p.currency)} per ${p.budget.period}`,
      payload: { policy: p, rawText: input.rawText, intentMandateHash: mandateHash(m.intentMandate!.contents), ap2OpenCheckoutHash: open.openCheckoutHash },
    });
    return m;
  }

  async setStatus(mandateId: string, status: MandateStatus) {
    const m = await this.d.mandates.get(mandateId);
    if (!m) throw new Error("mandate not found");
    if (m.status === "revoked") throw new Error("A revoked mandate cannot be changed.");
    await this.d.mandates.setStatus(mandateId, status);
    await this.d.receipts.append({ mandateId, type: "mandate", summary: `Mandate ${status}`, payload: { status } });
  }

  async budgetStatus(mandateId: string) {
    const m = await this.d.mandates.get(mandateId);
    if (!m) return undefined;
    const now = this.d.clock();
    const spentMinor = await this.d.payments.spentMinor(mandateId, m.policy.budget.period, now);
    const reservedMinor = (await this.d.permits.reservedMinor(mandateId, now)) + (await this.d.executor.pendingMinor(mandateId));
    return { mandate: m, spentMinor, reservedMinor, remainingMinor: Math.max(0, m.policy.budget.amountMinor - spentMinor - reservedMinor) };
  }

  async propose(p: Proposal): Promise<ProposeResult> {
    return this.run(p, false);
  }

  async decide(approvalId: string, choice: "approve" | "decline", opts: { passkey?: PasskeyAssertion } = {}): Promise<ProposeResult> {
    const a = await this.d.approvals.get(approvalId);
    if (!a) throw new Error("Approval not found.");
    if (a.status !== "pending") throw new Error(`Approval already ${a.status}.`);
    if (this.d.clock().getTime() > Date.parse(a.expiresAt)) {
      await this.d.approvals.transition(approvalId, "pending", "expired");
      throw new Error("Approval expired.");
    }
    let passkey: PasskeyApproval | undefined;
    if (choice === "approve" && this.d.passkeys) {
      const mandate = await this.d.mandates.get(a.mandateId);
      const mine = mandate ? await this.d.passkeys.listForUser(passkeyOwner(mandate)) : [];
      if (opts.passkey) {
        const rec = mine.find((k) => k.credentialId === opts.passkey!.credentialId);
        if (!rec) throw new PasskeyError("That passkey is not registered for this account.");
        const why = verifyAssertion({ ...opts.passkey, publicKey: rec.publicKey }, { challenge: approvalChallenge(approvalCart(a)), origin: this.d.origins ?? [], rpId: rec.rpId });
        if (why) throw new PasskeyError(`Passkey approval failed: ${why}.`);
        passkey = { approvalId, ...opts.passkey, publicKey: rec.publicKey, rpId: rec.rpId, origin: clientOrigin(opts.passkey.clientDataJSON) };
      } else if (mine.length) throw new PasskeyError("Approve with your passkey: this account requires it.");
    }
    const to = choice === "approve" ? "approved" : "declined";
    if (!(await this.d.approvals.transition(approvalId, "pending", to))) throw new Error("Approval already decided.");
    await this.d.receipts.append({
      mandateId: a.mandateId,
      type: "approval_decided",
      summary: `You ${to} ${a.summary}`,
      payload: { approvalId, choice, ...(passkey ? { passkey: passkey.credentialId } : {}) },
    });
    if (choice === "decline") return { status: "declined" };
    return this.run(a.proposal, true, passkey);
  }

  /** After PayPal confirms a capture: the merchant and the payment gateway issue AP2 receipts. */
  async recordCapture(p: { paymentMandateId?: string; paypalOrderId: string; captureId: string; order: { mandateId: string; merchantId: string } }) {
    if (!p.paymentMandateId) return;
    const rec = (await this.d.credentialStore.list(p.order.mandateId)).find((r) => r.paymentMandateId === p.paymentMandateId);
    if (!rec?.ap2 || rec.ap2.paymentReceipt) return;
    const keys = this.d.credentials.ap2;
    const now = Math.floor(this.d.clock().getTime() / 1000);
    const merchantKey = keys.merchant(p.order.merchantId);
    await this.d.credentialStore.setAp2(rec.paymentMandateId, {
      ...rec.ap2,
      checkoutReceipt: checkoutReceipt(rec.ap2.checkoutChain, { orderId: p.paypalOrderId, issuer: merchantKey.kid!, key: merchantKey, now }),
      paymentReceipt: paymentReceipt(rec.ap2.paymentChain, { paypalOrderId: p.paypalOrderId, captureId: p.captureId, issuer: keys.gateway.kid!, key: keys.gateway, now }),
    });
  }

  /** Market reference for the whole cart (each line's unit reference × qty), or null if any line has none. */
  private async marketReference(policy: Policy, order: { currency: string; items: Array<{ title: string; qty: number }> }): Promise<(MarketQuote & { lines: number }) | null> {
    if (policy.maxPremiumPct === null || policy.maxPremiumPct === undefined || !this.d.market) return null;
    let total = 0;
    let products = Infinity;
    let source = "";
    for (const i of order.items) {
      const q = await this.d.market.reference({ title: i.title, currency: order.currency });
      if (!q) return null;
      total += q.referenceMinor * i.qty;
      products = Math.min(products, q.products);
      source = q.source;
    }
    return { referenceMinor: total, currency: order.currency, products, source, lines: order.items.length };
  }

  private async logBlock(mandateId: string, r: Extract<ProposeResult, { status: "blocked" }>, what: string) {
    await this.d.receipts.append({ mandateId, type: "decision", summary: `Blocked: ${what}. ${r.decision.reason}`, payload: { decision: r.decision } });
    return r;
  }

  private async run(p: Proposal, approved: boolean, passkey?: PasskeyApproval): Promise<ProposeResult> {
    const now = this.d.clock();
    const mandate = await this.d.mandates.get(p.mandateId);
    if (!mandate) return block("invalid_input", "Unknown mandate.");

    const parsedOrder = OrderSpecSchema.safeParse(p.order);
    if (!parsedOrder.success || parsedOrder.data.mandateId !== mandate.id)
      return this.logBlock(mandate.id, block("invalid_input", "The order is malformed or belongs to another mandate."), "malformed order");

    // The limits the agent obeys must be exactly the ones the user signed.
    const intentProblem = this.d.credentials.verifyIntent(mandate);
    if (intentProblem) return this.logBlock(mandate.id, block("credentials", `The rules on file don't match what you signed (${intentProblem}).`), "credentials");

    // The merchant prices, categorises and signs the cart. Nothing here comes from the agent.
    const q = await this.d.merchants.quote(p, now);
    if ("error" in q) return this.logBlock(mandate.id, block("invalid_input", `The merchant refused to quote: ${q.error}`), "no quote");
    const order = q.order;
    const amountMinor = orderTotalMinor(order);
    const market = await this.marketReference(mandate.policy, order);
    const itemTitle = order.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.title}` : i.title)).join(", ");
    const intent: Intent = {
      id: randomUUID(),
      mandateId: mandate.id,
      action: "purchase",
      amountMinor,
      currency: order.currency,
      merchantId: order.merchantId,
      merchantVerified: q.merchant.verified,
      category: q.category,
      itemTitle,
      origin: p.origin,
      ...(market ? { marketReferenceMinor: market.referenceMinor } : {}),
    };
    const spentMinor = await this.d.payments.spentMinor(mandate.id, mandate.policy.budget.period, now);
    const reservedMinor = (await this.d.permits.reservedMinor(mandate.id, now)) + (await this.d.executor.pendingMinor(mandate.id));
    const decision = evaluate(mandate, intent, { now, spentMinor, reservedMinor, approved });
    const digest = orderDigest(order);
    const money = formatMoney(amountMinor, order.currency);
    const label = { allow: "Allowed", approve: "Needs approval", block: "Blocked" }[decision.outcome];
    const cartHash = mandateHash(q.cart.contents);

    await this.d.receipts.append({
      mandateId: mandate.id,
      type: "decision",
      summary: `${label}: ${itemTitle} ${money} from ${q.merchant.name}${p.via ? ` (via ${p.via})` : ""}. ${decision.reason}`,
      payload: { intent, decision, digest, spentMinor, reservedMinor, cartId: q.cart.contents.id, cartHash, market },
    });

    if (decision.outcome === "block") return { status: "blocked", decision };

    if (decision.outcome === "approve") {
      const id = randomUUID();
      const summary = `${itemTitle} for ${money} from ${q.merchant.name}`;
      await this.d.approvals.save({
        id,
        mandateId: mandate.id,
        proposal: p,
        decision,
        summary,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + APPROVAL_TTL_MS).toISOString(),
        status: "pending",
      });
      await this.d.receipts.append({
        mandateId: mandate.id,
        type: "approval_requested",
        summary: `Asked you to approve ${summary}: ${decision.reason}`,
        payload: { approvalId: id, digest },
      });
      return { status: "pending_approval", decision, approvalId: id };
    }

    // Human-present when the user approved this cart; otherwise the gateway attests it is within the signed intent.
    const mode = approved ? "human_present" : "human_not_present";
    const pm = this.d.credentials.signPayment(mandate.intentMandate!, q.cart, mode, mandate.userId, now);
    const pmId = pm.payment_mandate_contents.payment_mandate_id;
    const fingerprint = paymentFingerprint(pm);

    // AP2 v0.2: the merchant signs the checkout; the agent (or the user, when they approved) closes the mandates.
    let ap2: Ap2PurchaseRecord | undefined;
    if (mandate.ap2) {
      const keys = this.d.credentials.ap2;
      const s = Math.floor(now.getTime() / 1000);
      const checkout = merchantCheckout(
        { id: q.cart.contents.id, merchant: { id: order.merchantId, name: q.merchant.name }, currency: order.currency, items: order.items.map((i) => ({ sku: i.sku, title: i.title, unitMinor: i.unitMinor, qty: i.qty })) },
        keys.merchant(order.merchantId),
      );
      const payee = { id: order.merchantId, name: q.merchant.name };
      const prior = (await this.d.credentialStore.list(mandate.id)).filter((r) => r.ap2?.mode === "human_not_present");
      const context = { totalAmount: spentMinor + reservedMinor, totalUses: prior.length };
      const closed = approved
        ? closeApproved(checkout, { userKey: keys.user(mandate.userId), payee, now: s })
        : closeAutonomous({ checkoutOpen: { token: mandate.ap2.checkoutOpen }, paymentOpen: { token: mandate.ap2.paymentOpen } }, checkout, { agentKey: keys.agent, payee, now: s, nonce: intent.id });
      if (!approved) {
        // Defence in depth: the payment must satisfy the user's AP2 open mandate, checked as a verifier would.
        const [openPayment, closedPayment] = verifyChain(closed.paymentChain, () => publicJwk(keys.provider), { now: s });
        const violations = checkPaymentConstraints(openPayment!, closedPayment!, { openCheckoutHash: mandate.ap2.openCheckoutHash, context });
        if (violations.length) return this.logBlock(mandate.id, block("credentials", `The purchase is outside your signed AP2 mandate: ${violations.join("; ")}`), "AP2 mandate check");
      }
      ap2 = { spec: "ap2/0.2", mode: closed.mode, checkoutJwt: checkout.jwt, checkoutChain: closed.checkoutChain, paymentChain: closed.paymentChain, context, ...(passkey ? { passkey } : {}) };
    }
    await this.d.credentialStore.put({ paymentMandateId: pmId, mandateId: mandate.id, paypalOrderId: null, cart: q.cart, payment: pm, fingerprint, createdAt: now.toISOString(), ...(ap2 ? { ap2 } : {}) });

    const permit = issuePermit({ intentId: intent.id, mandateId: mandate.id, digest, amountMinor, currency: order.currency, now }, this.d.signer);
    await this.d.permits.save(permit);
    await this.d.receipts.append({
      mandateId: mandate.id,
      type: "permit",
      summary: `Issued single-use permit for ${money} and ${mode === "human_present" ? "your signed" : "an attested"} payment mandate ${pmId}`,
      payload: { permitId: permit.id, digest, expiresAt: permit.expiresAt, paymentMandateId: pmId, mode, cartHash },
    });

    const paid = await this.d.executor.pay(permit.id, order, { note: fingerprint, paymentMandateId: pmId });
    if (paid.status === "paid" || paid.status === "awaiting_buyer") await this.d.credentialStore.attachOrder(pmId, paid.paypalOrderId);
    switch (paid.status) {
      case "paid":
        return { status: "paid", decision, paypalOrderId: paid.paypalOrderId, amountMinor, paymentMandateId: pmId };
      case "awaiting_buyer":
        return { status: "awaiting_buyer", decision, paypalOrderId: paid.paypalOrderId, approveUrl: paid.approveUrl, amountMinor, paymentMandateId: pmId };
      case "failed":
        return { status: "failed", decision, error: paid.error };
      case "refused":
        return { status: "failed", decision, error: `Executor refused: ${paid.reason}` };
    }
  }
}
