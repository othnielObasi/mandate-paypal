import { describe, it, expect } from "vitest";
import { SimulatedCarrier, MemoryParcelStore } from "@/lib/fulfilment/carrier";

const t0 = new Date("2026-10-21T10:00:00Z");

describe("simulated carrier", () => {
  it("ships with a tracking number and an expected date three days out", async () => {
    const c = new SimulatedCarrier();
    const s = await c.ship("5O1", t0);
    expect(s.trackingNumber).toMatch(/^SIM1Z[0-9A-Z]+$/);
    expect(s.expectedBy).toBe("2026-10-24T10:00:00.000Z");
    const t = await c.track(s.trackingNumber);
    expect(t.status).toBe("IN_TRANSIT");
    expect(t.events.map((e) => e.status)).toEqual(["LABEL_CREATED", "IN_TRANSIT"]);
  });

  it("gives each shipment a different tracking number", async () => {
    const c = new SimulatedCarrier();
    const nums = await Promise.all(Array.from({ length: 50 }, (_, i) => c.ship(`o${i}`, t0)));
    expect(new Set(nums.map((n) => n.trackingNumber)).size).toBe(50);
  });

  it("can mark a parcel lost or delivered (demo controls)", async () => {
    const c = new SimulatedCarrier();
    const a = await c.ship("a", t0);
    const b = await c.ship("b", t0);
    await c.markLost(a.trackingNumber, new Date("2026-10-22T09:00:00Z"));
    await c.markDelivered(b.trackingNumber, new Date("2026-10-22T09:00:00Z"));
    expect((await c.track(a.trackingNumber)).status).toBe("LOST");
    expect((await c.track(b.trackingNumber)).status).toBe("DELIVERED");
    expect((await c.track(a.trackingNumber)).events.at(-1)).toMatchObject({ status: "LOST", at: "2026-10-22T09:00:00.000Z" });
  });

  it("a delivered parcel cannot then be lost", async () => {
    const c = new SimulatedCarrier();
    const a = await c.ship("a", t0);
    await c.markDelivered(a.trackingNumber, t0);
    await expect(c.markLost(a.trackingNumber, t0)).rejects.toThrow(/delivered/);
  });

  it("rejects unknown tracking numbers", async () => {
    const c = new SimulatedCarrier();
    await expect(c.track("nope")).rejects.toThrow(/unknown/i);
    await expect(c.markLost("nope", t0)).rejects.toThrow(/unknown/i);
  });

  it("keeps parcels in its store, so a new carrier instance sees them", async () => {
    const store = new MemoryParcelStore();
    const a = await new SimulatedCarrier(store).ship("a", t0);
    expect((await new SimulatedCarrier(store).track(a.trackingNumber)).status).toBe("IN_TRANSIT");
  });
});
