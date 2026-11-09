"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api } from "../../components/api";
import type { Insights } from "@/lib/ui/insights";
import { useStore } from "../store";
import { SkCard } from "../../components/Skeleton";

function DashboardSkeleton() {
  return (
    <div className="stack" style={{ gap: 20 }} aria-busy="true" aria-label="Loading the dashboard">
      <div className="split-even">
        <SkCard lines={1} />
        <SkCard lines={1} />
      </div>
      <SkCard lines={6} height={320} />
    </div>
  );
}

// AG Studio is large and browser-only: load it on this page alone.
const Dashboard = dynamic(() => import("./Dashboard"), { ssr: false, loading: () => <DashboardSkeleton /> });
const DecisionExplorer = dynamic(() => import("./DecisionExplorer"), { ssr: false, loading: () => <SkCard lines={6} height={420} /> });

export default function InsightsPage() {
  const { mandate, receipts } = useStore();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [editing, setEditing] = useState(false);
  const mandateId = mandate?.id ?? null;

  // Refresh whenever the signed log grows.
  useEffect(() => {
    let live = true;
    void api<Insights>(`/api/insights${mandateId ? `?mandateId=${encodeURIComponent(mandateId)}` : ""}`)
      .then((d) => live && setInsights(d))
      .catch(() => live && setInsights({ decisions: [], payments: [] }));
    return () => {
      live = false;
    };
  }, [mandateId, receipts.length]);

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-sub">What your agents tried to buy, what the gate decided and why, and where the money went. Built from the signed decision log, so every number traces back to a receipt.</p>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          {editing ? "Done editing" : "Customise"}
        </button>
      </section>
      {insights && insights.decisions.length === 0 && (
        <p className="small" style={{ marginBottom: 12 }}>
          No decisions yet. Give your agent a job on Home and come back.
        </p>
      )}
      {insights ? <Dashboard insights={insights} editing={editing} /> : <DashboardSkeleton />}
      <div style={{ marginTop: 24 }}>
        <DecisionExplorer receipts={receipts} mandateId={mandateId} />
      </div>
    </>
  );
}
