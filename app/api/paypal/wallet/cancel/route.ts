import { getContainer } from "@/lib/server/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The buyer chose not to save PayPal. Nothing was saved. */
export async function GET() {
  return Response.redirect(`${getContainer().appUrl}/app?wallet=cancelled`, 303);
}
