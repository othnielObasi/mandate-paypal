import type { IntentMandate } from "../ap2/mandates";
import type { OrderSpec } from "../gate/canonical";
import type { Decision, Intent, Mandate, MandateStatus } from "../gate/types";

export interface MandateRecord extends Mandate {
  rawText: string;
  createdAt: string;
  /** AP2-style Intent Mandate: the user's signature over these exact limits. */
  intentMandate?: IntentMandate;
}

export interface MandateStore {
  save(m: MandateRecord): Promise<void>;
  get(id: string): Promise<MandateRecord | undefined>;
  list(userId?: string): Promise<MandateRecord[]>;
  setStatus(id: string, status: MandateStatus): Promise<void>;
}

export class MemoryMandateStore implements MandateStore {
  private rows = new Map<string, MandateRecord>();
  async save(m: MandateRecord) {
    this.rows.set(m.id, structuredClone(m));
  }
  async get(id: string) {
    const m = this.rows.get(id);
    return m ? structuredClone(m) : undefined;
  }
  async list(userId?: string) {
    return [...this.rows.values()].filter((m) => !userId || m.userId === userId).map((m) => structuredClone(m));
  }
  async setStatus(id: string, status: MandateStatus) {
    const m = this.rows.get(id);
    if (!m) throw new Error("mandate not found");
    m.status = status;
  }
}

export interface Proposal {
  mandateId: string;
  order: OrderSpec;
  category: string;
  merchantVerified: boolean;
  origin: Intent["origin"];
}

export type ApprovalStatus = "pending" | "approved" | "declined" | "expired";

export interface ApprovalRecord {
  id: string;
  mandateId: string;
  proposal: Proposal;
  decision: Decision;
  summary: string;
  createdAt: string;
  expiresAt: string;
  status: ApprovalStatus;
}

export interface ApprovalStore {
  save(a: ApprovalRecord): Promise<void>;
  get(id: string): Promise<ApprovalRecord | undefined>;
  list(mandateId?: string): Promise<ApprovalRecord[]>;
  /** Atomic compare-and-set. True only if the record was in `from`. */
  transition(id: string, from: ApprovalStatus, to: ApprovalStatus): Promise<boolean>;
}

export class MemoryApprovalStore implements ApprovalStore {
  private rows = new Map<string, ApprovalRecord>();
  async save(a: ApprovalRecord) {
    this.rows.set(a.id, structuredClone(a));
  }
  async get(id: string) {
    const a = this.rows.get(id);
    return a ? structuredClone(a) : undefined;
  }
  async list(mandateId?: string) {
    return [...this.rows.values()].filter((a) => !mandateId || a.mandateId === mandateId).map((a) => structuredClone(a));
  }
  async transition(id: string, from: ApprovalStatus, to: ApprovalStatus) {
    const a = this.rows.get(id);
    if (!a || a.status !== from) return false;
    a.status = to;
    return true;
  }
}
