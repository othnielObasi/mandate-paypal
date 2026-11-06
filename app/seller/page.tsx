"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { api } from "../components/api";
import { SkRows } from "../components/Skeleton";
import { Back, Check, Cross, Download, Mark, Shield, ShieldX, Store } from "../components/icons";

import type { SellerRow } from "./SellerGrid";

// AG Grid is heavy: load it after the page text is on screen.
const SellerGrid = dynamic(() => import("./SellerGrid"), { ssr: false, loading: () => <SkRows rows={3} /> });

type CheckRow = { id: string; label: string; ok: boolean; detail: string };
type Row = SellerRow;
type Ap2 = { spec: string; ok: boolean; mode: "human_present" | "human_not_present"; checks: CheckRow[]; evidence: Record<string, unknown> };
type Detail = Row & { checks: CheckRow[]; notes: string[]; chain: unknown; ap2: Ap2 | null };
type Trust = { merchants: Record<string, { name: string; verified: boolean }> };


/** AP2 v0.2 (current spec): what each link in the chain proves, by check id. */
const AP2_GROUPS: Array<{ name: string; ids: string[]; who: (d: Detail) => string }> = [
  { name: "Your checkout", ids: ["checkout_signed"], who: () => "Signed by you (ES256)" },
  { name: "Checkout Mandate", ids: ["checkout_chain", "checkout_hash", "checkout_constraints"], who: (d) => (d.ap2?.mode === "human_present" ? "Signed by the customer" : "Customer's open mandate, closed by their agent") },
  { name: "Payment Mandate", ids: ["payment_chain", "payment_matches_checkout", "payment_constraints"], who: (d) => (d.ap2?.mode === "human_present" ? "Approved and signed by the customer" : "Within the customer's signed limits") },
  { name: "Customer's device", ids: ["passkey_approval"], who: () => "Approved with a passkey (Face ID, fingerprint or PIN)" },
  { name: "Receipts", ids: ["checkout_receipt", "payment_receipt"], who: () => "Your receipt and the payment gateway's" },
];

const GROUPS: Array<{ name: string; ids: string[]; who: (d: Detail) => string; ref: (d: Detail) => string }> = [
  { name: "Intent Mandate", ids: ["intent_signed_by_user", "intent_unexpired"], who: () => "Signed by the customer", ref: () => "limits the customer set" },
  { name: "Cart Mandate", ids: ["cart_signed_by_merchant", "cart_consistent", "cart_unexpired"], who: (d) => `Signed by ${d.merchant}`, ref: (d) => d.total },
  { name: "Payment Mandate", ids: ["payment_matches_cart", "payment_authorised", "within_intent"], who: (d) => (d.mode === "human_present" ? "Approved on the customer's device" : "Within the customer's signed limits"), ref: (d) => d.paymentMandateId },
  { name: "PayPal order", ids: ["paypal_order_fingerprint"], who: () => "Carries the payment mandate fingerprint", ref: (d) => d.paypalOrderId },
];

function SellerView() {
  const params = useSearchParams();
  const [trust, setTrust] = useState<Trust | null>(null);
  const [merchantId, setMerchantId] = useState(params.get("merchant") ?? "acme-supplies");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (orderId: string) => {
    try {
      setDetail(await api<Detail>(`/api/verify/${encodeURIComponent(orderId)}`));
      setError(null);
      requestAnimationFrame(() => {
        if (window.matchMedia("(max-width: 960px)").matches) document.getElementById("seller-detail")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    api<Trust>("/api/trust").then(setTrust).catch(() => undefined);
    const o = params.get("order");
    if (o) void open(o);
  }, [open, params]);

  useEffect(() => {
    setRows(null);
    api<Row[]>(`/api/seller?merchantId=${encodeURIComponent(merchantId)}`)
      .then(setRows)
      .catch((e) => setError(String(e)));
  }, [merchantId]);

  const merchants = trust?.merchants ?? { "acme-supplies": { name: "Acme Supplies", verified: true } };
  const name = merchants[merchantId]?.name ?? merchantId;
  const ap2 = detail?.ap2 ?? null;
  const shown = ap2?.checks ?? detail?.checks ?? [];
  const okCount = shown.filter((c) => c.ok).length;
  const safe = !!detail && detail.ok && (ap2 ? ap2.ok : true);

  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="seller-bar">
        <div className="wrap row between" style={{ minHeight: 64 }}>
          <span className="brand">
            <Mark />
            Mandate <small>for sellers</small>
          </span>
          <div className="row" style={{ gap: 16 }}>
            <label className="row small" style={{ gap: 8, color: "var(--night-muted)" }}>
              <Store size={16} />
              <span className="sr-only">Merchant</span>
              <select
                className="select"
                style={{ width: "auto", minHeight: 38, background: "var(--night-2)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}
                value={merchantId}
                onChange={(e) => (setMerchantId(e.target.value), setDetail(null))}
                aria-label="Merchant"
              >
                {Object.entries(merchants).map(([id, m]) => (
                  <option key={id} value={id}>
                    {m.name}
                    {m.verified ? "" : " (unverified)"}
                  </option>
                ))}
              </select>
            </label>
            <NextLink href="/app" className="back small row" style={{ gap: 6 }}>
              <Back size={16} /> Buyer view
            </NextLink>
          </div>
        </div>
      </header>

      <main id="main" className="wrap page">
        <section className="page-head">
          <div>
            <h1 className="page-title">Was this payment really authorised?</h1>
            <p className="page-sub">When an AI agent pays {name}, check the customer&rsquo;s signed mandates before you ship. If they&rsquo;re valid, a &ldquo;my agent did it without asking&rdquo; claim doesn&rsquo;t hold up.</p>
          </div>
        </section>
        {error && (
          <div className="banner banner-block" role="alert" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div className="col">
          <section className="card card-flush" aria-labelledby="pay-h">
            <h2 id="pay-h" className="card-title" style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
              Agent payments to {name}
            </h2>
            <div data-testid="seller-grid" className="grid-wrap">
              {rows === null ? (
                <div aria-busy="true" aria-label="Checking payments">
                  <SkRows rows={3} />
                </div>
              ) : (
              <SellerGrid rows={rows} onOpen={open} />
              )}
            </div>
          </section>

          <section id="seller-detail" className="col" aria-live="polite">
            {!detail ? (
              <div className="card empty" style={{ padding: "28px 24px" }}>
                <span className="icon-tile icon-tile-accent">
                  <Shield size={26} />
                </span>
                <h2>Pick a payment to check</h2>
                <p>Mandate checks the chain of consent with public keys only. You don&rsquo;t have to trust Mandate&rsquo;s word.</p>
              </div>
            ) : (
              <div className="seller-detail" data-testid="seller-detail">
                <div className={`card verdict ${safe ? "" : "bad"}`}>
                  <span className={`icon-tile ${safe ? "icon-tile-allow" : "icon-tile-block"}`} style={{ width: 52, height: 52 }}>
                    {safe ? <Shield size={28} /> : <ShieldX size={28} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ color: safe ? "var(--allow)" : "var(--block)" }}>{safe ? "Safe to fulfil" : "Don't ship this"}</h2>
                    <p className="small" style={{ marginTop: 2 }}>
                      {detail.items.join(", ")} · {detail.total} · PayPal order <span className="mono">{detail.paypalOrderId}</span>
                    </p>
                  </div>
                </div>

                <div className="card">
                  <div className="row between" style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 16 }}>The chain of consent</h3>
                    {ap2 && <span className="chip chip-accent">AP2 v0.2</span>}
                  </div>
                  {ap2 ? (
                    <ol className="chain">
                      {AP2_GROUPS.filter((g) => g.name !== "Customer's device" || ap2.checks.some((c) => c.id === "passkey_approval")).map((g) => {
                        const cs = ap2.checks.filter((c) => g.ids.includes(c.id));
                        const ok = cs.length > 0 && cs.every((c) => c.ok);
                        return (
                          <li key={g.name} className={ok ? (g.name === "Receipts" ? "ok" : undefined) : "bad"}>
                            <strong>{g.name}</strong>
                            {g.who(detail)}
                            <br />
                            <span className="mono">{cs.length} check{cs.length === 1 ? "" : "s"} {ok ? "passed" : "failed"}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                  <ol className="chain">
                    {GROUPS.map((g) => {
                      const cs = detail.checks.filter((c) => g.ids.includes(c.id));
                      const ok = cs.length > 0 && cs.every((c) => c.ok);
                      return (
                        <li key={g.name} className={ok ? (g.name === "PayPal order" ? "ok" : undefined) : "bad"}>
                          <strong>{g.name}</strong>
                          {g.who(detail)}
                          <br />
                          <span className="mono">{g.ref(detail)}</span>
                        </li>
                      );
                    })}
                  </ol>
                  )}
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 14 }}>
                    {okCount} of {shown.length} {ap2 ? "AP2 checks" : "checks"} passed
                  </h3>
                  <ul className="checks">
                    {shown.map((c) => (
                      <li key={c.id} className={c.ok ? undefined : "bad"}>
                        {c.ok ? <Check size={16} className="ok-ico" /> : <Cross size={16} className="bad-ico" />}
                        <span>
                          <strong style={{ fontWeight: 600 }}>{c.label}</strong>
                          <br />
                          <span className="small" style={{ overflowWrap: "anywhere" }}>
                            {c.detail}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {ap2 && (
                    <details className="mt-16">
                      <summary className="small" style={{ cursor: "pointer" }}>
                        Mandate v1 checks ({detail.checks.filter((c) => c.ok).length} of {detail.checks.length} passed)
                      </summary>
                      <ul className="checks mt-12">
                        {detail.checks.map((c) => (
                          <li key={c.id} className={c.ok ? undefined : "bad"}>
                            {c.ok ? <Check size={16} className="ok-ico" /> : <Cross size={16} className="bad-ico" />}
                            <span>
                              <strong style={{ fontWeight: 600 }}>{c.label}</strong>
                              <br />
                              <span className="small" style={{ overflowWrap: "anywhere" }}>
                                {c.detail}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {!ap2 && detail.notes.map((n) => (
                    <p className="small mt-12" key={n}>
                      {n}
                    </p>
                  ))}
                  <div className="row mt-16">
                    {ap2 ? (
                      <a className="btn btn-sm btn-primary" href={`/api/ap2/orders/${encodeURIComponent(detail.paypalOrderId)}`} download={`ap2-evidence-${detail.paypalOrderId}.json`}>
                        <Download size={15} /> Download AP2 evidence pack
                      </a>
                    ) : null}
                    <a className="btn btn-sm" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(detail.chain, null, 2))}`} download={`mandate-${detail.paymentMandateId}.json`}>
                      <Download size={15} /> Mandate v1 chain
                    </a>
                    <a className="small" href={ap2 ? "/api/ap2/jwks" : "/api/trust"} target="_blank" rel="noreferrer">
                      Public keys
                    </a>
                  </div>
                  <details className="incode mt-16">
                    <summary>
                      Check this payment in code <span className="chip chip-outline">APIMatic SDK</span>
                    </summary>
                    <pre className="code" tabIndex={0} aria-label="Code: check this payment with the SDK">{`import {
  MandateApiClient,
  ServerEnvironment,
} from "mandate-api";

const mandate = new MandateApiClient({
  serverEnvironment: ServerEnvironment.Production,
});

const v = await mandate.verification.verifyOrder({
  paypalOrderId: "${detail.paypalOrderId}",
});

// ${safe ? "This one: safe to fulfil" : "This one: don't ship"}
if (v.ok && v.ap2?.ok) fulfil(); else hold();`}</pre>
                    <p className="tiny">
                      Mandate&rsquo;s TypeScript SDK, generated by APIMatic from the OpenAPI spec. <NextLink href="/developers#sdk">More about the SDK</NextLink>
                    </p>
                  </details>
                </div>
              </div>
            )}
          </section>
        </div>
        <p className="tiny mt-24">
          AP2 v0.2 checks follow the specification&rsquo;s dispute rules: ES256 signatures, SD-JWT delegation chains, constraints and receipts, verified with the keys at /api/ap2/jwks. Mandate v1 checks use Ed25519 over canonical JSON, and the PayPal order carries the payment mandate&rsquo;s fingerprint.
        </p>
      </main>
    </>
  );
}

export default function SellerPage() {
  return (
    <Suspense>
      <SellerView />
    </Suspense>
  );
}
