import { z } from "zod";
import { getContainer } from "@/lib/server/container";
import { handle, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ mandateId: z.string().min(1) }).strict();

/** The fulfilment watcher: refresh tracking for every undelivered order. */
export const POST = handle(async (req: Request) => {
  const { mandateId } = await readBody(req, Body);
  return json(await getContainer().fulfilment.refreshAll(mandateId));
});
