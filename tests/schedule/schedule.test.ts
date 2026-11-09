import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextRun, occurrences } from "@/lib/schedule/recur";
import { ScheduleRunner } from "@/lib/schedule/runner";
import { MemoryScheduleStore, type Schedule } from "@/lib/schedule/store";
import { MemoryMandateStore } from "@/lib/core/stores";
import { createContainer, setContainer, type Container } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { GET as listSchedules, POST as createSchedule } from "@/app/api/schedules/route";
import { DELETE as deleteSchedule, PATCH as patchSchedule } from "@/app/api/schedules/[id]/route";
import { POST as runSchedule } from "@/app/api/schedules/[id]/run/route";

const T0 = "2026-11-10T09:00:00.000Z";

describe("when scheduled buys run", () => {
  it("steps by day, week and month, strictly after a time", () => {
    expect(nextRun(T0, "weekly", new Date("2026-11-01T00:00:00Z"))?.toISOString()).toBe(T0);
    expect(nextRun(T0, "weekly", new Date(T0))?.toISOString()).toBe("2026-11-17T09:00:00.000Z");
    expect(nextRun(T0, "daily", new Date("2026-11-12T10:00:00Z"))?.toISOString()).toBe("2026-11-13T09:00:00.000Z");
    expect(nextRun(T0, "monthly", new Date("2026-11-10T09:00:01Z"))?.toISOString()).toBe("2026-12-10T09:00:00.000Z");
    expect(nextRun(T0, "once", new Date(T0))).toBeNull();
  });

  it("lists the occurrences in a window, for the calendar", () => {
    const w = occurrences(T0, "weekly", new Date("2026-11-01Z"), new Date("2026-12-01Z")).map((d) => d.toISOString().slice(0, 10));
    expect(w).toEqual(["2026-11-10", "2026-11-17", "2026-11-24"]);
    expect(occurrences(T0, "once", new Date("2026-12-01Z"), new Date("2027-01-01Z"))).toEqual([]);
  });
});

describe("the runner", () => {
  const mk = (over: Partial<Schedule> = {}): Schedule => ({ id: "s1", mandateId: "m1", task: "Buy sponges", repeat: "weekly", startAt: T0, nextRunAt: T0, active: true, createdAt: T0, runs: [], ...over });
  let store: MemoryScheduleStore;
  let mandates: MemoryMandateStore;
  let run: ReturnType<typeof vi.fn>;
  let now: Date;
  const runner = () => new ScheduleRunner({ store, mandates, run, clock: () => now });

  beforeEach(async () => {
    store = new MemoryScheduleStore();
    mandates = new MemoryMandateStore();
    await mandates.save({ id: "m1", userId: "u", status: "active", policy: {} as never, rawText: "", createdAt: T0 } as never);
    run = vi.fn(async () => ({ final: "Bought sponges.", outcomes: ["paid"] }));
    now = new Date("2026-11-10T09:00:30Z");
  });

  it("runs what is due once, records it, and moves it to the next week", async () => {
    await store.put(mk());
    const r = runner();
    expect(await Promise.all([r.tick(), r.tick()])).toContain(1);
    expect(run).toHaveBeenCalledTimes(1);
    const s = (await store.get("s1"))!;
    expect(s.nextRunAt).toBe("2026-11-17T09:00:00.000Z");
    expect(s.runs[0]).toMatchObject({ status: "ran", outcomes: ["paid"], manual: false });
    expect(await r.tick()).toBe(0); // not due again until next week
  });

  it("doesn't run a paused schedule, or for a paused mandate", async () => {
    await store.put(mk({ active: false }));
    expect(await runner().tick()).toBe(0);
    await store.put(mk());
    await mandates.setStatus("m1", "paused");
    await runner().tick();
    expect(run).not.toHaveBeenCalled();
    expect((await store.get("s1"))!.runs[0]).toMatchObject({ status: "skipped" });
  });

  it("a one-off runs once and is then done", async () => {
    await store.put(mk({ repeat: "once" }));
    await runner().tick();
    expect((await store.get("s1"))!.nextRunAt).toBeNull();
  });

  it("a model failure is recorded, not thrown", async () => {
    run.mockRejectedValueOnce(new Error("model down"));
    await store.put(mk());
    await runner().tick();
    expect((await store.get("s1"))!.runs[0]).toMatchObject({ status: "failed" });
  });
});

describe("schedules API", () => {
  const BASE = "http://localhost:3000";
  const ALICE = "a".repeat(43);
  const BOB = "b".repeat(43);
  const req = (path: string, method = "GET", body?: unknown, who?: string) =>
    new Request(`${BASE}${path}`, { method, headers: { "content-type": "application/json", ...(who ? { cookie: `mandate_session=${who}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  let c: Container;
  beforeEach(() => {
    c = createContainer({ APP_URL: BASE, MANDATE_SCHEDULER: "off" });
    setContainer(c);
  });

  it("creates, runs through the gate (labelled as a scheduled buy), moves, pauses and deletes, only for the owner", async () => {
    const m = (await (await createMandate(req("/api/mandates", "POST", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }, ALICE))).json()) as { id: string };
    const res = await createSchedule(req("/api/schedules", "POST", { mandateId: m.id, task: "Buy sponges", startAt: "2030-01-07T09:00:00Z", repeat: "weekly" }, ALICE));
    expect(res.status).toBe(201);
    const s = (await res.json()) as Schedule;
    expect(s.nextRunAt).toBe("2030-01-07T09:00:00.000Z");

    expect((await listSchedules(req(`/api/schedules?mandateId=${m.id}`, "GET", undefined, BOB))).status).toBe(403);
    expect((await runSchedule(req(`/api/schedules/${s.id}/run`, "POST", undefined, BOB), params(s.id))).status).toBe(403);

    const run = (await (await runSchedule(req(`/api/schedules/${s.id}/run`, "POST", undefined, ALICE), params(s.id))).json()) as { status: string; outcomes: string[] };
    expect(run).toMatchObject({ status: "ran", outcomes: ["paid"] });
    const receipts = await c.receipts.list(m.id);
    expect(receipts.some((r) => r.type === "decision" && /\(via Scheduled buy\)/.test(r.summary))).toBe(true);

    const moved = (await (await patchSchedule(req(`/api/schedules/${s.id}`, "PATCH", { startAt: "2030-01-08T10:00:00Z" }, ALICE), params(s.id))).json()) as Schedule;
    expect(moved.nextRunAt).toBe("2030-01-08T10:00:00.000Z");
    expect(((await (await patchSchedule(req(`/api/schedules/${s.id}`, "PATCH", { active: false }, ALICE), params(s.id))).json()) as Schedule).active).toBe(false);
    expect((await deleteSchedule(req(`/api/schedules/${s.id}`, "DELETE", undefined, ALICE), params(s.id))).status).toBe(200);
    expect(await (await listSchedules(req(`/api/schedules?mandateId=${m.id}`, "GET", undefined, ALICE))).json()).toEqual([]);
  });

  it("refuses a task that is too short or a repeat it doesn't know", async () => {
    const m = (await (await createMandate(req("/api/mandates", "POST", { text: "Household basics, up to $80 a month" }, ALICE))).json()) as { id: string };
    expect((await createSchedule(req("/api/schedules", "POST", { mandateId: m.id, task: "x", startAt: "2030-01-07T09:00:00Z", repeat: "weekly" }, ALICE))).status).toBe(400);
    expect((await createSchedule(req("/api/schedules", "POST", { mandateId: m.id, task: "Buy sponges", startAt: "2030-01-07T09:00:00Z", repeat: "hourly" }, ALICE))).status).toBe(400);
  });
});
