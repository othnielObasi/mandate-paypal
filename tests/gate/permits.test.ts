import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canonicalJson, orderDigest, type OrderSpec } from "@/lib/gate/canonical";
import { generateSigner } from "@/lib/gate/keys";
import { issuePermit, verifyPermit, MemoryPermitStore } from "@/lib/gate/permits";

const order: OrderSpec = {
  mandateId: "m1",
  merchantId: "acme-supplies",
  currency: "GBP",
  items: [{ sku: "wul-500", title: "Washing-up liquid", unitMinor: 450, qty: 1 }],
};

const now = new Date("2026-10-21T10:00:00Z");

describe("canonical JSON and order digests", () => {
  it("is independent of key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it("gives the same digest for the same order, and a different one for any change", () => {
    expect(orderDigest(order)).toBe(orderDigest({ ...order, items: [...order.items] }));
    expect(orderDigest(order)).not.toBe(orderDigest({ ...order, merchantId: "other" }));
    expect(orderDigest(order)).not.toBe(orderDigest({ ...order, items: [{ ...order.items[0]!, unitMinor: 451 }] }));
    expect(orderDigest(order)).not.toBe(orderDigest({ ...order, items: [{ ...order.items[0]!, qty: 2 }] }));
  });

  it("rejects non-finite numbers rather than silently serialising them", () => {
    expect(() => canonicalJson({ a: Number.NaN })).toThrow();
    expect(() => canonicalJson({ a: Number.POSITIVE_INFINITY })).toThrow();
  });

  it("produces a 64-char hex SHA-256", () => {
    expect(orderDigest(order)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("execution permits", () => {
  const signer = generateSigner();
  const digest = orderDigest(order);
  const base = { intentId: "i1", mandateId: "m1", digest, amountMinor: 450, currency: "GBP" as const, now };

  it("verifies a fresh permit for the exact order", () => {
    const p = issuePermit(base, signer);
    expect(verifyPermit(p, { digest, now, publicKey: signer.publicKey })).toEqual({ ok: true });
  });

  it("expires after five minutes by default", () => {
    const p = issuePermit(base, signer);
    const later = new Date(now.getTime() + 5 * 60_000 + 1);
    expect(verifyPermit(p, { digest, now: later, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a permit used for a different order", () => {
    const p = issuePermit(base, signer);
    const other = orderDigest({ ...order, merchantId: "other" });
    expect(verifyPermit(p, { digest: other, now, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "digest_mismatch" });
  });

  it("rejects a permit whose amount or digest was edited after signing", () => {
    const p = issuePermit(base, signer);
    expect(verifyPermit({ ...p, amountMinor: 45000 }, { digest, now, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "bad_signature" });
    const tamperedDigest = orderDigest({ ...order, merchantId: "evil" });
    expect(verifyPermit({ ...p, digest: tamperedDigest }, { digest: tamperedDigest, now, publicKey: signer.publicKey })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a permit signed by a different key", () => {
    const p = issuePermit(base, generateSigner());
    expect(verifyPermit(p, { digest, now, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a permit issued in the future (clock tampering)", () => {
    const p = issuePermit({ ...base, now: new Date(now.getTime() + 60_000) }, signer);
    expect(verifyPermit(p, { digest, now, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "not_yet_valid" });
  });

  it("rejects malformed permits without throwing", () => {
    expect(verifyPermit({} as never, { digest, now, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "malformed" });
    expect(verifyPermit(null as never, { digest, now, publicKey: signer.publicKey })).toEqual({ ok: false, reason: "malformed" });
  });

  it("gives every permit a unique id and nonce", () => {
    const a = issuePermit(base, signer);
    const b = issuePermit(base, signer);
    expect(a.id).not.toBe(b.id);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it("property: any single-field edit breaks the signature", () => {
    const p = issuePermit(base, signer);
    fc.assert(
      fc.property(
        fc.constantFrom("intentId", "mandateId", "currency", "issuedAt", "expiresAt", "nonce", "id"),
        fc.string({ minLength: 1 }),
        (field, value) => {
          const edited = { ...p, [field]: value };
          fc.pre((edited as Record<string, unknown>)[field] !== (p as unknown as Record<string, unknown>)[field]);
          const r = verifyPermit(edited, { digest, now, publicKey: signer.publicKey });
          expect(r.ok).toBe(false);
        },
      ),
    );
  });
});

describe("permit store: single use", () => {
  it("consumes a permit exactly once", async () => {
    const store = new MemoryPermitStore();
    const signer = generateSigner();
    const p = issuePermit({ intentId: "i1", mandateId: "m1", digest: "d".repeat(64), amountMinor: 100, currency: "GBP", now }, signer);
    await store.save(p);
    expect(await store.consume(p.id)).toBe(true);
    expect(await store.consume(p.id)).toBe(false);
  });

  it("refuses to consume an unknown permit", async () => {
    expect(await new MemoryPermitStore().consume("nope")).toBe(false);
  });

  it("only one of many concurrent consumers wins", async () => {
    const store = new MemoryPermitStore();
    const p = issuePermit({ intentId: "i1", mandateId: "m1", digest: "d".repeat(64), amountMinor: 100, currency: "GBP", now }, generateSigner());
    await store.save(p);
    const results = await Promise.all(Array.from({ length: 25 }, () => store.consume(p.id)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("reports money held by unused, unexpired permits and by payments still in flight", async () => {
    const store = new MemoryPermitStore();
    const s = generateSigner();
    const mk = (amountMinor: number, mandateId = "m1", at = now) =>
      issuePermit({ intentId: "i", mandateId, digest: "d".repeat(64), amountMinor, currency: "GBP", now: at }, s);
    const used = mk(300);
    const expired = mk(700, "m1", new Date(now.getTime() - 10 * 60_000));
    await store.save(mk(100));
    await store.save(mk(200));
    await store.save(used);
    await store.save(expired);
    await store.save(mk(999, "m2"));
    await store.consume(used.id);
    // 100 + 200 unused, plus 300 used but not yet settled; the expired one and m2's are not counted.
    expect(await store.reservedMinor("m1", now)).toBe(600);
    await store.close(used.id);
    expect(await store.reservedMinor("m1", now)).toBe(300);
  });
});
