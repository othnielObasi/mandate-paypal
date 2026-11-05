"use client";

import { studioTheme } from "ag-studio";

/**
 * AG Studio themed from the app's design tokens, so Insights looks like the rest of Mandate.
 * Chrome (panels, cards, grid) uses the CSS variables and follows light/dark automatically.
 * Charts draw on a canvas, which can't read CSS variables, so they get concrete colours per scheme.
 * The palette's first three slots line up with the outcomes (Allowed, Asked you, Blocked, which
 * Studio orders alphabetically): green, amber, red, as on the app's badges.
 */
const CHART = {
  light: { text: "#0f172a", subtle: "#4b5565", grid: "#e2e5ea", axis: "#cbd2dc", tooltip: "#ffffff", palette: ["#1f9d63", "#d98a1c", "#d64545", "#1e40af", "#64748b", "#7c3aed", "#0e7490", "#be185d", "#4d7c0f"] },
  dark: { text: "#e8edf6", subtle: "#9aa6b8", grid: "#243049", axis: "#33415e", tooltip: "#17223a", palette: ["#4cc38a", "#f2b45a", "#ff8f87", "#7ea2ff", "#9aa6b8", "#b39bff", "#5ccbe0", "#f28ab8", "#a3d977"] },
};

const FONT = '"Inter Tight", system-ui, -apple-system, "Segoe UI", sans-serif';

export function mandateStudioTheme(dark: boolean) {
  const c = dark ? CHART.dark : CHART.light;
  const palette = Object.fromEntries(c.palette.map((color, i) => [`chartPaletteFills${i + 1}Color`, color]));
  return studioTheme.withParams({
    fontFamily: FONT,
    fontSize: 14,
    accentColor: "var(--accent)",
    backgroundColor: "var(--surface)",
    foregroundColor: "var(--ink)",
    textColor: "var(--ink)",
    subtleTextColor: "var(--muted)",
    borderColor: "var(--line)",
    borderRadius: 10,
    rowHoverColor: "var(--surface-2)",
    menuBackgroundColor: "var(--surface)",
    tooltipBackgroundColor: "var(--surface)",
    tooltipTextColor: "var(--ink)",
    browserColorScheme: dark ? "dark" : "light",
    studioWrapperBackgroundColor: "var(--bg)",
    studioWrapperBorder: false,
    studioWrapperBorderRadius: 0,
    studioPanelContainerBackgroundColor: "var(--surface)",
    studioPanelContainerBorder: { color: "var(--line)" },
    studioPanelContainerBorderRadius: 16,
    studioPanelHeaderFontFamily: FONT,
    chartFontFamily: FONT,
    chartFontSize: 12,
    chartTextColor: c.text,
    chartSubtleTextColor: c.subtle,
    chartGridLineColor: c.grid,
    chartAxisLineColor: c.axis,
    chartTooltipBackgroundColor: c.tooltip,
    chartTooltipTextColor: c.text,
    ...palette,
  } as never);
}
