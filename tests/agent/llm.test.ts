import { describe, it, expect, vi } from "vitest";
import { AnthropicClient } from "@/lib/agent/anthropic";
import { OfflinePlanner } from "@/lib/agent/offline";
import { parseMandate } from "@/lib/agent/mandate-parser";
import { runAgentTask } from "@/lib/agent/runtime";
import { DEMO_CATALOG, Catalog } from "@/lib/merchant/catalog";
import type { Proposal } from "@/lib/core/stores";

describe("AnthropicClient", () => {
  it("sends a Messages API request and maps the response", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(
        JSON.stringify({
          stop_reason: "tool_use",
          content: [
            { type: "text", text: "Searching." },
            { type: "tool_use", id: "toolu_1", name: "search_catalog", input: { query: "sponges" } },
          ],
        }),
        { status: 200 },
      ),
    );
    const c = new AnthropicClient({ apiKey: "sk-test", model: "claude-sonnet-5-5", fetch: fetchMock as unknown as typeof fetch });
    const r = await c.complete({
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
      tools: [{ name: "search_catalog", description: "d", input_schema: { type: "object" } }],
      maxTokens: 100,
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: "claude-sonnet-5-5", max_tokens: 100, system: "sys", tools: [{ name: "search_catalog" }] });
    expect(r).toEqual({
      stop: "tool_use",
      content: [
        { type: "text", text: "Searching." },
        { type: "tool_use", id: "toolu_1", name: "search_catalog", input: { query: "sponges" } },
      ],
    });
  });

  it("omits an empty tools list", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "{}" }] })));
    const c = new AnthropicClient({ apiKey: "k", model: "m", fetch: fetchMock as unknown as typeof fetch });
    const r = await c.complete({ system: "s", messages: [{ role: "user", content: "x" }], tools: [], maxTokens: 10 });
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))).not.toHaveProperty("tools");
    expect(r.stop).toBe("end");
  });

  it("throws a readable error on an API failure, without leaking the key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: "overloaded" } }), { status: 529 }));
    const c = new AnthropicClient({ apiKey: "sk-secret", model: "m", fetch: fetchMock as unknown as typeof fetch });
    const err = await c.complete({ system: "s", messages: [{ role: "user", content: "x" }], tools: [], maxTokens: 10 }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/529.*overloaded/);
    expect((err as Error).message).not.toContain("sk-secret");
  });
});

describe("OfflinePlanner (runs the demo with no API key)", () => {
  const catalog = new Catalog(DEMO_CATALOG);

  it("parses a plain-English mandate into a valid policy", async () => {
    const r = await parseMandate(
      "Household basics, up to $80 a month, nothing over $25, verified sellers only",
      new OfflinePlanner(),
      new Date("2026-10-21T10:00:00Z"),
    );
    expect(r).toMatchObject({
      ok: true,
      policy: { categories: ["household"], currency: "USD", maxItemMinor: 2500, budget: { amountMinor: 8000, period: "month" }, sellers: { verifiedOnly: true } },
    });
  });

  it("understands weekly budgets and office supplies", async () => {
    const r = await parseMandate("office supplies, $40 per week", new OfflinePlanner(), new Date("2026-10-21T10:00:00Z"));
    expect(r).toMatchObject({ ok: true, policy: { categories: ["office"], maxItemMinor: 4000, budget: { amountMinor: 4000, period: "week" } } });
  });

  it("shops for each item named in the task through the normal tools", async () => {
    const propose = vi.fn(async (_p: Proposal) => ({ status: "paid" }));
    const r = await runAgentTask({ task: "Buy washing-up liquid and sponges", mandateId: "m1", llm: new OfflinePlanner(), catalog, propose });
    expect(propose.mock.calls.map((c) => c[0].order.items[0]!.sku).sort()).toEqual(["sponge-3", "wul-500"]);
    expect(r.stoppedBy).toBe("end");
  });

  it("reads product pages and can be fooled into proposing the injected item — which the session marks untrusted", async () => {
    const propose = vi.fn(async (_p: Proposal) => ({ status: "blocked" }));
    await runAgentTask({ task: "Buy a cleaning spray", mandateId: "m1", llm: new OfflinePlanner({ followPageInstructions: true }), catalog, propose });
    const origins = Object.fromEntries(propose.mock.calls.map((c) => [c[0].order.items[0]!.sku, c[0].origin]));
    expect(origins["clean-spray"]).toBe("agent");
    expect(origins["platinum-bundle"]).toBe("untrusted_instruction");
    expect(origins["gift-card-50"]).toBe("untrusted_instruction");
  });
});
