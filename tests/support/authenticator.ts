import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { b64url } from "@/lib/ap2v2/es256";

const enc = new TextEncoder();
const SPKI_PREFIX = Uint8Array.from(Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200", "hex"));

/** A software passkey: produces the same bytes a phone's platform authenticator would. */
export function softAuthenticator(o: { origin: string; rpId: string; credentialId?: string }) {
  const d = p256.utils.randomPrivateKey();
  const credentialId = o.credentialId ?? b64url(p256.utils.randomPrivateKey().slice(0, 16));
  const clientData = (type: string, challenge: string, origin = o.origin) => enc.encode(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  return {
    credentialId,
    register(challenge: string) {
      return { credentialId, publicKey: b64url(new Uint8Array([...SPKI_PREFIX, ...p256.getPublicKey(d, false)])), clientDataJSON: b64url(clientData("webauthn.create", challenge)) };
    },
    sign(challenge: string, x: { origin?: string; flags?: number } = {}) {
      const cd = clientData("webauthn.get", challenge, x.origin);
      const auth = new Uint8Array([...sha256(enc.encode(o.rpId)), x.flags ?? 0x05, 0, 0, 0, 1]);
      const sig = p256.sign(sha256(new Uint8Array([...auth, ...sha256(cd)])), d).toDERRawBytes();
      return { credentialId, clientDataJSON: b64url(cd), authenticatorData: b64url(auth), signature: b64url(sig) };
    },
  };
}
