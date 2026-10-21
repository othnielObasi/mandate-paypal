import { randomUUID, randomBytes } from "node:crypto";
import { z } from "zod";
import { canonicalJson } from "./canonical";
import { signText, verifyText, type Signer } from "./keys";
import { CURRENCIES, type Currency } from "./policy";

export const PERMIT_TTL_MS = 5 * 60_000;
const CLOCK_SKEW_MS = 5_000;

export interface Permit {
  id: string;
  intentId: string;
  mandateId: string;
  /** SHA-256 of the canonical order this permit pays for. */
  digest: string;
  amountMinor: number;
  currency: Currency;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  signature: string;
}

const PermitSchema = z.object({
  id: z.string().min(1),
  intentId: z.string().min(1),
  mandateId: z.string().min(1),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
  amountMinor: z.number().int().positive(),
  currency: z.enum(CURRENCIES),
  issuedAt: z.string(),
  expiresAt: z.string(),
  nonce: z.string().min(1),
  signature: z.string().min(1),
});

export interface IssueInput {
  intentId: string;
  mandateId: string;
  digest: string;
  amountMinor: number;
  currency: Currency;
  now: Date;
  ttlMs?: number;
}

const unsignedBody = (p: Omit<Permit, "signature">) =>
  canonicalJson({
    id: p.id,
    intentId: p.intentId,
    mandateId: p.mandateId,
    digest: p.digest,
    amountMinor: p.amountMinor,
    currency: p.currency,
    issuedAt: p.issuedAt,
    expiresAt: p.expiresAt,
    nonce: p.nonce,
  });

export function issuePermit(input: IssueInput, signer: Signer): Permit {
  const body: Omit<Permit, "signature"> = {
    id: randomUUID(),
    intentId: input.intentId,
    mandateId: input.mandateId,
    digest: input.digest,
    amountMinor: input.amountMinor,
    currency: input.currency,
    issuedAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + (input.ttlMs ?? PERMIT_TTL_MS)).toISOString(),
    nonce: randomBytes(16).toString("hex"),
  };
  return { ...body, signature: signText(unsignedBody(body), signer) };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "malformed" | "bad_signature" | "not_yet_valid" | "expired" | "digest_mismatch" };

export function verifyPermit(permit: Permit, opts: { digest: string; now: Date; publicKey: string }): VerifyResult {
  const parsed = PermitSchema.safeParse(permit);
  if (!parsed.success) return { ok: false, reason: "malformed" };
  const p = parsed.data;
  const { signature, ...body } = p;
  if (!verifyText(unsignedBody(body), signature, opts.publicKey)) return { ok: false, reason: "bad_signature" };

  const issued = Date.parse(p.issuedAt);
  const expires = Date.parse(p.expiresAt);
  if (Number.isNaN(issued) || Number.isNaN(expires)) return { ok: false, reason: "malformed" };
  const t = opts.now.getTime();
  if (issued > t + CLOCK_SKEW_MS) return { ok: false, reason: "not_yet_valid" };
  if (t > expires) return { ok: false, reason: "expired" };
  if (p.digest !== opts.digest) return { ok: false, reason: "digest_mismatch" };
  return { ok: true };
}

/** Single-use enforcement. A Postgres implementation uses UPDATE ... WHERE used_at IS NULL. */
export interface PermitStore {
  save(p: Permit): Promise<void>;
  get(id: string): Promise<Permit | undefined>;
  /** Atomically mark used. True only for the first caller. */
  consume(id: string): Promise<boolean>;
  /** Money held by unused, unexpired permits for a mandate. */
  reservedMinor(mandateId: string, now: Date): Promise<number>;
}

export class MemoryPermitStore implements PermitStore {
  private rows = new Map<string, { permit: Permit; used: boolean }>();

  async save(p: Permit) {
    if (this.rows.has(p.id)) throw new Error("permit id already exists");
    this.rows.set(p.id, { permit: p, used: false });
  }

  async get(id: string) {
    return this.rows.get(id)?.permit;
  }

  async consume(id: string) {
    const row = this.rows.get(id);
    if (!row || row.used) return false;
    row.used = true; // synchronous check-and-set: atomic on the JS event loop
    return true;
  }

  async reservedMinor(mandateId: string, now: Date) {
    let sum = 0;
    for (const { permit, used } of this.rows.values()) {
      if (!used && permit.mandateId === mandateId && Date.parse(permit.expiresAt) >= now.getTime()) sum += permit.amountMinor;
    }
    return sum;
  }
}
