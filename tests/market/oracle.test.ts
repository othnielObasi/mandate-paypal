import { describe, it, expect, vi } from "vitest";
import { Channel3Oracle, SimulatedMarket } from "@/lib/market/oracle";

const product = (title: string, offers: Array<[number, string, "InStock" | "OutOfStock"]>) => ({
  id: title,
  title,
  offers: offers.map(([price, currency, availability], i) => ({ url: `https://shop${i}.example/p`, domain: `shop${i}.example`, price: { price, currency }, availability })),
});

function fetchReturning(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status }));
}

describe("Channel3 market reference", () => {
  it("searches Channel3 for in-stock offers with the API key", async () => {
    const f = fetchReturning({ products: [] });
    await new Channel3Oracle({ apiKey: "c3-key", fetch: f as unknown as typeof fetch }).reference({ title: "Electric kettle 1.7L", currency: "USD" });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://api.trychannel3.com/v1/search");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("c3-key");
    expect(JSON.parse(String(init.body))).toEqual({ query: "Electric kettle 1.7L", limit: 10, filters: { availability: ["InStock"] } });
  });

  it("uses the median of each product's cheapest in-stock offer in the same currency", async () => {
    const f = fetchReturning({
      products: [
        product("A", [[30, "USD", "InStock"], [20, "USD", "InStock"]]), // cheapest 20
        product("B", [[22, "USD", "InStock"]]),
        product("C", [[25.5, "USD", "InStock"], [5, "USD", "OutOfStock"]]), // out of stock ignored → 25.50
        product("D", [[9, "GBP", "InStock"]]), // other currency ignored
        product("E", [[100, "USD", "InStock"]]),
      ],
    });
    const r = await new Channel3Oracle({ apiKey: "k", fetch: f as unknown as typeof fetch }).reference({ title: "kettle", currency: "USD" });
    // median of 20, 22, 25.50 and 100 = (22 + 25.50) / 2 = 23.75
    expect(r).toMatchObject({ referenceMinor: 2375, products: 4, source: "Channel3" });
  });

  it("needs at least three comparable products", async () => {
    const f = fetchReturning({ products: [product("A", [[20, "USD", "InStock"]]), product("B", [[22, "USD", "InStock"]])] });
    expect(await new Channel3Oracle({ apiKey: "k", fetch: f as unknown as typeof fetch }).reference({ title: "x", currency: "USD" })).toBeNull();
  });

  it("returns no reference on an API error or timeout, instead of failing the purchase", async () => {
    const err = fetchReturning({ detail: "rate limited" }, 429);
    expect(await new Channel3Oracle({ apiKey: "k", fetch: err as unknown as typeof fetch }).reference({ title: "x", currency: "USD" })).toBeNull();
    const boom = vi.fn(async () => Promise.reject(new Error("network")));
    expect(await new Channel3Oracle({ apiKey: "k", fetch: boom as unknown as typeof fetch }).reference({ title: "x", currency: "USD" })).toBeNull();
  });

  it("caches answers for a while", async () => {
    let t = 0;
    const f = fetchReturning({ products: [product("A", [[20, "USD", "InStock"]]), product("B", [[22, "USD", "InStock"]]), product("C", [[24, "USD", "InStock"]])] });
    const o = new Channel3Oracle({ apiKey: "k", fetch: f as unknown as typeof fetch, clock: () => t });
    await o.reference({ title: "x", currency: "USD" });
    await o.reference({ title: "x", currency: "USD" });
    expect(f).toHaveBeenCalledTimes(1);
    t += 11 * 60_000;
    await o.reference({ title: "x", currency: "USD" });
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("simulated market (no Channel3 key)", () => {
  it("has reference prices for the demo catalogue and none for unknown items", async () => {
    const m = new SimulatedMarket();
    expect(await m.reference({ title: "Electric kettle 1.7L", currency: "USD" })).toMatchObject({ referenceMinor: 2499, source: "simulated market" });
    expect(await m.reference({ title: "Unknown thing", currency: "USD" })).toBeNull();
  });
});
