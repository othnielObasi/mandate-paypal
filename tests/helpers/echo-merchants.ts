import { deriveSigner } from "@/lib/ap2/keys";
import { signCartMandate } from "@/lib/ap2/mandates";
import type { Signer } from "@/lib/gate/keys";
import type { Merchants, Quote } from "@/lib/merchant/merchants";
import type { Proposal } from "@/lib/core/stores";

/**
 * Test merchant: signs a cart for whatever lines it is asked for, at the
 * proposed prices, so gate and budget logic can be exercised with any amount.
 */
export class EchoMerchants implements Merchants {
  private keys = new Map<string, Signer>();
  constructor(
    private root: Signer,
    private unverified = new Set<string>(),
  ) {}

  private key(id: string) {
    if (!this.keys.has(id)) this.keys.set(id, deriveSigner(this.root, `merchant:${id}`));
    return this.keys.get(id)!;
  }

  async quote(p: Proposal, now: Date): Promise<Quote | { error: string }> {
    const o = p.order;
    if (!o?.items?.length) return { error: "Empty cart." };
    const lines = o.items.map((i) => ({ sku: i.sku, title: i.title, unitMinor: i.unitMinor, qty: i.qty }));
    const cart = signCartMandate({ merchantId: o.merchantId, merchantName: o.merchantId, currency: o.currency, category: p.category, lines, now }, this.key(o.merchantId));
    return {
      cart,
      order: { mandateId: p.mandateId, merchantId: o.merchantId, currency: o.currency, items: lines },
      category: p.category,
      merchant: { id: o.merchantId, name: o.merchantId, verified: !this.unverified.has(o.merchantId), publicKey: this.key(o.merchantId).publicKey },
    };
  }

  directory() {
    return Object.fromEntries([...this.keys].map(([id, k]) => [id, { publicKey: k.publicKey, verified: !this.unverified.has(id), name: id }]));
  }
}
