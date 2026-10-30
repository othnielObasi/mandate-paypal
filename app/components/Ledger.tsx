"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type CellValueChangedEvent, type ColDef, type ICellRendererParams } from "ag-grid-community";
import type { Receipt } from "@/lib/gate/receipts";
import { editedSeqs, KIND_TONE, toRows, withEdits, type Kind, type LedgerRow } from "@/lib/ui/ledger";
import { api } from "./api";
import { gridTheme } from "./grid-theme";
import { Download, Shield, ShieldX } from "./icons";

ModuleRegistry.registerModules([AllCommunityModule]);

type Verify = { ok: true; count: number } | { ok: false; brokenAt: number; reason: string };

const TONE = { good: "chip-allow", warn: "chip-ask", bad: "chip-block", info: "chip-accent" } as const;

function KindChip(p: ICellRendererParams<LedgerRow, Kind>) {
  if (!p.value) return null;
  return <span className={`chip ${TONE[KIND_TONE[p.value]]}`}>{p.value[0]!.toUpperCase() + p.value.slice(1)}</span>;
}

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatch(m.matches);
    const on = (e: MediaQueryListEvent) => setMatch(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/**
 * The signed receipts ledger, on AG Grid. Every row is a signed, hash-chained
 * receipt. "What happened" is editable on purpose: change a cell, press
 * Verify, and the chain names the row that was altered.
 */
export function Ledger({ receipts, mandateId }: { receipts: Receipt[]; mandateId: string | null }) {
  const grid = useRef<AgGridReact<LedgerRow>>(null);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [checking, setChecking] = useState(false);
  const [quick, setQuick] = useState("");
  const [onlyThis, setOnlyThis] = useState(true);
  const narrow = useMedia("(max-width: 640px)");

  const runVerify = useCallback(async (list: Receipt[]) => {
    if (list.length === 0) return;
    setChecking(true);
    try {
      setVerify(await api<Verify>("/api/receipts/verify", { method: "POST", body: JSON.stringify({ receipts: list }) }));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    setRows(toRows(receipts));
    setVerify(null);
    void runVerify(receipts).catch(() => undefined);
  }, [receipts, runVerify]);

  const mandateOf = useMemo(() => new Map(receipts.map((r) => [r.seq, r.mandateId])), [receipts]);
  const edited = useMemo(() => new Set(editedSeqs(receipts, rows)), [receipts, rows]);
  const brokenAt = verify && !verify.ok ? verify.brokenAt : null;

  const columns = useMemo<ColDef<LedgerRow>[]>(
    () => [
      { field: "seq", headerName: "#", width: narrow ? 64 : 76, sort: "desc", filter: "agNumberColumnFilter" },
      { field: "time", headerName: "Time", width: 110, hide: narrow, valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }) : "") },
      { field: "kind", headerName: "Kind", width: narrow ? 140 : 168, cellRenderer: KindChip, filter: "agTextColumnFilter", cellClass: "chipcell" },
      {
        field: "summary",
        headerName: "What happened (double-click to edit)",
        flex: 1,
        minWidth: narrow ? 220 : 300,
        editable: true,
        wrapText: true,
        autoHeight: true,
        cellClass: "wrap",
        filter: "agTextColumnFilter",
        cellClassRules: { "cell-edited": (p) => !!p.data && edited.has(p.data.seq) },
      },
      { field: "hash", headerName: "Hash", width: 150, hide: narrow, cellClass: "mono", valueFormatter: (p) => `${String(p.value ?? "").slice(0, 12)}…` },
    ],
    [edited, narrow],
  );

  const shown = useMemo(() => (onlyThis && mandateId ? rows.filter((r) => mandateOf.get(r.seq) === mandateId) : rows), [rows, onlyThis, mandateId, mandateOf]);

  const onEdit = (e: CellValueChangedEvent<LedgerRow>) => {
    if (!e.data) return;
    const changed = e.data;
    setRows((rs) => rs.map((r) => (r.seq === changed.seq ? { ...r, summary: String(changed.summary ?? "") } : r)));
    setVerify(null);
  };

  return (
    <div data-testid="ledger" className="stack" style={{ gap: 16 }}>
      {verify ? (
        <div className={`banner ${verify.ok ? "banner-allow" : "banner-block"}`} data-testid="verify-result" role="status">
          {verify.ok ? <Shield size={22} /> : <ShieldX size={22} />}
          <strong>{verify.ok ? `All ${verify.count} receipts verified` : `Chain broken at receipt #${verify.brokenAt}`}</strong>
          <span style={{ fontSize: 14 }}>
            {verify.ok ? "Ed25519 signatures valid · hash chain unbroken" : `${verify.reason.replace(/_/g, " ")}. That row was altered after it was signed.`}
          </span>
        </div>
      ) : edited.size > 0 ? (
        <div className="banner banner-ask" role="status">
          <strong>You edited {edited.size} row{edited.size > 1 ? "s" : ""}.</strong>
          <span style={{ fontSize: 14 }}>Press Verify chain to see whether the ledger notices.</span>
        </div>
      ) : (
        <div className="banner banner-info" role="status">
          {checking ? <span className="spinner" aria-hidden="true" /> : <Shield size={20} />}
          <span>{receipts.length === 0 ? "No receipts yet." : "Checking every signature…"}</span>
        </div>
      )}

      <div className="row">
        <button className="btn btn-primary" onClick={() => runVerify(withEdits(receipts, rows))} disabled={receipts.length === 0 || checking}>
          <Shield size={16} /> Verify chain
        </button>
        <button className="btn" onClick={() => (setRows(toRows(receipts)), setVerify(null))} disabled={edited.size === 0}>
          Undo edits
        </button>
        <button className="btn" onClick={() => grid.current?.api.exportDataAsCsv({ fileName: "mandate-receipts.csv" })} disabled={receipts.length === 0}>
          <Download size={16} /> Export CSV
        </button>
        <input type="search" className="input grow" style={{ flex: "1 1 180px", width: "auto" }} placeholder="Search receipts" value={quick} onChange={(e) => setQuick(e.target.value)} aria-label="Search receipts" />
        <label className="check small">
          <input type="checkbox" checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} /> This mandate only
        </label>
      </div>

      <div className="card card-flush grid-wrap">
        <AgGridReact<LedgerRow>
          ref={grid}
          theme={gridTheme}
          rowData={shown}
          columnDefs={columns}
          getRowId={(p) => String(p.data.seq)}
          quickFilterText={quick}
          domLayout="autoHeight"
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={narrow ? false : [10, 25, 50]}
          singleClickEdit={false}
          stopEditingWhenCellsLoseFocus
          onCellValueChanged={onEdit}
          rowClassRules={{ "row-broken": (p) => !!p.data && p.data.seq === brokenAt }}
          defaultColDef={{ sortable: true, resizable: true }}
          overlayNoRowsTemplate="No receipts yet."
        />
      </div>
    </div>
  );
}
