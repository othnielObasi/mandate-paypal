import { checkPayment } from "@/lib/ap2/check";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Merchant-side check: is this PayPal order backed by a mandate the buyer signed? */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const r = await checkPayment(getContainer(), orderId, new Date());
  if (!r) throw new HttpError(404, "No agent payment mandate is on file for this PayPal order.");
  return json(r);
});
