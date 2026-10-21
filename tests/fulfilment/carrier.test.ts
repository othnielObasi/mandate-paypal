import { describe, it, expect } from "vitest";
import { SimulatedCarrier } from "@/lib/fulfilment/carrier";

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
    expect((await c.ship("a", t0)).trackingNumber).not.toBe((await c.ship("b", t0)).trackingNumber);
  });

  it("can mark a parcel lost or delivered (demo controls)", async () => {
    const c = new SimulatedCarrier();
    const a = await c.ship("a", t0);
    const b = await c.ship("b", t0);
    c.markLost(a.trackingNumber, new Date("2026-10-22T09:00:00Z"));
    c.markDelivered(b.trackingNumber, new Date("2026-10-22T09:00:00Z"));
    expect((await c.track(a.trackingNumber)).status).toBe("LOST");
    expect((await c.track(b.trackingNumber)).status).toBe("DELIVERED");
    expect((await c.track(a.trackingNumber)).events.at(-1)).toMatchObject({ status: "LOST", at: "2026-10-22T09:00:00.000Z" });
  });

  it("a delivered parcel cannot then be lost", async () => {
    const c = new SimulatedCarrier();
    const a = await c.ship("a", t0);
    c.markDelivered(a.trackingNumber, t0);
    expect(() => c.markLost(a.trackingNumber, t0)).toThrow(/delivered/);
  });

  it("rejects unknown tracking numbers", async () => {
    const c = new SimulatedCarrier();
    await expect(c.track("nope")).rejects.toThrow(/unknown/i);
    expect(() => c.markLost("nope", t0)).toThrow(/unknown/i);
  });
});
