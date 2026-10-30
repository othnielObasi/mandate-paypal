import type { Ap2PurchaseRecord } from "../ap2v2/records";
import type { CartMandate, PaymentMandate } from "./mandates";

export interface CredentialRecord {
  paymentMandateId: string;
  mandateId: string;
  paypalOrderId: string | null;
  cart: CartMandate;
  payment: PaymentMandate;
  fingerprint: string;
  createdAt: string;
  /** AP2 v0.2 evidence for the same purchase: merchant checkout, closed mandates, receipts. */
  ap2?: Ap2PurchaseRecord;
}

export interface CredentialStore {
  put(r: CredentialRecord): Promise<void>;
  attachOrder(paymentMandateId: string, paypalOrderId: string): Promise<void>;
  getByOrder(paypalOrderId: string): Promise<CredentialRecord | undefined>;
  list(mandateId?: string): Promise<CredentialRecord[]>;
  /** Replace the AP2 v0.2 evidence on a record (e.g. to add receipts after capture). */
  setAp2(paymentMandateId: string, ap2: Ap2PurchaseRecord): Promise<void>;
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
  async setAp2(id: string, ap2: Ap2PurchaseRecord) {
    const r = this.rows.get(id);
    if (!r) throw new Error("payment mandate not found");
    r.ap2 = structuredClone(ap2);
  }
}
