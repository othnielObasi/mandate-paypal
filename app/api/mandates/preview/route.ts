import { z } from "zod";
import { parseMandate } from "@/lib/agent/mandate-parser";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";
import { enforceLimit } from "@/lib/server/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ text: z.string() }).strict();

/** Read the rules from plain English without saving, so the user can check and edit them first. */
export const POST = handle(async (req: Request) => {
  const { text } = await readBody(req, Body);
  const c = getContainer();
  enforceLimit(req, c);
  const parsed = await parseMandate(text, c.newLlm(), new Date());
  if (!parsed.ok) throw new HttpError(422, parsed.error);
  return json({ policy: parsed.policy });
});
