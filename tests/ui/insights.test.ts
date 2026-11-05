import { describe, expect, it } from "vitest";
import { buildInsights, decisionRow } from "@/lib/ui/insights";
import type { Receipt } from "@/lib/gate/receipts";
import { createContainer, setContainer } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as insights } from "@/app/api/insights/route";
import { FIELDS, REPORT } from "@/app/app/insights/Dashboard";

const r = (over: Partial<Receipt>): Receipt => ({
  seq: 3,
  mandateId: "m",
  type: "decision",
  summary: "",
  payload: {},
  payloadHash: "",
  createdAt: "2026-11-05T10:00:00.000Z",
  prevHash: "",
  hash: "",
  signature: "",
  ...over,
});
const intent = { amountMinor: 3200, category: "household", merchantId: "acme-supplies", itemTitle: "Electric kettle 1.7L", origin: "agent" };

describe("Insights rows", () => {
  it("turns a gate decision into a row that points back to its receipt", () => {
    expect(decisionRow(r({ payload: { intent, decision: { outcome: "approve", rule: "item_cap" } } }))).toEqual({
      n: 1,
      seq: 3,
      at: "2026-11-05T10:00:00.000Z",
      day: "2026-11-05",
      outcome: "Asked you",
      rule: "Over the item limit",
      item: "Electric kettle 1.7L",
      category: "household",
      merchant: "acme-supplies",
      amount: 32,
      source: "Mandate's agent",
    });
  });

  it("names who started it: an outside assistant, or a page that steered the agent", () => {
    const via = decisionRow(r({ summary: "Allowed: Sponges $1.99 from Acme (via Astropods shopper). Within every rule.", payload: { intent, decision: { outcome: "allow", rule: "ok" } } }));
    expect(via?.source).toBe("Outside assistant: Astropods shopper");
    const steered = decisionRow(r({ payload: { intent: { ...intent, origin: "untrusted_instruction" }, decision: { outcome: "block", rule: "untrusted_instruction" } } }));
    expect([steered?.source, steered?.rule]).toEqual(["A web or product page", "Injected by a page"]);
  });

  it("keeps early blocks that have no priced intent, using the item named in the summary", () => {
    const row = decisionRow(r({ summary: "Blocked: Store gift card $50. The mandate is paused.", payload: { decision: { outcome: "block", rule: "mandate_inactive" } } }));
    expect(row).toMatchObject({ outcome: "Blocked", item: "Store gift card $50", rule: "Mandate paused or revoked", amount: 0 });
  });

  it("ignores everything that is not a decision, and malformed payloads", () => {
    expect(decisionRow(r({ type: "payment" }))).toBeNull();
    expect(decisionRow(r({ payload: null }))).toBeNull();
    expect(decisionRow(r({ payload: { decision: { outcome: "maybe" } } }))).toBeNull();
  });

  it("payments become dollars by day and merchant", () => {
    expect(buildInsights([], [{ amountMinor: 450, capturedAt: "2026-11-05T09:00:00Z", paypalOrderId: "X", merchant: "Acme Supplies" }]).payments).toEqual([
      { n: 1, at: "2026-11-05T09:00:00Z", day: "2026-11-05", amount: 4.5, merchant: "Acme Supplies", paypalOrderId: "X" },
    ]);
  });
});

describe("Insights API and dashboard", () => {
  const post = (p: string, b: unknown) => new Request(`http://localhost:3000${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });

  it("serves rows for a mandate from its signed log and payments", async () => {
    setContainer(createContainer({ APP_URL: "http://localhost:3000" }));
    const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
    await runAgent(post("/api/agent/run", { mandateId: m.id, task: "Buy washing-up liquid and an electric kettle" }));
    const body = (await (await insights(new Request(`http://localhost:3000/api/insights?mandateId=${m.id}`))).json()) as { decisions: Array<{ outcome: string }>; payments: Array<{ amount: number; merchant: string }> };
    expect(body.decisions.map((d) => d.outcome).sort()).toEqual(["Allowed", "Asked you"]);
    expect(body.payments).toEqual([expect.objectContaining({ amount: 4.5, merchant: "Acme Supplies" })]);
  });

  it("every widget reads only fields the rows actually have", () => {
    const fields = {
      decisions: Object.keys(decisionRow(r({ payload: { intent, decision: { outcome: "allow", rule: "ok" } } }))!),
      payments: Object.keys(buildInsights([], [{ amountMinor: 1, capturedAt: "2026-11-05T00:00:00Z", paypalOrderId: "X" }]).payments[0]!),
    };
    const refs = JSON.stringify(REPORT).match(/"id":"(decisions|payments)\.[a-zA-Z]+"/g) ?? [];
    expect(refs.length).toBeGreaterThan(10);
    for (const ref of refs) {
      const [source, field] = ref.slice(6, -1).split(".") as ["decisions" | "payments", string];
      expect(fields[source], ref).toContain(field);
    }
  });

  it("declares every field up front, so an empty source (no payment captured yet) still has a schema", () => {
    const rows = {
      decisions: Object.keys(decisionRow(r({ payload: { intent, decision: { outcome: "allow", rule: "ok" } } }))!),
      payments: Object.keys(buildInsights([], [{ amountMinor: 1, capturedAt: "2026-11-05T00:00:00Z", paypalOrderId: "X" }]).payments[0]!),
    };
    for (const source of ["decisions", "payments"] as const) expect(FIELDS[source].map((f) => f.id).sort(), source).toEqual([...rows[source]].sort());
  });
});
