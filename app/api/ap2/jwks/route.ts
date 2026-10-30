import { getContainer } from "@/lib/server/container";
import { DEMO_USER } from "@/lib/server/demo";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** ES256 public keys (JWKS) for every AP2 v0.2 credential Mandate issues: provider, agent, gateway, merchants, users. */
export async function GET() {
  const c = getContainer();
  return json(c.credentials.ap2.jwks(Object.keys(c.merchants.directory()), [DEMO_USER]));
}
