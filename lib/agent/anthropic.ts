import type { LlmClient, LlmRequest, LlmResponse, TextBlock, ToolUseBlock } from "./runtime";

/** Minimal Claude Messages API client (no SDK dependency). */
export class AnthropicClient implements LlmClient {
  private fetchImpl: typeof fetch;
  constructor(private o: { apiKey: string; model: string; fetch?: typeof fetch; timeoutMs?: number }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  get model() {
    return this.o.model;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: this.o.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
    };
    if (req.tools.length > 0) body.tools = req.tools;

    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.o.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.o.timeoutMs ?? 45_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      stop_reason?: string;
      content?: Array<Record<string, unknown>>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${json.error?.message ?? "request failed"}`);

    const content: Array<TextBlock | ToolUseBlock> = [];
    for (const b of json.content ?? []) {
      if (b.type === "text") content.push({ type: "text", text: String(b.text ?? "") });
      if (b.type === "tool_use") content.push({ type: "tool_use", id: String(b.id), name: String(b.name), input: (b.input as Record<string, unknown>) ?? {} });
    }
    const stop = json.stop_reason === "tool_use" ? "tool_use" : json.stop_reason === "max_tokens" ? "max_tokens" : "end";
    return { stop, content };
  }
}
