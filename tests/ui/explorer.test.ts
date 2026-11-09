import { describe, expect, it } from "vitest";
import { createContainer, setContainer } from "@/lib/server/container";
import { explorerRow, RULE_COLUMNS } from "@/lib/ui/explorer";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown) => new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("decision explorer rows", () => {
  it("each decision carries all 7 rules' results from its signed receipt", async () => {
    const c = createContainer({ APP_URL: BASE, MANDATE_SCHEDULER: "off" });
    setContainer(c);
    const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
    for (const task of ["Buy washing-up liquid", "Buy an electric kettle", "Buy toilet roll"]) await runAgent(post("/api/agent/run", { mandateId: m.id, task }));
    const rows = (await c.receipts.list(m.id)).map(explorerRow).filter((r) => r !== null);
    const by = (item: RegExp) => rows.find((r) => item.test(r!.item))!;
    expect(RULE_COLUMNS.map(([k]) => by(/washing-up/)[`rule_${k}`])).toEqual(["pass", "pass", "pass", "pass", "pass", "off", "pass"]);
    expect(by(/kettle/)).toMatchObject({ outcome: "Asked you", rule_item_cap: "ask" });
    expect(by(/Toilet/)).toMatchObject({ outcome: "Blocked", rule_seller: "block" });
  });
});
