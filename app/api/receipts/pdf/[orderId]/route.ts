import { getContainer } from "@/lib/server/container";
import { handle, HttpError } from "@/lib/server/http";
import { receiptPdf } from "@/lib/ui/receipt-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A simple PDF receipt for a paid order, for people. The JSON evidence pack is the verifiable version. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const { orderId } = await ctx.params;
  const c = getContainer();
  const o = await c.stores.orders.get(orderId);
  if (!o) throw new HttpError(404, "No paid order with that id.");
  const cred = await c.stores.credentials.getByOrder(orderId);
  const paid = (await c.receipts.list(o.mandateId)).find((r) => r.type === "payment" && (r.payload as { paypalOrderId?: string } | null)?.paypalOrderId === orderId);
  const pdf = await receiptPdf({
    paypalOrderId: o.id,
    captureId: o.captureId,
    paidAt: o.paidAt,
    seller: c.merchants.directory()[o.merchantId]?.name ?? o.merchantId.replace(/^channel3:/, ""),
    items: o.items.map((i) => ({ title: i.title, qty: i.qty, unitMinor: i.unitMinor })),
    totalMinor: o.amountMinor,
    currency: o.currency,
    mode: cred?.payment.payment_mandate_contents.x_mandate.mode ?? "human_not_present",
    receiptSeq: paid?.seq ?? null,
    verifyUrl: `${c.appUrl}/seller?order=${encodeURIComponent(o.id)}`,
  });
  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="mandate-receipt-${o.id.replace(/[^A-Za-z0-9-]/g, "")}.pdf"`,
      "cache-control": "no-store",
    },
  });
});
