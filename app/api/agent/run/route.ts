import { z } from "zod";
import { runAgentTask } from "@/lib/agent/runtime";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";
import { enforceLimit } from "@/lib/server/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z
  .object({
    mandateId: z.string().min(1),
    task: z.string().trim().min(1).max(500),
    /** Compromised-agent drill: a planner that obeys product pages. */
    drill: z.boolean().optional(),
  })
  .strict();

export const POST = handle(async (req: Request) => {
  const { mandateId, task, drill } = await readBody(req, Body);
  const c = getContainer();
  if (!(await c.mandates.get(mandateId))) throw new HttpError(404, "Mandate not found.");
  enforceLimit(req, c);
  const result = await runAgentTask({
    task,
    mandateId,
    llm: c.newLlm({ drill }),
    catalog: c.catalog,
    propose: (p) => c.governor.propose(p),
  });
  return json(result);
});
