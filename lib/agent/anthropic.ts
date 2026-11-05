import type { LlmClient, LlmRequest, LlmResponse, TextBlock, ToolUseBlock } from "./runtime";

/** Where a Messages-API request goes, and how the key is sent. */
export interface MessagesEndpoint {
  /** Shown in errors and on /api/health. */
  label: string;
  baseUrl: string;
  auth: "x-api-key" | "bearer";
  /**
   * Extra output tokens for models that think before answering. Their thinking counts against
   * max_tokens, so without headroom a short answer budget can be spent before any text is written.
   */
  thinkingHeadroom?: number;
}

/** Anthropic's Claude API. */
export const CLAUDE: MessagesEndpoint = { label: "Claude API", baseUrl: "https://api.anthropic.com", auth: "x-api-key" };

/**
 * Meta Model API (Muse Spark, Muse Wonder). It accepts Anthropic-shaped /v1/messages requests
 * unchanged, with the key as a bearer token.
 */
export const META: MessagesEndpoint = { label: "Meta Model API", baseUrl: "https://api.meta.ai", auth: "bearer", thinkingHeadroom: 4096 };

class RetryableError extends Error {}

/**
 * Minimal Messages API client (no SDK dependency), for Claude or Meta's Muse models.
 * A slow or failed call (timeout, 429, 5xx) is retried once.
 */
export class AnthropicClient implements LlmClient {
  private fetchImpl: typeof fetch;
  private endpoint: MessagesEndpoint;

  constructor(private o: { apiKey: string; model: string; fetch?: typeof fetch; timeoutMs?: number; endpoint?: MessagesEndpoint; retries?: number }) {
    this.fetchImpl = o.fetch ?? fetch;
    this.endpoint = o.endpoint ?? CLAUDE;
  }

  get model() {
    return this.o.model;
  }

  get provider() {
    return this.endpoint.label;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const retries = this.o.retries ?? 1;
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.once(req);
      } catch (e) {
        if (!(e instanceof RetryableError) || attempt >= retries) throw e instanceof RetryableError ? new Error(e.message) : e;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  private async once(req: LlmRequest): Promise<LlmResponse> {
    const { label, baseUrl, auth, thinkingHeadroom = 0 } = this.endpoint;
    const body: Record<string, unknown> = {
      model: this.o.model,
      max_tokens: req.maxTokens + thinkingHeadroom,
      system: req.system,
      messages: req.messages,
    };
    if (req.tools.length > 0) body.tools = req.tools;

    let res: Response;
    try {
      res = await this.fetchImpl(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(auth === "bearer" ? { authorization: `Bearer ${this.o.apiKey}` } : { "x-api-key": this.o.apiKey }),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.o.timeoutMs ?? 45_000),
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new RetryableError(`${label}: ${timedOut ? "no answer in time" : "network error"}`);
    }
    const json = (await res.json().catch(() => ({}))) as {
      stop_reason?: string;
      content?: Array<Record<string, unknown>>;
      error?: { message?: string } | string;
    };
    if (!res.ok) {
      const detail = typeof json.error === "string" ? json.error : (json.error?.message ?? "request failed");
      const msg = `${label} ${res.status}: ${detail}`;
      if (res.status === 429 || res.status >= 500) throw new RetryableError(msg);
      throw new Error(msg);
    }

    const content: Array<TextBlock | ToolUseBlock> = [];
    for (const b of json.content ?? []) {
      if (b.type === "text") content.push({ type: "text", text: String(b.text ?? "") });
      if (b.type === "tool_use") content.push({ type: "tool_use", id: String(b.id), name: String(b.name), input: (b.input as Record<string, unknown>) ?? {} });
    }
    const stop = json.stop_reason === "tool_use" ? "tool_use" : json.stop_reason === "max_tokens" ? "max_tokens" : "end";
    return { stop, content };
  }
}
