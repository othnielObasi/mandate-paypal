import { z } from "zod";
import { orderDigest, orderTotalMinor, type OrderSpec } from "../gate/canonical";
import { verifyPermit, type PermitStore } from "../gate/permits";
import { CURRENCIES, formatMoney } from "../gate/policy";
import type { ReceiptLog } from "../gate/receipts";
import type { PaymentProvider, ReturnUrls } from "../paypal/provider";
import { ledgerOf, type BudgetLedger } from "./ledger";
import { MemoryPendingStore, type PendingStore } from "./pending";
import type { PaymentStore } from "./spend";

export const OrderSpecSchema = z.object({
  mandateId: z.string().min(1),
  merchantId: z.string().min(1),
  currency: z.enum(CURRENCIES),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        title: z.string().min(1).max(127),
        unitMinor: z.number().int().positive().max(10_000_000),
        qty: z.number().int().positive().max(100),
      }),
    )
    .min(1)
    .max(50),
});

export type PayResult =
  | { status: "paid"; paypalOrderId: string; captureId: string; amountMinor: number }
  | { status: "awaiting_buyer"; paypalOrderId: string; approveUrl: string; amountMinor: number }
  | { status: "failed"; error: string }
  | {
      status: "refused";
      reason:
        | "no_permit"
        | "invalid_order"
        | "malformed"
        | "bad_signature"
        | "not_yet_valid"
        | "expired"
        | "digest_mismatch"
        | "amount_mismatch"
        | "permit_used"
        | "unknown_order";
    };

export interface PaymentMeta {
  /** Shown on the PayPal order (item description): the payment mandate's fingerprint. */
  note?: string;
  paymentMandateId?: string;
}

export interface PaidOrder {
  paypalOrderId: string;
  paymentMandateId?: string;
  captureId: string;
  order: OrderSpec;
  amountMinor: number;
  permitId: string;
}

interface Deps {
  provider: PaymentProvider;
  permits: PermitStore;
  payments: PaymentStore;
  receipts: ReceiptLog;
  publicKey: string;
  clock: () => Date;
  urls: ReturnUrls;
  /** Called after money is captured (e.g. to ship). Failures are contained. */
  onPaid?: (p: PaidOrder) => Promise<void>;
  /** Orders waiting for buyer approval in PayPal. Defaults to memory. */
  pending?: PendingStore;
  /** Records a payment and releases its permit together. Defaults to the two stores. */
  ledger?: BudgetLedger;
}

/**
 * The only component that holds a PaymentProvider. It moves money only
 * for a stored, correctly signed, unexpired, unused permit whose digest
 * matches the exact order being paid.
 */
export class Executor {
  private pending: PendingStore;

  private ledger: BudgetLedger;
  constructor(private d: Deps) {
    this.pending = d.pending ?? new MemoryPendingStore();
    this.ledger = d.ledger ?? ledgerOf(d.payments, d.permits);
  }

  get providerName() {
    return this.d.provider.name;
  }

  /** Read back the payment-mandate note PayPal holds for an order (read-only). */
  orderNote(paypalOrderId: string): Promise<string | null> {
    return this.d.provider.getOrderNote(paypalOrderId);
  }

  pendingMinor(mandateId: string): Promise<number> {
    return this.pending.sumFor(mandateId);
  }

  async pay(permitId: string, orderIn: OrderSpec, meta: PaymentMeta = {}): Promise<PayResult> {
    const refuse = async (reason: Extract<PayResult, { status: "refused" }>["reason"]): Promise<PayResult> => {
      const mandateId = typeof orderIn?.mandateId === "string" ? orderIn.mandateId : "unknown";
      await this.d.receipts.append({ mandateId, type: "refusal", summary: `Executor refused payment: ${reason}`, payload: { permitId, reason } });
      return { status: "refused", reason };
    };

    const parsed = OrderSpecSchema.safeParse(orderIn);
    if (!parsed.success) return refuse("invalid_order");
    const order = parsed.data;

    const permit = await this.d.permits.get(permitId);
    if (!permit) return refuse("no_permit");

    const v = verifyPermit(permit, { digest: orderDigest(order), now: this.d.clock(), publicKey: this.d.publicKey });
    if (!v.ok) return refuse(v.reason);

    const total = orderTotalMinor(order);
    if (total !== permit.amountMinor || order.currency !== permit.currency) return refuse("amount_mismatch");

    if (!(await this.d.permits.consume(permit.id))) return refuse("permit_used");

    const money = formatMoney(total, order.currency);
    let paypalOrderId: string | null = null;
    try {
      const created = await this.d.provider.createOrder(order, this.d.urls, { note: meta.note });
      paypalOrderId = created.paypalOrderId;
      if (created.status === "PAYER_ACTION_REQUIRED") {
        await this.pending.put(created.paypalOrderId, { mandateId: order.mandateId, amountMinor: total, currency: order.currency, order, permitId: permit.id, paymentMandateId: meta.paymentMandateId });
        await this.d.receipts.append({
          mandateId: order.mandateId,
          type: "payment_pending",
          summary: `Awaiting buyer approval in PayPal for ${money}`,
          payload: { permitId: permit.id, paypalOrderId: created.paypalOrderId },
        });
        return { status: "awaiting_buyer", paypalOrderId: created.paypalOrderId, approveUrl: created.approveUrl, amountMinor: total };
      }
      const captured = created.status === "COMPLETED" ? created : await this.d.provider.captureOrder(created.paypalOrderId);
      await this.settle(order.mandateId, total, order.currency, captured.paypalOrderId, captured.captureId, permit.id, order.merchantId);
      await this.handOff({ paypalOrderId: captured.paypalOrderId, captureId: captured.captureId, order, amountMinor: total, permitId: permit.id, paymentMandateId: meta.paymentMandateId });
      return { status: "paid", paypalOrderId: captured.paypalOrderId, captureId: captured.captureId, amountMinor: total };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      // No PayPal order means no money can have moved: release the reservation. If an order exists,
      // the capture may still have happened, so the money stays held until it is reconciled.
      if (!paypalOrderId) await this.d.permits.close(permit.id);
      await this.d.receipts.append({
        mandateId: order.mandateId,
        type: "payment_failed",
        summary: `Payment of ${money} failed: ${error}${paypalOrderId ? " (amount held until PayPal order " + paypalOrderId + " is reconciled)" : ""}`.slice(0, 300),
        payload: { permitId: permit.id, error, paypalOrderId, held: !!paypalOrderId },
      });
      return { status: "failed", error };
    }
  }

  /** Called when the buyer returns from PayPal. Captures only orders this executor created. */
  async completeBuyerApproval(paypalOrderId: string): Promise<PayResult> {
    const p = await this.pending.claim(paypalOrderId); // atomic: only one caller gets it
    if (!p) return { status: "refused", reason: "unknown_order" };
    try {
      const captured = await this.d.provider.captureOrder(paypalOrderId);
      await this.settle(p.mandateId, p.amountMinor, p.currency, captured.paypalOrderId, captured.captureId, p.permitId, p.order.merchantId);
      await this.handOff({ paypalOrderId: captured.paypalOrderId, captureId: captured.captureId, order: p.order, amountMinor: p.amountMinor, permitId: p.permitId, paymentMandateId: p.paymentMandateId });
      return { status: "paid", paypalOrderId, captureId: captured.captureId, amountMinor: p.amountMinor };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await this.d.receipts.append({ mandateId: p.mandateId, type: "payment_failed", summary: `Capture failed: ${error}`.slice(0, 300), payload: { paypalOrderId, error } });
      return { status: "failed", error };
    }
  }

  /** Buyer cancelled in PayPal: release the reservation. */
  async cancelBuyerApproval(paypalOrderId: string): Promise<boolean> {
    const p = await this.pending.claim(paypalOrderId);
    if (!p) return false;
    if (p.permitId) await this.d.permits.close(p.permitId);
    await this.d.receipts.append({ mandateId: p.mandateId, type: "payment_failed", summary: "Buyer cancelled in PayPal", payload: { paypalOrderId } });
    return true;
  }

  private async handOff(p: PaidOrder) {
    if (!this.d.onPaid) return;
    try {
      await this.d.onPaid(p);
    } catch (e) {
      console.error("onPaid hook failed", e);
    }
  }

  private async settle(
    mandateId: string,
    amountMinor: number,
    currency: OrderSpec["currency"],
    paypalOrderId: string,
    captureId: string,
    permitId: string | null,
    merchantId: string | null,
  ) {
    const capturedAt = this.d.clock().toISOString();
    // Counted as spent and no longer held as reserved, in one step.
    await this.ledger.settle({ mandateId, amountMinor, capturedAt, paypalOrderId }, permitId);
    await this.d.receipts.append({
      mandateId,
      type: "payment",
      summary: `Paid ${formatMoney(amountMinor, currency)}${merchantId ? ` to ${merchantId}` : ""} via ${this.d.provider.name}`,
      payload: { permitId, paypalOrderId, captureId, provider: this.d.provider.name },
    });
  }
}
