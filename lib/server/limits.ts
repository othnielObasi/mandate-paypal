import type { Container } from "./container";
import { HttpError } from "./http";
import { clientIp } from "./rate-limit";

/** Call before any route work that costs a model call. */
export function enforceLimit(req: Request, c: Container) {
  const r = c.limiter.check(clientIp(req, c.proxyHops));
  if (!r.ok) throw new HttpError(429, "Too many requests. Please wait a moment.", { "retry-after": String(r.retryAfterSec) });
}
