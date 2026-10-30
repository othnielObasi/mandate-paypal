"use client";

import { themeQuartz } from "ag-grid-community";

/** AG Grid themed from the app's design tokens, so it follows light and dark mode automatically. */
export const gridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 14,
  headerFontWeight: 600,
  headerFontSize: 13,
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--ink)",
  textColor: "var(--ink)",
  subtleTextColor: "var(--muted)",
  borderColor: "var(--line)",
  headerBackgroundColor: "var(--surface-2)",
  headerTextColor: "var(--muted)",
  oddRowBackgroundColor: "var(--surface)",
  rowHoverColor: "var(--surface-2)",
  selectedRowBackgroundColor: "var(--accent-tint)",
  accentColor: "var(--accent)",
  inputBorder: { color: "var(--line-strong)" },
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  rowBorder: { color: "var(--line)" },
  spacing: 7,
  cellHorizontalPadding: 16,
  menuBackgroundColor: "var(--surface)",
  chromeBackgroundColor: "var(--surface-2)",
});
