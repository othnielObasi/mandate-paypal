"use client";

import { useEffect, useMemo, useState } from "react";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { AgFieldDefinition, AgReportState } from "ag-studio";
import type { Insights } from "@/lib/ui/insights";
import { UI, mandateStudioTheme } from "./studio-theme";

// AG Studio licence keys are meant to ship to the browser; without one Studio shows a watermark.
const LICENSE = process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY || undefined;

const title = (text: string) => ({ title: { enabled: true, text, typography: { fontSize: 15, fontWeight: "bold" as const } } });
/** A chart title with its legend always shown (so "Paid" and "Waiting for PayPal" are labelled even when only one appears). */
const withLegend = (text: string) => ({ ...title(text), style: { theme: { common: { legend: { enabled: true, position: "bottom" as const } } } } });
const kpi = (text: string) => ({ ...title(text), style: { typography: { fontSize: 30, fontWeight: "bold" as const }, textScaling: { enabled: false } } });

/** The dashboard, defined as an AG Studio report: KPIs, outcome and rule breakdowns, spend, and the decision log. */
export const REPORT: AgReportState = {
  pages: [
    {
      id: "overview",
      layout: {
        backgroundColor: UI.light.bg,
        widgetBackgroundColor: UI.light.surface,
        widgetBorderEnabled: true,
        widgetBorderColor: UI.light.line,
        widgetBorderWidth: 1,
        widgetBorderRadius: 16,
        widgetPadding: 12,
      },
      widgets: {
        paid: { type: "value", dataMapping: { value: [{ id: "payments.paid", aggregation: "sum" }] }, format: kpi("Paid through PayPal ($)") },
        waiting: { type: "value", dataMapping: { value: [{ id: "payments.waiting", aggregation: "sum" }] }, format: kpi("Waiting for PayPal ($)") },
        payments: { type: "value", dataMapping: { value: [{ id: "payments.paidN", aggregation: "sum" }] }, format: kpi("Payments") },
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
          type: "column-chart-stacked",
          dataMapping: { categoryKey: [{ id: "payments.day" }], valueKey: [{ id: "payments.amount", aggregation: "sum" }], legendKey: [{ id: "payments.status" }] },
          format: withLegend("Spend per day ($)"),
        },
        merchants: {
          type: "bar-chart-stacked",
          dataMapping: { categoryKey: [{ id: "payments.merchant" }], valueKey: [{ id: "payments.amount", aggregation: "sum" }], legendKey: [{ id: "payments.status" }] },
          format: withLegend("Spend by merchant ($)"),
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
        paid: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 6 },
        waiting: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 6 },
        payments: { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: 6 },
        decisions: { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: 6 },
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
    num("seq", "#", "integerFormat"),
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
    text("status", "Status"),
    num("paid", "Paid ($)"),
    num("paidN", "Paid count", "integerFormat"),
    num("waiting", "Waiting for PayPal ($)"),
  ],
};

function useDarkScheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => setDark(m.matches && document.documentElement.dataset.theme !== "light");
    read();
    m.addEventListener("change", read);
    return () => m.removeEventListener("change", read);
  }, []);
  return dark;
}

export default function Dashboard({ insights, editing }: { insights: Insights; editing: boolean }) {
  const dark = useDarkScheme();
  const theme = useMemo(() => mandateStudioTheme(dark), [dark]);
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
      <div className="studio-wrap" style={{ height: 900 }}>
        <AgStudio data={data} key={dark ? "dark" : "light"} initialState={reportFor(dark)} mode={editing ? "edit" : "view"} theme={theme} style={{ height: "100%" }} />
      </div>
    </AgStudioProvider>
  );
}

/** The report with layout colours for the current scheme. Concrete hex: Customise mode's colour pickers can't parse CSS variables. */
export function reportFor(dark: boolean): AgReportState {
  const u = dark ? UI.dark : UI.light;
  return {
    ...REPORT,
    pages: REPORT.pages?.map((p) => ({ ...p, layout: { ...p.layout, backgroundColor: u.bg, widgetBackgroundColor: u.surface, widgetBorderColor: u.line } })),
  } as AgReportState;
}
