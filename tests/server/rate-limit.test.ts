import { describe, it, expect } from "vitest";
import { RateLimiter, clientIp } from "@/lib/server/rate-limit";

const req = (headers: Record<string, string>) => new Request("http://x/", { headers });

describe("client IP behind a proxy", () => {
  it("uses the address the trusted proxy appended, not a spoofable first entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }), 1)).toBe("203.0.113.9");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }), 1)).toBe("203.0.113.9");
  });

  it("supports more proxy hops", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.2" }), 2)).toBe("203.0.113.9");
  });

  it("falls back when there is no header or too few entries", () => {
    expect(clientIp(req({}), 1)).toBe("unknown");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }), 3)).toBe("203.0.113.9");
  });
});

describe("rate limiter", () => {
  function make(perIp = 3, global = 5) {
    let t = 0;
    const rl = new RateLimiter({ perIp: { limit: perIp, windowMs: 60_000 }, global: { limit: global, windowMs: 3_600_000 }, clock: () => t });
    return { rl, advance: (ms: number) => (t += ms) };
  }

  it("allows up to the per-IP limit, then refuses with a retry time", () => {
    const { rl, advance } = make();
    for (let i = 0; i < 3; i++) expect(rl.check("a").ok).toBe(true);
    advance(20_000);
    expect(rl.check("a")).toEqual({ ok: false, retryAfterSec: 40 });
    expect(rl.check("b").ok).toBe(true);
  });

  it("frees capacity as the window slides", () => {
    const { rl, advance } = make();
    for (let i = 0; i < 3; i++) rl.check("a");
    advance(60_001);
    expect(rl.check("a").ok).toBe(true);
  });

  it("enforces a global cap across all IPs", () => {
    const { rl } = make(3, 5);
    const results = ["a", "b", "c", "d", "e", "f"].map((ip) => rl.check(ip).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("a refused request does not use up capacity", () => {
    const { rl, advance } = make(1, 100);
    rl.check("a");
    for (let i = 0; i < 10; i++) rl.check("a");
    advance(60_001);
    expect(rl.check("a").ok).toBe(true);
  });

  it("does not grow without bound", () => {
    const { rl, advance } = make(1, 1_000_000);
    for (let i = 0; i < 20_000; i++) rl.check(`ip${i}`);
    advance(120_000);
    rl.check("z");
    expect(rl.size).toBeLessThan(20_000);
  });
});
