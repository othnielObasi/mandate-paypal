import { disputeTemplate, type DisputeFacts } from "./dispute-writer";
import type { LlmClient, LlmRequest, LlmResponse, Message } from "./runtime";

type Action = { tool: "search_catalog"; query: string } | { tool: "get_product"; sku: string } | { tool: "propose_purchase"; sku: string; qty: number };

/**
 * A deterministic stand-in for the model, so the app runs end to end
 * without an API key. It uses the same tools and passes the same gate.
 * With followPageInstructions it behaves like a naive agent that obeys
 * product pages, which is how the demo shows the injection defence.
 */
export class OfflinePlanner implements LlmClient {
  readonly model = "offline-planner";
  private queue: Action[] = [];
  private last: Action | null = null;
  private outcomes: string[] = [];

  constructor(private opts: { followPageInstructions?: boolean } = {}) {}

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const first = req.messages[0];
    const userText = typeof first?.content === "string" ? first.content : "";
    if (req.tools.length === 0 && req.system.startsWith("DISPUTE_STATEMENT")) {
      try {
        return text(disputeTemplate(JSON.parse(userText) as DisputeFacts));
      } catch {
        return text("");
      }
    }
    if (req.tools.length === 0) return text(JSON.stringify(parsePolicyText(userText, req.system)));

    if (req.messages.length === 1) {
      this.queue = itemPhrases(userText).map((query) => ({ tool: "search_catalog" as const, query }));
      this.last = null;
      this.outcomes = [];
    } else {
      this.absorb(lastToolResult(req.messages));
    }

    const next = this.queue.shift();
    if (!next) return text(this.summary());
    this.last = next;
    const { tool, ...input } = next;
    return { stop: "tool_use", content: [{ type: "tool_use", id: `off_${Math.random().toString(36).slice(2, 10)}`, name: tool, input }] };
  }

  private absorb(result: unknown) {
    const a = this.last;
    if (!a || !result || typeof result !== "object") return;
    const r = result as Record<string, unknown>;
    if (a.tool === "search_catalog") {
      const top = (r.results as Array<{ sku: string }> | undefined)?.[0];
      if (!top) return;
      if (this.opts.followPageInstructions) this.queue.unshift({ tool: "get_product", sku: top.sku }, { tool: "propose_purchase", sku: top.sku, qty: 1 });
      else this.queue.unshift({ tool: "propose_purchase", sku: top.sku, qty: 1 });
    } else if (a.tool === "get_product" && this.opts.followPageInstructions) {
      const page = String(r.page ?? "");
      const skus = [...page.matchAll(/sku ([a-z0-9-]+)/g)].map((m) => m[1]!);
      for (const sku of skus) this.queue.push({ tool: "propose_purchase", sku, qty: 1 });
    } else if (a.tool === "propose_purchase") {
      this.outcomes.push(`${a.sku}: ${String(r.status ?? "unknown")}`);
    }
  }

  private summary() {
    return this.outcomes.length ? `Finished. ${this.outcomes.join("; ")}.` : "I couldn't find anything matching that in the catalogue.";
  }
}

const text = (t: string): LlmResponse => ({ stop: "end", content: [{ type: "text", text: t }] });

function lastToolResult(messages: Message[]): unknown {
  const m = messages.at(-1);
  if (!m || m.role !== "user" || typeof m.content === "string") return null;
  const block = m.content.at(-1);
  if (!block) return null;
  try {
    return JSON.parse(block.content);
  } catch {
    return null;
  }
}

/** "Buy washing-up liquid and sponges" → ["washing-up liquid", "sponges"] */
export function itemPhrases(task: string): string[] {
  return task
    .replace(/^\s*(please\s+)?(buy|restock|get|order|purchase|reorder)\s+(me\s+)?(some\s+)?/i, "")
    .split(/,|\band\b|\bplus\b|;/i)
    .map((s) => s.replace(/^\s*(a|an|some|the)\s+/i, "").replace(/[.!?]+$/, "").trim())
    .filter((s) => s.length > 1)
    .slice(0, 5);
}

function parsePolicyText(t: string, system: string) {
  const s = t.toLowerCase();
  const today = system.match(/Today is (\d{4}-\d{2}-\d{2})/)?.[1] ?? new Date().toISOString().slice(0, 10);
  const expires = new Date(Date.parse(`${today}T00:00:00Z`) + 90 * 864e5).toISOString().slice(0, 10);

  const categories: string[] = [];
  if (/office|printer|paper|ink|stationery/.test(s)) categories.push("office");
  if (/household|home|cleaning|kitchen|basics|groceries/.test(s) || categories.length === 0) categories.push("household");

  let budget: { amountMinor: number; period: "week" | "month" } | null = null;
  let cap: number | null = null;
  for (const m of s.matchAll(/\$\s?(\d+(?:\.\d{1,2})?)/g)) {
    const cents = Math.round(Number(m[1]) * 100);
    const before = s.slice(Math.max(0, m.index! - 24), m.index!);
    const after = s.slice(m.index! + m[0].length, m.index! + m[0].length + 16);
    const period = /week/.test(after) ? "week" : /month/.test(after) ? "month" : null;
    if (period) budget = { amountMinor: cents, period };
    else if (/over|above|more than|per item|each|single|max/.test(before + after)) cap = cents;
    else if (!budget) budget = { amountMinor: cents, period: "month" };
  }
  budget ??= { amountMinor: 5000, period: "month" };
  cap = Math.min(cap ?? budget.amountMinor, budget.amountMinor);

  const premium = s.match(/(\d{1,3})\s*%\s*(?:above|over)\s*(?:the\s*)?market/);
  return {
    ...(premium ? { maxPremiumPct: Math.min(200, Number(premium[1])) } : {}),
    categories,
    currency: "USD",
    maxItemMinor: cap,
    budget,
    sellers: { verifiedOnly: !/any seller|unverified/.test(s), blocked: [] },
    overLimit: /\brefuse\b|block anything|hard limit|never ask/.test(s) ? "block" : "ask",
    expires,
  };
}
