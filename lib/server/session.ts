import { createHash } from "node:crypto";
import type { Container } from "./container";
import { DEMO_USER } from "./demo";
import { HttpError } from "./http";

/**
 * Each browser gets its own private workspace: a random secret in an httpOnly cookie
 * (set by middleware.ts). The user id is a hash of it, so ids that appear in public
 * receipts can't be turned back into the cookie. Requests without the cookie (API,
 * SDK, tests) act as the shared demo user, which can never save a PayPal wallet.
 */
export const SESSION_COOKIE = "mandate_session";
const VALID = /^[A-Za-z0-9_-]{32,128}$/;

export function sessionSecret(req: Request | undefined): string | null {
  for (const part of (req?.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) {
      const val = decodeURIComponent(v.join("="));
      return VALID.test(val) ? val : null;
    }
  }
  return null;
}

export const userIdFor = (secret: string) => `u-${createHash("sha256").update(`mandate-session:${secret}`).digest("hex").slice(0, 32)}`;

/** Who is calling: their private user id, or the shared demo user. */
export function currentUser(req: Request | undefined): string {
  const s = sessionSecret(req);
  return s ? userIdFor(s) : DEMO_USER;
}

export const isPrivate = (userId: string) => userId !== DEMO_USER;

/** The mandate, if this caller may act on it. Shared demo mandates stay open to everyone. */
export async function ownMandate(req: Request, c: Container, mandateId: string) {
  const m = await c.mandates.get(mandateId);
  if (!m) throw new HttpError(404, "Mandate not found.");
  if (m.userId !== DEMO_USER && m.userId !== currentUser(req)) throw new HttpError(403, "This mandate belongs to another workspace.");
  return m;
}

/** Expires the session cookie. */
export const clearSessionCookie = (secure: boolean) => `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
