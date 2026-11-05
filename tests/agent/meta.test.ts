import { describe, expect, it, vi } from "vitest";
import { AnthropicClient, META } from "@/lib/agent/anthropic";
import { chooseLlm, createContainer } from "@/lib/server/container";

const req = { system: "s", messages: [{ role: "user" as const, content: "x" }], tools: [], maxTokens: 10 };
const ok = (content: unknown[] = [{ type: "text", text: "hi" }]) => new Response(JSON.stringify({ stop_reason: "end_turn", content }));

describe("Muse models on the Meta Model API", () => {
  it("sends the same Messages request to api.meta.ai with a bearer token", async () => {
    const fetchMock = vi.fn(async () => ok());
    const c = new AnthropicClient({ apiKey: "meta-key", model: "muse-spark-1.3", endpoint: META, fetch: fetchMock as unknown as typeof fetch });
    expect(await c.complete(req)).toEqual({ stop: "end", content: [{ type: "text", text: "hi" }] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.meta.ai/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer meta-key");
    expect(headers).not.toHaveProperty("x-api-key");
    // Muse thinks before answering, and thinking counts against max_tokens: it gets headroom on top.
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "muse-spark-1.3", system: "s", max_tokens: 10 + 4096 });
  });

  it("retries once when the model is overloaded or slow, then succeeds", async () => {
    const overloaded = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "busy" } }), { status: 503 })).mockResolvedValueOnce(ok());
    expect((await new AnthropicClient({ apiKey: "k", model: "m", endpoint: META, fetch: overloaded as unknown as typeof fetch }).complete(req)).stop).toBe("end");
    expect(overloaded).toHaveBeenCalledTimes(2);

    const stalls = vi.fn().mockRejectedValueOnce(Object.assign(new Error("timed out"), { name: "TimeoutError" })).mockResolvedValueOnce(ok());
    expect((await new AnthropicClient({ apiKey: "k", model: "m", endpoint: META, fetch: stalls as unknown as typeof fetch }).complete(req)).stop).toBe("end");
    expect(stalls).toHaveBeenCalledTimes(2);
  });

  it("does not retry a request the API rejects, and names the provider without leaking the key", async () => {
    const bad = vi.fn(async () => new Response(JSON.stringify({ error: { message: "bad model" } }), { status: 400 }));
    const err = (await new AnthropicClient({ apiKey: "meta-secret", model: "m", endpoint: META, fetch: bad as unknown as typeof fetch }).complete(req).catch((e: Error) => e)) as Error;
    expect(bad).toHaveBeenCalledTimes(1);
    expect(err.message).toBe("Meta Model API 400: bad model");
    expect(err.message).not.toContain("meta-secret");
  });

  it("gives up after one retry", async () => {
    const down = vi.fn(async () => new Response("{}", { status: 502 }));
    const err = (await new AnthropicClient({ apiKey: "k", model: "m", endpoint: META, fetch: down as unknown as typeof fetch }).complete(req).catch((e: Error) => e)) as Error;
    expect(down).toHaveBeenCalledTimes(2);
    expect(err.message).toMatch(/^Meta Model API 502/);
  });
});

describe("choosing the model", () => {
  it("uses Muse Spark when only a Meta key is set", () => {
    expect(chooseLlm({ MODEL_API_KEY: "m" })).toMatchObject({ endpoint: { label: "Meta Model API" }, model: "muse-spark-1.3" });
  });

  it("prefers Claude when both keys are set, unless MANDATE_LLM says meta", () => {
    expect(chooseLlm({ MODEL_API_KEY: "m", ANTHROPIC_API_KEY: "a" })).toMatchObject({ endpoint: { label: "Claude API" }, model: "claude-sonnet-5-5" });
    expect(chooseLlm({ MODEL_API_KEY: "m", ANTHROPIC_API_KEY: "a", MANDATE_LLM: "meta" })).toMatchObject({ endpoint: { label: "Meta Model API" } });
  });

  it("ignores a model name meant for the other provider", () => {
    expect(chooseLlm({ MODEL_API_KEY: "m", MANDATE_MODEL: "claude-sonnet-5-5" })!.model).toBe("muse-spark-1.3");
    expect(chooseLlm({ MODEL_API_KEY: "m", MANDATE_MODEL: "muse-wonder-1.0" })!.model).toBe("muse-wonder-1.0");
    expect(chooseLlm({ ANTHROPIC_API_KEY: "a", MANDATE_MODEL: "muse-spark-1.3" })!.model).toBe("claude-sonnet-5-5");
  });

  it("falls back to the offline planner with no usable key", () => {
    expect(chooseLlm({})).toBeNull();
    expect(chooseLlm({ MANDATE_LLM: "meta", ANTHROPIC_API_KEY: "a" })).toBeNull();
    const c = createContainer({});
    expect([c.modelName, c.modelProvider]).toEqual(["offline-planner", "offline"]);
  });

  it("reports the provider on the container", () => {
    const c = createContainer({ MODEL_API_KEY: "m" });
    expect([c.modelName, c.modelProvider]).toEqual(["muse-spark-1.3", "Meta Model API"]);
  });
});
