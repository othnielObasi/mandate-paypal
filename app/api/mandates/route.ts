import { z } from "zod";
import { parseMandate } from "@/lib/agent/mandate-parser";
import { getContainer } from "@/lib/server/container";
import { DEMO_USER } from "@/lib/server/demo";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ text: z.string() }).strict();

export const POST = handle(async (req: Request) => {
  const { text } = await readBody(req, Body);
  const c = getContainer();
  const parsed = await parseMandate(text, c.newLlm(), new Date());
  if (!parsed.ok) throw new HttpError(422, parsed.error);
  const mandate = await c.governor.createMandate({ userId: DEMO_USER, policy: parsed.policy, rawText: text.trim() });
  return json(mandate, 201);
});

export const GET = handle(async () => {
  return json(await getContainer().mandates.list(DEMO_USER));
});
