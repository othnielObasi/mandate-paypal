import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cut off an outside AI assistant immediately. */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!(await getContainer().stores.connections.revoke(id, new Date().toISOString()))) throw new HttpError(404, "Connection not found or already revoked.");
  return json({ revoked: true });
});
