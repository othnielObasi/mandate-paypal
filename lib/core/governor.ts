import { randomUUID } from "node:crypto";
import type { Credentials } from "../ap2/credentials";
import { mandateHash, paymentFingerprint } from "../ap2/mandates";
import type { CredentialStore } from "../ap2/store";
import { orderDigest, orderTotalMinor } from "../gate/canonical";
import { evaluate } from "../gate/evaluate";
import type { Signer } from "../gate/keys";
import { issuePermit, type PermitStore } from "../gate/permits";
import { formatMoney, parsePolicy, type Policy } from "../gate/policy";
import type { ReceiptLog } from "../gate/receipts";
import type { Decision, Intent, MandateStatus } from "../gate/types";
import type { Merchants } from "../merchant/merchants";
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
}

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
    const m: MandateRecord = { ...base, intentMandate: this.d.credentials.signIntent(base, now) };
    await this.d.mandates.save(m);
    const p = m.policy;
    await this.d.receipts.append({
      mandateId: m.id,
      type: "mandate",
      summary: `Mandate created and signed: ${p.categories.join(", ")}; up to ${formatMoney(p.maxItemMinor, p.currency)} per item, ${formatMoney(p.budget.amountMinor, p.currency)} per ${p.budget.period}`,
      payload: { policy: p, rawText: input.rawText, intentMandateHash: mandateHash(m.intentMandate!.contents) },
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

  async decide(approvalId: string, choice: "approve" | "decline"): Promise<ProposeResult> {
    const a = await this.d.approvals.get(approvalId);
    if (!a) throw new Error("Approval not found.");
    if (a.status !== "pending") throw new Error(`Approval already ${a.status}.`);
    if (this.d.clock().getTime() > Date.parse(a.expiresAt)) {
      await this.d.approvals.transition(approvalId, "pending", "expired");
      throw new Error("Approval expired.");
    }
    const to = choice === "approve" ? "approved" : "declined";
    if (!(await this.d.approvals.transition(approvalId, "pending", to))) throw new Error("Approval already decided.");
    await this.d.receipts.append({
      mandateId: a.mandateId,
      type: "approval_decided",
      summary: `You ${to} ${a.summary}`,
      payload: { approvalId, choice },
    });
    if (choice === "decline") return { status: "declined" };
    return this.run(a.proposal, true);
  }

  private async logBlock(mandateId: string, r: Extract<ProposeResult, { status: "blocked" }>, what: string) {
    await this.d.receipts.append({ mandateId, type: "decision", summary: `Blocked: ${what}. ${r.decision.reason}`, payload: { decision: r.decision } });
    return r;
  }

  private async run(p: Proposal, approved: boolean): Promise<ProposeResult> {
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
      payload: { intent, decision, digest, spentMinor, reservedMinor, cartId: q.cart.contents.id, cartHash },
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
    await this.d.credentialStore.put({ paymentMandateId: pmId, mandateId: mandate.id, paypalOrderId: null, cart: q.cart, payment: pm, fingerprint, createdAt: now.toISOString() });

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
