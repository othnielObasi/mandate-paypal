"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { REPEAT_LABEL, REPEATS, type Repeat } from "@/lib/schedule/recur";
import type { Schedule } from "@/lib/schedule/store";
import { decisionRow, type DecisionRow } from "@/lib/ui/insights";
import { api, clock, day } from "../../components/api";
import { SkCard } from "../../components/Skeleton";
import { Calendar as CalIcon, Pause, Play } from "../../components/icons";
import { useStore } from "../store";

const ScheduleCalendar = dynamic(() => import("./ScheduleCalendar"), { ssr: false, loading: () => <SkCard lines={6} height={560} /> });

/** Tomorrow at 9:00, local time, in the format a datetime-local input wants. */
function tomorrowNine() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const OUTCOME_WORD: Record<string, string> = { paid: "paid", awaiting_buyer: "waiting for PayPal", pending_approval: "needs your approval", blocked: "blocked", failed: "failed" };
const describeRun = (r: Schedule["runs"][number]) =>
  r.status !== "ran" ? r.summary : r.outcomes.length ? r.outcomes.map((o) => OUTCOME_WORD[o] ?? o).join(", ") : "nothing to buy";

export default function SchedulePage() {
  const { mandate, receipts, act, busy, toast, refresh } = useStore();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [task, setTask] = useState("Buy washing-up liquid");
  const [when, setWhen] = useState(tomorrowNine);
  const [repeat, setRepeat] = useState<Repeat>("weekly");
  const id = mandate?.id ?? null;

  const load = useCallback(async () => {
    if (!id) return;
    setSchedules(await api<Schedule[]>(`/api/schedules?mandateId=${encodeURIComponent(id)}`).catch(() => []));
  }, [id]);
  useEffect(() => {
    void load();
  }, [load, receipts.length]);

  const decisions = useMemo<DecisionRow[]>(
    () => (id ? receipts.filter((r) => r.mandateId === id).map(decisionRow).filter((d): d is DecisionRow => d !== null) : []),
    [receipts, id],
  );

  const call = (path: string, method: string, body?: unknown) => api(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    void act(async () => {
      await call("/api/schedules", "POST", { mandateId: id, task, startAt: new Date(when).toISOString(), repeat });
      await load();
      toast(`Scheduled: ${task}, ${REPEAT_LABEL[repeat].toLowerCase()}.`);
    });
  };

  const onMove = (sid: string, delta: number) => {
    const s = schedules?.find((x) => x.id === sid);
    if (!s) return;
    void act(async () => {
      await call(`/api/schedules/${sid}`, "PATCH", { startAt: new Date(new Date(s.startAt).getTime() + delta).toISOString() });
      await load();
      toast(`Moved: ${s.task}.`);
    });
  };

  if (!mandate) return <p className="small">Sign a mandate first, then schedule purchases here.</p>;

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-sub">Your agent buys these on its own, on time. Each one still goes through your rules: anything over a limit waits for you, and you&rsquo;re notified.</p>
        </div>
      </section>

      <div className="sched-grid">
        <div className="col">
          <ScheduleCalendar schedules={schedules ?? []} decisions={decisions} onMove={onMove} />
          <p className="small">Drag a scheduled buy to another day or time to move it and every repeat after it. Past purchases are coloured by what the gate decided.</p>
        </div>

        <aside className="col">
          <section className="card" aria-labelledby="new-h">
            <h2 id="new-h" className="section-label" style={{ marginBottom: 12 }}>
              New scheduled buy
            </h2>
            <form className="stack" style={{ gap: 12 }} onSubmit={add} data-testid="schedule-form">
              <label className="field">
                <span className="small">What to buy</span>
                <input className="input" value={task} onChange={(e) => setTask(e.target.value)} maxLength={200} required minLength={3} />
              </label>
              <label className="field">
                <span className="small">First time</span>
                <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
              </label>
              <label className="field">
                <span className="small">Repeat</span>
                <select className="select" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
                  {REPEATS.map((r) => (
                    <option key={r} value={r}>
                      {REPEAT_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" type="submit" disabled={busy || mandate.status !== "active"}>
                <CalIcon size={16} /> Schedule it
              </button>
            </form>
          </section>

          <section className="card" aria-labelledby="list-h">
            <h2 id="list-h" className="section-label" style={{ marginBottom: 8 }}>
              Scheduled buys
            </h2>
            {!schedules ? (
              <p className="small">Loading…</p>
            ) : schedules.length === 0 ? (
              <p className="small">None yet. Add one above, e.g. washing-up liquid every week.</p>
            ) : (
              <ul className="sched-list" data-testid="schedule-list">
                {schedules.map((s) => {
                  const last = s.runs[0];
                  return (
                    <li key={s.id} className="sched-item">
                      <div className="sched-top">
                        <strong>{s.task}</strong>
                        <span className={`chip ${s.active ? "chip-accent" : "chip-outline"}`}>{s.active ? REPEAT_LABEL[s.repeat] : "Paused"}</span>
                      </div>
                      <p className="small">
                        {s.active && s.nextRunAt ? `Next: ${day(s.nextRunAt)} · ${clock(s.nextRunAt)}` : s.nextRunAt ? "Paused" : "Done"}
                        {last && (
                          <>
                            <br />
                            Last: {day(last.at)} · {describeRun(last)}
                          </>
                        )}
                      </p>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() =>
                            act(async () => {
                              const r = await call(`/api/schedules/${s.id}/run`, "POST");
                              await Promise.all([load(), refresh()]);
                              toast(`Ran "${s.task}": ${describeRun(r as Schedule["runs"][number])}.`);
                            })
                          }
                        >
                          Run now
                        </button>
                        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act(async () => (await call(`/api/schedules/${s.id}`, "PATCH", { active: !s.active }), await load()))}>
                          {s.active ? <Pause size={14} /> : <Play size={14} />} {s.active ? "Pause" : "Resume"}
                        </button>
                        <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act(async () => (await call(`/api/schedules/${s.id}`, "DELETE"), await load()))}>
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
