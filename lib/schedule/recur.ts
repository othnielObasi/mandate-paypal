/** How often a scheduled buy repeats. Daily is the most frequent: the agent calls a model each time. */
export type Repeat = "once" | "daily" | "weekly" | "monthly";
export const REPEATS: Repeat[] = ["once", "daily", "weekly", "monthly"];

const DAY = 86_400_000;

/** The n-th occurrence after the first. */
export function nth(start: Date, repeat: Repeat, n: number): Date {
  if (repeat === "daily") return new Date(start.getTime() + n * DAY);
  if (repeat === "weekly") return new Date(start.getTime() + n * 7 * DAY);
  if (repeat === "monthly") {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d;
  }
  return start;
}

/** When it runs next, strictly after `after`; null if a one-off has already run. */
export function nextRun(startIso: string, repeat: Repeat, after: Date): Date | null {
  const start = new Date(startIso);
  if (start > after) return start;
  if (repeat === "once") return null;
  // Jump close to `after`, then step forward.
  const period = repeat === "daily" ? DAY : repeat === "weekly" ? 7 * DAY : 28 * DAY;
  let n = Math.max(0, Math.floor((after.getTime() - start.getTime()) / period) - 1);
  for (let guard = 0; guard < 1000; guard++, n++) {
    const d = nth(start, repeat, n);
    if (d > after) return d;
  }
  return null;
}

/** Every occurrence between `from` and `to` (for the calendar), at most `max`. */
export function occurrences(startIso: string, repeat: Repeat, from: Date, to: Date, max = 120): Date[] {
  const out: Date[] = [];
  const start = new Date(startIso);
  if (repeat === "once") return start >= from && start <= to ? [start] : [];
  let d: Date | null = start >= from ? start : nextRun(startIso, repeat, new Date(from.getTime() - 1));
  let n = 0;
  while (d && d <= to && out.length < max) {
    out.push(d);
    d = nextRun(startIso, repeat, d);
    if (++n > max * 2) break;
  }
  return out;
}

export const REPEAT_LABEL: Record<Repeat, string> = { once: "Once", daily: "Every day", weekly: "Every week", monthly: "Every month" };
