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
    /** Stream steps as NDJSON lines ({type:"event"} … then {type:"done"}) so the UI can show them live. */
    stream: z.boolean().optional(),
  })
  .strict();

export const POST = handle(async (req: Request) => {
  const { mandateId, task, drill, stream } = await readBody(req, Body);
  const c = getContainer();
  if (!(await c.mandates.get(mandateId))) throw new HttpError(404, "Mandate not found.");
  enforceLimit(req, c);
  const opts = { task, mandateId, llm: c.newLlm({ drill }), catalog: c.catalog, propose: c.governor.propose.bind(c.governor) };
  if (!stream) return json(await runAgentTask(opts));

  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const result = await runAgentTask({ ...opts, onEvent: (event) => send({ type: "event", event }) });
        send({ type: "done", result });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : String(e) });
      } finally {
        ctl.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
});
