import { z } from "zod";
import { getContainer } from "@/lib/server/container";
import { asHttp } from "@/lib/server/errors";
import { handle, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ event: z.enum(["lost", "delivered"]) }).strict();

/** Demo control for the simulated carrier. Refused for real carriers. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { event } = await readBody(req, Body);
  const f = getContainer().fulfilment;
  try {
    await f.simulate(id, event);
    return json(await f.refresh(id));
  } catch (e) {
    asHttp(e);
  }
});
