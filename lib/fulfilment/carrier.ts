export type ShipmentStatus = "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "LOST";

export interface TrackingEvent {
  at: string;
  status: ShipmentStatus;
  note: string;
}

export interface Tracking {
  status: ShipmentStatus;
  expectedBy: string;
  events: TrackingEvent[];
}

export interface Carrier {
  readonly name: string;
  /** True if the demo may change parcel states (simulated carriers only). */
  readonly simulated: boolean;
  ship(reference: string, now: Date): Promise<{ trackingNumber: string; expectedBy: string }>;
  track(trackingNumber: string): Promise<Tracking>;
  markLost?(trackingNumber: string, now: Date): void;
  markDelivered?(trackingNumber: string, now: Date): void;
}

export const DELIVERY_DAYS = 3;

/** Stand-in carrier for the demo. Labelled "simulated" everywhere in the UI. */
export class SimulatedCarrier implements Carrier {
  readonly name = "Simulated carrier";
  readonly simulated = true;
  private parcels = new Map<string, Tracking>();
  private seq = 0;

  async ship(_reference: string, now: Date) {
    this.seq += 1;
    const trackingNumber = `SIM1Z${now.getTime().toString(36).toUpperCase()}${String(this.seq).padStart(4, "0")}`;
    const expectedBy = new Date(now.getTime() + DELIVERY_DAYS * 864e5).toISOString();
    const at = now.toISOString();
    this.parcels.set(trackingNumber, {
      status: "IN_TRANSIT",
      expectedBy,
      events: [
        { at, status: "LABEL_CREATED", note: "Label created by seller" },
        { at, status: "IN_TRANSIT", note: "Collected by carrier" },
      ],
    });
    return { trackingNumber, expectedBy };
  }

  async track(trackingNumber: string): Promise<Tracking> {
    const p = this.parcels.get(trackingNumber);
    if (!p) throw new Error(`Unknown tracking number ${trackingNumber}`);
    return structuredClone(p);
  }

  markLost(trackingNumber: string, now: Date) {
    const p = this.get(trackingNumber);
    if (p.status === "DELIVERED") throw new Error("Parcel already delivered");
    p.status = "LOST";
    p.events.push({ at: now.toISOString(), status: "LOST", note: "Carrier reports parcel lost in transit" });
  }

  markDelivered(trackingNumber: string, now: Date) {
    const p = this.get(trackingNumber);
    p.status = "DELIVERED";
    p.events.push({ at: now.toISOString(), status: "DELIVERED", note: "Delivered" });
  }

  private get(trackingNumber: string) {
    const p = this.parcels.get(trackingNumber);
    if (!p) throw new Error(`Unknown tracking number ${trackingNumber}`);
    return p;
  }
}
