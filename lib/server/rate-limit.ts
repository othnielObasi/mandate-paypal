/**
 * The client address as seen by our nearest trusted proxy. Proxies append to
 * X-Forwarded-For, so the left-most entries are whatever the client sent and
 * can be forged; the entry `hops` from the right is the one our proxy saw.
 */
export function clientIp(req: Request, hops = 1): string {
  const list = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return req.headers.get("x-real-ip")?.trim() || "unknown";
  return list[Math.max(0, list.length - hops)]!;
}

interface Window {
  limit: number;
  windowMs: number;
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const MAX_KEYS = 50_000;

/** Sliding-window limits per client and across all clients. Refused requests use no capacity. */
export class RateLimiter {
  private logs = new Map<string, number[]>();
  private global: number[] = [];
  private lastSweep: number;

  constructor(private o: { perIp: Window; global: Window; clock?: () => number }) {
    this.lastSweep = this.now();
  }

  get size() {
    return this.logs.size;
  }

  private now() {
    return this.o.clock ? this.o.clock() : Date.now();
  }

  check(key: string): LimitResult {
    const now = this.now();
    this.sweep(now);
    const { perIp, global } = this.o;

    const log = (this.logs.get(key) ?? []).filter((t) => now - t < perIp.windowMs);
    if (log.length >= perIp.limit) {
      this.logs.set(key, log);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((log[0]! + perIp.windowMs - now) / 1000)) };
    }
    this.global = this.global.filter((t) => now - t < global.windowMs);
    if (this.global.length >= global.limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((this.global[0]! + global.windowMs - now) / 1000)) };
    }
    log.push(now);
    this.global.push(now);
    this.logs.delete(key); // re-insert so Map order tracks recency
    this.logs.set(key, log);
    return { ok: true };
  }

  private sweep(now: number) {
    if (now - this.lastSweep >= this.o.perIp.windowMs) {
      for (const [k, log] of this.logs) if (now - log.at(-1)! >= this.o.perIp.windowMs) this.logs.delete(k);
      this.lastSweep = now;
    }
    while (this.logs.size > MAX_KEYS) this.logs.delete(this.logs.keys().next().value!);
  }
}
