import { createHash, randomBytes, randomUUID } from "node:crypto";

/** One outside AI assistant's access to one mandate. Only the token's hash is stored. */
export interface ConnectionRecord {
  id: string;
  mandateId: string;
  label: string;
  tokenHash: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface ConnectionStore {
  put(r: ConnectionRecord): Promise<void>;
  getByHash(tokenHash: string): Promise<ConnectionRecord | undefined>;
  list(mandateId: string): Promise<ConnectionRecord[]>;
  revoke(id: string, at: string): Promise<boolean>;
}

export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export function newConnection(mandateId: string, label: string, now: Date): { record: ConnectionRecord; token: string } {
  const token = `mdt_${randomBytes(32).toString("base64url")}`;
  return { token, record: { id: randomUUID(), mandateId, label, tokenHash: hashToken(token), createdAt: now.toISOString(), revokedAt: null } };
}

export class MemoryConnectionStore implements ConnectionStore {
  private rows = new Map<string, ConnectionRecord>();
  async put(r: ConnectionRecord) {
    this.rows.set(r.id, structuredClone(r));
  }
  async getByHash(h: string) {
    for (const r of this.rows.values()) if (r.tokenHash === h) return structuredClone(r);
    return undefined;
  }
  async list(mandateId: string) {
    return [...this.rows.values()].filter((r) => r.mandateId === mandateId).map((r) => structuredClone(r));
  }
  async revoke(id: string, at: string) {
    const r = this.rows.get(id);
    if (!r || r.revokedAt) return false;
    r.revokedAt = at;
    return true;
  }
}
