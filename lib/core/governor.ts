import { randomUUID } from "node:crypto";
import { orderDigest, orderTotalMinor } from "../gate/canonical";
import { evaluate } from "../gate/evaluate";
import type { Signer } from "../gate/keys";
import { issuePermit, type PermitStore } from "../gate/permits";
import { formatMoney, parsePolicy, type Policy } from "../gate/policy";
import type { ReceiptLog } from "../gate/receipts";
import type { Decision, Intent, MandateStatus } from "../gate/types";
import { OrderSpecSchema, type Executor } from "./executor";
import type { PaymentStore } from "./spend";
import type { ApprovalStore, MandateRecord, MandateStore, Proposal } from "./stores";

export const APPROVAL_TTL_MS = 15 * 60_000;

export type ProposeResult =
  | { status: "paid"; decision: Decision; paypalOrderId: string; amountMinor: number }
  | { status: "awaiting_buyer"; decision: Decision; paypalOrderId: string; approveUrl: string; amountMinor: number }
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
}

const blocked = (reason: string): Extract<ProposeResult, { status: "blocked" }> => ({
  status: "blocked",
  decision: { outcome: "block", rule: "invalid_input", reason },
});

/** Orchestrates: proposal → gate → (approval) → permit → executor, logging every step. */
export class Governor {
  constructor(private d: Deps) {}

  async createMandate(input: { userId: string; policy: Policy; rawText: string }): Promise<MandateRecord> {
    const parsed = parsePolicy(input.policy);
    if (!parsed.ok) throw new Error(`Invalid policy: ${parsed.error}`);
    const m: MandateRecord = {
      id: randomUUID(),
      userId: input.userId,
      policy: parsed.value,
      status: "active",
      rawText: input.rawText,
      createdAt: this.d.clock().toISOString(),
    };
    await this.d.mandates.save(m);
    const p = m.policy;
    await this.d.receipts.append({
      mandateId: m.id,
      type: "mandate",
      summary: `Mandate created: ${p.categories.join(", ")}; up to ${formatMoney(p.maxItemMinor, p.currency)} per item, ${formatMoney(p.budget.amountMinor, p.currency)} per ${p.budget.period}`,
      payload: { policy: p, rawText: input.rawText },
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

  private async run(p: Proposal, approved: boolean): Promise<ProposeResult> {
    const now = this.d.clock();
    const mandate = await this.d.mandates.get(p.mandateId);
    if (!mandate) return blocked("Unknown mandate.");

    const parsedOrder = OrderSpecSchema.safeParse(p.order);
    if (!parsedOrder.success || parsedOrder.data.mandateId !== mandate.id) {
      const r = blocked("The order is malformed or belongs to another mandate.");
      await this.d.receipts.append({ mandateId: mandate.id, type: "decision", summary: "Blocked: malformed order", payload: { decision: r.decision } });
      return r;
    }
    const order = parsedOrder.data;
    const amountMinor = orderTotalMinor(order);
    const itemTitle = order.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.title}` : i.title)).join(", ");
    const intent: Intent = {
      id: randomUUID(),
      mandateId: mandate.id,
      action: "purchase",
      amountMinor,
      currency: order.currency,
      merchantId: order.merchantId,
      merchantVerified: p.merchantVerified,
      category: p.category,
      itemTitle,
      origin: p.origin,
    };
    const spentMinor = await this.d.payments.spentMinor(mandate.id, mandate.policy.budget.period, now);
    const reservedMinor = (await this.d.permits.reservedMinor(mandate.id, now)) + (await this.d.executor.pendingMinor(mandate.id));
    const decision = evaluate(mandate, intent, { now, spentMinor, reservedMinor, approved });
    const digest = orderDigest(order);
    const money = formatMoney(amountMinor, order.currency);
    const label = { allow: "Allowed", approve: "Needs approval", block: "Blocked" }[decision.outcome];

    await this.d.receipts.append({
      mandateId: mandate.id,
      type: "decision",
      summary: `${label}: ${itemTitle} ${money} from ${order.merchantId}. ${decision.reason}`,
      payload: { intent, decision, digest, spentMinor, reservedMinor },
    });

    if (decision.outcome === "block") return { status: "blocked", decision };

    if (decision.outcome === "approve") {
      const id = randomUUID();
      const summary = `${itemTitle} for ${money} from ${order.merchantId}`;
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

    const permit = issuePermit({ intentId: intent.id, mandateId: mandate.id, digest, amountMinor, currency: order.currency, now }, this.d.signer);
    await this.d.permits.save(permit);
    await this.d.receipts.append({
      mandateId: mandate.id,
      type: "permit",
      summary: `Issued single-use permit for ${money}, valid 5 minutes`,
      payload: { permitId: permit.id, digest, expiresAt: permit.expiresAt },
    });

    const paid = await this.d.executor.pay(permit.id, order);
    switch (paid.status) {
      case "paid":
        return { status: "paid", decision, paypalOrderId: paid.paypalOrderId, amountMinor };
      case "awaiting_buyer":
        return { status: "awaiting_buyer", decision, paypalOrderId: paid.paypalOrderId, approveUrl: paid.approveUrl, amountMinor };
      case "failed":
        return { status: "failed", decision, error: paid.error };
      case "refused":
        return { status: "failed", decision, error: `Executor refused: ${paid.reason}` };
    }
  }
}
