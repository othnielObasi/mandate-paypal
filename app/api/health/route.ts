import { getContainer } from "@/lib/server/container";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const c = getContainer();
  return json({ ok: true, provider: c.providerName, model: c.modelName, signingKey: c.signingKey, storage: c.storage, sandboxOnly: true });
}
