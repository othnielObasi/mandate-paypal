import { canonicalJson } from "../gate/canonical";
import type { Signer } from "../gate/keys";
import type { Policy } from "../gate/policy";
import type { Merchants } from "../merchant/merchants";
import { verifyJws } from "./jws";
import { deriveSigner } from "./keys";
import { mandateHash, signIntentMandate, signPaymentMandate, type CartMandate, type IntentMandate, type PaymentMode } from "./mandates";
import type { TrustStore } from "./verify";

/**
 * Key custody for the demo. The gateway's root key signs receipts, permits
 * and human-not-present payment mandates. Each user's key is derived from it;
 * in production that key would live on the user's device (a passkey) and
 * the user would sign there.
 */
export class Credentials {
  private users = new Map<string, Signer>();
  constructor(private root: Signer) {}

  get platformKey() {
    return this.root.publicKey;
  }

  userKey(userId: string): Signer {
    if (!this.users.has(userId)) this.users.set(userId, deriveSigner(this.root, `user:${userId}`));
    return this.users.get(userId)!;
  }

  signIntent(m: { id: string; userId: string; rawText: string; policy: Policy }, now: Date): IntentMandate {
    return signIntentMandate({ mandateId: m.id, userId: m.userId, description: m.rawText || "Mandate", policy: m.policy, now }, this.userKey(m.userId));
  }

  /** Null when the mandate's limits are exactly what the user signed; otherwise why not. */
  verifyIntent(m: { id: string; userId: string; policy: Policy; intentMandate?: IntentMandate }): string | null {
    const im = m.intentMandate;
    if (!im) return "no signed intent";
    const v = verifyJws(im.user_authorization, this.userKey(m.userId).publicKey);
    if (!v.ok) return "intent signature invalid";
    if (v.payload.hash !== mandateHash(im.contents)) return "intent changed after signing";
    const x = im.contents.x_mandate;
    if (x.mandate_id !== m.id || x.user_id !== m.userId) return "intent belongs to another mandate";
    if (canonicalJson(x.policy) !== canonicalJson(m.policy)) return "limits differ from the signed intent";
    return null;
  }

  signPayment(intent: IntentMandate, cart: CartMandate, mode: PaymentMode, userId: string, now: Date) {
    return signPaymentMandate({ intent, cart, mode, now }, mode === "human_present" ? this.userKey(userId) : this.root);
  }

  trust(merchants: Merchants, userIds: string[]): TrustStore {
    return {
      users: Object.fromEntries(userIds.map((u) => [u, this.userKey(u).publicKey])),
      merchants: merchants.directory(),
      platform: this.root.publicKey,
    };
  }
}
