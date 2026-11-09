import type { MandateStore } from "../core/stores";
import { nextRun } from "./recur";
import type { Schedule, ScheduleRun, ScheduleStore } from "./store";

export type RunAgent = (s: Schedule) => Promise<{ final: string; outcomes: string[] }>;

/**
 * Runs scheduled buys when they are due. The agent runs exactly as if you had asked it in the chat,
 * so every purchase still goes through the gate. Nobody is present, so anything that needs a person
 * waits for you as an approval (and you are notified).
 */
export class ScheduleRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  constructor(
    private o: {
      store: ScheduleStore;
      mandates: MandateStore;
      run: RunAgent;
      clock?: () => Date;
      onError?: (e: unknown) => void;
    },
  ) {}

  private now() {
    return this.o.clock ? this.o.clock() : new Date();
  }

  start(everyMs = 30_000) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), everyMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Run everything that is due. Returns how many ran. */
  async tick(): Promise<number> {
    if (this.busy) return 0;
    this.busy = true;
    let ran = 0;
    try {
      const now = this.now();
      for (const s of await this.o.store.due(now)) {
        const next = nextRun(s.startAt, s.repeat, now);
        // Move it on first, atomically: a second server (or a slow tick) can't run it twice.
        if (!(await this.o.store.claim(s.id, s.nextRunAt!, next ? next.toISOString() : null))) continue;
        await this.runNow(s.id, false);
        ran++;
      }
    } catch (e) {
      this.o.onError?.(e);
    } finally {
      this.busy = false;
    }
    return ran;
  }

  /** Run one schedule now (also used by "Run now"); records the result on the schedule. */
  async runNow(id: string, manual = true): Promise<ScheduleRun | null> {
    const s = await this.o.store.get(id);
    if (!s) return null;
    const m = await this.o.mandates.get(s.mandateId);
    const at = this.now().toISOString();
    let run: ScheduleRun;
    if (!m || m.status !== "active") {
      run = { at, status: "skipped", summary: `Not run: the mandate is ${m?.status ?? "gone"}.`, outcomes: [], manual };
    } else {
      try {
        const r = await this.o.run(s);
        run = { at, status: "ran", summary: r.final.slice(0, 400), outcomes: r.outcomes, manual };
      } catch (e) {
        this.o.onError?.(e);
        run = { at, status: "failed", summary: `The agent couldn't run: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400), outcomes: [], manual };
      }
    }
    const latest = (await this.o.store.get(id)) ?? s;
    await this.o.store.put({ ...latest, runs: [run, ...latest.runs].slice(0, 10) });
    return run;
  }
}
