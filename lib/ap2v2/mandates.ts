/**
 * AP2 v0.2 Checkout and Payment Mandates for Mandate's policies.
 *
 * Model: "Trusted Agent Provider" (AP2 agent_authorization.md). Mandate shows
 * the user their rules on its trusted surface, then signs open mandates with
 * its provider key. Open mandates delegate to Mandate's agent key (cnf), which
 * closes each in-policy purchase. Purchases the user approves are closed
 * directly with the user's key (human present). Merchants sign the checkout as
 * an ES256 JWT; merchants and the payment gateway return signed receipts.
 *
 * Open mandates carry only what is fixed when the user signs: the per-order
 * cap, the budget and its period, and the link between the two mandates.
 * Rules that depend on live data (verified sellers, blocked sellers) or have
 * no standard AP2 constraint (categories, fair price, untrusted-content
 * origin) are enforced by Mandate's gate before anything is signed: a fixed
 * merchant list would wrongly block sellers verified after signing, and
 * verifiers must reject constraints they do not know.
 */
import type { Policy } from "../gate/policy";
import { decodeJws, sha256b64url, signJws, verifyJws, type Es256Key, type PublicJwk, publicJwk } from "./es256";
import { closedJwtOf, issueRoot, parseChain, present, sd, verifyChain } from "./sdjwt";

export const VCT = {
  checkout: "mandate.checkout.1",
  checkoutOpen: "mandate.checkout.open.1",
  payment: "mandate.payment.1",
  paymentOpen: "mandate.payment.open.1",
} as const;

export interface Merchant {
  id: string;
  name: string;
  website?: string;
}
type Json = Record<string, unknown>;

export interface OpenMandates {
  checkoutOpen: { token: string; mandate: Json };
  paymentOpen: { token: string; mandate: Json & { constraints: Json[]; exp: number } };
  /** sd_hash of the open checkout token: what payment.reference names. */
  openCheckoutHash: string;
}

const FREQ = { week: "WEEKLY", month: "MONTHLY" } as const;

/** Open Checkout + Payment Mandates expressing `policy` in AP2's standard constraints. */
export function openMandatesFor(
  policy: Policy,
  o: { providerKey: Es256Key; agentKey: Es256Key; now: number; allowedMerchants?: Merchant[] },
): OpenMandates {
  const allowed = o.allowedMerchants;
  const exp = Math.floor(Date.parse(`${policy.expires}T23:59:59Z`) / 1000);
  const cnf = { jwk: publicJwk(o.agentKey) };

  const checkoutMandate: Json = { vct: VCT.checkoutOpen, constraints: allowed ? [{ type: "checkout.allowed_merchants", allowed: allowed.map((m) => sd(m)) }] : [], cnf, iat: o.now, exp };
  const checkoutToken = issueRoot(checkoutMandate, o.providerKey);
  const openCheckoutHash = sha256b64url(parseChain(checkoutToken)[0]!.sdJwt);

  const constraints: Json[] = [
    { type: "payment.amount_range", currency: policy.currency, min: 0, max: policy.maxItemMinor },
    { type: "payment.budget", currency: policy.currency, max: policy.budget.amountMinor / 100 },
    { type: "payment.agent_recurrence", frequency: FREQ[policy.budget.period] },
    ...(allowed ? [{ type: "payment.allowed_payees", allowed: allowed.map((m) => sd(m)) }] : []),
    { type: "payment.reference", conditional_transaction_id: openCheckoutHash },
  ];
  const paymentMandate = { vct: VCT.paymentOpen, constraints, cnf, iat: o.now, exp };
  const paymentToken = issueRoot(paymentMandate, o.providerKey);

  return {
    checkoutOpen: { token: checkoutToken, mandate: { ...checkoutMandate, constraints: allowed ? [{ type: "checkout.allowed_merchants", allowed }] : [] } },
    paymentOpen: { token: paymentToken, mandate: { ...paymentMandate, constraints: constraints.map((c) => (c.type === "payment.allowed_payees" ? { ...c, allowed } : c)) } },
    openCheckoutHash,
  };
}

/* ---------------- merchant checkout ---------------- */

export interface CartLine {
  sku: string;
  title: string;
  unitMinor: number;
  qty: number;
}

/** A UCP Checkout object, signed by the merchant (ES256). */
export function merchantCheckout(c: { id: string; merchant: Merchant; currency: string; items: CartLine[]; expiresAt?: string }, merchantKey: Es256Key): { jwt: string; hash: string; total: number } {
  const total = c.items.reduce((s, i) => s + i.unitMinor * i.qty, 0);
  const payload = {
    id: c.id,
    merchant: c.merchant,
    line_items: c.items.map((i, n) => ({ id: `line_${n + 1}`, item: { id: i.sku, title: i.title, price: i.unitMinor }, quantity: i.qty, totals: [{ type: "subtotal", amount: i.unitMinor * i.qty }] })),
    status: "ready_for_complete",
    currency: c.currency,
    totals: [{ type: "total", amount: total }],
    links: [],
    ...(c.expiresAt ? { expires_at: c.expiresAt } : {}),
  };
  const jwt = signJws({ alg: "ES256", typ: "JWT", ...(merchantKey.kid ? { kid: merchantKey.kid } : {}) }, payload, merchantKey);
  return { jwt, hash: sha256b64url(jwt), total };
}

const PAYPAL_INSTRUMENT = { id: "paypal-wallet", type: "paypal", description: "PayPal" };

function closedPair(checkout: { jwt: string; hash: string; total: number }, payee: Merchant, currency: string) {
  const checkoutMandate = { vct: VCT.checkout, checkout_jwt: sd(checkout.jwt), checkout_hash: checkout.hash };
  const paymentMandate = { vct: VCT.payment, transaction_id: checkout.hash, payee, payment_amount: { amount: checkout.total, currency }, payment_instrument: PAYPAL_INSTRUMENT };
  return { checkoutMandate, paymentMandate };
}

const currencyOf = (jwt: string) => String(decodeJws(jwt).payload.currency ?? "USD");

/** Human not present: Mandate's agent closes both open mandates (KB-SD-JWT hops). */
export function closeAutonomous(open: { checkoutOpen: { token: string }; paymentOpen: { token: string } }, checkout: { jwt: string; hash: string; total: number }, o: { agentKey: Es256Key; payee: Merchant; now: number; nonce: string }) {
  const { checkoutMandate, paymentMandate } = closedPair(checkout, o.payee, currencyOf(checkout.jwt));
  return {
    mode: "human_not_present" as const,
    checkoutChain: present(open.checkoutOpen.token, o.agentKey, checkoutMandate, { aud: o.payee.id, nonce: o.nonce, iat: o.now, terminal: true }),
    paymentChain: present(open.paymentOpen.token, o.agentKey, paymentMandate, { aud: "paypal", nonce: o.nonce, iat: o.now, terminal: true }),
  };
}

/** Human present: the user approved this exact cart; closed mandates are signed with the user's key. */
export function closeApproved(checkout: { jwt: string; hash: string; total: number }, o: { userKey: Es256Key; payee: Merchant; now: number }) {
  const { checkoutMandate, paymentMandate } = closedPair(checkout, o.payee, currencyOf(checkout.jwt));
  return {
    mode: "human_present" as const,
    checkoutChain: issueRoot({ ...checkoutMandate, iat: o.now }, o.userKey),
    paymentChain: issueRoot({ ...paymentMandate, iat: o.now }, o.userKey),
  };
}

/* ---------------- receipts ---------------- */

export function checkoutReceipt(checkoutChain: string, o: { orderId: string; issuer: string; key: Es256Key; now: number }): string {
  return signJws({ alg: "ES256", typ: "JWT", ...(o.key.kid ? { kid: o.key.kid } : {}) }, { status: "Success", iss: o.issuer, iat: o.now, reference: sha256b64url(closedJwtOf(checkoutChain)), order_id: o.orderId }, o.key);
}

/** Issued by Mandate's payment gateway once PayPal confirms the capture. */
export function paymentReceipt(paymentChain: string, o: { paypalOrderId: string; captureId: string; issuer: string; key: Es256Key; now: number }): string {
  return signJws(
    { alg: "ES256", typ: "JWT", ...(o.key.kid ? { kid: o.key.kid } : {}) },
    { status: "Success", iss: o.issuer, iat: o.now, reference: sha256b64url(closedJwtOf(paymentChain)), payment_id: o.paypalOrderId, psp_confirmation_id: o.captureId, network_confirmation_id: o.paypalOrderId },
    o.key,
  );
}

/* ---------------- constraint evaluation (mirrors the AP2 reference SDK) ---------------- */

const merchantMatches = (a: Json, b: Json) => (a.id && b.id ? a.id === b.id : !!a.name && a.name === b.name && !!a.website && a.website === b.website);

export interface UsageContext {
  /** Minor units already spent under this open mandate in the current period. */
  totalAmount: number;
  totalUses: number;
}

export function checkPaymentConstraints(open: Json, closed: Json, o: { openCheckoutHash?: string; context?: UsageContext }): string[] {
  const v: string[] = [];
  const amt = closed.payment_amount as { amount: number; currency: string };
  const cons = (open.constraints as Json[] | undefined) ?? [];
  if (open.payee && !merchantMatches(open.payee as Json, closed.payee as Json)) v.push("Pre-set payee mismatch");
  if (open.payment_amount && JSON.stringify(open.payment_amount) !== JSON.stringify(closed.payment_amount)) v.push("Pre-set amount mismatch");
  const has = (t: string) => cons.some((c) => c.type === t);
  if (has("payment.agent_recurrence")) {
    if (!has("payment.amount_range")) v.push("payment.agent_recurrence requires payment.amount_range constraint");
    if (!has("payment.budget")) v.push("payment.agent_recurrence requires payment.budget constraint");
  }
  for (const c of cons) {
    switch (c.type) {
      case "payment.amount_range":
        if (c.currency && amt.currency !== c.currency) v.push(`Currency mismatch: expected ${c.currency}, got ${amt.currency}`);
        if (typeof c.min === "number" && amt.amount < c.min) v.push(`Amount ${amt.amount} below minimum ${c.min}`);
        if (typeof c.max === "number" && amt.amount > c.max) v.push(`Amount ${amt.amount} exceeds maximum ${c.max}`);
        break;
      case "payment.allowed_payees":
        if (!((c.allowed as Json[]) ?? []).some((m) => merchantMatches(m, closed.payee as Json))) v.push(`Payee ${(closed.payee as Json).name} not in allowed list`);
        break;
      case "payment.reference":
        if (!o.openCheckoutHash) v.push("open_checkout_hash is required to evaluate PaymentReference constraints");
        else if (o.openCheckoutHash !== c.conditional_transaction_id) v.push("PaymentReference mismatch");
        break;
      case "payment.budget": {
        if (amt.currency !== c.currency) v.push(`Budget currency mismatch: expected ${c.currency}, got ${amt.currency}`);
        else if (!o.context) v.push("Missing mandate context required to evaluate budget");
        else {
          const limit = Math.round(Number(c.max) * 100);
          if (o.context.totalAmount + amt.amount > limit) v.push(`Cumulative spend ${o.context.totalAmount + amt.amount} exceeds budget limit ${limit}`);
        }
        break;
      }
      case "payment.agent_recurrence":
        if (typeof c.max_occurrences === "number") {
          if (!o.context) v.push("Missing mandate context required to evaluate recurrence");
          else if (o.context.totalUses >= c.max_occurrences) v.push(`Maximum occurrences exceeded: ${o.context.totalUses} >= ${c.max_occurrences}`);
        }
        break;
      case "payment.allowed_payment_instruments":
        if (!((c.allowed as Json[]) ?? []).some((p) => p.id === (closed.payment_instrument as Json)?.id)) v.push("Payment instrument not in allowed list");
        break;
      case "payment.execution_date": {
        const d = closed.execution_date as string | undefined;
        if (d && c.not_before && d < String(c.not_before)) v.push("Execution date before allowed window");
        if (d && c.not_after && d > String(c.not_after)) v.push("Execution date after allowed window");
        break;
      }
      default:
        v.push(`Unknown constraint type ${String(c.type)} (unresolved_constraint)`);
    }
  }
  return v;
}

export function checkCheckoutConstraints(open: Json, checkout: Json): string[] {
  const v: string[] = [];
  for (const c of (open.constraints as Json[] | undefined) ?? []) {
    if (c.type === "checkout.allowed_merchants") {
      const m = checkout.merchant as Json | undefined;
      if (!m) v.push("Missing merchant in checkout");
      else if (!((c.allowed as Json[]) ?? []).some((a) => merchantMatches(a, m))) v.push(`Merchant ${String(m.name ?? "")} not in allowed list`);
    } else v.push(`Unknown constraint type ${String(c.type)} (unresolved_constraint)`);
  }
  return v;
}

/* ---------------- full verification (AP2 "Dispute" rules) ---------------- */

export interface Purchase {
  checkoutChain: string;
  paymentChain: string;
  checkoutJwt: string;
  checkoutReceipt?: string;
  paymentReceipt?: string;
}

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface PurchaseKeys {
  /** Root key for an SD-JWT, by its header (provider key, or the user's key for approved purchases). */
  root: (header: Record<string, unknown>) => PublicJwk;
  merchant: (merchantId: string) => PublicJwk | undefined;
  receiptIssuer: (iss: string) => PublicJwk | undefined;
}

export interface PurchaseVerdict {
  ok: boolean;
  mode: "human_present" | "human_not_present";
  checks: Check[];
  amount: { amount: number; currency: string } | null;
  merchant: Merchant | null;
}

export function verifyPurchase(p: Purchase, keys: PurchaseKeys, o: { now?: number; context?: UsageContext } = {}): PurchaseVerdict {
  const checks: Check[] = [];
  const add = (id: string, label: string, run: () => string) => {
    try {
      checks.push({ id, label, ok: true, detail: run() });
    } catch (e) {
      checks.push({ id, label, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  };
  const fail = (m: string): never => {
    throw new Error(m);
  };

  let checkoutMandates: Json[] = [];
  let paymentMandates: Json[] = [];
  let checkoutPayload: Json = {};
  const mode = parseChain(p.paymentChain).length > 1 ? "human_not_present" : "human_present";

  add("checkout_signed", "Checkout signed by the merchant", () => {
    const { header, payload } = decodeJws(p.checkoutJwt);
    checkoutPayload = payload;
    const mid = String((payload.merchant as Json | undefined)?.id ?? "");
    const k = keys.merchant(mid) ?? fail(`No key for merchant ${mid}`);
    if (!verifyJws(p.checkoutJwt, k)) fail("Checkout signature does not verify");
    return `Signed by ${String((payload.merchant as Json).name)} (${String(header.kid ?? mid)})`;
  });
  add("checkout_chain", mode === "human_present" ? "Checkout Mandate signed by the user" : "Checkout Mandate chain verifies (user's open mandate, agent's closed mandate)", () => {
    checkoutMandates = verifyChain(p.checkoutChain, keys.root, { now: o.now });
    const closed = checkoutMandates.at(-1)!;
    if (closed.vct !== VCT.checkout) fail(`Closed mandate has vct ${String(closed.vct)}`);
    return `${checkoutMandates.length} mandate(s), closed ${VCT.checkout}`;
  });
  add("checkout_hash", "Checkout Mandate is bound to the merchant's checkout", () => {
    const closed = checkoutMandates.at(-1) ?? fail("no closed checkout mandate");
    if (closed.checkout_hash !== sha256b64url(p.checkoutJwt)) fail("checkout_hash does not match the checkout JWT");
    if (closed.checkout_jwt !== undefined && closed.checkout_jwt !== p.checkoutJwt) fail("checkout_jwt differs from the presented checkout");
    return "checkout_hash matches";
  });
  if (mode === "human_not_present")
    add("checkout_constraints", "Checkout within the user's open Checkout Mandate", () => {
      const v = checkCheckoutConstraints(checkoutMandates[0] ?? {}, checkoutPayload);
      if (v.length) fail(v.join("; "));
      return "All constraints met";
    });
  add("payment_chain", mode === "human_present" ? "Payment Mandate signed by the user" : "Payment Mandate chain verifies", () => {
    paymentMandates = verifyChain(p.paymentChain, keys.root, { now: o.now });
    const closed = paymentMandates.at(-1)!;
    if (closed.vct !== VCT.payment) fail(`Closed mandate has vct ${String(closed.vct)}`);
    return `${paymentMandates.length} mandate(s), closed ${VCT.payment}`;
  });
  add("payment_matches_checkout", "Payment Mandate pays this exact checkout", () => {
    const closed = paymentMandates.at(-1) ?? fail("no closed payment mandate");
    if (closed.transaction_id !== sha256b64url(p.checkoutJwt)) fail("transaction_id is not the checkout hash");
    const total = ((checkoutPayload.totals as Json[] | undefined) ?? []).find((t) => t.type === "total")?.amount;
    const amt = closed.payment_amount as { amount: number; currency: string };
    if (amt.amount !== total || amt.currency !== checkoutPayload.currency) fail(`Pays ${amt.amount} ${amt.currency}, checkout totals ${String(total)} ${String(checkoutPayload.currency)}`);
    const payee = closed.payee as Json;
    if (!merchantMatches(payee, (checkoutPayload.merchant as Json) ?? {})) fail("Payee is not the checkout's merchant");
    return `${(amt.amount / 100).toFixed(2)} ${amt.currency} to ${String(payee.name)}`;
  });
  if (mode === "human_not_present")
    add("payment_constraints", "Payment within the user's open Payment Mandate", () => {
      const openCheckoutHash = sha256b64url(parseChain(p.checkoutChain)[0]!.sdJwt);
      const v = checkPaymentConstraints(paymentMandates[0] ?? {}, paymentMandates.at(-1) ?? {}, { openCheckoutHash, context: o.context });
      if (v.length) fail(v.join("; "));
      return "All constraints met";
    });
  const receipt = (id: string, label: string, jwt: string | undefined, chain: string) =>
    add(id, label, () => {
      if (!jwt) fail("No receipt yet");
      const { payload } = decodeJws(jwt!);
      const k = keys.receiptIssuer(String(payload.iss)) ?? fail(`Unknown receipt issuer ${String(payload.iss)}`);
      if (!verifyJws(jwt!, k)) fail("Receipt signature does not verify");
      if (payload.reference !== sha256b64url(closedJwtOf(chain))) fail("Receipt does not reference this closed mandate");
      if (payload.status !== "Success") fail(`Receipt status ${String(payload.status)}: ${String(payload.error_description ?? "")}`);
      return `${String(payload.iss)}: ${String(payload.order_id ?? payload.payment_id)}`;
    });
  if (p.checkoutReceipt !== undefined) receipt("checkout_receipt", "Merchant's checkout receipt", p.checkoutReceipt, p.checkoutChain);
  if (p.paymentReceipt !== undefined) receipt("payment_receipt", "Payment receipt from the payment gateway", p.paymentReceipt, p.paymentChain);

  const closedPay = paymentMandates.at(-1);
  return {
    ok: checks.every((c) => c.ok),
    mode,
    checks,
    amount: (closedPay?.payment_amount as PurchaseVerdict["amount"]) ?? null,
    merchant: (closedPay?.payee as Merchant | undefined) ?? null,
  };
}
