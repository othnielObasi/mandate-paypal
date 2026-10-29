import type { CartMandate, PaymentMandate } from "./mandates";

export interface CredentialRecord {
  paymentMandateId: string;
  mandateId: string;
  paypalOrderId: string | null;
  cart: CartMandate;
  payment: PaymentMandate;
  fingerprint: string;
  createdAt: string;
}

export interface CredentialStore {
  put(r: CredentialRecord): Promise<void>;
  attachOrder(paymentMandateId: string, paypalOrderId: string): Promise<void>;
  getByOrder(paypalOrderId: string): Promise<CredentialRecord | undefined>;
  list(mandateId?: string): Promise<CredentialRecord[]>;
}

export class MemoryCredentialStore implements CredentialStore {
  private rows = new Map<string, CredentialRecord>();
  async put(r: CredentialRecord) {
    if (this.rows.has(r.paymentMandateId)) throw new Error("payment mandate already stored");
    this.rows.set(r.paymentMandateId, structuredClone(r));
  }
  async attachOrder(id: string, paypalOrderId: string) {
    const r = this.rows.get(id);
    if (!r) throw new Error("payment mandate not found");
    r.paypalOrderId = paypalOrderId;
  }
  async getByOrder(paypalOrderId: string) {
    for (const r of this.rows.values()) if (r.paypalOrderId === paypalOrderId) return structuredClone(r);
    return undefined;
  }
  async list(mandateId?: string) {
    return [...this.rows.values()].filter((r) => !mandateId || r.mandateId === mandateId).map((r) => structuredClone(r));
  }
}
