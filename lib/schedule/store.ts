import type { Repeat } from "./recur";

/** One run of a scheduled buy: when, and what the agent and the gate made of it. */
export interface ScheduleRun {
  at: string;
  /** "ran" (the agent finished), "skipped" (mandate not active) or "failed" (model or network error). */
  status: "ran" | "skipped" | "failed";
  /** The agent's closing message, or why it didn't run. */
  summary: string;
  /** Purchase outcomes, e.g. ["paid", "pending_approval"]. */
  outcomes: string[];
  manual?: boolean;
}

/** A purchase the agent makes on its own, on a schedule, through the same gate as everything else. */
export interface Schedule {
  id: string;
  mandateId: string;
  /** What to ask the agent, in the user's words. */
  task: string;
  repeat: Repeat;
  /** The first (or only) run. Later runs follow from it. */
  startAt: string;
  /** Next time it is due; null once a one-off has run. */
  nextRunAt: string | null;
  active: boolean;
  createdAt: string;
  /** The most recent runs, newest first (at most 10). */
  runs: ScheduleRun[];
}

export interface ScheduleStore {
  list(mandateId: string): Promise<Schedule[]>;
  get(id: string): Promise<Schedule | undefined>;
  put(s: Schedule): Promise<void>;
  remove(id: string): Promise<boolean>;
  /** Active schedules whose next run is due. */
  due(now: Date, limit?: number): Promise<Schedule[]>;
  /** Atomically move a schedule from `expected` to `next`. Only one caller (one server) wins a run. */
  claim(id: string, expected: string, next: string | null): Promise<boolean>;
}

export class MemoryScheduleStore implements ScheduleStore {
  private rows = new Map<string, Schedule>();
  async list(mandateId: string) {
    return [...this.rows.values()].filter((s) => s.mandateId === mandateId).map((s) => structuredClone(s));
  }
  async get(id: string) {
    const s = this.rows.get(id);
    return s && structuredClone(s);
  }
  async put(s: Schedule) {
    this.rows.set(s.id, structuredClone(s));
  }
  async remove(id: string) {
    return this.rows.delete(id);
  }
  async due(now: Date, limit = 20) {
    return [...this.rows.values()]
      .filter((s) => s.active && s.nextRunAt && new Date(s.nextRunAt) <= now)
      .slice(0, limit)
      .map((s) => structuredClone(s));
  }
  async claim(id: string, expected: string, next: string | null) {
    const s = this.rows.get(id);
    if (!s || s.nextRunAt !== expected) return false;
    s.nextRunAt = next;
    return true;
  }
}
