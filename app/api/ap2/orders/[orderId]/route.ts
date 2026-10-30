import { checkAp2Order } from "@/lib/ap2v2/check";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * AP2 v0.2 evidence pack for a PayPal order: the merchant-signed checkout,
 * the Checkout and Payment Mandate chains, both receipts, and the verdict.
 * Verify it independently with the keys at /api/ap2/jwks.
 */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const c = getContainer();
  const r = await checkAp2Order({ credentials: c.stores.credentials, mandates: c.mandates, keys: c.credentials.ap2 }, orderId);
  if (!r) throw new HttpError(404, "No AP2 v0.2 evidence is on file for this PayPal order.");
  return json(r);
});
