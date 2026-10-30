import { describe, it, expect } from "vitest";
import * as node from "node:crypto";
import { b64url, b64urlDecode, deriveEs256, generateEs256, jwkThumbprint, publicJwk, signJws, verifyJws, decodeJws, importPublicJwk } from "@/lib/ap2v2/es256";

describe("ES256 keys and compact JWS", () => {
  it("signs a JWS that Node's own crypto verifies (IEEE P1363 r||s)", () => {
    const k = generateEs256("agent-1");
    const jws = signJws({ alg: "ES256", typ: "JWT", kid: k.kid }, { hello: "world" }, k);
    const [h, p, s] = jws.split(".");
    const pub = node.createPublicKey({ key: publicJwk(k) as node.JsonWebKey, format: "jwk" });
    const ok = node.verify("sha256", Buffer.from(`${h}.${p}`), { key: pub, dsaEncoding: "ieee-p1363" }, b64urlDecode(s!));
    expect(ok).toBe(true);
    expect(decodeJws(jws).header).toMatchObject({ alg: "ES256", kid: "agent-1" });
  });

  it("verifies a JWS made by Node's crypto, and rejects tampering", () => {
    const { privateKey, publicKey } = node.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const h = b64url(JSON.stringify({ alg: "ES256" }));
    const p = b64url(JSON.stringify({ a: 1 }));
    const sig = node.sign("sha256", Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
    const jwk = importPublicJwk(publicKey.export({ format: "jwk" }) as Record<string, string>);
    expect(verifyJws(`${h}.${p}.${b64url(sig)}`, jwk)).toBe(true);
    const bad = b64url(JSON.stringify({ a: 2 }));
    expect(verifyJws(`${h}.${bad}.${b64url(sig)}`, jwk)).toBe(false);
    expect(verifyJws(`${h}.${p}`, jwk)).toBe(false);
  });

  it("rejects any algorithm other than ES256", () => {
    const k = generateEs256();
    const jws = signJws({ alg: "ES256" }, { a: 1 }, k);
    const [, p, s] = jws.split(".");
    expect(verifyJws(`${b64url(JSON.stringify({ alg: "none" }))}.${p}.${s}`, publicJwk(k))).toBe(false);
  });

  it("derives the same key from the same seed and label, different keys for different labels", () => {
    const seed = new Uint8Array(32).fill(7);
    expect(publicJwk(deriveEs256(seed, "merchant:acme"))).toEqual(publicJwk(deriveEs256(seed, "merchant:acme")));
    expect(publicJwk(deriveEs256(seed, "merchant:acme")).x).not.toBe(publicJwk(deriveEs256(seed, "merchant:other")).x);
  });

  it("computes the RFC 7638 thumbprint the same way Node does", () => {
    const k = generateEs256();
    const jwk = publicJwk(k);
    const expected = node.createHash("sha256").update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).digest("base64url");
    expect(jwkThumbprint(jwk)).toBe(expected);
  });
});
