import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";

export interface Signer {
  privateKey: KeyObject;
  /** PEM (SPKI). Safe to publish so anyone can verify permits and receipts. */
  publicKey: string;
}

export function generateSigner(): Signer {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return { privateKey, publicKey: publicKey.export({ type: "spki", format: "pem" }).toString() };
}

/** Load from a PEM (PKCS#8) private key, e.g. the MANDATE_SIGNING_KEY env var. */
export function signerFromPem(privatePem: string): Signer {
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
  return { privateKey, publicKey };
}

export function exportPrivatePem(s: Signer): string {
  return s.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

export function signText(text: string, signer: Signer): string {
  return sign(null, Buffer.from(text, "utf8"), signer.privateKey).toString("base64");
}

export function verifyText(text: string, signatureB64: string, publicKeyPem: string): boolean {
  try {
    return verify(null, Buffer.from(text, "utf8"), createPublicKey(publicKeyPem), Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
