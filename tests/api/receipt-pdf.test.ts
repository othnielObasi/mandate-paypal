import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createContainer, setContainer } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as receiptPdf } from "@/app/api/receipts/pdf/[orderId]/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown) => new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = (id: string) => receiptPdf(new Request(`${BASE}/api/receipts/pdf/${id}`), { params: Promise.resolve({ orderId: id }) });

describe("PDF receipt", () => {
  it("a paid order downloads as a one-page PDF; an unknown order is a 404", async () => {
    const c = createContainer({ APP_URL: BASE, MANDATE_SCHEDULER: "off" });
    setContainer(c);
    const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
    await runAgent(post("/api/agent/run", { mandateId: m.id, task: "Buy washing-up liquid" }));
    const [order] = await c.stores.orders.list(m.id);
    const res = await get(order!.id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="mandate-receipt-.+\.pdf"/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe(`Mandate receipt ${order!.id}`);
    expect((await get("NOPE")).status).toBe(404);
  });
});
