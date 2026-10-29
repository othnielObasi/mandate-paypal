import { createPublicKey, sign, verify } from "node:crypto";
import { canonicalJson } from "../gate/canonical";
import type { Signer } from "../gate/keys";
import { kidOf } from "./keys";

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** Compact JWS, EdDSA over Ed25519, payload serialised canonically. */
export function signJws(payload: unknown, signer: Signer): string {
  const header = b64(JSON.stringify({ alg: "EdDSA", typ: "JWT", kid: kidOf(signer.publicKey) }));
  const body = b64(canonicalJson(payload));
  const sig = sign(null, Buffer.from(`${header}.${body}`), signer.privateKey).toString("base64url");
  return `${header}.${body}.${sig}`;
}

export function decodeJws(token: string): { header: Record<string, unknown>; payload: unknown } {
  const [h, p] = token.split(".");
  return { header: JSON.parse(Buffer.from(h!, "base64url").toString("utf8")), payload: JSON.parse(Buffer.from(p!, "base64url").toString("utf8")) };
}

export type JwsResult = { ok: true; payload: Record<string, unknown> } | { ok: false; reason: "malformed" | "bad_header" | "bad_signature" };

export function verifyJws(token: string, publicKeyPem: string): JwsResult {
  try {
    if (typeof token !== "string") return { ok: false, reason: "malformed" };
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((x) => !/^[A-Za-z0-9_-]+$/.test(x))) return { ok: false, reason: "malformed" };
    const [h, p, s] = parts as [string, string, string];
    let header: Record<string, unknown>;
    try {
      header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    } catch {
      return { ok: false, reason: "malformed" };
    }
    if (header.alg !== "EdDSA") return { ok: false, reason: "bad_header" };
    if (!verify(null, Buffer.from(`${h}.${p}`), createPublicKey(publicKeyPem), Buffer.from(s, "base64url"))) return { ok: false, reason: "bad_signature" };
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return { ok: false, reason: "malformed" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
