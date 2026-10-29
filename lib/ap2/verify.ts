import { verifyJws } from "./jws";
import { cartTotalMinor, decimal, mandateHash, type CartMandate, type IntentMandate, type PaymentMandate } from "./mandates";

export interface TrustStore {
  users: Record<string, string>;
  merchants: Record<string, { publicKey: string; verified: boolean; name: string }>;
  /** The Mandate gateway's key, which signs human-not-present payment mandates. */
  platform: string;
}

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface ChainResult {
  ok: boolean;
  checks: Check[];
  notes: string[];
}

export interface Chain {
  intent: IntentMandate;
  cart: CartMandate;
  payment: PaymentMandate;
}

function signedBy(token: string, key: string | undefined, typ: string, contents: unknown): string | null {
  if (!key) return "unknown signer";
  const v = verifyJws(token, key);
  if (!v.ok) return `signature ${v.reason.replace("_", " ")}`;
  if (v.payload.typ !== typ) return "wrong credential type";
  if (v.payload.hash !== mandateHash(contents)) return "contents changed after signing";
  return null;
}

/**
 * Independent verification of one agent payment, using only public keys.
 * A merchant (or PayPal, or a dispute reviewer) can run this without
 * trusting the Mandate gateway's database.
 */
export function verifyPaymentChain(chain: Chain, trust: TrustStore, now: Date): ChainResult {
  const checks: Check[] = [];
  const add = (id: string, label: string, failure: string | null, okDetail: string) =>
    checks.push({ id, label, ok: failure === null, detail: failure ?? okDetail });
  const notes = ["The period budget spans many payments, so it is enforced by the user's Mandate gateway; see its signed receipts."];

  try {
    const { intent, cart, payment } = chain;
    const ix = intent.contents.x_mandate;
    const cx = cart.contents.x_mandate;
    const pc = payment.payment_mandate_contents;
    const policy = ix.policy;
    const merchant = trust.merchants[cx.merchant_id];

    add("intent_signed_by_user", "Intent Mandate signed by the user", signedBy(intent.user_authorization, trust.users[ix.user_id], "ap2.intent_mandate", intent.contents), `Signed by user ${ix.user_id}`);

    add("cart_signed_by_merchant", "Cart Mandate signed by the merchant", merchant ? signedBy(cart.merchant_signature, merchant.publicKey, "ap2.cart_mandate", cart.contents) : "merchant not in the trusted registry", `Signed by ${merchant?.name ?? cx.merchant_id}`);

    const total = cartTotalMinor(cx.lines);
    const shown = cart.contents.payment_request.details;
    const consistent =
      shown.total.amount.value === decimal(total) &&
      shown.total.amount.currency === cx.currency &&
      shown.displayItems.length === cx.lines.length &&
      shown.displayItems.every((d, i) => d.amount.value === decimal(cx.lines[i]!.unitMinor * cx.lines[i]!.qty));
    add("cart_consistent", "Cart total matches its line items", consistent ? null : "displayed items and total disagree", `${cx.currency} ${decimal(total)}`);

    const matchFail =
      pc.payment_details_id !== cart.contents.id
        ? "points at a different cart"
        : pc.x_mandate.cart_hash !== mandateHash(cart.contents)
          ? "cart contents differ from what was paid"
          : pc.x_mandate.intent_hash !== mandateHash(intent.contents)
            ? "made under a different intent"
            : pc.payment_details_total.amount.value !== shown.total.amount.value || pc.payment_details_total.amount.currency !== shown.total.amount.currency
              ? "amount differs from the cart"
              : pc.merchant_agent !== cx.merchant_id
                ? "paid to a different merchant"
                : null;
    add("payment_matches_cart", "Payment Mandate matches the cart and intent", matchFail, `Pays ${pc.payment_details_total.amount.currency} ${pc.payment_details_total.amount.value} for cart ${cart.contents.id}`);

    const mode = pc.x_mandate.mode;
    const authKey = mode === "human_present" ? trust.users[ix.user_id] : trust.platform;
    add(
      "payment_authorised",
      mode === "human_present" ? "Payment approved and signed by the user" : "Payment attested by the Mandate gateway",
      signedBy(payment.user_authorization, authKey, "ap2.payment_mandate", pc),
      mode === "human_present" ? "User signed this exact cart" : "Gateway attests the cart satisfies the signed intent",
    );

    const paidAt = Date.parse(pc.timestamp);
    add("intent_unexpired", "Intent Mandate valid at payment time", Number.isFinite(paidAt) && paidAt <= Date.parse(intent.contents.intent_expiry) ? null : `expired ${intent.contents.intent_expiry}`, `Valid until ${intent.contents.intent_expiry.slice(0, 10)}`);
    add("cart_unexpired", "Cart Mandate valid at payment time", Number.isFinite(paidAt) && paidAt <= Date.parse(cart.contents.cart_expiry) ? null : "cart expired before payment", "Paid before the cart expired");

    const hard =
      cx.currency !== policy.currency
        ? `currency ${cx.currency} not allowed`
        : !policy.categories.includes(cx.category.toLowerCase())
          ? `category "${cx.category}" is outside the intent`
          : policy.sellers.blocked.includes(cx.merchant_id)
            ? `${cx.merchant_id} is blocked by the user`
            : policy.sellers.verifiedOnly && !merchant?.verified
              ? `${cx.merchant_id} is not a verified seller`
              : null;
    const overCap = total > policy.maxItemMinor;
    const withinFail = hard ?? (overCap && mode === "human_not_present" ? `over the signed item limit of ${decimal(policy.maxItemMinor)}` : null);
    add(
      "within_intent",
      "Purchase is within the user's signed limits",
      withinFail,
      overCap ? `Over the item limit, approved by the user for this cart` : `Category, seller and item limit all satisfied`,
    );
    void now;
  } catch {
    checks.push({ id: "malformed", label: "Credentials are well-formed", ok: false, detail: "missing or malformed mandate" });
  }
  return { ok: checks.length > 0 && checks.every((c) => c.ok), checks, notes };
}
