export interface MarketQuote {
  /** Reference price for one unit, in minor units. */
  referenceMinor: number;
  currency: string;
  /** How many comparable products the reference is based on. */
  products: number;
  source: string;
}

/** Where the market-price rule gets its reference prices. No answer means the rule does not apply. */
export interface PriceOracle {
  readonly name: string;
  reference(item: { title: string; currency: string }): Promise<MarketQuote | null>;
}

type C3Offer = { price?: { price?: number; currency?: string }; availability?: string };
type C3Product = { offers?: C3Offer[] };

const MIN_PRODUCTS = 3;
const TTL_MS = 10 * 60_000;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Market reference from Channel3's product catalogue: for each matching
 * product, its cheapest in-stock offer in the same currency; the reference
 * is the median of those. Fewer than three comparable products, an API
 * error or a timeout all mean "no reference", never a blocked purchase.
 */
export class Channel3Oracle implements PriceOracle {
  readonly name = "Channel3";
  private cache = new Map<string, { at: number; value: MarketQuote | null }>();
  private fetchImpl: typeof fetch;

  constructor(private o: { apiKey: string; fetch?: typeof fetch; clock?: () => number; timeoutMs?: number }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  async reference(item: { title: string; currency: string }): Promise<MarketQuote | null> {
    const now = this.o.clock ? this.o.clock() : Date.now();
    const key = `${item.currency}|${item.title.toLowerCase()}`;
    const hit = this.cache.get(key);
    if (hit && now - hit.at < TTL_MS) return hit.value;
    const value = await this.lookup(item).catch(() => null);
    this.cache.set(key, { at: now, value });
    return value;
  }

  private async lookup(item: { title: string; currency: string }): Promise<MarketQuote | null> {
    const res = await this.fetchImpl("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.o.apiKey },
      body: JSON.stringify({ query: item.title, limit: 10, filters: { availability: ["InStock"] } }),
      signal: AbortSignal.timeout(this.o.timeoutMs ?? 4_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { products?: C3Product[] };
    const cheapest: number[] = [];
    for (const p of json.products ?? []) {
      const prices = (p.offers ?? [])
        .filter((o) => o.availability === "InStock" && o.price?.currency === item.currency && typeof o.price.price === "number" && o.price.price > 0)
        .map((o) => o.price!.price!);
      if (prices.length) cheapest.push(Math.min(...prices));
    }
    if (cheapest.length < MIN_PRODUCTS) return null;
    return { referenceMinor: Math.round(median(cheapest) * 100), currency: item.currency, products: cheapest.length, source: "Channel3" };
  }
}

/** Fixed reference prices for the demo catalogue, used when no Channel3 key is set. Labelled as simulated. */
const SIMULATED: Record<string, number> = {
  "eco washing-up liquid 500ml": 420,
  "non-scratch sponges (3 pack)": 210,
  "multi-surface cleaning spray": 399,
  "platinum deep-clean bundle": 1800,
  "electric kettle 1.7l": 2499,
  "toilet roll (9 pack)": 620,
  "store gift card $50": 5000,
  "a4 copier paper (500 sheets)": 650,
  "black ink cartridge": 1999,
};

export class SimulatedMarket implements PriceOracle {
  readonly name = "simulated market";
  async reference(item: { title: string; currency: string }): Promise<MarketQuote | null> {
    const ref = item.currency === "USD" ? SIMULATED[item.title.toLowerCase()] : undefined;
    return ref ? { referenceMinor: ref, currency: "USD", products: 5, source: this.name } : null;
  }
}
