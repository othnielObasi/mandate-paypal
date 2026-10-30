"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Policy } from "@/lib/gate/policy";
import type { Receipt } from "@/lib/gate/receipts";
import { toActivity, type Activity } from "@/lib/ui/activity";
import { api } from "../components/api";
import type { OrderView } from "../components/Orders";

export type Mandate = { id: string; status: "active" | "paused" | "revoked"; policy: Policy; rawText: string; createdAt: string; intentMandate?: { user_authorization?: string } };
export type Budget = { mandate: Mandate; spentMinor: number; reservedMinor: number; remainingMinor: number };
export type Decision = { outcome: "allow" | "approve" | "block"; rule: string; reason: string };
export type ProposeResult = { status: string; decision?: Decision; approveUrl?: string; error?: string; paypalOrderId?: string; approvalId?: string };
export type AgentEvent = { kind: "text"; text: string } | { kind: "tool"; name: string; input: Record<string, unknown>; ok: boolean; result: unknown };
export type Approval = { id: string; summary: string; decision: Decision; expiresAt: string; createdAt: string };
export type Health = { provider: string; model: string; signingKey: string; market: string; storage?: string };
export type Run = { task: string; drill: boolean; events: AgentEvent[] };

type Store = {
  ready: boolean;
  health: Health | null;
  mandate: Mandate | null;
  budget: Budget | null;
  approvals: Approval[];
  orders: OrderView[];
  receipts: Receipt[];
  activity: Activity[];
  run: Run | null;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  refresh: (id?: string) => Promise<void>;
  act: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  toast: (msg: string) => void;
  setRun: (r: Run | null) => void;
  runAgent: (task: string, drill: boolean) => Promise<void>;
  decide: (id: string, choice: "approve" | "decline") => Promise<ProposeResult | undefined>;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idRef = useRef<string | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const refresh = useCallback(async (id?: string) => {
    const mid = id ?? idRef.current;
    if (id) {
      idRef.current = id;
      setMandateId(id);
    }
    const all = await api<Receipt[]>("/api/receipts");
    setReceipts(all);
    if (!mid) return;
    const [b, a, o] = await Promise.all([
      api<Budget>(`/api/mandates/${mid}`),
      api<Approval[]>(`/api/approvals?mandateId=${mid}`),
      api<OrderView[]>(`/api/orders?mandateId=${mid}`),
    ]);
    setBudget(b);
    setApprovals(a);
    setOrders(o);
  }, []);

  useEffect(() => {
    api<Health>("/api/health").then(setHealth).catch(() => undefined);
    api<Mandate[]>("/api/mandates")
      .then((ms) => refresh(ms.at(-1)?.id))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setReady(true));
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p) toast(p === "paid" ? "Payment captured in PayPal." : p === "cancelled" ? "Payment cancelled in PayPal. Nothing was charged." : `PayPal: ${p.replace(/_/g, " ")}`);
  }, [refresh, toast]);

  const act = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const runAgent = useCallback(
    async (task: string, drill: boolean) => {
      const id = idRef.current;
      if (!id) return;
      setRun({ task, drill, events: [] });
      await act(async () => {
        const r = await api<{ events: AgentEvent[] }>("/api/agent/run", { method: "POST", body: JSON.stringify({ mandateId: id, task, drill }) });
        setRun({ task, drill, events: r.events });
        await refresh();
      });
    },
    [act, refresh],
  );

  const decide = useCallback(
    async (approvalId: string, choice: "approve" | "decline") =>
      act(async () => {
        const r = await api<ProposeResult>(`/api/approvals/${approvalId}`, { method: "POST", body: JSON.stringify({ choice }) });
        setRun((cur) => (cur ? { ...cur, events: [...cur.events, { kind: "tool", name: "your_decision", input: { choice }, ok: true, result: r }] } : cur));
        await refresh();
        if (choice === "decline") toast("Declined. No money moved.");
        else if (r.status === "paid") toast("Approved and paid with PayPal.");
        else if (r.status === "awaiting_buyer") toast("Approved. Finish the payment in PayPal.");
        return r;
      }),
    [act, refresh, toast],
  );

  const mandate = budget?.mandate && budget.mandate.id === mandateId ? budget.mandate : null;
  const mine = useMemo(() => (mandateId ? receipts.filter((r) => r.mandateId === mandateId) : []), [receipts, mandateId]);
  const activity = useMemo(() => toActivity(mine), [mine]);

  const value: Store = {
    ready,
    health,
    mandate,
    budget: mandate ? budget : null,
    approvals,
    orders,
    receipts,
    activity,
    run,
    busy,
    error,
    clearError: () => setError(null),
    refresh,
    act,
    toast,
    setRun,
    runAgent,
    decide,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && (
        <div className="toast" role="status" aria-live="polite" title="Dismiss" onClick={() => setToastMsg(null)}>
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
