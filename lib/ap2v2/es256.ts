/**
 * ES256 (ECDSA P-256 + SHA-256) keys and compact JWS, as AP2 v0.2 requires.
 * Pure JavaScript (@noble), so it runs unchanged on the server and in the
 * browser. Signatures use the JOSE encoding: 64 bytes, r || s.
 */
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";

export interface Es256Key {
  /** 32-byte private scalar. Never leaves the process that made it. */
  readonly d: Uint8Array;
  readonly kid?: string;
}

export interface PublicJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  kid?: string;
  [k: string]: unknown;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("invalid base64url");
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const b64urlJson = (s: string): unknown => JSON.parse(dec.decode(b64urlDecode(s)));
export const sha256b64url = (s: string): string => b64url(sha256(enc.encode(s)));

export function generateEs256(kid?: string): Es256Key {
  return { d: p256.utils.randomPrivateKey(), kid };
}

/** A stable P-256 key from a secret seed and a label (HKDF-SHA256, reduced into [1, n-1]). */
export function deriveEs256(seed: Uint8Array, label: string, kid?: string): Es256Key {
  const okm = hkdf(sha256, seed, enc.encode("mandate-ap2-v2"), enc.encode(label), 48);
  let n = 0n;
  for (const b of okm) n = (n << 8n) | BigInt(b);
  const scalar = (n % (p256.CURVE.n - 1n)) + 1n;
  const d = new Uint8Array(32);
  let v = scalar;
  for (let i = 31; i >= 0; i--) {
    d[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return { d, kid };
}

export function publicJwk(k: Es256Key): PublicJwk {
  const pt = p256.ProjectivePoint.fromHex(p256.getPublicKey(k.d, false));
  const aff = pt.toAffine();
  const bytes = (n: bigint) => {
    const out = new Uint8Array(32);
    for (let i = 31; i >= 0; i--) {
      out[i] = Number(n & 0xffn);
      n >>= 8n;
    }
    return out;
  };
  return { kty: "EC", crv: "P-256", x: b64url(bytes(aff.x)), y: b64url(bytes(aff.y)), ...(k.kid ? { kid: k.kid } : {}) };
}

export function importPublicJwk(j: Record<string, unknown>): PublicJwk {
  if (j.kty !== "EC" || j.crv !== "P-256" || typeof j.x !== "string" || typeof j.y !== "string") throw new Error("expected a P-256 EC public JWK");
  return { kty: "EC", crv: "P-256", x: j.x, y: j.y, ...(typeof j.kid === "string" ? { kid: j.kid } : {}) };
}

function pointBytes(j: PublicJwk): Uint8Array {
  const x = b64urlDecode(j.x);
  const y = b64urlDecode(j.y);
  if (x.length !== 32 || y.length !== 32) throw new Error("bad P-256 coordinates");
  const out = new Uint8Array(65);
  out[0] = 4;
  out.set(x, 1);
  out.set(y, 33);
  return out;
}

/** RFC 7638 thumbprint (base64url SHA-256 of the required members in lexical order). */
export function jwkThumbprint(j: PublicJwk): string {
  return b64url(sha256(enc.encode(JSON.stringify({ crv: j.crv, kty: j.kty, x: j.x, y: j.y }))));
}

export function signJws(header: Record<string, unknown>, payload: unknown, key: Es256Key): string {
  if (header.alg !== "ES256") throw new Error("only ES256 is supported");
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = p256.sign(sha256(enc.encode(input)), key.d);
  return `${input}.${b64url(sig.toCompactRawBytes())}`;
}

export function decodeJws(jws: string): { header: Record<string, unknown>; payload: Record<string, unknown> } {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("malformed JWS");
  const header = b64urlJson(parts[0]!);
  const payload = b64urlJson(parts[1]!);
  if (!header || typeof header !== "object" || !payload || typeof payload !== "object") throw new Error("JWS header and payload must be objects");
  return { header: header as Record<string, unknown>, payload: payload as Record<string, unknown> };
}

/** True only for a well-formed ES256 JWS whose signature verifies under `key`. Never throws. */
export function verifyJws(jws: string, key: PublicJwk): boolean {
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) return false;
    const { header } = decodeJws(jws);
    if (header.alg !== "ES256") return false;
    const sig = b64urlDecode(parts[2]!);
    if (sig.length !== 64) return false;
    return p256.verify(sig, sha256(enc.encode(`${parts[0]}.${parts[1]}`)), pointBytes(key), { lowS: false });
  } catch {
    return false;
  }
}
