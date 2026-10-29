import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { signJws, verifyJws, decodeJws } from "@/lib/ap2/jws";
import { deriveSigner, kidOf } from "@/lib/ap2/keys";
import { generateSigner } from "@/lib/gate/keys";

describe("compact JWS (EdDSA / Ed25519)", () => {
  const s = generateSigner();

  it("round-trips a payload and exposes alg and kid", () => {
    const t = signJws({ b: 1, a: "x" }, s);
    expect(t.split(".")).toHaveLength(3);
    const d = decodeJws(t);
    expect(d.header).toMatchObject({ alg: "EdDSA", kid: kidOf(s.publicKey) });
    expect(verifyJws(t, s.publicKey)).toEqual({ ok: true, payload: { a: "x", b: 1 } });
  });

  it("signs the canonical form, so key order does not matter", () => {
    expect(verifyJws(signJws({ a: 1, b: 2 }, s), s.publicKey)).toEqual(verifyJws(signJws({ b: 2, a: 1 }, s), s.publicKey));
  });

  it("rejects a token signed by another key", () => {
    expect(verifyJws(signJws({ a: 1 }, generateSigner()), s.publicKey)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects an edited payload", () => {
    const [h, , sig] = signJws({ amount: 450 }, s).split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ amount: 1 })).toString("base64url")}.${sig}`;
    expect(verifyJws(forged, s.publicKey)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects alg other than EdDSA (no 'none' downgrade)", () => {
    const t = signJws({ a: 1 }, s);
    const [, p, sig] = t.split(".");
    const none = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    expect(verifyJws(`${none}.${p}.${sig}`, s.publicKey)).toEqual({ ok: false, reason: "bad_header" });
  });

  it("never throws on garbage", () => {
    fc.assert(
      fc.property(fc.string(), (g) => {
        expect(verifyJws(g, s.publicKey).ok).toBe(false);
      }),
    );
  });
});

describe("derived keys", () => {
  const root = generateSigner();

  it("derives the same key for the same label, different keys for different labels", () => {
    expect(deriveSigner(root, "user:u1").publicKey).toBe(deriveSigner(root, "user:u1").publicKey);
    expect(deriveSigner(root, "user:u1").publicKey).not.toBe(deriveSigner(root, "merchant:acme").publicKey);
    expect(deriveSigner(root, "user:u1").publicKey).not.toBe(root.publicKey);
  });

  it("depends on the root key", () => {
    expect(deriveSigner(root, "user:u1").publicKey).not.toBe(deriveSigner(generateSigner(), "user:u1").publicKey);
  });

  it("produces working signing keys", () => {
    const k = deriveSigner(root, "merchant:acme");
    expect(verifyJws(signJws({ a: 1 }, k), k.publicKey).ok).toBe(true);
  });

  it("key ids are short, stable fingerprints", () => {
    expect(kidOf(root.publicKey)).toMatch(/^ed25519:[0-9a-f]{16}$/);
    expect(kidOf(root.publicKey)).toBe(kidOf(root.publicKey));
  });
});
