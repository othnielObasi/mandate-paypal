import { getContainer } from "@/lib/server/container";
import { handle, json } from "@/lib/server/http";
import { enforceLimit } from "@/lib/server/limits";
import { ownSchedule } from "@/lib/server/schedules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Run a scheduled buy now, without waiting (its schedule doesn't change). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const c = getContainer();
  await ownSchedule(req, c, id);
  enforceLimit(req, c); // calls the model
  return json(await c.scheduler.runNow(id));
});
