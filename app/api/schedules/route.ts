import { randomUUID } from "node:crypto";
import { z } from "zod";
import { nextRun, REPEATS } from "@/lib/schedule/recur";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";
import { ownMandate } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PER_MANDATE = 20;

const ScheduleBody = z
  .object({
    mandateId: z.string().min(1),
    task: z.string().trim().min(3).max(200),
    startAt: z.string().datetime({ offset: true }),
    repeat: z.enum(REPEATS as [string, ...string[]]),
  })
  .strict();

/** A mandate's scheduled buys. */
export const GET = handle(async (req: Request) => {
  const mandateId = new URL(req.url).searchParams.get("mandateId");
  if (!mandateId) throw new HttpError(400, "mandateId is required.");
  const c = getContainer();
  await ownMandate(req, c, mandateId);
  return json(await c.stores.schedules.list(mandateId));
});

/** Schedule a purchase: the agent will ask for it on its own, on time, through the same gate. */
export const POST = handle(async (req: Request) => {
  const b = await readBody(req, ScheduleBody);
  const c = getContainer();
  const m = await ownMandate(req, c, b.mandateId);
  if (m.status === "revoked") throw new HttpError(409, "This mandate is revoked.");
  if ((await c.stores.schedules.list(b.mandateId)).length >= MAX_PER_MANDATE) throw new HttpError(409, `At most ${MAX_PER_MANDATE} scheduled buys per mandate.`);
  const now = new Date();
  const startAt = new Date(b.startAt).toISOString();
  const repeat = b.repeat as (typeof REPEATS)[number];
  const next = nextRun(startAt, repeat, new Date(now.getTime() - 60_000));
  const s = { id: randomUUID(), mandateId: b.mandateId, task: b.task, repeat, startAt, nextRunAt: next ? next.toISOString() : null, active: true, createdAt: now.toISOString(), runs: [] };
  await c.stores.schedules.put(s);
  return json(s, 201);
});
