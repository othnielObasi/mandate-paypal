import { describe, it, expect } from "vitest";
import { writeDisputeStatement, disputeTemplate, type DisputeFacts } from "@/lib/agent/dispute-writer";
import { OfflinePlanner } from "@/lib/agent/offline";
import type { LlmClient, LlmRequest } from "@/lib/agent/runtime";

const facts: DisputeFacts = {
  paypalOrderId: "5O1",
  merchantId: "acme-supplies",
  items: "Eco washing-up liquid 500ml",
  amount: "$4.50",
  paidAt: "2026-10-21",
  carrierStatus: "LOST",
  expectedBy: "2026-10-24",
};

describe("dispute writer", () => {
  it("sends only the facts and asks for a statement, with no tools", async () => {
    let seen: LlmRequest | undefined;
    const llm: LlmClient = {
      complete: async (req) => {
        seen = req;
        return { stop: "end", content: [{ type: "text", text: `Order 5O1 for $4.50 was lost in transit by the carrier and never arrived. I request a refund.` }] };
      },
    };
    const r = await writeDisputeStatement(facts, llm);
    expect(r.writer).toBe("model");
    expect(seen!.tools).toEqual([]);
    expect(JSON.stringify(seen!.messages)).toContain("5O1");
    expect(seen!.system).toMatch(/only the facts/i);
  });

  it("rejects statements that are too short, too long, or miss the order id or amount", async () => {
    const say = (text: string): LlmClient => ({ complete: async () => ({ stop: "end", content: [{ type: "text", text }] }) });
    expect((await writeDisputeStatement(facts, say("Refund."))).writer).toBe("template");
    expect((await writeDisputeStatement(facts, say(`Order 5O1 $4.50 ${"x".repeat(2000)}`))).writer).toBe("template");
    expect((await writeDisputeStatement(facts, say("The item never arrived and the carrier lost it. Please refund my money in full."))).writer).toBe("template");
  });

  it("the template states the facts", () => {
    const s = disputeTemplate(facts);
    for (const f of ["5O1", "acme-supplies", "$4.50", "2026-10-24", "lost"]) expect(s).toContain(f);
  });

  it("the offline planner writes the statement when no API key is set", async () => {
    const r = await writeDisputeStatement(facts, new OfflinePlanner());
    expect(r.writer).toBe("model");
    expect(r.statement).toContain("5O1");
  });
});
