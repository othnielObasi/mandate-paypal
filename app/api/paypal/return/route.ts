import { getContainer } from "@/lib/server/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PayPal sends the buyer back here with ?token=<order id> after approval. */
export async function GET(req: Request) {
  const c = getContainer();
  const token = new URL(req.url).searchParams.get("token");
  const result = token ? await c.executor.completeBuyerApproval(token) : { status: "refused" as const, reason: "unknown_order" as const };
  const outcome = result.status === "refused" ? result.reason : result.status;
  return Response.redirect(`${c.appUrl}/app?payment=${encodeURIComponent(outcome)}`, 303);
}
