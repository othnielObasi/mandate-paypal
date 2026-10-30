export type DisputeView = {
  status: "draft" | "awaiting_buyer_filing" | "filed" | "open" | "resolved";
  statement: string;
  writer: "model" | "template" | "user";
  evidenceDigest: string;
  evidence: { receipts?: unknown[] } | null;
  paypalDisputeId: string | null;
  fileUrl: string | null;
};

export type ShipmentStatus = "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "LOST";

export type OrderView = {
  id: string;
  merchantId: string;
  items: Array<{ title: string; qty: number; unitMinor?: number }>;
  amountMinor: number;
  paidAt?: string;
  carrier: string;
  trackingNumber: string;
  expectedBy: string;
  shipmentStatus: ShipmentStatus;
  trackingEvents?: Array<{ at: string; status: ShipmentStatus; note: string }>;
  paypalTracking: "attached" | "failed" | "not_applicable";
  problem: "not_received" | null;
  dispute: DisputeView | null;
};
