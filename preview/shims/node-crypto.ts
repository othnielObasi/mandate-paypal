/**
 * Browser stand-in for the parts of node:crypto Mandate uses, built on the
 * audited @noble libraries. Same algorithms (Ed25519, SHA-256, HKDF), same
 * key encodings (PKCS#8 / SPKI DER and PEM, JWK), so signatures made in the
 * standalone preview verify exactly as they do on the server.
 */
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";
import { Buffer } from "./buffer";

const PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const pem = (label: string, der: Uint8Array) => `-----BEGIN ${label}-----\n${Buffer.from(der).toString("base64").match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----\n`;
const unpem = (text: string) => Buffer.from(text.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""), "base64");

export class KeyObject {
  constructor(
    readonly type: "private" | "public",
    private readonly raw: Uint8Array,
  ) {}
  get asymmetricKeyType() {
    return "ed25519";
  }
  /** Raw 32-byte seed (private) or public key. */
  _raw() {
    return this.raw;
  }
  export(opts: { type?: string; format: "pem" | "der" | "jwk" }): Buffer | string | Record<string, string> {
    const pub = this.type === "private" ? ed25519.getPublicKey(this.raw) : this.raw;
    if (opts.format === "jwk") {
      const x = Buffer.from(pub).toString("base64url");
      return this.type === "private" ? { kty: "OKP", crv: "Ed25519", x, d: Buffer.from(this.raw).toString("base64url") } : { kty: "OKP", crv: "Ed25519", x };
    }
    const der = this.type === "private" ? Buffer.concat([PKCS8_PREFIX, Buffer.from(this.raw)]) : Buffer.concat([SPKI_PREFIX, Buffer.from(pub)]);
    return opts.format === "der" ? der : pem(this.type === "private" ? "PRIVATE KEY" : "PUBLIC KEY", der);
  }
}

type KeyInput = string | KeyObject | { key: Uint8Array | string; format?: string; type?: string };

function derOf(input: KeyInput): Buffer {
  if (typeof input === "string") return unpem(input);
  if (input instanceof KeyObject) throw new Error("unexpected KeyObject");
  return typeof input.key === "string" ? unpem(input.key) : Buffer.from(input.key);
}

export function createPrivateKey(input: KeyInput): KeyObject {
  if (input instanceof KeyObject) return input;
  const der = derOf(input);
  if (der.length !== 48 || !der.subarray(0, 16).equals(PKCS8_PREFIX)) throw new Error("Only Ed25519 PKCS#8 keys are supported");
  return new KeyObject("private", new Uint8Array(der.subarray(16)));
}

export function createPublicKey(input: KeyInput): KeyObject {
  if (input instanceof KeyObject) return input.type === "public" ? input : new KeyObject("public", ed25519.getPublicKey(input._raw()));
  const der = derOf(input);
  if (der.length === 48 && der.subarray(0, 16).equals(PKCS8_PREFIX)) return new KeyObject("public", ed25519.getPublicKey(new Uint8Array(der.subarray(16))));
  if (der.length !== 44 || !der.subarray(0, 12).equals(SPKI_PREFIX)) throw new Error("Only Ed25519 SPKI keys are supported");
  return new KeyObject("public", new Uint8Array(der.subarray(12)));
}

export function generateKeyPairSync(kind: "ed25519") {
  if (kind !== "ed25519") throw new Error("Only ed25519 is supported");
  const seed = ed25519.utils.randomPrivateKey();
  return { privateKey: new KeyObject("private", seed), publicKey: new KeyObject("public", ed25519.getPublicKey(seed)) };
}

export function sign(_alg: null, data: Uint8Array, key: KeyObject): Buffer {
  return Buffer.from(ed25519.sign(data, key._raw()));
}

export function verify(_alg: null, data: Uint8Array, key: KeyObject, signature: Uint8Array): boolean {
  try {
    return ed25519.verify(signature, data, key._raw());
  } catch {
    return false;
  }
}

class Hash {
  private parts: Uint8Array[] = [];
  update(data: string | Uint8Array, enc?: string) {
    this.parts.push(typeof data === "string" ? Buffer.from(data, (enc as BufferEncoding) ?? "utf8") : data);
    return this;
  }
  digest(enc?: "hex" | "base64" | "base64url") {
    const out = Buffer.from(sha256(Buffer.concat(this.parts)));
    return enc ? out.toString(enc) : out;
  }
}

export function createHash(alg: string) {
  if (alg !== "sha256") throw new Error(`Only sha256 is supported (got ${alg})`);
  return new Hash();
}

export function hkdfSync(alg: string, ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number): ArrayBuffer {
  if (alg !== "sha256") throw new Error("Only sha256 is supported");
  const out = hkdf(sha256, ikm, salt, info, len);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

export function randomBytes(n: number): Buffer {
  return Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(n)));
}

export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

export default { KeyObject, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, createHash, hkdfSync, randomBytes, randomUUID };
