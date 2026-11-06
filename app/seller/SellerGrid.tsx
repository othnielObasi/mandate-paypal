"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { gridTheme } from "../components/grid-theme";

ModuleRegistry.registerModules([AllCommunityModule]);

export type SellerRow = { paypalOrderId: string; paymentMandateId: string; ok: boolean; mode: "human_not_present" | "human_present"; merchant: string; total: string; items: string[]; createdAt: string; ap2: boolean | null };

function Verdict(p: ICellRendererParams<SellerRow, boolean>) {
  return p.value ? <span className="chip chip-allow">Safe to fulfil</span> : <span className="chip chip-block">Don&rsquo;t ship</span>;
}
function Ap2Cell(p: ICellRendererParams<SellerRow, boolean | null>) {
  if (p.value === null || p.value === undefined) return <span className="chip chip-outline">Not issued</span>;
  return p.value ? <span className="chip chip-allow">Verified</span> : <span className="chip chip-block">Failed</span>;
}
function Mode(p: ICellRendererParams<SellerRow, SellerRow["mode"]>) {
  return p.value === "human_present" ? <span className="chip chip-ask">Buyer approved</span> : <span className="chip chip-accent">Within signed intent</span>;
}

/** The seller's payment grid. Its own module so the page can load AG Grid after the text is on screen. */
export default function SellerGrid({ rows, onOpen }: { rows: SellerRow[]; onOpen: (paypalOrderId: string) => void }) {
  const columns = useMemo<ColDef<SellerRow>[]>(
    () => [
      { field: "createdAt", headerName: "Time", width: 100, sort: "desc", valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "") },
      { field: "items", headerName: "Items", flex: 1, minWidth: 180, valueFormatter: (p) => ((p.value as string[]) ?? []).join(", ") },
      { field: "total", headerName: "Total", width: 100 },
      { field: "mode", headerName: "Authorised by", width: 190, cellRenderer: Mode, cellClass: "chipcell" },
      { field: "ap2", headerName: "AP2 v0.2", width: 130, cellRenderer: Ap2Cell, cellClass: "chipcell" },
      { colId: "verdict", headerName: "Verdict", width: 160, valueGetter: (p) => !!p.data && p.data.ok && p.data.ap2 !== false, cellRenderer: Verdict, cellClass: "chipcell" },
      { field: "paypalOrderId", headerName: "PayPal order", width: 190, cellClass: "mono" },
    ],
    [],
  );
  return (
    <AgGridReact<SellerRow>
      theme={gridTheme}
      rowData={rows}
      columnDefs={columns}
      getRowId={(p) => p.data.paypalOrderId}
      domLayout="autoHeight"
      rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
      onRowClicked={(e) => e.data && onOpen(e.data.paypalOrderId)}
      overlayNoRowsTemplate="No agent payments yet. Run the agent from the buyer view."
      defaultColDef={{ sortable: true, resizable: true, filter: true }}
    />
  );
}
