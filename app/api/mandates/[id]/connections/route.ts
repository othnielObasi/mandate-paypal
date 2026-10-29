import { z } from "zod";
import { newConnection } from "@/lib/mcp/connections";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ label: z.string().trim().min(1).max(60) }).strict();

/** Connect an outside AI assistant to this mandate. The URL (with its secret) is shown once. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { label } = await readBody(req, Body);
  const c = getContainer();
  const m = await c.mandates.get(id);
  if (!m) throw new HttpError(404, "Mandate not found.");
  if (m.status === "revoked") throw new HttpError(409, "This mandate is revoked.");
  const { record, token } = newConnection(id, label, new Date());
  await c.stores.connections.put(record);
  await c.receipts.append({ mandateId: id, type: "mandate", summary: `Connected an outside AI assistant: ${label}`, payload: { connectionId: record.id, label } });
  return json({ id: record.id, label, createdAt: record.createdAt, token, url: `${c.appUrl}/api/mcp/${token}` }, 201);
});

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const rows = await getContainer().stores.connections.list(id);
  return json(rows.map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt, revoked: r.revokedAt !== null })));
});
