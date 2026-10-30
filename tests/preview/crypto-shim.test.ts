import { describe, it, expect } from "vitest";
import * as node from "node:crypto";
import * as shim from "../../preview/shims/node-crypto";

describe("browser crypto shim matches node:crypto", () => {
  const nodePair = node.generateKeyPairSync("ed25519");
  const pkcs8Pem = nodePair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const spkiPem = nodePair.publicKey.export({ type: "spki", format: "pem" }).toString();

  it("reads Node's PEM keys and writes identical PEM back", () => {
    const k = shim.createPrivateKey(pkcs8Pem);
    expect(k.export({ type: "pkcs8", format: "pem" })).toBe(pkcs8Pem);
    expect(shim.createPublicKey(k).export({ type: "spki", format: "pem" })).toBe(spkiPem);
    expect(shim.createPublicKey(spkiPem).export({ type: "spki", format: "pem" })).toBe(spkiPem);
  });

  it("signatures cross-verify in both directions", () => {
    const msg = Buffer.from("receipt #7");
    const bySim = shim.sign(null, msg, shim.createPrivateKey(pkcs8Pem));
    expect(node.verify(null, msg, node.createPublicKey(spkiPem), bySim)).toBe(true);
    const byNode = node.sign(null, msg, nodePair.privateKey);
    expect(shim.verify(null, msg, shim.createPublicKey(spkiPem), byNode)).toBe(true);
    expect(shim.verify(null, Buffer.from("receipt #8"), shim.createPublicKey(spkiPem), byNode)).toBe(false);
  });

  it("generated keys round-trip through Node", () => {
    const { privateKey } = shim.generateKeyPairSync("ed25519");
    const pemOut = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const back = node.createPrivateKey(pemOut);
    expect(node.createPublicKey(back).export({ type: "spki", format: "pem" })).toBe(shim.createPublicKey(privateKey).export({ type: "spki", format: "pem" }));
  });

  it("JWK, DER, SHA-256 and HKDF agree", () => {
    const k = shim.createPrivateKey(pkcs8Pem);
    expect(k.export({ format: "jwk" })).toEqual(nodePair.privateKey.export({ format: "jwk" }));
    expect(Buffer.compare(shim.createPublicKey(spkiPem).export({ type: "spki", format: "der" }) as Buffer, nodePair.publicKey.export({ type: "spki", format: "der" }))).toBe(0);
    expect(shim.createHash("sha256").update("abc", "utf8").digest("hex")).toBe(node.createHash("sha256").update("abc").digest("hex"));
    const args = [Buffer.from("ikm"), Buffer.from("salt"), Buffer.from("info"), 32] as const;
    expect(Buffer.from(shim.hkdfSync("sha256", ...args)).toString("hex")).toBe(Buffer.from(node.hkdfSync("sha256", ...args)).toString("hex"));
    const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.alloc(32, 7)]);
    expect(shim.createPrivateKey({ key: der, format: "der", type: "pkcs8" }).export({ type: "pkcs8", format: "pem" })).toBe(node.createPrivateKey({ key: der, format: "der", type: "pkcs8" }).export({ type: "pkcs8", format: "pem" }));
  });
});
