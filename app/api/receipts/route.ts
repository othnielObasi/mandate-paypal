import { getContainer } from "@/lib/server/container";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  const mandateId = new URL(req.url).searchParams.get("mandateId") ?? undefined;
  return json(await getContainer().receipts.list(mandateId));
});
