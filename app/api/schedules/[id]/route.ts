import { z } from "zod";
import { nextRun, REPEATS, type Repeat } from "@/lib/schedule/recur";
import { getContainer } from "@/lib/server/container";
import { handle, json, readBody } from "@/lib/server/http";
import { ownSchedule } from "@/lib/server/schedules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z
  .object({
    task: z.string().trim().min(3).max(200).optional(),
    /** Moving it on the calendar: the new first run; later runs follow from it. */
    startAt: z.string().datetime({ offset: true }).optional(),
    repeat: z.enum(REPEATS as [string, ...string[]]).optional(),
    active: z.boolean().optional(),
  })
  .strict();

/** Change, move, pause or resume a scheduled buy. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await readBody(req, Body);
  const c = getContainer();
  const s = await ownSchedule(req, c, id);
  const next = { ...s, ...(b.task ? { task: b.task } : {}), ...(b.repeat ? { repeat: b.repeat as Repeat } : {}), ...(b.startAt ? { startAt: new Date(b.startAt).toISOString() } : {}), ...(b.active !== undefined ? { active: b.active } : {}) };
  const due = nextRun(next.startAt, next.repeat, new Date(Date.now() - 60_000));
  next.nextRunAt = due ? due.toISOString() : null;
  await c.stores.schedules.put(next);
  return json(next);
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const c = getContainer();
  await ownSchedule(req, c, id);
  await c.stores.schedules.remove(id);
  return json({ deleted: true });
});
