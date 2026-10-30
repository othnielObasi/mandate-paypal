"use client";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;
export const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const merchantName = (id: string) =>
  ({ "acme-supplies": "Acme Supplies", "corner-mart": "Corner Mart", "promo-deals": "Promo Deals", "office-hub": "Office Hub" })[id] ??
  id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
