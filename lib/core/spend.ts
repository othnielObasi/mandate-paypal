export type Period = "week" | "month";

/** Start of the budget period containing `now`, in UTC. Weeks start on Monday. */
export function periodStart(period: Period, now: Date): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "month") return new Date(Date.UTC(y, m, 1));
  const d = now.getUTCDate();
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(y, m, d - daysSinceMonday));
}

export interface PaymentRecord {
  mandateId: string;
  amountMinor: number;
  capturedAt: string;
  paypalOrderId: string;
}

export interface PaymentStore {
  record(p: PaymentRecord): Promise<void>;
  spentMinor(mandateId: string, period: Period, now: Date): Promise<number>;
  list(mandateId?: string): Promise<PaymentRecord[]>;
}

export class MemoryPaymentStore implements PaymentStore {
  private rows = new Map<string, PaymentRecord>();

  async record(p: PaymentRecord) {
    if (!this.rows.has(p.paypalOrderId)) this.rows.set(p.paypalOrderId, p);
  }

  async spentMinor(mandateId: string, period: Period, now: Date) {
    const from = periodStart(period, now).getTime();
    let sum = 0;
    for (const p of this.rows.values()) {
      const at = Date.parse(p.capturedAt);
      if (p.mandateId === mandateId && at >= from && at <= now.getTime()) sum += p.amountMinor;
    }
    return sum;
  }

  async list(mandateId?: string) {
    const all = [...this.rows.values()];
    return mandateId ? all.filter((p) => p.mandateId === mandateId) : all;
  }
}
