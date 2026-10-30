import { describe, expect, it } from "vitest";
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { b64url, generateEs256 } from "@/lib/ap2v2/es256";
import { merchantCheckout } from "@/lib/ap2v2/mandates";
import { approvalChallenge, cartFromCheckout, spkiToJwk, verifyAssertion, verifyPasskeyApproval, type PasskeyApproval } from "@/lib/passkey/webauthn";

const enc = new TextEncoder();
const ORIGIN = "https://mandate.example";
const RP = "mandate.example";

/** A software authenticator: what a phone's passkey does, byte for byte. */
function authenticator() {
  const d = p256.utils.randomPrivateKey();
  const pub = p256.getPublicKey(d, false);
  const spki = new Uint8Array([...Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200", "hex"), ...pub]);
  return {
    spki: b64url(spki),
    sign(challenge: string, o: { origin?: string; rpId?: string; flags?: number; type?: string } = {}) {
      const clientData = enc.encode(JSON.stringify({ type: o.type ?? "webauthn.get", challenge, origin: o.origin ?? ORIGIN, crossOrigin: false }));
      const auth = new Uint8Array([...sha256(enc.encode(o.rpId ?? RP)), o.flags ?? 0x05, 0, 0, 0, 7]);
      const msg = sha256(new Uint8Array([...auth, ...sha256(clientData)]));
      const sig = p256.sign(msg, d).toDERRawBytes();
      return { credentialId: "cred-1", clientDataJSON: b64url(clientData), authenticatorData: b64url(auth), signature: b64url(sig) };
    },
  };
}

const checkout = merchantCheckout({ id: "c1", merchant: { id: "acme-supplies", name: "Acme" }, currency: "USD", items: [{ sku: "kettle", title: "Kettle", unitMinor: 3200, qty: 1 }] }, generateEs256("merchant:acme-supplies"));

describe("passkey approvals", () => {
  it("reads a P-256 SPKI and verifies a device assertion over the exact cart", () => {
    const a = authenticator();
    const publicKey = spkiToJwk(a.spki);
    const challenge = approvalChallenge(cartFromCheckout(checkout.jwt, "ap_1"));
    const ev: PasskeyApproval = { approvalId: "ap_1", publicKey, rpId: RP, origin: ORIGIN, ...a.sign(challenge) };
    expect(verifyPasskeyApproval(ev, checkout.jwt)).toBeNull();
  });

  it("fails when the cart differs from what the device approved", () => {
    const a = authenticator();
    const other = merchantCheckout({ id: "c1", merchant: { id: "acme-supplies", name: "Acme" }, currency: "USD", items: [{ sku: "kettle", title: "Kettle", unitMinor: 3200, qty: 2 }] }, generateEs256());
    const challenge = approvalChallenge(cartFromCheckout(checkout.jwt, "ap_1"));
    const ev: PasskeyApproval = { approvalId: "ap_1", publicKey: spkiToJwk(a.spki), rpId: RP, origin: ORIGIN, ...a.sign(challenge) };
    expect(verifyPasskeyApproval(ev, other.jwt)).toMatch(/challenge/);
    expect(verifyPasskeyApproval({ ...ev, approvalId: "ap_2" }, checkout.jwt)).toMatch(/challenge/);
  });

  it("rejects wrong origin, wrong site, no user verification, another key, and tampered data", () => {
    const a = authenticator();
    const b = authenticator();
    const publicKey = spkiToJwk(a.spki);
    const challenge = "abc";
    const want = { challenge, origin: ORIGIN, rpId: RP };
    expect(verifyAssertion({ ...a.sign(challenge), publicKey }, want)).toBeNull();
    expect(verifyAssertion({ ...a.sign(challenge, { origin: "https://evil.example" }), publicKey }, want)).toMatch(/origin/);
    expect(verifyAssertion({ ...a.sign(challenge, { rpId: "evil.example" }), publicKey }, want)).toMatch(/different site/);
    expect(verifyAssertion({ ...a.sign(challenge, { flags: 0x01 }), publicKey }, want)).toMatch(/not verified/);
    expect(verifyAssertion({ ...a.sign(challenge, { type: "webauthn.create" }), publicKey }, want)).toMatch(/type/);
    expect(verifyAssertion({ ...b.sign(challenge), publicKey }, want)).toMatch(/does not verify/);
    const s = a.sign(challenge);
    expect(verifyAssertion({ ...s, signature: s.signature.slice(0, -4) + "AAAA", publicKey }, want)).not.toBeNull();
  });

  it("refuses non-P-256 keys", () => {
    expect(() => spkiToJwk(b64url(new Uint8Array(91)))).toThrow(/P-256/);
  });
});
