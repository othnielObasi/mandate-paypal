import { z } from "zod";
import { bearerMatches } from "@/lib/automation/zapier";
import type { MandateStatus } from "@/lib/gate/types";
import { getContainer } from "@/lib/server/container";
import { DEMO_USER } from "@/lib/server/demo";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z
  .object({
    action: z.enum(["pause", "resume", "revoke"]),
    /** One mandate; omit to act on all of the user's mandates. */
    mandateId: z.string().min(1).max(100).optional(),
  })
  .strict();

const TARGET: Record<"pause" | "resume" | "revoke", { to: MandateStatus; from: MandateStatus[] }> = {
  pause: { to: "paused", from: ["active"] },
  resume: { to: "active", from: ["paused"] },
  revoke: { to: "revoked", from: ["active", "paused"] },
};

/**
 * Kill switch for automations (e.g. a Zap: "text STOP to pause every agent").
 * Needs `Authorization: Bearer <AUTOMATION_SECRET>`. It can only stop or resume
 * spending, never approve a purchase or raise a limit.
 */
export const POST = handle(async (req: Request) => {
  const c = getContainer();
  const secret = c.automation.killSwitchSecret;
  if (!secret) throw new HttpError(503, "The automation kill switch is not configured (set AUTOMATION_SECRET, 16+ characters).");
  if (!bearerMatches(req.headers.get("authorization"), secret)) throw new HttpError(401, "Missing or wrong bearer token.", { "www-authenticate": "Bearer" });

  const { action, mandateId } = await readBody(req, Body);
  const { to, from } = TARGET[action];
  const mandates = mandateId ? [await c.mandates.get(mandateId)].filter((m) => m !== undefined) : await c.mandates.list(DEMO_USER);
  if (mandateId && mandates.length === 0) throw new HttpError(404, "Mandate not found.");

  const changed: string[] = [];
  for (const m of mandates) {
    if (!from.includes(m.status)) continue;
    await c.governor.setStatus(m.id, to, { via: "automation" });
    changed.push(m.id);
  }
  return json({ ok: true, action, status: to, changed });
});
