import { checkPayment } from "@/lib/ap2/check";
import { checkAp2Order } from "@/lib/ap2v2/check";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Merchant-side check: is this PayPal order backed by a mandate the buyer signed? */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const c = getContainer();
  const r = await checkPayment(c, orderId, new Date());
  if (!r) throw new HttpError(404, "No agent payment mandate is on file for this PayPal order.");
  const ap2 = await checkAp2Order({ credentials: c.stores.credentials, mandates: c.mandates, keys: c.credentials.ap2 }, orderId);
  return json({ ...r, ap2 });
});
