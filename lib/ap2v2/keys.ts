import { deriveEs256, publicJwk, type Es256Key, type PublicJwk } from "./es256";

/**
 * ES256 keys for AP2 v0.2, all derived from one root secret so the demo
 * needs no extra configuration and keys survive restarts when the root key
 * is configured.
 *
 * - provider: Mandate as "Trusted Agent Provider"; signs open mandates after
 *   the user confirms their rules on Mandate's trusted surface.
 * - agent: Mandate's shopping agent; the open mandates delegate to it (cnf),
 *   and it closes in-policy purchases.
 * - gateway: signs payment receipts once PayPal confirms a capture.
 * - merchant:<id>: each demo merchant's checkout and receipt key. Real
 *   merchants hold their own and publish it.
 * - user:<id>: signs purchases the user approves (human present). In
 *   production this is the user's passkey, held on their device.
 */
export class Ap2Keys {
  private cache = new Map<string, Es256Key>();
  constructor(private seed: Uint8Array) {}

  private key(label: string): Es256Key {
    let k = this.cache.get(label);
    if (!k) {
      k = deriveEs256(this.seed, label, label);
      this.cache.set(label, k);
    }
    return k;
  }

  get provider() {
    return this.key("mandate-provider");
  }
  get agent() {
    return this.key("mandate-agent");
  }
  get gateway() {
    return this.key("mandate-gateway");
  }
  merchant(id: string) {
    return this.key(`merchant:${id}`);
  }
  user(id: string) {
    return this.key(`user:${id}`);
  }

  /** Public JWKs anyone can use to verify AP2 v0.2 credentials Mandate issued. */
  jwks(merchantIds: string[], userIds: string[]): { keys: PublicJwk[] } {
    return {
      keys: [this.provider, this.agent, this.gateway, ...merchantIds.map((m) => this.merchant(m)), ...userIds.map((u) => this.user(u))].map((k) => ({ ...publicJwk(k), alg: "ES256", use: "sig" })),
    };
  }

  /** Resolve a public key by kid, for verifying chains and receipts. */
  byKid(kid: unknown): PublicJwk | undefined {
    if (typeof kid !== "string") return undefined;
    if (kid === "mandate-provider" || kid === "mandate-agent" || kid === "mandate-gateway" || kid.startsWith("merchant:") || kid.startsWith("user:")) return publicJwk(this.key(kid));
    return undefined;
  }
}
