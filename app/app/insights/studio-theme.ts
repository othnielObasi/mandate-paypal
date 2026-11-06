"use client";

import { studioTheme } from "ag-studio";

/**
 * AG Studio themed from the app's design tokens, so Insights looks like the rest of Mandate.
 * Every colour is a concrete hex per scheme (mirroring the tokens in globals.css): the canvas charts
 * and Studio's own colour pickers (Customise mode) can't parse CSS variables.
 * The palette's first three slots line up with the outcomes (Allowed, Asked you, Blocked, which
 * Studio orders alphabetically): green, amber, red, as on the app's badges.
 */
export const UI = {
  light: { bg: "#f6f7f9", surface: "#ffffff", surface2: "#f8f9fb", ink: "#0b1220", muted: "#4a5568", line: "#e3e7ee", accent: "#1d4ed8" },
  dark: { bg: "#0b1120", surface: "#131c2e", surface2: "#17223a", ink: "#e8edf6", muted: "#9aa6b8", line: "#243049", accent: "#7ea2ff" },
};

const CHART = {
  light: { text: "#0b1220", subtle: "#4a5568", grid: "#e3e7ee", axis: "#cdd4df", tooltip: "#ffffff", palette: ["#1f9d63", "#d98a1c", "#d64545", "#1d4ed8", "#64748b", "#7c3aed", "#0e7490", "#be185d", "#4d7c0f"] },
  dark: { text: "#e8edf6", subtle: "#9aa6b8", grid: "#243049", axis: "#33415e", tooltip: "#17223a", palette: ["#4cc38a", "#f2b45a", "#ff8f87", "#7ea2ff", "#9aa6b8", "#b39bff", "#5ccbe0", "#f28ab8", "#a3d977"] },
};

const FONT = '"Geist Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

export function mandateStudioTheme(dark: boolean) {
  const c = dark ? CHART.dark : CHART.light;
  const u = dark ? UI.dark : UI.light;
  const palette = Object.fromEntries(c.palette.map((color, i) => [`chartPaletteFills${i + 1}Color`, color]));
  return studioTheme.withParams({
    fontFamily: FONT,
    fontSize: 14,
    accentColor: u.accent,
    backgroundColor: u.surface,
    foregroundColor: u.ink,
    textColor: u.ink,
    subtleTextColor: u.muted,
    borderColor: u.line,
    borderRadius: 10,
    rowHoverColor: u.surface2,
    menuBackgroundColor: u.surface,
    tooltipBackgroundColor: u.surface,
    tooltipTextColor: u.ink,
    browserColorScheme: dark ? "dark" : "light",
    studioWrapperBackgroundColor: u.bg,
    studioWrapperBorder: false,
    studioWrapperBorderRadius: 0,
    studioPanelContainerBackgroundColor: u.surface,
    studioPanelContainerBorder: { color: u.line },
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
