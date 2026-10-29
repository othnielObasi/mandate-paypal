import { getContainer } from "@/lib/server/container";
import { DEMO_USER } from "@/lib/server/demo";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public keys needed to verify any mandate chain: the gateway, the merchants (with verified status) and users. */
export async function GET() {
  const c = getContainer();
  return json(c.credentials.trust(c.merchants, [DEMO_USER]));
}
