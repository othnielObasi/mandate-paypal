import { z } from "zod";
import { parseMandate } from "@/lib/agent/mandate-parser";
import { parsePolicy, type Policy } from "@/lib/gate/policy";
import { getContainer } from "@/lib/server/container";
import { DEMO_USER } from "@/lib/server/demo";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ text: z.string().max(2000), policy: z.unknown().optional() }).strict();

/**
 * Create a mandate. With `policy`, save the rules the user reviewed and
 * edited (validated again here). Without it, parse `text` and save.
 */
export const POST = handle(async (req: Request) => {
  const { text, policy: edited } = await readBody(req, Body);
  const c = getContainer();
  let policy: Policy;
  if (edited !== undefined) {
    const p = parsePolicy(edited);
    if (!p.ok) throw new HttpError(422, p.error);
    if (p.value.expires < new Date().toISOString().slice(0, 10)) throw new HttpError(422, "The expiry date is in the past.");
    policy = p.value;
  } else {
    const parsed = await parseMandate(text, c.newLlm(), new Date());
    if (!parsed.ok) throw new HttpError(422, parsed.error);
    policy = parsed.policy;
  }
  const mandate = await c.governor.createMandate({ userId: DEMO_USER, policy, rawText: text.trim() });
  return json(mandate, 201);
});

export const GET = handle(async () => {
  return json(await getContainer().mandates.list(DEMO_USER));
});
