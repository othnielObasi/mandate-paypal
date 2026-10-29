import { describe, it, expect } from "vitest";
import { FakeProvider } from "@/lib/paypal/fake-provider";
import type { OrderSpec } from "@/lib/gate/canonical";

const order: OrderSpec = { mandateId: "m", merchantId: "a", currency: "USD", items: [{ sku: "a", title: "A", unitMinor: 100, qty: 1 }] };
const urls = { returnUrl: "r", cancelUrl: "c" };

describe("simulated provider", () => {
  it("never reuses an order id, even across instances (i.e. restarts)", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const p = new FakeProvider();
      for (let j = 0; j < 20; j++) ids.add((await p.createOrder(order, urls)).paypalOrderId);
    }
    expect(ids.size).toBe(60);
  });

  it("never reuses a capture id across instances", async () => {
    const caps = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const p = new FakeProvider();
      for (let j = 0; j < 20; j++) {
        const r = await p.createOrder(order, urls);
        if (r.status === "COMPLETED") caps.add(r.captureId);
      }
    }
    expect(caps.size).toBe(60);
  });
});
