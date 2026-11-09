"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Policy } from "@/lib/gate/policy";
import type { Receipt } from "@/lib/gate/receipts";
import { toActivity, type Activity } from "@/lib/ui/activity";
import { listPasskeys, registerPasskey, signApproval, type PasskeyView } from "../components/passkey";
import { api } from "../components/api";
import type { OrderView } from "../components/Orders";

export type Mandate = { id: string; status: "active" | "paused" | "revoked"; policy: Policy; rawText: string; createdAt: string; intentMandate?: { user_authorization?: string } };
export type Budget = { mandate: Mandate; spentMinor: number; reservedMinor: number; remainingMinor: number };
export type Decision = { outcome: "allow" | "approve" | "block"; rule: string; reason: string };
export type TraceStep = { rule: string; label: string; value: string; status: "pass" | "ask" | "block" | "approved" | "skip" | "off" };
export type GateTrace = { steps: TraceStep[]; outcome: "allow" | "approve" | "block" };
export type ProposeResult = { status: string; decision?: Decision; approveUrl?: string; error?: string; paypalOrderId?: string; approvalId?: string; trace?: GateTrace; market?: { referenceMinor: number; products: number; source: string } };
export type AgentEvent = { kind: "text"; text: string } | { kind: "tool"; name: string; input: Record<string, unknown>; ok: boolean; result: unknown };
export type Approval = { id: string; summary: string; decision: Decision; expiresAt: string; createdAt: string };
export type Health = { provider: string; model: string; signingKey: string; market: string; storage?: string };
/** The saved PayPal wallet for this workspace. `available` is false in the shared demo workspace (API, SDK). */
export type Wallet = { available: boolean; simulated: boolean; connected: boolean; email: string | null; connectedAt: string | null };
/** One turn of the conversation: what you asked, every step the agent took, and its closing reply. */
export type Run = { task: string; drill: boolean; events: AgentEvent[]; final?: string };

type Store = {
  ready: boolean;
  health: Health | null;
  mandate: Mandate | null;
  budget: Budget | null;
  approvals: Approval[];
  orders: OrderView[];
  receipts: Receipt[];
  activity: Activity[];
  /** The latest turn. */
  run: Run | null;
  /** The whole conversation with the agent, oldest first. */
  turns: Run[];
  /** Start a new conversation. */
  newChat: () => void;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  refresh: (id?: string) => Promise<void>;
  act: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  toast: (msg: string) => void;
  runAgent: (task: string, drill: boolean) => Promise<void>;
  decide: (id: string, choice: "approve" | "decline") => Promise<ProposeResult | undefined>;
  /** Passkeys that sign approvals; empty means approvals use the demo key. */
  passkeys: PasskeyView[];
  addPasskey: (label: string) => Promise<void>;
  wallet: Wallet | null;
  /** Go to PayPal to save it for this workspace. */
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  /** End this browser's workspace and go back to the home page. */
  signOut: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

const STEP_PACE_MS = 140;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyView[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [turns, setTurns] = useState<Run[]>([]);
  const turnsRef = useRef<Run[]>([]);
  turnsRef.current = turns;
  /** Replace the latest turn. */
  const setLast = useCallback((t: Run) => setTurns((all) => [...all.slice(0, -1), t]), []);
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
      if (idRef.current !== id) setTurns([]);
      idRef.current = id;
      setMandateId(id);
    }
    const [all, w] = await Promise.all([api<Receipt[]>("/api/receipts"), api<Wallet>("/api/wallet").catch(() => null)]);
    setReceipts(all);
    setWallet(w);
    if (!mid) return;
    const [b, a, o, k] = await Promise.all([
      api<Budget>(`/api/mandates/${mid}`),
      api<Approval[]>(`/api/approvals?mandateId=${mid}`),
      api<OrderView[]>(`/api/orders?mandateId=${mid}`),
      listPasskeys(mid).catch(() => ({ passkeys: [] as PasskeyView[] })),
    ]);
    setBudget(b);
    setApprovals(a);
    setOrders(o);
    setPasskeys(k.passkeys);
  }, []);

  useEffect(() => {
    api<Health>("/api/health").then(setHealth).catch(() => undefined);
    api<Mandate[]>("/api/mandates")
      .then((ms) => refresh(ms.at(-1)?.id))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setReady(true));
    const p = new URLSearchParams(window.location.search).get("payment");
    const w = new URLSearchParams(window.location.search).get("wallet");
    if (w) toast(w === "connected" ? "PayPal connected. Purchases your rules allow are now paid from it." : w === "cancelled" ? "PayPal not connected. Nothing was saved." : "Couldn't connect PayPal. Please try again.");
    if (p || w) window.history.replaceState(null, "", window.location.pathname);
    if (p) toast(p === "paid" ? "Payment captured in PayPal." : p === "cancelled" ? "Payment cancelled in PayPal. Nothing was charged." : `PayPal: ${p.replace(/_/g, " ")}`);
  }, [refresh, toast]);

  // Things can happen without you: an outside assistant buys, PayPal confirms a payment, an approval expires.
  // While this tab is visible, look for new receipts every few seconds and refresh when there are any.
  const busyRef = useRef(false);
  busyRef.current = busy;
  const lastSeq = useRef(0);
  useEffect(() => {
    const id = mandateId;
    lastSeq.current = id ? Math.max(0, ...receipts.filter((r) => r.mandateId === id).map((r) => r.seq)) : 0;
  }, [receipts, mandateId]);
  useEffect(() => {
    let running = false;
    const tick = async () => {
      const id = idRef.current;
      if (!id || running || busyRef.current || document.visibilityState !== "visible") return;
      running = true;
      try {
        const mine = await api<Receipt[]>(`/api/receipts?mandateId=${encodeURIComponent(id)}`);
        if ((mine.at(-1)?.seq ?? 0) > lastSeq.current) await refresh();
      } catch {
        // Offline or a deploy in progress: try again next time.
      } finally {
        running = false;
      }
    };
    const t = setInterval(tick, 6000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

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
      // Earlier turns go along as context (drills are simulations of a compromised agent, so they stay out).
      const history = turnsRef.current
        .filter((t) => !t.drill)
        .slice(-5)
        .flatMap((t) => [
          { role: "user" as const, text: t.task.slice(0, 2000) },
          {
            role: "agent" as const,
            text: (t.final ?? "").slice(0, 2000),
            skus: t.events.flatMap((e) => (e.kind === "tool" && e.name === "propose_purchase" && e.ok ? [String(e.input.sku)] : [])).slice(0, 20),
          },
        ])
        .filter((t) => t.text);
      setTurns((all) => [...all, { task, drill, events: [] }]);
      await act(async () => {
        const res = await fetch("/api/agent/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId: id, task, drill, stream: true, history }) });
        if (!res.ok || !res.body) {
          const b = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(b.error ?? `Request failed (${res.status})`);
        }
        // Show each step as it happens; pace instant (simulated) runs so people can follow them.
        const events: AgentEvent[] = [];
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let last = 0;
        let failed: string | null = null;
        for (;;) {
          const { done, value } = await reader.read();
          if (value) buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const msg = JSON.parse(line) as { type: "event"; event: AgentEvent } | { type: "done"; result: { events: AgentEvent[] } } | { type: "error"; error: string };
            if (msg.type === "event") {
              const wait = last + STEP_PACE_MS - Date.now();
              if (wait > 0) await new Promise((r) => setTimeout(r, wait));
              last = Date.now();
              events.push(msg.event);
              setLast({ task, drill, events: [...events] });
              if (msg.event.kind === "tool" && msg.event.name === "propose_purchase") void refresh();
            } else if (msg.type === "done") setLast({ task, drill, events: msg.result.events, final: (msg.result as { final?: string }).final });
            else failed = msg.error;
          }
          if (done) break;
        }
        if (failed) throw new Error(failed);
        await refresh();
      });
    },
    [act, refresh, setLast],
  );

  const decide = useCallback(
    async (approvalId: string, choice: "approve" | "decline") =>
      act(async () => {
        // With a registered passkey, the device signs this exact cart; otherwise the demo key does.
        const passkey = choice === "approve" && passkeys.length ? await signApproval(approvalId) : undefined;
        const r = await api<ProposeResult>(`/api/approvals/${approvalId}`, { method: "POST", body: JSON.stringify({ choice, ...(passkey ? { passkey } : {}) }) });
        // Add the decision to the turn that asked for it.
        const step: AgentEvent = { kind: "tool", name: "your_decision", input: { choice, approvalId }, ok: true, result: r };
        setTurns((all) => {
          const asked = (t: Run) => t.events.some((e) => e.kind === "tool" && (e.result as ProposeResult | undefined)?.approvalId === approvalId);
          const at = all.map(asked).lastIndexOf(true);
          const i = at >= 0 ? at : all.length - 1;
          return i < 0 ? all : all.map((t, j) => (j === i ? { ...t, events: [...t.events, step] } : t));
        });
        await refresh();
        if (choice === "decline") toast("Declined. No money moved.");
        else if (r.status === "paid") toast(passkey ? "Signed with your passkey and paid with PayPal." : "Approved and paid with PayPal.");
        else if (r.status === "awaiting_buyer") toast("Approved. Finish the payment in PayPal.");
        return r;
      }),
    [act, refresh, toast, passkeys.length],
  );

  const addPasskey = useCallback(
    async (label: string) => {
      await act(async () => {
        await registerPasskey(idRef.current!, label);
        await refresh();
        toast("Passkey added. Approvals now need your device.");
      });
    },
    [act, refresh, toast],
  );

  const connectWallet = useCallback(async () => {
    await act(async () => {
      const { approveUrl } = await api<{ approveUrl: string }>("/api/wallet", { method: "POST", body: "{}" });
      window.location.assign(approveUrl);
    });
  }, [act]);

  const disconnectWallet = useCallback(async () => {
    await act(async () => {
      await api("/api/wallet", { method: "DELETE" });
      await refresh();
      toast("PayPal disconnected. Each purchase needs a PayPal approval again.");
    });
  }, [act, refresh, toast]);

  const signOut = useCallback(async () => {
    await act(async () => {
      await api("/api/session", { method: "DELETE" });
      window.location.assign("/");
    });
  }, [act]);

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
    run: turns.at(-1) ?? null,
    turns,
    newChat: () => setTurns([]),
    busy,
    error,
    clearError: () => setError(null),
    refresh,
    act,
    toast,
    passkeys,
    addPasskey,
    wallet,
    connectWallet,
    disconnectWallet,
    signOut,
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
