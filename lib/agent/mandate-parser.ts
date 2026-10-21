import { parsePolicy, type Policy } from "../gate/policy";
import type { LlmClient } from "./runtime";

const SYSTEM = (today: string) => `Convert the user's spending instructions into a JSON policy. Today is ${today}.
Reply with ONLY a JSON object with exactly these keys:
{
  "categories": string[],          // lower-case, e.g. ["household"] or ["office"]
  "currency": "USD",
  "maxItemMinor": integer,         // largest single purchase, in cents
  "budget": { "amountMinor": integer, "period": "week" | "month" },
  "sellers": { "verifiedOnly": boolean, "blocked": string[] },
  "overLimit": "ask" | "block",    // "ask" unless the user says to refuse outright
  "expires": "YYYY-MM-DD"          // default: 3 months from today
}
Never add other keys. If the user gives no item limit, use the budget amount.`;

export type ParseMandateResult = { ok: true; policy: Policy } | { ok: false; error: string };

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate.trim().startsWith("{")) throw new Error("no JSON object in model output");
  return JSON.parse(candidate);
}

/** The model drafts; the schema decides. Nothing the model invents gets past validation. */
export async function parseMandate(text: string, llm: LlmClient, today: Date): Promise<ParseMandateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Describe what the agent may buy." };
  if (trimmed.length > 2000) return { ok: false, error: "Keep the mandate under 2,000 characters." };

  const day = today.toISOString().slice(0, 10);
  let raw: unknown;
  try {
    const res = await llm.complete({ system: SYSTEM(day), messages: [{ role: "user", content: trimmed }], tools: [], maxTokens: 400 });
    const out = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    raw = extractJson(out);
  } catch (e) {
    return { ok: false, error: `Could not read the mandate: ${e instanceof Error ? e.message : String(e)}` };
  }

  const parsed = parsePolicy(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.value.expires < day) return { ok: false, error: "The mandate's expiry date is in the past." };
  return { ok: true, policy: parsed.value };
}
