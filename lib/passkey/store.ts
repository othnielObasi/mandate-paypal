import type { PublicJwk } from "../ap2v2/es256";

/** A user's registered passkey: only the public half ever reaches the server. */
export interface PasskeyRecord {
  credentialId: string;
  userId: string;
  publicKey: PublicJwk;
  rpId: string;
  label: string;
  createdAt: string;
}

/**
 * Who a passkey belongs to. The hosted demo gives every visitor the same user
 * id, so passkeys are scoped to the mandate they were added under; one
 * visitor's passkey never gates another's approvals.
 */
export const passkeyOwner = (m: { id: string; userId: string }) => `${m.userId}/${m.id}`;

export interface PasskeyStore {
  add(r: PasskeyRecord): Promise<void>;
  get(credentialId: string): Promise<PasskeyRecord | undefined>;
  listForUser(userId: string): Promise<PasskeyRecord[]>;
}

export class MemoryPasskeyStore implements PasskeyStore {
  private m = new Map<string, PasskeyRecord>();
  async add(r: PasskeyRecord) {
    this.m.set(r.credentialId, structuredClone(r));
  }
  async get(id: string) {
    const r = this.m.get(id);
    return r && structuredClone(r);
  }
  async listForUser(userId: string) {
    return [...this.m.values()].filter((r) => r.userId === userId).map((r) => structuredClone(r));
  }
}
