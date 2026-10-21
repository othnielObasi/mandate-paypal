import { randomBytes } from "node:crypto";

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
  markLost?(trackingNumber: string, now: Date): Promise<void>;
  markDelivered?(trackingNumber: string, now: Date): Promise<void>;
}

export interface ParcelStore {
  get(trackingNumber: string): Promise<Tracking | undefined>;
  put(trackingNumber: string, t: Tracking): Promise<void>;
}

export class MemoryParcelStore implements ParcelStore {
  private rows = new Map<string, Tracking>();
  async get(n: string) {
    const t = this.rows.get(n);
    return t ? structuredClone(t) : undefined;
  }
  async put(n: string, t: Tracking) {
    this.rows.set(n, structuredClone(t));
  }
}

export const DELIVERY_DAYS = 3;

/** Stand-in carrier for the demo. Labelled "simulated" everywhere in the UI. */
export class SimulatedCarrier implements Carrier {
  readonly name = "Simulated carrier";
  readonly simulated = true;

  constructor(private store: ParcelStore = new MemoryParcelStore()) {}

  async ship(_reference: string, now: Date) {
    const trackingNumber = `SIM1Z${now.getTime().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
    const expectedBy = new Date(now.getTime() + DELIVERY_DAYS * 864e5).toISOString();
    const at = now.toISOString();
    await this.store.put(trackingNumber, {
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
    return this.get(trackingNumber);
  }

  async markLost(trackingNumber: string, now: Date) {
    const p = await this.get(trackingNumber);
    if (p.status === "DELIVERED") throw new Error("Parcel already delivered");
    p.status = "LOST";
    p.events.push({ at: now.toISOString(), status: "LOST", note: "Carrier reports parcel lost in transit" });
    await this.store.put(trackingNumber, p);
  }

  async markDelivered(trackingNumber: string, now: Date) {
    const p = await this.get(trackingNumber);
    p.status = "DELIVERED";
    p.events.push({ at: now.toISOString(), status: "DELIVERED", note: "Delivered" });
    await this.store.put(trackingNumber, p);
  }

  private async get(trackingNumber: string) {
    const p = await this.store.get(trackingNumber);
    if (!p) throw new Error(`Unknown tracking number ${trackingNumber}`);
    return p;
  }
}
