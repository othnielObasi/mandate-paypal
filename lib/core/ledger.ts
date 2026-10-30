import type { PermitStore } from "../gate/permits";
import type { PaymentRecord, PaymentStore, Period } from "./spend";

/**
 * The budget's money, read and moved consistently. Spent and reserved come
 * from one snapshot, and settling a payment records it and releases its
 * permit in one step, so money is never counted twice or missed while it
 * moves from "reserved" to "spent".
 */
export interface BudgetLedger {
  committed(mandateId: string, period: Period, at: Date): Promise<{ spentMinor: number; reservedMinor: number }>;
  settle(p: PaymentRecord, permitId: string | null): Promise<void>;
}

/**
 * In memory. The two stores' methods do their work synchronously when called,
 * so starting both before awaiting either gives one consistent view.
 */
export class MemoryLedger implements BudgetLedger {
  constructor(
    private payments: PaymentStore,
    private permits: PermitStore,
  ) {}
  async committed(mandateId: string, period: Period, at: Date) {
    const [spentMinor, reservedMinor] = await Promise.all([this.payments.spentMinor(mandateId, period, at), this.permits.reservedMinor(mandateId, at)]);
    return { spentMinor, reservedMinor };
  }
  async settle(p: PaymentRecord, permitId: string | null) {
    const done = [this.payments.record(p), permitId ? this.permits.close(permitId) : Promise.resolve()];
    await Promise.all(done);
  }
}

/** Fallback when only the two stores are known (unit tests building a Governor by hand). */
export const ledgerOf = (payments: PaymentStore, permits: PermitStore): BudgetLedger => new MemoryLedger(payments, permits);

