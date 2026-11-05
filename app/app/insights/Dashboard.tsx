"use client";

import { useMemo } from "react";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { AgFieldDefinition, AgReportState } from "ag-studio";
import type { Insights } from "@/lib/ui/insights";

// AG Studio licence keys are meant to ship to the browser; without one Studio shows a watermark.
const LICENSE = process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY || undefined;

const title = (text: string) => ({ title: { enabled: true, text } });
const kpi = (text: string) => ({ ...title(text), style: { textScaling: { enabled: true } } });

/** The dashboard, defined as an AG Studio report: KPIs, outcome and rule breakdowns, spend, and the decision log. */
export const REPORT: AgReportState = {
  pages: [
    {
      id: "overview",
      widgets: {
        paid: { type: "value", dataMapping: { value: [{ id: "payments.amount", aggregation: "sum" }] }, format: kpi("Paid through PayPal ($)") },
        payments: { type: "value", dataMapping: { value: [{ id: "payments.n", aggregation: "sum" }] }, format: kpi("Payments") },
        decisions: { type: "value", dataMapping: { value: [{ id: "decisions.n", aggregation: "sum" }] }, format: kpi("Gate decisions") },
        outcomes: {
          type: "donut-chart",
          dataMapping: { categoryKey: [{ id: "decisions.outcome" }], valueKey: [{ id: "decisions.n", aggregation: "sum" }] },
          format: title("Outcomes"),
        },
        rules: {
          type: "bar-chart-stacked",
          dataMapping: {
            categoryKey: [{ id: "decisions.rule" }],
            valueKey: [{ id: "decisions.n", aggregation: "sum" }],
            legendKey: [{ id: "decisions.outcome" }],
          },
          format: title("Which rule decided"),
        },
        daily: {
          type: "column-chart-grouped",
          dataMapping: { categoryKey: [{ id: "payments.day" }], valueKey: [{ id: "payments.amount", aggregation: "sum" }] },
          format: title("Spend per day ($)"),
        },
        merchants: {
          type: "bar-chart-grouped",
          dataMapping: { categoryKey: [{ id: "payments.merchant" }], valueKey: [{ id: "payments.amount", aggregation: "sum" }] },
          format: title("Spend by merchant ($)"),
        },
        log: {
          type: "grid",
          dataMapping: {
            cols: [
              { id: "decisions.seq" },
              { id: "decisions.day" },
              { id: "decisions.outcome" },
              { id: "decisions.rule" },
              { id: "decisions.item" },
              { id: "decisions.merchant" },
              { id: "decisions.amount", aggregation: "sum" },
              { id: "decisions.source" },
            ],
          },
          format: title("Decision log (each row is a signed receipt)"),
        },
      },
      widgetLayout: {
        paid: { xTrack: 0, yTrack: 0, xSpan: 8, ySpan: 6 },
        payments: { xTrack: 8, yTrack: 0, xSpan: 8, ySpan: 6 },
        decisions: { xTrack: 16, yTrack: 0, xSpan: 8, ySpan: 6 },
        outcomes: { xTrack: 0, yTrack: 6, xSpan: 9, ySpan: 14 },
        rules: { xTrack: 9, yTrack: 6, xSpan: 15, ySpan: 14 },
        daily: { xTrack: 0, yTrack: 20, xSpan: 12, ySpan: 14 },
        merchants: { xTrack: 12, yTrack: 20, xSpan: 12, ySpan: 14 },
        log: { xTrack: 0, yTrack: 34, xSpan: 24, ySpan: 18 },
      },
    },
  ],
  selectedPageId: "overview",
  panels: { filters: { collapsed: true } },
} as AgReportState;

const text = (id: string, name: string): AgFieldDefinition => ({ id, name, format: "textFormat" });
const num = (id: string, name: string, format: "decimalFormat" | "integerFormat" = "decimalFormat"): AgFieldDefinition => ({ id, name, format });

/**
 * Declared, not inferred: Studio infers fields from rows, so an empty source (no payment captured
 * yet, e.g. every PayPal order still waiting for the buyer) would otherwise have no fields at all.
 */
export const FIELDS: Record<"decisions" | "payments", AgFieldDefinition[]> = {
  decisions: [
    num("n", "Count", "integerFormat"),
    num("seq", "Receipt #", "integerFormat"),
    { id: "at", name: "Time", format: "dateTimeFormat" },
    text("day", "Day"),
    text("outcome", "Outcome"),
    text("rule", "Rule"),
    text("item", "Item"),
    text("category", "Category"),
    text("merchant", "Merchant"),
    num("amount", "Amount ($)"),
    text("source", "Started by"),
  ],
  payments: [
    num("n", "Count", "integerFormat"),
    { id: "at", name: "Time", format: "dateTimeFormat" },
    text("day", "Day"),
    num("amount", "Amount ($)"),
    text("merchant", "Merchant"),
    text("paypalOrderId", "PayPal order"),
  ],
};

export default function Dashboard({ insights, editing }: { insights: Insights; editing: boolean }) {
  const data = useMemo(
    () => ({
      sources: [
        { id: "decisions", name: "Gate decisions", data: insights.decisions as unknown as Record<string, unknown>[], fields: FIELDS.decisions },
        { id: "payments", name: "Payments", data: insights.payments as unknown as Record<string, unknown>[], fields: FIELDS.payments },
      ],
    }),
    [insights],
  );
  return (
    <AgStudioProvider licenseKey={LICENSE}>
      <div style={{ height: 900 }}>
        <AgStudio data={data} initialState={REPORT} mode={editing ? "edit" : "view"} style={{ height: "100%" }} />
      </div>
    </AgStudioProvider>
  );
}
