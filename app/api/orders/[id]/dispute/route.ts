import { z } from "zod";
import { getContainer } from "@/lib/server/container";
import { asHttp } from "@/lib/server/errors";
import { handle, json, readBody } from "@/lib/server/http";
import { enforceLimit } from "@/lib/server/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("draft") }).strict(),
  z.object({ action: z.literal("file"), confirm: z.boolean().optional() }).strict(),
  z.object({ action: z.literal("sync") }).strict(),
]);

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await readBody(req, Body);
  const c = getContainer();
  if (body.action === "draft") enforceLimit(req, c); // drafting calls the model
  try {
    if (body.action === "draft") return json(await c.fulfilment.draftDispute(id, c.newLlm()));
    if (body.action === "file") return json(await c.fulfilment.fileDispute(id, body.confirm === true));
    return json(await c.fulfilment.syncDispute(id));
  } catch (e) {
    asHttp(e);
  }
});
