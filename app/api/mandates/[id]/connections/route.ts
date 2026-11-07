import { z } from "zod";
import { newConnection } from "@/lib/mcp/connections";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";
import { ownMandate } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ label: z.string().trim().min(1).max(60) }).strict();

/** Connect an outside AI assistant to this mandate. The URL (with its secret) is shown once. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { label } = await readBody(req, Body);
  const c = getContainer();
  const m = await ownMandate(req, c, id);
  if (m.status === "revoked") throw new HttpError(409, "This mandate is revoked.");
  const { record, token } = newConnection(id, label, new Date());
  await c.stores.connections.put(record);
  await c.receipts.append({ mandateId: id, type: "mandate", summary: `Connected an outside AI assistant: ${label}`, payload: { connectionId: record.id, label } });
  return json({ id: record.id, label, createdAt: record.createdAt, token, url: `${c.appUrl}/api/mcp/${token}` }, 201);
});

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const c = getContainer();
  await ownMandate(req, c, id);
  const rows = await c.stores.connections.list(id);
  return json(rows.map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt, revoked: r.revokedAt !== null })));
});
