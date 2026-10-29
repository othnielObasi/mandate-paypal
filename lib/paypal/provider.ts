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
  /** meta.note is carried on the PayPal order (first item's description, max 127 chars). */
  createOrder(order: OrderSpec, urls: ReturnUrls, meta?: { note?: string }): Promise<CreateResult>;
  captureOrder(paypalOrderId: string): Promise<CaptureResult>;
  getOrderStatus(paypalOrderId: string): Promise<string>;
  /** The note PayPal holds for this order, read back from PayPal. */
  getOrderNote(paypalOrderId: string): Promise<string | null>;
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
