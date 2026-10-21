import { getContainer } from "@/lib/server/container";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(getContainer().catalog.all());
}
