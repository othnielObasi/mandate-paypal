import { getContainer } from "@/lib/server/container";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  const mandateId = new URL(req.url).searchParams.get("mandateId") ?? undefined;
  const now = Date.now();
  const rows = (await getContainer().approvals.list(mandateId)).filter((a) => a.status === "pending" && Date.parse(a.expiresAt) > now);
  return json(rows.map(({ proposal: _p, ...a }) => a));
});
