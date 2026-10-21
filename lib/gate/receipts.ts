import { canonicalJson, sha256Hex } from "./canonical";
import { signText, verifyText, type Signer } from "./keys";

export const GENESIS_HASH = "0".repeat(64);

export type ReceiptType =
  | "mandate"
  | "decision"
  | "approval_requested"
  | "approval_decided"
  | "permit"
  | "payment"
  | "payment_pending"
  | "payment_failed"
  | "refusal"
  | "tracking"
  | "dispute";

export interface Receipt {
  seq: number;
  mandateId: string;
  type: ReceiptType;
  summary: string;
  payload: unknown;
  payloadHash: string;
  createdAt: string;
  prevHash: string;
  hash: string;
  signature: string;
}

export interface AppendInput {
  mandateId: string;
  type: ReceiptType;
  summary: string;
  payload: unknown;
}

export function hashReceipt(r: Omit<Receipt, "hash" | "signature">): string {
  return sha256Hex(
    canonicalJson({
      seq: r.seq,
      mandateId: r.mandateId,
      type: r.type,
      summary: r.summary,
      payloadHash: r.payloadHash,
      createdAt: r.createdAt,
      prevHash: r.prevHash,
    }),
  );
}

export interface ReceiptStore {
  append(r: Receipt): Promise<void>;
  last(): Promise<Receipt | undefined>;
  list(mandateId?: string): Promise<Receipt[]>;
}

export class MemoryReceiptStore implements ReceiptStore {
  private rows: Receipt[] = [];
  async append(r: Receipt) {
    if (this.rows.some((x) => x.seq === r.seq)) throw new Error(`receipt ${r.seq} already exists`);
    this.rows.push(r);
  }
  async last() {
    return this.rows.at(-1);
  }
  async list(mandateId?: string) {
    return mandateId ? this.rows.filter((r) => r.mandateId === mandateId) : [...this.rows];
  }
}

/** Append-only, hash-chained, signed log. Appends are serialised so the chain never forks. */
export class ReceiptLog {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private signer: Signer,
    private clock: () => Date = () => new Date(),
    private store: ReceiptStore = new MemoryReceiptStore(),
  ) {}

  get publicKey() {
    return this.signer.publicKey;
  }

  append(input: AppendInput): Promise<Receipt> {
    const run = async () => {
      const prev = await this.store.last();
      const body = {
        seq: (prev?.seq ?? 0) + 1,
        mandateId: input.mandateId,
        type: input.type,
        summary: input.summary,
        payload: input.payload,
        payloadHash: sha256Hex(canonicalJson(input.payload ?? null)),
        createdAt: this.clock().toISOString(),
        prevHash: prev?.hash ?? GENESIS_HASH,
      };
      const hash = hashReceipt(body);
      const receipt: Receipt = { ...body, hash, signature: signText(hash, this.signer) };
      await this.store.append(receipt);
      return receipt;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  list(mandateId?: string) {
    return this.store.list(mandateId);
  }
}

export type ChainResult =
  | { ok: true; count: number }
  | { ok: false; brokenAt: number; reason: "sequence_gap" | "chain_break" | "payload_mismatch" | "hash_mismatch" | "bad_signature" };

/** Verify the whole log, in order. Reports the first row that fails. */
export function verifyChain(receipts: Receipt[], publicKeyPem: string): ChainResult {
  let prevHash = GENESIS_HASH;
  let expectedSeq = 1;
  for (const r of receipts) {
    const fail = (reason: Exclude<ChainResult, { ok: true }>["reason"]): ChainResult => ({ ok: false, brokenAt: r.seq, reason });
    if (r.seq !== expectedSeq) return fail("sequence_gap");
    if (r.prevHash !== prevHash) return fail("chain_break");
    let payloadHash: string;
    try {
      payloadHash = sha256Hex(canonicalJson(r.payload ?? null));
    } catch {
      return fail("payload_mismatch");
    }
    if (r.payload !== undefined && payloadHash !== r.payloadHash) return fail("payload_mismatch");
    if (hashReceipt(r) !== r.hash) return fail("hash_mismatch");
    if (!verifyText(r.hash, r.signature, publicKeyPem)) return fail("bad_signature");
    prevHash = r.hash;
    expectedSeq += 1;
  }
  return { ok: true, count: receipts.length };
}
