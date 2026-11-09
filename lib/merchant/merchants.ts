import { deriveSigner } from "../ap2/keys";
import { signCartMandate, type CartMandate } from "../ap2/mandates";
import type { Proposal } from "../core/stores";
import type { OrderSpec } from "../gate/canonical";
import type { Signer } from "../gate/keys";
import type { Catalog } from "./catalog";
import { isLive, liveDomain } from "./live";

export interface MerchantInfo {
  id: string;
  name: string;
  verified: boolean;
  publicKey: string;
}

/** A merchant's signed offer: the cart, the order derived from it, and who is selling. */
export interface Quote {
  cart: CartMandate;
  order: OrderSpec;
  category: string;
  merchant: MerchantInfo;
}

/** The merchant side of a purchase. Prices, categories and seller status come from here, never from the agent. */
export interface Merchants {
  quote(p: Proposal, now: Date): Promise<Quote | { error: string }>;
  directory(): Record<string, { publicKey: string; verified: boolean; name: string }>;
}

export const DEMO_MERCHANTS = [
  { id: "acme-supplies", name: "Acme Supplies", verified: true },
  { id: "office-hub", name: "Office Hub", verified: true },
  { id: "corner-mart", name: "Corner Mart", verified: false },
  { id: "promo-deals", name: "Promo Deals", verified: false },
] as const;

/** Demo merchants selling from the catalogue, each with its own signing key. */
export class CatalogMerchants implements Merchants {
  private keys: Map<string, Signer>;
  private info: Map<string, { id: string; name: string; verified: boolean }>;

  constructor(
    private root: Signer,
    private catalog: Catalog,
    merchants: ReadonlyArray<{ id: string; name: string; verified: boolean }>,
  ) {
    this.info = new Map(merchants.map((m) => [m.id, m]));
    this.keys = new Map(merchants.map((m) => [m.id, deriveSigner(root, `merchant:${m.id}`)]));
  }

  async quote(p: Proposal, now: Date): Promise<Quote | { error: string }> {
    const merchantId = p.order?.merchantId;
    // A real shop found through Channel3: the cart is signed by Mandate's listing key for it, and it is
    // never a verified seller (the shop itself hasn't signed anything).
    if (merchantId && isLive(merchantId) && !this.info.has(merchantId) && (p.order?.items ?? []).every((i) => this.catalog.get(i.sku)?.merchantId === merchantId)) {
      this.info.set(merchantId, { id: merchantId, name: `${liveDomain(merchantId)} (Channel3 listing)`, verified: false });
      this.keys.set(merchantId, deriveSigner(this.root, `merchant:${merchantId}`));
    }
    const m = this.info.get(merchantId);
    if (!m) return { error: `${merchantId} is not a known merchant.` };
    const items = p.order?.items ?? [];
    if (items.length === 0) return { error: "Empty cart." };

    const lines = [];
    let category: string | null = null;
    for (const i of items) {
      const product = this.catalog.get(i.sku);
      if (!product || product.merchantId !== merchantId) return { error: `${m.name} does not sell "${i.sku}".` };
      if (category && product.category !== category) return { error: "A cart must be one category." };
      category = product.category;
      lines.push({ sku: product.sku, title: product.title, unitMinor: product.unitMinor, qty: i.qty });
    }
    const cart = signCartMandate({ merchantId, merchantName: m.name, currency: "USD", category: category!, lines, now }, this.keys.get(merchantId)!);
    return {
      cart,
      order: { mandateId: p.mandateId, merchantId, currency: "USD", items: lines },
      category: category!,
      merchant: { ...m, publicKey: this.keys.get(merchantId)!.publicKey },
    };
  }

  directory() {
    return Object.fromEntries([...this.info.values()].map((m) => [m.id, { publicKey: this.keys.get(m.id)!.publicKey, verified: m.verified, name: m.name }]));
  }
}
