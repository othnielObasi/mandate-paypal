import { getContainer } from "@/lib/server/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const c = getContainer();
  const token = new URL(req.url).searchParams.get("token");
  const released = token ? await c.executor.cancelBuyerApproval(token) : false;
  return Response.redirect(`${c.appUrl}/app?payment=${released ? "cancelled" : "unknown_order"}`, 303);
}
