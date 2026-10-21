import { describe, it, expect, vi } from "vitest";
import { ToolkitProvider, type ToolkitTools } from "@/lib/paypal/toolkit-provider";
import { PaymentError } from "@/lib/paypal/provider";
import type { OrderSpec } from "@/lib/gate/canonical";

const order: OrderSpec = {
  mandateId: "m1",
  merchantId: "acme-supplies",
  currency: "USD",
  items: [
    { sku: "wul-500", title: "Washing-up liquid", unitMinor: 450, qty: 2 },
    { sku: "spg-3", title: "Sponges (3)", unitMinor: 199, qty: 1 },
  ],
};

// Shapes copied from what @paypal/agent-toolkit 1.11 actually returns (JSON strings).
const created = JSON.stringify({
  id: "5O190127TN364715T",
  status: "PAYER_ACTION_REQUIRED",
  links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T" }],
});
// pay_order wraps a real capture in {"status":"error","response":...}; the inner status is what matters.
const captured = JSON.stringify({
  status: "error",
  response: { id: "5O190127TN364715T", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-1", status: "COMPLETED" }] } }] },
});

function fakeTools(over: Partial<Record<keyof ToolkitTools, unknown>> = {}) {
  const tools = {
    create_order: { execute: vi.fn(async () => over.create_order ?? created) },
    pay_order: { execute: vi.fn(async () => over.pay_order ?? captured) },
    get_order: { execute: vi.fn(async () => over.get_order ?? JSON.stringify({ id: "5O190127TN364715T", status: "APPROVED" })) },
  };
  return tools;
}

const urls = { returnUrl: "https://mandate.test/api/paypal/return", cancelUrl: "https://mandate.test/api/paypal/cancel" };

describe("ToolkitProvider", () => {
  it("maps minor units to the toolkit's decimal item fields", async () => {
    const tools = fakeTools();
    await new ToolkitProvider(tools).createOrder(order, urls);
    expect(tools.create_order.execute).toHaveBeenCalledWith(
      {
        currencyCode: "USD",
        items: [
          { name: "Washing-up liquid", quantity: 2, itemCost: 4.5, itemTotal: 9, taxPercent: 0 },
          { name: "Sponges (3)", quantity: 1, itemCost: 1.99, itemTotal: 1.99, taxPercent: 0 },
        ],
        returnUrl: urls.returnUrl,
        cancelUrl: urls.cancelUrl,
      },
      expect.anything(),
    );
  });

  it("returns the approval link when the buyer must approve", async () => {
    const r = await new ToolkitProvider(fakeTools()).createOrder(order, urls);
    expect(r).toEqual({
      paypalOrderId: "5O190127TN364715T",
      status: "PAYER_ACTION_REQUIRED",
      approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
    });
  });

  it("captures an approved order and reads through the toolkit's error envelope", async () => {
    const r = await new ToolkitProvider(fakeTools()).captureOrder("5O190127TN364715T");
    expect(r).toEqual({ paypalOrderId: "5O190127TN364715T", status: "COMPLETED", captureId: "CAP-1" });
  });

  it("throws a PaymentError when a capture is not completed", async () => {
    const tools = fakeTools({ pay_order: JSON.stringify({ status: "error", response: { name: "UNPROCESSABLE_ENTITY", message: "ORDER_NOT_APPROVED" } }) });
    await expect(new ToolkitProvider(tools).captureOrder("X")).rejects.toBeInstanceOf(PaymentError);
  });

  it("throws a PaymentError when the toolkit returns an error object", async () => {
    const tools = fakeTools({ create_order: JSON.stringify({ error: { message: "invalid_enum_value" } }) });
    await expect(new ToolkitProvider(tools).createOrder(order, urls)).rejects.toBeInstanceOf(PaymentError);
  });

  it("throws a PaymentError on unparseable output", async () => {
    await expect(new ToolkitProvider(fakeTools({ create_order: "<html>oops" })).createOrder(order, urls)).rejects.toBeInstanceOf(PaymentError);
  });

  it("refuses currencies the toolkit cannot create orders in, before calling it", async () => {
    const tools = fakeTools();
    await expect(new ToolkitProvider(tools).createOrder({ ...order, currency: "GBP" }, urls)).rejects.toThrow(/USD/);
    expect(tools.create_order.execute).not.toHaveBeenCalled();
  });

  it("reports order status", async () => {
    expect(await new ToolkitProvider(fakeTools()).getOrderStatus("5O190127TN364715T")).toBe("APPROVED");
  });
});
