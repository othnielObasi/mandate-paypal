import { handleMcp } from "@/lib/mcp/server";
import { getContainer } from "@/lib/server/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const route = (req: Request) => handleMcp(req, getContainer().mcp, null);

/** MCP endpoint authenticated with `Authorization: Bearer <connection token>`. */
export const POST = route;
export const GET = route;
export const DELETE = route;
