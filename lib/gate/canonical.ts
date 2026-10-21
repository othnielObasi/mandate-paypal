import { createHash } from "node:crypto";
import type { Currency } from "./policy";

/** Deterministic JSON: object keys sorted, no whitespace, non-finite numbers rejected. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson: non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  throw new Error(`canonicalJson: unsupported type ${typeof value}`);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export interface OrderItem {
  sku: string;
  title: string;
  unitMinor: number;
  qty: number;
}

/** Exactly what will be bought. A permit is bound to the digest of this. */
export interface OrderSpec {
  mandateId: string;
  merchantId: string;
  currency: Currency;
  items: OrderItem[];
}

export function orderTotalMinor(order: OrderSpec): number {
  return order.items.reduce((sum, i) => sum + i.unitMinor * i.qty, 0);
}

export function orderDigest(order: OrderSpec): string {
  return sha256Hex(canonicalJson(order));
}
