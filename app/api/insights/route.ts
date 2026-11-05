import { getContainer } from "@/lib/server/container";
import { handle, json } from "@/lib/server/http";
import { buildInsights } from "@/lib/ui/insights";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Rows for the Insights dashboard: every gate decision and every captured payment, from signed records. */
export const GET = handle(async (req: Request) => {
  const mandateId = new URL(req.url).searchParams.get("mandateId") ?? undefined;
  const c = getContainer();
  const [receipts, payments] = await Promise.all([c.receipts.list(mandateId), c.payments.list(mandateId)]);
  const withMerchants = await Promise.all(
    payments.map(async (p) => ({ ...p, merchant: (await c.stores.credentials.getByOrder(p.paypalOrderId))?.cart.contents.merchant_name })),
  );
  const names = c.merchants.directory();
  const out = buildInsights(receipts, withMerchants);
  for (const d of out.decisions) d.merchant = names[d.merchant]?.name ?? d.merchant;
  return json(out);
});
