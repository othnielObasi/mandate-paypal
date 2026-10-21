"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type CellValueChangedEvent,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import type { Receipt } from "@/lib/gate/receipts";
import { editedSeqs, KIND_TONE, toRows, withEdits, type Kind, type LedgerRow } from "@/lib/ui/ledger";
import { api } from "./api";

ModuleRegistry.registerModules([AllCommunityModule]);

type Verify = { ok: true; count: number } | { ok: false; brokenAt: number; reason: string };

const TONE_CLASS = { good: "b-allow", warn: "b-ask", bad: "b-block", info: "b-info" } as const;

function KindBadge(p: ICellRendererParams<LedgerRow, Kind>) {
  if (!p.value) return null;
  return <span className={`badge ${TONE_CLASS[KIND_TONE[p.value]]}`}>{p.value}</span>;
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

/**
 * The receipts ledger, built on AG Grid. Every row is a signed, hash-chained
 * receipt. The "What happened" column is editable on purpose: change any
 * cell, press Verify, and the chain names the row that was altered.
 */
export function Ledger({ receipts, mandateId }: { receipts: Receipt[]; mandateId: string | null }) {
  const grid = useRef<AgGridReact<LedgerRow>>(null);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [quick, setQuick] = useState("");
  const [onlyThis, setOnlyThis] = useState(true);
  const dark = useDark();
  const narrow = useMedia("(max-width: 640px)");

  useEffect(() => {
    setRows(toRows(receipts));
    setVerify(null);
  }, [receipts]);

  const mandateOf = useMemo(() => new Map(receipts.map((r) => [r.seq, r.mandateId])), [receipts]);
  const edited = useMemo(() => new Set(editedSeqs(receipts, rows)), [receipts, rows]);
  const brokenAt = verify && !verify.ok ? verify.brokenAt : null;

  const theme = useMemo(
    () =>
      themeQuartz.withPart(dark ? colorSchemeDark : colorSchemeLight).withParams({
        fontFamily: "inherit",
        fontSize: 13.5,
        headerFontWeight: 600,
        accentColor: dark ? "#7ea2ff" : "#1f4fd8",
        wrapperBorderRadius: 10,
      }),
    [dark],
  );

  const columns = useMemo<ColDef<LedgerRow>[]>(
    () => [
      { field: "seq", headerName: "#", width: narrow ? 70 : 90, sort: "desc", filter: "agNumberColumnFilter" },
      {
        field: "time",
        headerName: "Time",
        width: 110,
        hide: narrow,
        valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleTimeString() : ""),
      },
      { field: "kind", headerName: "Kind", width: narrow ? 128 : 160, cellRenderer: KindBadge, filter: "agTextColumnFilter", cellClass: "badgecell" },
      {
        field: "summary",
        headerName: "What happened (double-click to edit)",
        flex: 1,
        minWidth: narrow ? 200 : 280,
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

  const runVerify = async () => {
    const copy = withEdits(receipts, rows);
    setVerify(await api<Verify>("/api/receipts/verify", { method: "POST", body: JSON.stringify({ receipts: copy }) }));
  };

  return (
    <div data-testid="ledger">
      <div className="row" style={{ marginTop: 0, marginBottom: 10 }}>
        <button className="primary" onClick={runVerify} disabled={receipts.length === 0}>
          Verify chain
        </button>
        <button onClick={() => (setRows(toRows(receipts)), setVerify(null))} disabled={edited.size === 0}>
          Undo edits
        </button>
        <button onClick={() => grid.current?.api.exportDataAsCsv({ fileName: "mandate-receipts.csv" })} disabled={receipts.length === 0}>
          Export CSV
        </button>
        <input type="text" className="quick" placeholder="Search receipts" value={quick} onChange={(e) => setQuick(e.target.value)} aria-label="Search receipts" />
        <label className="check small">
          <input type="checkbox" checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} /> This mandate only
        </label>
      </div>
      {verify && (
        <p className={`verdict ${verify.ok ? "ok" : "bad"}`} data-testid="verify-result">
          {verify.ok
            ? `✓ All ${verify.count} receipts verified: Ed25519 signatures and hash chain intact.`
            : `✗ Chain broken at receipt #${verify.brokenAt} (${verify.reason.replace(/_/g, " ")}). That row was altered.`}
        </p>
      )}
      {edited.size > 0 && !verify && <p className="small">You edited {edited.size} row(s). Press Verify chain to see if the ledger notices.</p>}
      <AgGridReact<LedgerRow>
        ref={grid}
        theme={theme}
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
      />
    </div>
  );
}
