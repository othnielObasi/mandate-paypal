"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef, type ColGroupDef, type ICellRendererParams, type IRowNode } from "ag-grid-community";
import type { Receipt } from "@/lib/gate/receipts";
import { explorerRow, RULE_COLUMNS, type Check, type ExplorerRow } from "@/lib/ui/explorer";
import { merchantName } from "../../components/api";
import { gridTheme } from "../../components/grid-theme";
import { Download } from "../../components/icons";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHECK_VIEW: Record<Exclude<Check, null>, { text: string; cls: string; title: string }> = {
  pass: { text: "✓", cls: "chk-pass", title: "Passed" },
  approved: { text: "✓ you", cls: "chk-pass", title: "Over a limit, approved by you" },
  ask: { text: "asks", cls: "chk-ask", title: "Asked you" },
  block: { text: "✕", cls: "chk-block", title: "Blocked here" },
  skip: { text: "·", cls: "chk-muted", title: "Not checked: an earlier rule decided" },
  off: { text: "off", cls: "chk-muted", title: "Rule switched off in your mandate" },
};

function CheckCell(p: ICellRendererParams<ExplorerRow, Check>) {
  if (p.node.rowPinned) return null;
  const v = p.value ? CHECK_VIEW[p.value] : null;
  if (!v) return <span className="chk-muted" title="Recorded before per-rule results were kept">—</span>;
  return (
    <span className={`chk ${v.cls}`} title={v.title}>
      {v.text}
    </span>
  );
}

const OUTCOME_CHIP = { Allowed: "chip-allow", "Asked you": "chip-ask", Blocked: "chip-block" } as const;
function OutcomeCell(p: ICellRendererParams<ExplorerRow, ExplorerRow["outcome"]>) {
  if (p.node.rowPinned) return <strong>{String(p.value ?? "")}</strong>;
  return p.value ? <span className={`chip ${OUTCOME_CHIP[p.value]}`}>{p.value}</span> : null;
}

/** Quick views: each a plain test on a row. */
const VIEWS: Array<{ id: string; label: string; test: (r: ExplorerRow) => boolean }> = [
  { id: "all", label: "All", test: () => true },
  { id: "blocked", label: "Blocked", test: (r) => r.outcome === "Blocked" },
  { id: "asked", label: "Asked you", test: (r) => r.outcome === "Asked you" },
  { id: "hijack", label: "Hijack attempts", test: (r) => r.rule_source === "block" || r.source === "A web or product page" },
  { id: "scheduled", label: "Scheduled buys", test: (r) => r.source === "Scheduled buy" },
];

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Every gate decision as a row, with the 7 rules as columns: audit an AI agent rule by rule.
 * Built from the signed log, so each row carries its receipt number.
 */
export default function DecisionExplorer({ receipts, mandateId }: { receipts: Receipt[]; mandateId: string | null }) {
  const grid = useRef<AgGridReact<ExplorerRow>>(null);
  const [view, setView] = useState("all");
  const [quick, setQuick] = useState("");
  const [shown, setShown] = useState<ExplorerRow[]>([]);

  const rows = useMemo(
    () => receipts.filter((r) => !mandateId || r.mandateId === mandateId).map(explorerRow).filter((r): r is ExplorerRow => r !== null).reverse(),
    [receipts, mandateId],
  );

  // The 7 rules come right after what was bought and what happened, so they're on screen without scrolling.
  const columns = useMemo<Array<ColDef<ExplorerRow> | ColGroupDef<ExplorerRow>>>(
    () => [
      {
        headerName: "Purchase",
        children: [
          { field: "seq", headerName: "#", width: 64, sort: "desc", filter: "agNumberColumnFilter" },
          { field: "item", headerName: "Item", minWidth: 190, flex: 1, filter: "agTextColumnFilter", tooltipField: "item" },
          { field: "outcome", headerName: "Outcome", width: 120, cellRenderer: OutcomeCell, filter: "agTextColumnFilter" },
        ],
      },
      {
        headerName: "The 7 rules, in order",
        headerClass: "rules-group",
        children: RULE_COLUMNS.map(([k, label]) => ({
          field: `rule_${k}` as keyof ExplorerRow,
          headerName: label,
          width: 92,
          cellRenderer: CheckCell,
          cellClass: "chk-cell",
          sortable: false,
          filter: false,
          headerTooltip: label,
        })),
      },
      {
        headerName: "Details",
        children: [
          { field: "amount", headerName: "Amount", width: 104, type: "rightAligned", valueFormatter: (p) => (typeof p.value === "number" ? money(p.value) : ""), filter: "agNumberColumnFilter" },
          { field: "merchant", headerName: "Seller", width: 150, filter: "agTextColumnFilter", valueFormatter: (p) => (p.value ? merchantName(String(p.value)) : "") },
          { field: "rule", headerName: "Decided by", width: 180, filter: "agTextColumnFilter" },
          { field: "source", headerName: "Started by", width: 180, filter: "agTextColumnFilter" },
          { field: "at", headerName: "When", width: 140, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "") },
        ],
      },
    ],
    [],
  );

  const viewTest = VIEWS.find((v) => v.id === view)!.test;
  const isExternalFilterPresent = useCallback(() => view !== "all", [view]);
  const doesExternalFilterPass = useCallback((n: IRowNode<ExplorerRow>) => (n.data ? viewTest(n.data) : true), [viewTest]);

  // Totals for what's on screen, pinned under the grid.
  const totals = useMemo<ExplorerRow[]>(() => {
    if (!shown.length) return [];
    const allowed = shown.filter((r) => r.outcome === "Allowed").reduce((s, r) => s + r.amount, 0);
    return [{ item: `${shown.length} decisions · ${money(allowed)} allowed`, amount: shown.reduce((s, r) => s + r.amount, 0), outcome: `${shown.filter((r) => r.outcome === "Blocked").length} blocked` } as unknown as ExplorerRow];
  }, [shown]);

  const recount = useCallback(() => {
    const out: ExplorerRow[] = [];
    grid.current?.api?.forEachNodeAfterFilter((n) => n.data && out.push(n.data));
    setShown(out);
  }, []);

  return (
    <section className="card explorer" aria-labelledby="ex-h" data-testid="decision-explorer">
      <div className="card-head explorer-head">
        <div>
          <h2 id="ex-h" className="card-title">
            Decision explorer
          </h2>
          <p className="tiny">Every purchase your agents tried, and how each of the 7 rules came out. Each row is a signed receipt.</p>
        </div>
        <button className="btn btn-sm" onClick={() => grid.current?.api?.exportDataAsCsv({ fileName: "mandate-decisions.csv", skipPinnedBottom: true })} disabled={!rows.length}>
          <Download size={14} /> CSV
        </button>
      </div>
      <div className="explorer-tools">
        <div className="seg" role="group" aria-label="Show">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={`seg-btn${view === v.id ? " on" : ""}`} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="ex-q">
          Search decisions
        </label>
        <input id="ex-q" className="input chan-input explorer-q" placeholder="Search item, seller, rule…" value={quick} onChange={(e) => setQuick(e.target.value)} />
      </div>
      <div className="explorer-grid">
        <AgGridReact<ExplorerRow>
          ref={grid}
          theme={gridTheme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={{ resizable: true, sortable: true, floatingFilter: false }}
          quickFilterText={quick}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          pinnedBottomRowData={totals}
          onFilterChanged={recount}
          onRowDataUpdated={recount}
          onFirstDataRendered={recount}
          overlayNoRowsTemplate="No decisions yet. Ask your agent to buy something."
          getRowId={(p) => String(p.data.seq)}
        />
      </div>
    </section>
  );
}
