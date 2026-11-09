import type { Product } from "./catalog";

/** Real products from outside the demo store. Checkout still goes to Mandate's PayPal sandbox merchant. */
export interface LiveSource {
  readonly name: string;
  search(query: string, limit?: number): Promise<Product[]>;
}

/** Real products with a "channel3:" seller id are listings, not merchants that sign with Mandate. */
export const LIVE_PREFIX = "channel3:";
export const isLive = (merchantId: string) => merchantId.startsWith(LIVE_PREFIX);
export const liveDomain = (merchantId: string) => merchantId.slice(LIVE_PREFIX.length);

type C3Offer = { domain?: string; url?: string; price?: { price?: number; currency?: string }; availability?: string };
type C3Product = {
  id?: string;
  title?: string;
  description?: string;
  brands?: Array<{ name?: string }>;
  images?: Array<{ url?: string; cleaned_url?: string }>;
  category?: { slug?: string; path?: Array<{ slug?: string }> };
  offers?: C3Offer[];
};

/** Channel3's category path, in the plain words people put in their rules. */
const CATEGORY: Array<[RegExp, string]> = [
  [/office|school-supplies|paper/, "office"],
  [/household|cleaning|laundry|dish|kitchen|home-garden|bath|storage/, "household"],
  [/food|beverage|grocer|snack|pantry/, "groceries"],
  [/electronic|computer|phone|audio|camera|video-game|cable|charger/, "electronics"],
  [/health|beauty|personal-care|cosmetic|skin|hair|oral/, "personal care"],
  [/apparel|clothing|shoe|accessor|jewel/, "clothing"],
  [/toy|game|baby/, "toys"],
  [/pet/, "pets"],
  [/sport|outdoor|fitness/, "sports"],
  [/gift-card/, "gift-cards"],
];

export function mapCategory(c?: C3Product["category"]): string {
  const slugs = [...(c?.path ?? []).map((p) => p.slug ?? ""), c?.slug ?? ""].join(" ");
  for (const [re, name] of CATEGORY) if (re.test(slugs)) return name;
  return (c?.path?.[0]?.slug ?? "other").replace(/-/g, " ");
}

/** Product search across real shops (Channel3). Errors and timeouts mean "nothing found". */
export class Channel3Products implements LiveSource {
  readonly name = "Channel3";
  private fetchImpl: typeof fetch;
  constructor(private o: { apiKey: string; fetch?: typeof fetch; timeoutMs?: number }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  async search(query: string, limit = 5): Promise<Product[]> {
    const res = await this.fetchImpl("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.o.apiKey },
      body: JSON.stringify({ query, limit: 10, filters: { availability: ["InStock"] } }),
      signal: AbortSignal.timeout(this.o.timeoutMs ?? 6_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: C3Product[] };
    const out: Product[] = [];
    for (const p of json.products ?? []) {
      const product = toProduct(p);
      if (product) out.push(product);
      if (out.length >= limit) break;
    }
    return out;
  }
}

/** The cheapest in-stock USD offer becomes the product; anything without one is skipped. */
export function toProduct(p: C3Product): Product | null {
  if (!p.id || !p.title) return null;
  const offers = (p.offers ?? []).filter(
    (o) => o.availability === "InStock" && o.price?.currency === "USD" && typeof o.price.price === "number" && o.price.price > 0 && !!o.domain,
  );
  if (offers.length === 0) return null;
  const best = offers.reduce((a, b) => (b.price!.price! < a.price!.price! ? b : a));
  const brand = p.brands?.[0]?.name?.replace(/â€™/g, "’");
  const title = (brand && !p.title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${p.title}` : p.title).slice(0, 120);
  const image = p.images?.[0]?.cleaned_url ?? p.images?.[0]?.url;
  return {
    sku: `c3-${p.id}`.slice(0, 64),
    title,
    category: mapCategory(p.category),
    unitMinor: Math.round(best.price!.price! * 100),
    merchantId: `${LIVE_PREFIX}${best.domain!.toLowerCase()}`,
    // Real shops don't sign checkouts with Mandate, so they are never "verified sellers".
    merchantVerified: false,
    // Seller-written text: untrusted, like every product page.
    description: (p.description ?? "").slice(0, 600),
    ...(image && /^https:\/\//.test(image) ? { image } : {}),
    live: { source: "Channel3", domain: best.domain!.toLowerCase() },
  };
}
