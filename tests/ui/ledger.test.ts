import { describe, it, expect } from "vitest";
import { kindOf, toRows, withEdits, editedSeqs, type LedgerRow } from "@/lib/ui/ledger";
import { generateSigner } from "@/lib/gate/keys";
import { ReceiptLog, verifyChain, type Receipt } from "@/lib/gate/receipts";

async function sample(): Promise<{ receipts: Receipt[]; publicKey: string }> {
  const s = generateSigner();
  const log = new ReceiptLog(s, () => new Date("2026-10-21T10:00:00Z"));
  await log.append({ mandateId: "m", type: "mandate", summary: "Mandate created", payload: {} });
  await log.append({ mandateId: "m", type: "decision", summary: "Allowed: soap", payload: { decision: { outcome: "allow" } } });
  await log.append({ mandateId: "m", type: "decision", summary: "Needs approval: kettle", payload: { decision: { outcome: "approve" } } });
  await log.append({ mandateId: "m", type: "decision", summary: "Blocked: gift card", payload: { decision: { outcome: "block" } } });
  await log.append({ mandateId: "m", type: "payment", summary: "Paid $4.50 to acme", payload: {} });
  return { receipts: await log.list(), publicKey: s.publicKey };
}

describe("ledger rows", () => {
  it("labels each receipt by what happened", async () => {
    const { receipts } = await sample();
    expect(receipts.map(kindOf)).toEqual(["mandate", "allowed", "needs approval", "blocked", "payment"]);
  });

  it("keeps every field needed to re-verify the chain", async () => {
    const { receipts, publicKey } = await sample();
    const rows = toRows(receipts);
    expect(rows[0]).toMatchObject({ seq: 1, kind: "mandate", summary: "Mandate created" });
    expect(verifyChain(withEdits(receipts, rows), publicKey).ok).toBe(true);
  });
});

describe("tamper test through grid edits", () => {
  it("an edited summary in the grid breaks verification at that row", async () => {
    const { receipts, publicKey } = await sample();
    const rows: LedgerRow[] = toRows(receipts).map((r) => (r.seq === 5 ? { ...r, summary: "Paid $0.01 to acme" } : r));
    expect(editedSeqs(receipts, rows)).toEqual([5]);
    expect(verifyChain(withEdits(receipts, rows), publicKey)).toMatchObject({ ok: false, brokenAt: 5 });
  });

  it("only the summary is taken from the grid; other columns cannot smuggle changes", async () => {
    const { receipts, publicKey } = await sample();
    const rows = toRows(receipts).map((r) => ({ ...r, kind: "payment", hash: "0".repeat(64) }) as LedgerRow);
    expect(editedSeqs(receipts, rows)).toEqual([]);
    expect(verifyChain(withEdits(receipts, rows), publicKey).ok).toBe(true);
  });

  it("ignores rows the grid sent that are not in the log", async () => {
    const { receipts } = await sample();
    const rows = [...toRows(receipts), { seq: 99, kind: "payment", summary: "x", time: "", type: "payment", hash: "" } as LedgerRow];
    expect(withEdits(receipts, rows)).toHaveLength(receipts.length);
  });
});
