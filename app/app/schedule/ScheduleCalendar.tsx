"use client";

// Bryntum Calendar (Community tier). Browser-only and large, so this file is loaded on the Schedule page alone.
import "@bryntum/core-community/fontawesome/css/fontawesome.css";
import "@bryntum/core-community/fontawesome/css/solid.css";
import "@bryntum/calendar-community/calendar.css";
import "@bryntum/calendar-community/svalbard.css";
import { useMemo } from "react";
import { BryntumCalendar } from "@bryntum/calendar-react-community";
import { occurrences } from "@/lib/schedule/recur";
import type { Schedule } from "@/lib/schedule/store";
import type { DecisionRow } from "@/lib/ui/insights";

/** Colour-coded rows, also shown as filters in the calendar's side bar. */
const RESOURCES = [
  { id: "scheduled", name: "Scheduled buys", eventColor: "blue" },
  { id: "paid", name: "Allowed", eventColor: "green" },
  { id: "ask", name: "Asked you", eventColor: "orange" },
  { id: "block", name: "Blocked", eventColor: "red" },
];
const OUTCOME_RES: Record<DecisionRow["outcome"], string> = { Allowed: "paid", "Asked you": "ask", Blocked: "block" };
const HALF_HOUR = 30 * 60_000;

export default function ScheduleCalendar({
  schedules,
  decisions,
  onMove,
}: {
  schedules: Schedule[];
  decisions: DecisionRow[];
  /** A scheduled buy was dragged: shift its whole series by this many milliseconds. */
  onMove: (scheduleId: string, deltaMs: number) => void;
}) {
  const events = useMemo(() => {
    const from = new Date(Date.now() - 45 * 86_400_000);
    const to = new Date(Date.now() + 120 * 86_400_000);
    const upcoming = schedules
      .filter((s) => s.active)
      .flatMap((s) =>
        occurrences(s.startAt, s.repeat, from, to).map((d, i) => ({
          id: `${s.id}#${i}`,
          name: s.task,
          startDate: d,
          endDate: new Date(d.getTime() + HALF_HOUR),
          resourceId: "scheduled",
          resizable: false,
          // Only future runs can be moved; past ones already happened.
          draggable: d.getTime() > Date.now(),
          scheduleId: s.id,
          origStart: d.toISOString(),
        })),
      );
    const past = decisions.map((d) => ({
      id: `d${d.seq}`,
      name: `${d.outcome}: ${d.item}${d.amount ? ` $${d.amount.toFixed(2)}` : ""}${d.source === "Scheduled buy" ? " · scheduled" : ""}`,
      startDate: new Date(d.at),
      endDate: new Date(new Date(d.at).getTime() + HALF_HOUR),
      resourceId: OUTCOME_RES[d.outcome],
      resizable: false,
      draggable: false,
    }));
    return [...upcoming, ...past];
  }, [schedules, decisions]);

  return (
    <>
    <ul className="bry-legend" aria-label="Colours">
      <li><i style={{ background: "var(--accent)" }} />Scheduled buy</li>
      <li><i style={{ background: "var(--allow)" }} />Allowed</li>
      <li><i style={{ background: "var(--ask)" }} />Asked you</li>
      <li><i style={{ background: "var(--block)" }} />Blocked</li>
    </ul>
    <div className="bry-wrap" data-testid="schedule-calendar">
      <BryntumCalendar
        date={new Date()}
        mode="month"
        resources={RESOURCES}
        events={events}
        eventEditFeature={false}
        scheduleMenuFeature={false}
        eventMenuFeature={false}
        dragFeature={{ creatable: false }}
        onDragMoveEnd={({ eventRecord }) => {
          const r = eventRecord as unknown as { startDate: Date; data: { scheduleId?: string; origStart?: string } };
          const id = r.data.scheduleId;
          if (!id || !r.data.origStart) return;
          const delta = new Date(r.startDate).getTime() - new Date(r.data.origStart).getTime();
          if (delta) onMove(id, delta);
        }}
      />
    </div>
    </>
  );
}
