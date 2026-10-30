/**
 * Passkey (WebAuthn) approval of a specific cart. Browser-safe: no Node APIs.
 *
 * The user's device signs a challenge derived from the approval and the exact
 * cart (merchant, currency, total, items). Anyone holding the evidence can
 * recompute that challenge from the merchant-signed checkout JWT and check the
 * device signature with the registered public key, so the approval is bound to
 * what was bought, not just to "an approval happened".
 */
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { b64url, b64urlDecode, decodeJws, type PublicJwk } from "../ap2v2/es256";

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface ApprovalCart {
  approvalId: string;
  merchantId: string;
  currency: string;
  totalMinor: number;
  items: Array<{ sku: string; qty: number }>;
}

/** Evidence stored with the purchase, everything a verifier needs. All binary fields are base64url. */
export interface PasskeyApproval {
  approvalId: string;
  credentialId: string;
  publicKey: PublicJwk;
  rpId: string;
  origin: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

export interface PasskeyAssertion {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

export function approvalChallenge(c: ApprovalCart): string {
  const items = [...c.items].sort((a, b) => a.sku.localeCompare(b.sku)).map((i) => `${i.sku}x${i.qty}`).join(",");
  return b64url(sha256(enc.encode(`mandate-approve/v1|${c.approvalId}|${c.merchantId}|${c.currency}|${c.totalMinor}|${items}`)));
}

/** The cart as the merchant signed it. */
export function cartFromCheckout(checkoutJwt: string, approvalId: string): ApprovalCart {
  const p = decodeJws(checkoutJwt).payload as {
    merchant?: { id?: string };
    currency?: string;
    totals?: Array<{ type: string; amount: number }>;
    line_items?: Array<{ item: { id: string }; quantity: number }>;
  };
  return {
    approvalId,
    merchantId: String(p.merchant?.id ?? ""),
    currency: String(p.currency ?? ""),
    totalMinor: Number(p.totals?.find((t) => t.type === "total")?.amount ?? NaN),
    items: (p.line_items ?? []).map((l) => ({ sku: l.item.id, qty: l.quantity })),
  };
}

export const clientOrigin = (clientDataJSON: string): string => {
  try {
    return String(JSON.parse(dec.decode(b64urlDecode(clientDataJSON))).origin ?? "");
  } catch {
    return "";
  }
};

/** Registration challenge: binds a new passkey to the mandate it will approve for. */
export const registrationChallenge = (mandateId: string) => b64url(sha256(enc.encode(`mandate-register/v1|${mandateId}`)));

const SPKI_P256_PREFIX = "3059301306072a8648ce3d020106082a8648ce3d030107034200";

/** P-256 SubjectPublicKeyInfo (from AuthenticatorAttestationResponse.getPublicKey()) to a JWK. */
export function spkiToJwk(spkiB64url: string): PublicJwk {
  const der = b64urlDecode(spkiB64url);
  const hex = Array.from(der.subarray(0, 26), (b) => b.toString(16).padStart(2, "0")).join("");
  if (der.length !== 91 || hex !== SPKI_P256_PREFIX || der[26] !== 4) throw new Error("Only P-256 (ES256) passkeys are supported.");
  p256.ProjectivePoint.fromHex(der.subarray(26)); // throws if not on the curve
  return { kty: "EC", crv: "P-256", x: b64url(der.subarray(27, 59)), y: b64url(der.subarray(59, 91)) };
}

function point(j: PublicJwk): Uint8Array {
  const out = new Uint8Array(65);
  out[0] = 4;
  out.set(b64urlDecode(j.x), 1);
  out.set(b64urlDecode(j.y), 33);
  return out;
}

export type ClientDataCheck = { type: "webauthn.get" | "webauthn.create"; challenge: string; origin: string | string[] };

export function checkClientData(clientDataJSON: string, want: ClientDataCheck): string | null {
  let cd: { type?: string; challenge?: string; origin?: string; crossOrigin?: boolean };
  try {
    cd = JSON.parse(dec.decode(b64urlDecode(clientDataJSON)));
  } catch {
    return "clientDataJSON is not JSON";
  }
  if (cd.type !== want.type) return `clientData type is ${String(cd.type)}, expected ${want.type}`;
  if (cd.challenge !== want.challenge) return "challenge does not match this cart";
  const origins = Array.isArray(want.origin) ? want.origin : [want.origin];
  if (!origins.includes(String(cd.origin))) return `origin ${String(cd.origin)} is not ${origins.join(" or ")}`;
  if (cd.crossOrigin) return "cross-origin ceremony";
  return null;
}

/** Verifies a WebAuthn assertion (ES256). Returns null when valid, else the reason. Never throws. */
export function verifyAssertion(a: PasskeyAssertion & { publicKey: PublicJwk }, want: { challenge: string; origin: string | string[]; rpId: string; requireUserVerification?: boolean }): string | null {
  try {
    const bad = checkClientData(a.clientDataJSON, { type: "webauthn.get", challenge: want.challenge, origin: want.origin });
    if (bad) return bad;
    const auth = b64urlDecode(a.authenticatorData);
    if (auth.length < 37) return "authenticator data too short";
    const rpHash = sha256(enc.encode(want.rpId));
    if (!rpHash.every((b, i) => b === auth[i])) return `signed for a different site than ${want.rpId}`;
    const flags = auth[32]!;
    if (!(flags & 0x01)) return "user was not present";
    if (want.requireUserVerification !== false && !(flags & 0x04)) return "user was not verified (no PIN or biometric)";
    const cdHash = sha256(b64urlDecode(a.clientDataJSON));
    const signed = new Uint8Array(auth.length + 32);
    signed.set(auth);
    signed.set(cdHash, auth.length);
    const sig = p256.Signature.fromDER(b64urlDecode(a.signature));
    return p256.verify(sig, sha256(signed), point(a.publicKey), { lowS: false }) ? null : "device signature does not verify";
  } catch (e) {
    return `malformed assertion: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** Check a stored passkey approval against the merchant-signed checkout it should cover. */
export function verifyPasskeyApproval(ev: PasskeyApproval, checkoutJwt: string): string | null {
  const challenge = approvalChallenge(cartFromCheckout(checkoutJwt, ev.approvalId));
  return verifyAssertion(ev, { challenge, origin: ev.origin, rpId: ev.rpId });
}
