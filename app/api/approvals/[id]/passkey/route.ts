import { approvalCart } from "@/lib/core/governor";
import { approvalChallenge } from "@/lib/passkey/webauthn";
import { passkeyOwner } from "@/lib/passkey/store";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** What the device must sign to approve this exact cart, and which passkeys may sign it. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const c = getContainer();
  const a = await c.stores.approvals.get(id);
  if (!a) throw new HttpError(404, "Approval not found.");
  const m = await c.mandates.get(a.mandateId);
  const keys = m ? await c.stores.passkeys.listForUser(passkeyOwner(m)) : [];
  return json({ challenge: approvalChallenge(approvalCart(a)), rpId: keys[0]?.rpId ?? null, allowCredentials: keys.map((k) => k.credentialId) });
});
