import { describe, it, expect } from "vitest";
import { periodStart, MemoryPaymentStore } from "@/lib/core/spend";

describe("budget periods (UTC)", () => {
  it("a month starts on the 1st at 00:00 UTC", () => {
    expect(periodStart("month", new Date("2026-10-21T10:00:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("a week starts on Monday at 00:00 UTC", () => {
    // 21 Oct 2026 is a Wednesday
    expect(periodStart("week", new Date("2026-10-21T10:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    // Sunday rolls back to the previous Monday
    expect(periodStart("week", new Date("2026-10-25T23:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    // Monday is its own start
    expect(periodStart("week", new Date("2026-10-26T00:00:00Z")).toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});

describe("payment store", () => {
  it("sums only this mandate's captures inside the current period", async () => {
    const s = new MemoryPaymentStore();
    await s.record({ mandateId: "m1", amountMinor: 1000, capturedAt: "2026-09-30T23:59:59Z", paypalOrderId: "a" });
    await s.record({ mandateId: "m1", amountMinor: 450, capturedAt: "2026-10-01T00:00:00Z", paypalOrderId: "b" });
    await s.record({ mandateId: "m1", amountMinor: 300, capturedAt: "2026-10-20T12:00:00Z", paypalOrderId: "c" });
    await s.record({ mandateId: "m2", amountMinor: 999, capturedAt: "2026-10-20T12:00:00Z", paypalOrderId: "d" });
    expect(await s.spentMinor("m1", "month", new Date("2026-10-21T10:00:00Z"))).toBe(750);
  });

  it("ignores a duplicate record of the same PayPal order", async () => {
    const s = new MemoryPaymentStore();
    await s.record({ mandateId: "m1", amountMinor: 450, capturedAt: "2026-10-20T12:00:00Z", paypalOrderId: "b" });
    await s.record({ mandateId: "m1", amountMinor: 450, capturedAt: "2026-10-20T12:00:01Z", paypalOrderId: "b" });
    expect(await s.spentMinor("m1", "month", new Date("2026-10-21T10:00:00Z"))).toBe(450);
  });
});
