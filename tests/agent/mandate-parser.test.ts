import { describe, it, expect } from "vitest";
import { parseMandate } from "@/lib/agent/mandate-parser";
import type { LlmClient } from "@/lib/agent/runtime";

const reply = (text: string): LlmClient => ({
  async complete() {
    return { stop: "end", content: [{ type: "text", text }] };
  },
});

const good = {
  categories: ["household"],
  currency: "USD",
  maxItemMinor: 2500,
  budget: { amountMinor: 8000, period: "month" },
  sellers: { verifiedOnly: true, blocked: [] },
  overLimit: "ask",
  expires: "2026-12-31",
};

const today = new Date("2026-10-21T10:00:00Z");

describe("mandate parser", () => {
  it("accepts a valid policy from the model", async () => {
    const r = await parseMandate("household basics, $80 a month, nothing over $25", reply(JSON.stringify(good)), today);
    expect(r).toEqual({ ok: true, policy: good });
  });

  it("extracts JSON wrapped in prose or a code fence", async () => {
    const r = await parseMandate("x", reply("Here you go:\n```json\n" + JSON.stringify(good) + "\n```"), today);
    expect(r.ok).toBe(true);
  });

  it("rejects output that is not JSON", async () => {
    expect((await parseMandate("x", reply("I can't do that"), today)).ok).toBe(false);
  });

  it("rejects a policy that breaks the schema", async () => {
    expect((await parseMandate("x", reply(JSON.stringify({ ...good, maxItemMinor: -5 })), today)).ok).toBe(false);
  });

  it("rejects extra fields the model invents", async () => {
    expect((await parseMandate("x", reply(JSON.stringify({ ...good, unlimited: true })), today)).ok).toBe(false);
  });

  it("rejects an expiry in the past", async () => {
    expect((await parseMandate("x", reply(JSON.stringify({ ...good, expires: "2026-01-01" })), today)).ok).toBe(false);
  });

  it("rejects empty or oversized input without calling the model", async () => {
    let called = false;
    const spy: LlmClient = {
      async complete() {
        called = true;
        return { stop: "end", content: [{ type: "text", text: "{}" }] };
      },
    };
    expect((await parseMandate("   ", spy, today)).ok).toBe(false);
    expect((await parseMandate("x".repeat(2001), spy, today)).ok).toBe(false);
    expect(called).toBe(false);
  });

  it("reports a model failure as an error, not a crash", async () => {
    const failing: LlmClient = {
      async complete() {
        throw new Error("timeout");
      },
    };
    expect(await parseMandate("x", failing, today)).toMatchObject({ ok: false });
  });
});
