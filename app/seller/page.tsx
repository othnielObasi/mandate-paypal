"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, colorSchemeDark, colorSchemeLight, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { api } from "../components/api";

ModuleRegistry.registerModules([AllCommunityModule]);

type Check = { id: string; label: string; ok: boolean; detail: string };
type Row = { paypalOrderId: string; paymentMandateId: string; ok: boolean; mode: "human_not_present" | "human_present"; merchant: string; total: string; items: string[]; createdAt: string };
type Detail = Row & { checks: Check[]; notes: string[]; chain: unknown };
type Trust = { merchants: Record<string, { name: string; verified: boolean }> };

function Verdict(p: ICellRendererParams<Row, boolean>) {
  return p.value ? <span className="badge b-allow">✓ Backed by signed mandate</span> : <span className="badge b-block">✗ Not backed</span>;
}
function Mode(p: ICellRendererParams<Row, Row["mode"]>) {
  return p.value === "human_present" ? <span className="badge b-ask">Buyer approved</span> : <span className="badge b-info">Agent, within mandate</span>;
}

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(m.matches);
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return dark;
}

function SellerView() {
  const params = useSearchParams();
  const [trust, setTrust] = useState<Trust | null>(null);
  const [merchantId, setMerchantId] = useState(params.get("merchant") ?? "acme-supplies");
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dark = useDark();

  const open = useCallback(async (orderId: string) => {
    try {
      setDetail(await api<Detail>(`/api/verify/${encodeURIComponent(orderId)}`));
      setError(null);
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
    api<Row[]>(`/api/seller?merchantId=${encodeURIComponent(merchantId)}`).then(setRows).catch((e) => setError(String(e)));
  }, [merchantId]);

  const theme = useMemo(() => themeQuartz.withPart(dark ? colorSchemeDark : colorSchemeLight).withParams({ fontFamily: "inherit", fontSize: 13.5, headerFontWeight: 600, wrapperBorderRadius: 10 }), [dark]);
  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { field: "createdAt", headerName: "Time", width: 110, sort: "desc", valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleTimeString() : "") },
      { field: "items", headerName: "Items", flex: 1, minWidth: 200, valueFormatter: (p) => ((p.value as string[]) ?? []).join(", ") },
      { field: "total", headerName: "Total", width: 110 },
      { field: "mode", headerName: "Authorised by", width: 190, cellRenderer: Mode },
      { field: "ok", headerName: "Mandate check", width: 230, cellRenderer: Verdict },
      { field: "paypalOrderId", headerName: "PayPal order", width: 190, cellClass: "mono" },
    ],
    [],
  );

  return (
    <main>
      <header className="top">
        <h1>
          Seller view<span>is this agent payment backed by a mandate the buyer signed?</span>
        </h1>
        <a href="/">← Buyer view</a>
      </header>
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginTop: 0 }}>
          <label className="small">
            Merchant{" "}
            <select value={merchantId} onChange={(e) => (setMerchantId(e.target.value), setDetail(null))} aria-label="Merchant">
              {Object.entries(trust?.merchants ?? { "acme-supplies": { name: "Acme Supplies", verified: true } }).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.name}
                  {m.verified ? "" : " (unverified)"}
                </option>
              ))}
            </select>
          </label>
          <span className="small">Checked with public keys only: the buyer's Intent Mandate, your Cart Mandate, the Payment Mandate, and the fingerprint on the PayPal order.</span>
        </div>
        {error && <p className="error">{error}</p>}
        <div data-testid="seller-grid" style={{ marginTop: 12 }}>
          <AgGridReact<Row>
            theme={theme}
            rowData={rows}
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

      {detail && (
        <section className="panel" data-testid="seller-detail">
          <h2>PayPal order {detail.paypalOrderId}</h2>
          <p className={`verdict ${detail.ok ? "ok" : "bad"}`}>
            {detail.ok ? "✓ Safe to fulfil: this payment is backed by the buyer's signed mandate." : "✗ Do not rely on this payment: a check failed."}
          </p>
          <ul className="feed">
            {detail.checks.map((c) => (
              <li key={c.id}>
                <span className={`badge ${c.ok ? "b-allow" : "b-block"}`}>{c.ok ? "✓" : "✗"}</span>
                <strong>{c.label}</strong>
                <div className="small">{c.detail}</div>
              </li>
            ))}
          </ul>
          {detail.notes.map((n) => (
            <p className="small" key={n}>
              {n}
            </p>
          ))}
          <div className="row">
            <a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(detail.chain, null, 2))}`} download={`mandate-${detail.paymentMandateId}.json`}>
              Download credential chain (AP2-style JSON)
            </a>
          </div>
        </section>
      )}
    </main>
  );
}

export default function SellerPage() {
  return (
    <Suspense>
      <SellerView />
    </Suspense>
  );
}
