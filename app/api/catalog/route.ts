import { getContainer } from "@/lib/server/container";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** The demo store plus real products found so far; ?sku=a,b returns just those. */
export async function GET(req: Request) {
  const c = getContainer().catalog;
  const want = new URL(req.url).searchParams.get("sku");
  if (!want) return json(c.all());
  return json(want.split(",").slice(0, 50).map((s) => c.get(s.trim())).filter(Boolean));
}
