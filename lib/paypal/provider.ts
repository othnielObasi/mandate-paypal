import type { OrderSpec } from "../gate/canonical";

export interface ReturnUrls {
  returnUrl: string;
  cancelUrl: string;
}

export type CreateResult =
  | { paypalOrderId: string; status: "COMPLETED"; captureId: string }
  | { paypalOrderId: string; status: "PAYER_ACTION_REQUIRED"; approveUrl: string }
  | { paypalOrderId: string; status: "CREATED" | "APPROVED" };

export interface CaptureResult {
  paypalOrderId: string;
  status: "COMPLETED";
  captureId: string;
}

/**
 * Everything that can move money. Only the Executor holds an instance.
 * The agent never receives one.
 */
export interface PaymentProvider {
  readonly name: string;
  createOrder(order: OrderSpec, urls: ReturnUrls): Promise<CreateResult>;
  captureOrder(paypalOrderId: string): Promise<CaptureResult>;
  getOrderStatus(paypalOrderId: string): Promise<string>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export const minorToDecimal = (minor: number) => Math.round(minor) / 100;
