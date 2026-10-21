import { z } from "zod";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ status: z.enum(["active", "paused", "revoked"]) }).strict();

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const status = await getContainer().governor.budgetStatus(id);
  if (!status) throw new HttpError(404, "Mandate not found.");
  return json(status);
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { status } = await readBody(req, Body);
  const c = getContainer();
  if (!(await c.mandates.get(id))) throw new HttpError(404, "Mandate not found.");
  try {
    await c.governor.setStatus(id, status);
  } catch (e) {
    throw new HttpError(409, e instanceof Error ? e.message : "Cannot change this mandate.");
  }
  return json(await c.mandates.get(id));
});
