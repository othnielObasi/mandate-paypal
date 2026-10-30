"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { api } from "../components/api";
import { gridTheme } from "../components/grid-theme";
import { Back, Check, Cross, Download, Mark, Shield, ShieldX, Store } from "../components/icons";

ModuleRegistry.registerModules([AllCommunityModule]);

type CheckRow = { id: string; label: string; ok: boolean; detail: string };
type Row = { paypalOrderId: string; paymentMandateId: string; ok: boolean; mode: "human_not_present" | "human_present"; merchant: string; total: string; items: string[]; createdAt: string };
type Detail = Row & { checks: CheckRow[]; notes: string[]; chain: unknown };
type Trust = { merchants: Record<string, { name: string; verified: boolean }> };

function Verdict(p: ICellRendererParams<Row, boolean>) {
  return p.value ? <span className="chip chip-allow">Safe to fulfil</span> : <span className="chip chip-block">Don&rsquo;t ship</span>;
}
function Mode(p: ICellRendererParams<Row, Row["mode"]>) {
  return p.value === "human_present" ? <span className="chip chip-ask">Buyer approved</span> : <span className="chip chip-accent">Within signed intent</span>;
}

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

  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { field: "createdAt", headerName: "Time", width: 100, sort: "desc", valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "") },
      { field: "items", headerName: "Items", flex: 1, minWidth: 180, valueFormatter: (p) => ((p.value as string[]) ?? []).join(", ") },
      { field: "total", headerName: "Total", width: 100 },
      { field: "mode", headerName: "Authorised by", width: 190, cellRenderer: Mode, cellClass: "chipcell" },
      { field: "ok", headerName: "Mandate check", width: 160, cellRenderer: Verdict, cellClass: "chipcell" },
      { field: "paypalOrderId", headerName: "PayPal order", width: 190, cellClass: "mono" },
    ],
    [],
  );
  const merchants = trust?.merchants ?? { "acme-supplies": { name: "Acme Supplies", verified: true } };
  const name = merchants[merchantId]?.name ?? merchantId;
  const okCount = detail?.checks.filter((c) => c.ok).length ?? 0;

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
              <AgGridReact<Row>
                theme={gridTheme}
                rowData={rows ?? undefined}
                columnDefs={columns}
                getRowId={(p) => p.data.paypalOrderId}
                domLayout="autoHeight"
                rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
                onRowClicked={(e) => e.data && open(e.data.paypalOrderId)}
                overlayNoRowsTemplate="No agent payments yet. Run the agent from the buyer view."
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
              />
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
                <div className={`card verdict ${detail.ok ? "" : "bad"}`}>
                  <span className={`icon-tile ${detail.ok ? "icon-tile-allow" : "icon-tile-block"}`} style={{ width: 52, height: 52 }}>
                    {detail.ok ? <Shield size={28} /> : <ShieldX size={28} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ color: detail.ok ? "var(--allow)" : "var(--block)" }}>{detail.ok ? "Safe to fulfil" : "Don't ship this"}</h2>
                    <p className="small" style={{ marginTop: 2 }}>
                      {detail.items.join(", ")} · {detail.total} · PayPal order <span className="mono">{detail.paypalOrderId}</span>
                    </p>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 14 }}>The chain of consent</h3>
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
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 14 }}>
                    {okCount} of {detail.checks.length} checks passed
                  </h3>
                  <ul className="checks">
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
                  {detail.notes.map((n) => (
                    <p className="small mt-12" key={n}>
                      {n}
                    </p>
                  ))}
                  <div className="row mt-16">
                    <a className="btn btn-sm" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(detail.chain, null, 2))}`} download={`mandate-${detail.paymentMandateId}.json`}>
                      <Download size={15} /> Download credential chain (AP2-style JSON)
                    </a>
                    <a className="small" href="/api/trust" target="_blank" rel="noreferrer">
                      Public keys
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        <p className="tiny mt-24">Checks use Ed25519 signatures over canonical JSON; the PayPal order carries the payment mandate&rsquo;s fingerprint in its item description.</p>
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
