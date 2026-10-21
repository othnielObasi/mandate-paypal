import { z } from "zod";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ choice: z.enum(["approve", "decline"]) }).strict();

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { choice } = await readBody(req, Body);
  try {
    return json(await getContainer().governor.decide(id, choice));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cannot decide this approval.";
    if (/not found/i.test(msg)) throw new HttpError(404, msg);
    if (/expired/i.test(msg)) throw new HttpError(410, msg);
    if (/already/i.test(msg)) throw new HttpError(409, msg);
    throw e;
  }
});
