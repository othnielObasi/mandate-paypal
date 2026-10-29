import { handleMcp } from "@/lib/mcp/server";
import { getContainer } from "@/lib/server/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };
const route = async (req: Request, ctx: Ctx) => handleMcp(req, getContainer().mcp, (await ctx.params).token);

/** MCP endpoint addressed by a connection URL (for clients that only take a URL). */
export const POST = route;
export const GET = route;
export const DELETE = route;
