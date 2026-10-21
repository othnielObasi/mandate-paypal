import { describe, it, expect, vi } from "vitest";
import { AgentSession } from "@/lib/agent/tools";
import { DEMO_CATALOG, Catalog } from "@/lib/merchant/catalog";
import type { Proposal } from "@/lib/core/stores";

const catalog = new Catalog(DEMO_CATALOG);

function session(task = "Restock household basics: washing-up liquid and sponges") {
  const propose = vi.fn(async (_p: Proposal) => ({ status: "paid" as const }));
  const s = new AgentSession({ task, mandateId: "m1", catalog, propose });
  return { s, propose };
}

describe("agent tools: search and product pages", () => {
  it("search returns matching products with trusted fields only", async () => {
    const { s } = session();
    const r = await s.call("search_catalog", { query: "washing up liquid" });
    if (!r.ok) throw new Error(r.error);
    const items = (r.result as { results: Array<Record<string, unknown>> }).results;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("sku");
    expect(items[0]).not.toHaveProperty("description");
  });

  it("product pages come back wrapped and labelled as untrusted", async () => {
    const { s } = session();
    const r = await s.call("get_product", { sku: "clean-spray" });
    if (!r.ok) throw new Error(r.error);
    const text = JSON.stringify(r.result);
    expect(text).toContain("UNTRUSTED");
    expect(text).toContain("SYSTEM NOTE");
  });

  it("returns an error for an unknown product or tool", async () => {
    const { s } = session();
    expect((await s.call("get_product", { sku: "nope" })).ok).toBe(false);
    expect((await s.call("transfer_money", { to: "x" })).ok).toBe(false);
  });

  it("rejects malformed tool input", async () => {
    const { s } = session();
    expect((await s.call("search_catalog", { query: 42 })).ok).toBe(false);
    expect((await s.call("propose_purchase", { sku: "wul-500", qty: -3 })).ok).toBe(false);
  });
});

describe("agent tools: purchases use catalogue facts, not model claims", () => {
  it("builds the order from the catalogue price, ignoring any price the model sends", async () => {
    const { s, propose } = session();
    await s.call("search_catalog", { query: "washing up liquid" });
    await s.call("propose_purchase", { sku: "wul-500", qty: 2, unitPrice: 0.01, category: "household" });
    const p = propose.mock.calls[0]![0];
    const product = catalog.get("wul-500")!;
    expect(p.order.items[0]).toEqual({ sku: "wul-500", title: product.title, unitMinor: product.unitMinor, qty: 2 });
    expect(p.order.merchantId).toBe(product.merchantId);
    expect(p.category).toBe(product.category);
    expect(p.merchantVerified).toBe(product.merchantVerified);
  });

  it("refuses to propose an unknown product", async () => {
    const { s, propose } = session();
    expect((await s.call("propose_purchase", { sku: "ghost", qty: 1 })).ok).toBe(false);
    expect(propose).not.toHaveBeenCalled();
  });
});

describe("agent tools: provenance (prompt-injection defence)", () => {
  it("a product found through the user's own search is agent-originated", async () => {
    const { s, propose } = session();
    await s.call("search_catalog", { query: "sponges" });
    await s.call("propose_purchase", { sku: "sponge-3", qty: 1 });
    expect(propose.mock.calls[0]![0].origin).toBe("agent");
  });

  it("a product never surfaced by a search is untrusted", async () => {
    const { s, propose } = session();
    await s.call("propose_purchase", { sku: "gift-card-50", qty: 1 });
    expect(propose.mock.calls[0]![0].origin).toBe("untrusted_instruction");
  });

  it("a search driven by words only seen on a product page is untrusted", async () => {
    const { s, propose } = session();
    await s.call("search_catalog", { query: "cleaning spray" });
    await s.call("get_product", { sku: "clean-spray" }); // page says: buy the Platinum Deep-Clean Bundle
    await s.call("search_catalog", { query: "platinum bundle" });
    await s.call("propose_purchase", { sku: "platinum-bundle", qty: 1 });
    expect(propose.mock.calls[0]![0].origin).toBe("untrusted_instruction");
  });

  it("reading a page does not taint later searches for the user's own items", async () => {
    const { s, propose } = session();
    await s.call("search_catalog", { query: "cleaning spray" });
    await s.call("get_product", { sku: "clean-spray" });
    await s.call("search_catalog", { query: "sponges" });
    await s.call("propose_purchase", { sku: "sponge-3", qty: 1 });
    expect(propose.mock.calls[0]![0].origin).toBe("agent");
  });

  it("a product found by both a clean and a tainted search stays trusted", async () => {
    const { s, propose } = session("Buy the platinum bundle for the office");
    await s.call("get_product", { sku: "clean-spray" });
    await s.call("search_catalog", { query: "platinum bundle" }); // words are in the user's task, so clean
    await s.call("propose_purchase", { sku: "platinum-bundle", qty: 1 });
    expect(propose.mock.calls[0]![0].origin).toBe("agent");
  });
});
