import { describe, it, expect, vi } from "vitest";
import { runAgentTask, type LlmClient, type LlmResponse } from "@/lib/agent/runtime";
import { DEMO_CATALOG, Catalog } from "@/lib/merchant/catalog";
import type { Proposal } from "@/lib/core/stores";

const catalog = new Catalog(DEMO_CATALOG);

/** A scripted model: returns the next canned response each turn and records what it was sent. */
function scripted(responses: LlmResponse[]): LlmClient & { seen: unknown[] } {
  const seen: unknown[] = [];
  let i = 0;
  return {
    seen,
    async complete(req) {
      seen.push(structuredClone(req));
      const r = responses[i++];
      if (!r) return { stop: "end", content: [{ type: "text", text: "Done." }] };
      return r;
    },
  };
}

const tool = (id: string, name: string, input: Record<string, unknown>): LlmResponse => ({
  stop: "tool_use",
  content: [{ type: "tool_use", id, name, input }],
});

describe("agent runtime", () => {
  it("runs search → propose and reports the gate's outcome", async () => {
    const propose = vi.fn(async (_p: Proposal) => ({ status: "paid" as const, decision: { outcome: "allow", rule: "ok", reason: "ok" } }));
    const llm = scripted([
      tool("t1", "search_catalog", { query: "washing up liquid" }),
      tool("t2", "propose_purchase", { sku: "wul-500", qty: 1 }),
      { stop: "end", content: [{ type: "text", text: "Bought washing-up liquid." }] },
    ]);
    const r = await runAgentTask({ task: "Buy washing-up liquid", mandateId: "m1", llm, catalog, propose });
    expect(propose).toHaveBeenCalledTimes(1);
    expect(r.final).toBe("Bought washing-up liquid.");
    expect(r.events.filter((e) => e.kind === "tool").map((e) => e.name)).toEqual(["search_catalog", "propose_purchase"]);
  });

  it("feeds tool results back to the model with matching ids", async () => {
    const llm = scripted([tool("abc", "search_catalog", { query: "sponges" })]);
    await runAgentTask({ task: "sponges", mandateId: "m1", llm, catalog, propose: vi.fn() });
    const second = llm.seen[1] as { messages: Array<{ role: string; content: unknown }> };
    const last = second.messages.at(-1)!;
    expect(last.role).toBe("user");
    expect(JSON.stringify(last.content)).toContain('"tool_use_id":"abc"');
  });

  it("only offers the model shopping tools — nothing that can pay", async () => {
    const llm = scripted([]);
    await runAgentTask({ task: "x", mandateId: "m1", llm, catalog, propose: vi.fn() });
    const req = llm.seen[0] as { tools: Array<{ name: string }> };
    expect(req.tools.map((t) => t.name).sort()).toEqual(["get_product", "propose_purchase", "search_catalog"]);
  });

  it("tells the model that product pages are data, not instructions", async () => {
    const llm = scripted([]);
    await runAgentTask({ task: "x", mandateId: "m1", llm, catalog, propose: vi.fn() });
    expect((llm.seen[0] as { system: string }).system).toMatch(/untrusted/i);
  });

  it("returns an error result for an unknown tool and keeps going", async () => {
    const llm = scripted([tool("t1", "wire_funds", { amount: 1 }), { stop: "end", content: [{ type: "text", text: "ok" }] }]);
    const r = await runAgentTask({ task: "x", mandateId: "m1", llm, catalog, propose: vi.fn() });
    expect(r.events.find((e) => e.kind === "tool")).toMatchObject({ name: "wire_funds", ok: false });
    expect(r.final).toBe("ok");
  });

  it("stops at the step limit", async () => {
    const loop = Array.from({ length: 50 }, (_, i) => tool(`t${i}`, "search_catalog", { query: "sponges" }));
    const llm = scripted(loop);
    const r = await runAgentTask({ task: "x", mandateId: "m1", llm, catalog, propose: vi.fn(), maxSteps: 4 });
    expect(r.events.filter((e) => e.kind === "tool")).toHaveLength(4);
    expect(r.stoppedBy).toBe("step_limit");
  });

  it("surfaces a model failure instead of crashing", async () => {
    const llm: LlmClient = {
      async complete() {
        throw new Error("rate limited");
      },
    };
    const r = await runAgentTask({ task: "x", mandateId: "m1", llm, catalog, propose: vi.fn() });
    expect(r.stoppedBy).toBe("model_error");
    expect(r.final).toMatch(/rate limited/);
  });

  it("an injected page cannot get a purchase through as agent-originated", async () => {
    const propose = vi.fn(async (_p: Proposal) => ({ status: "blocked" as const }));
    const llm = scripted([
      tool("t1", "search_catalog", { query: "cleaning spray" }),
      tool("t2", "get_product", { sku: "clean-spray" }),
      tool("t3", "search_catalog", { query: "platinum bundle" }),
      tool("t4", "propose_purchase", { sku: "platinum-bundle", qty: 1 }),
    ]);
    await runAgentTask({ task: "Buy a cleaning spray", mandateId: "m1", llm, catalog, propose });
    expect(propose.mock.calls[0]![0].origin).toBe("untrusted_instruction");
  });
});
