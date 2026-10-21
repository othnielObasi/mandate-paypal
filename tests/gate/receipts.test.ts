import { describe, it, expect } from "vitest";
import { generateSigner } from "@/lib/gate/keys";
import { ReceiptLog, verifyChain, GENESIS_HASH, type Receipt } from "@/lib/gate/receipts";

let clock = Date.parse("2026-10-21T10:00:00Z");
const tick = () => new Date((clock += 1000));

async function seeded() {
  const signer = generateSigner();
  const log = new ReceiptLog(signer, tick);
  await log.append({ mandateId: "m1", type: "decision", summary: "Allowed: Washing-up liquid £4.50", payload: { outcome: "allow" } });
  await log.append({ mandateId: "m1", type: "payment", summary: "Paid £4.50 to acme-supplies", payload: { paypalOrderId: "5O1" } });
  await log.append({ mandateId: "m1", type: "decision", summary: "Blocked: gift card", payload: { outcome: "block" } });
  return { signer, log, receipts: await log.list() };
}

describe("receipt log", () => {
  it("numbers receipts and links each to the previous hash", async () => {
    const { receipts } = await seeded();
    expect(receipts.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(receipts[0]!.prevHash).toBe(GENESIS_HASH);
    expect(receipts[1]!.prevHash).toBe(receipts[0]!.hash);
    expect(receipts[2]!.prevHash).toBe(receipts[1]!.hash);
  });

  it("verifies an untouched chain", async () => {
    const { receipts, signer } = await seeded();
    expect(verifyChain(receipts, signer.publicKey)).toEqual({ ok: true, count: 3 });
  });

  it("verifies an empty chain", () => {
    expect(verifyChain([], generateSigner().publicKey)).toEqual({ ok: true, count: 0 });
  });

  it("detects an edited summary and names the row", async () => {
    const { receipts, signer } = await seeded();
    const tampered = receipts.map((r) => (r.seq === 2 ? { ...r, summary: "Paid £0.01 to acme-supplies" } : r));
    expect(verifyChain(tampered, signer.publicKey)).toMatchObject({ ok: false, brokenAt: 2, reason: "hash_mismatch" });
  });

  it("detects an edited payload", async () => {
    const { receipts, signer } = await seeded();
    const tampered = receipts.map((r) => (r.seq === 1 ? { ...r, payloadHash: "0".repeat(64) } : r));
    expect(verifyChain(tampered, signer.publicKey)).toMatchObject({ ok: false, brokenAt: 1 });
  });

  it("detects a deleted row", async () => {
    const { receipts, signer } = await seeded();
    expect(verifyChain([receipts[0]!, receipts[2]!], signer.publicKey)).toMatchObject({ ok: false, brokenAt: 3 });
  });

  it("detects reordering", async () => {
    const { receipts, signer } = await seeded();
    expect(verifyChain([receipts[1]!, receipts[0]!, receipts[2]!], signer.publicKey)).toMatchObject({ ok: false, brokenAt: 2 });
  });

  it("detects a re-hashed row that was not re-signed", async () => {
    const { receipts, signer } = await seeded();
    // An attacker recomputes the hash after editing but cannot sign it.
    const forged: Receipt = { ...receipts[2]!, summary: "Allowed: gift card" };
    const { hashReceipt } = await import("@/lib/gate/receipts");
    forged.hash = hashReceipt(forged);
    expect(verifyChain([receipts[0]!, receipts[1]!, forged], signer.publicKey)).toMatchObject({
      ok: false,
      brokenAt: 3,
      reason: "bad_signature",
    });
  });

  it("rejects a chain checked against the wrong public key", async () => {
    const { receipts } = await seeded();
    expect(verifyChain(receipts, generateSigner().publicKey)).toMatchObject({ ok: false, brokenAt: 1, reason: "bad_signature" });
  });

  it("serialises concurrent appends into one unbroken chain", async () => {
    const signer = generateSigner();
    const log = new ReceiptLog(signer, tick);
    await Promise.all(
      Array.from({ length: 30 }, (_, i) => log.append({ mandateId: "m1", type: "decision", summary: `r${i}`, payload: { i } })),
    );
    const all = await log.list();
    expect(all.map((r) => r.seq)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(verifyChain(all, signer.publicKey)).toEqual({ ok: true, count: 30 });
  });

  it("filters by mandate without breaking whole-log verification", async () => {
    const signer = generateSigner();
    const log = new ReceiptLog(signer, tick);
    await log.append({ mandateId: "m1", type: "decision", summary: "a", payload: {} });
    await log.append({ mandateId: "m2", type: "decision", summary: "b", payload: {} });
    expect((await log.list("m1")).map((r) => r.summary)).toEqual(["a"]);
    expect(verifyChain(await log.list(), signer.publicKey).ok).toBe(true);
  });
});
