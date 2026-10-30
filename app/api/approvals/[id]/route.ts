import { z } from "zod";
import { PasskeyError } from "@/lib/core/governor";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const b64u = z.string().regex(/^[A-Za-z0-9_-]+$/).max(8192);
const Body = z
  .object({
    choice: z.enum(["approve", "decline"]),
    /** WebAuthn assertion over this approval's cart (see GET ./passkey for the challenge). */
    passkey: z.object({ credentialId: b64u, clientDataJSON: b64u, authenticatorData: b64u, signature: b64u }).strict().optional(),
  })
  .strict();

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { choice, passkey } = await readBody(req, Body);
  try {
    return json(await getContainer().governor.decide(id, choice, { passkey }));
  } catch (e) {
    if (e instanceof PasskeyError) throw new HttpError(403, e.message);
    const msg = e instanceof Error ? e.message : "Cannot decide this approval.";
    if (/not found/i.test(msg)) throw new HttpError(404, msg);
    if (/expired/i.test(msg)) throw new HttpError(410, msg);
    if (/already/i.test(msg)) throw new HttpError(409, msg);
    throw e;
  }
});
