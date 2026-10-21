import { describe, it, expect, vi } from "vitest";
import { ToolkitTracking, ToolkitDisputes, SANDBOX_RESOLUTION_CENTER } from "@/lib/paypal/toolkit-fulfilment";

describe("ToolkitTracking", () => {
  it("adds tracking to the PayPal capture with create_shipment_tracking", async () => {
    const tools = {
      create_shipment_tracking: { execute: vi.fn(async () => JSON.stringify({ tracker_identifiers: [{ transaction_id: "CAP-1" }] })) },
      update_shipment_tracking: { execute: vi.fn(async () => "{}") },
    };
    await new ToolkitTracking(tools).attach({ captureId: "CAP-1", trackingNumber: "SIM1Z1", status: "SHIPPED" });
    expect(tools.create_shipment_tracking.execute).toHaveBeenCalledWith(
      { transaction_id: "CAP-1", tracking_number: "SIM1Z1", status: "SHIPPED", carrier: "UPS" },
      expect.anything(),
    );
  });

  it("updates an existing tracker for a later status", async () => {
    const tools = {
      create_shipment_tracking: { execute: vi.fn(async () => "{}") },
      update_shipment_tracking: { execute: vi.fn(async () => "{}") },
    };
    await new ToolkitTracking(tools).attach({ captureId: "CAP-1", trackingNumber: "SIM1Z1", status: "DELIVERED" });
    expect(tools.update_shipment_tracking.execute).toHaveBeenCalledWith(
      { transaction_id: "CAP-1", tracking_number: "SIM1Z1", status: "DELIVERED", carrier: "UPS" },
      expect.anything(),
    );
    expect(tools.create_shipment_tracking.execute).not.toHaveBeenCalled();
  });

  it("surfaces toolkit errors", async () => {
    const tools = {
      create_shipment_tracking: { execute: vi.fn(async () => JSON.stringify({ error: { message: "INVALID_TRACKING" } })) },
      update_shipment_tracking: { execute: vi.fn(async () => "{}") },
    };
    await expect(new ToolkitTracking(tools).attach({ captureId: "C", trackingNumber: "T", status: "SHIPPED" })).rejects.toThrow(/INVALID_TRACKING/);
  });
});

describe("ToolkitDisputes", () => {
  it("cannot file by API: hands the buyer the sandbox Resolution Center", async () => {
    const d = new ToolkitDisputes({ list_disputes: { execute: vi.fn() } });
    expect(await d.file()).toEqual({ status: "awaiting_buyer_filing", fileUrl: SANDBOX_RESOLUTION_CENTER });
  });

  it("finds a dispute on the capture with list_disputes", async () => {
    const list = vi.fn(async () => JSON.stringify({ items: [{ dispute_id: "PP-D-000-1", status: "WAITING_FOR_SELLER_RESPONSE" }] }));
    const r = await new ToolkitDisputes({ list_disputes: { execute: list } }).find("CAP-1");
    expect(list).toHaveBeenCalledWith({ disputed_transaction_id: "CAP-1" }, expect.anything());
    expect(r).toEqual({ paypalDisputeId: "PP-D-000-1", state: "WAITING_FOR_SELLER_RESPONSE" });
  });

  it("returns null when PayPal has no dispute yet", async () => {
    const list = vi.fn(async () => JSON.stringify({ items: [] }));
    expect(await new ToolkitDisputes({ list_disputes: { execute: list } }).find("CAP-1")).toBeNull();
  });
});
