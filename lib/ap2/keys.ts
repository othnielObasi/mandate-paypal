import { createHash, createPrivateKey, createPublicKey, hkdfSync } from "node:crypto";
import type { Signer } from "../gate/keys";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

/**
 * A deterministic Ed25519 key derived from the root key and a label
 * ("user:<id>", "merchant:<id>"). The demo needs stable user and merchant
 * keys across restarts without extra secrets. In production the user's key
 * lives on their device (e.g. a passkey) and each merchant holds its own.
 */
export function deriveSigner(root: Signer, label: string): Signer {
  const jwk = root.privateKey.export({ format: "jwk" }) as { d?: string };
  if (!jwk.d) throw new Error("root key must be Ed25519");
  const seed = Buffer.from(hkdfSync("sha256", Buffer.from(jwk.d, "base64url"), Buffer.from("mandate-ap2-v1"), Buffer.from(label), 32));
  const privateKey = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: "der", type: "pkcs8" });
  return { privateKey, publicKey: createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString() };
}

/** Short fingerprint of a public key, used as the JWS key id. */
export function kidOf(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return `ed25519:${createHash("sha256").update(der).digest("hex").slice(0, 16)}`;
}
