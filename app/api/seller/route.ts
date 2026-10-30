import { checkPayment } from "@/lib/ap2/check";
import { checkAp2Order } from "@/lib/ap2v2/check";
import { getContainer } from "@/lib/server/container";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A merchant's view of the agent payments it received, each with a verdict. */
export const GET = handle(async (req: Request) => {
  const merchantId = new URL(req.url).searchParams.get("merchantId");
  const c = getContainer();
  const now = new Date();
  const recs = (await c.stores.credentials.list()).filter((r) => r.paypalOrderId && (!merchantId || r.cart.contents.x_mandate.merchant_id === merchantId));
  const rows = [];
  for (const r of recs.reverse()) {
    const v = await checkPayment(c, r.paypalOrderId!, now);
    if (v) {
      const { chain: _chain, ...summary } = v;
      const ap2 = await checkAp2Order({ credentials: c.stores.credentials, mandates: c.mandates, keys: c.credentials.ap2 }, r.paypalOrderId!);
      rows.push({ ...summary, ap2: ap2 ? ap2.ok : null });
    }
  }
  return json(rows);
});
