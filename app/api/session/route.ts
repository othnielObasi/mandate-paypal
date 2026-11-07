import { getContainer } from "@/lib/server/container";
import { handle, json } from "@/lib/server/http";
import { clearSessionCookie, currentUser, isPrivate } from "@/lib/server/session";
import { disconnectWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sign out: ends this browser's workspace. There are no passwords, so it can't be
 * reopened; the saved PayPal wallet and outside assistants are cut off first.
 * Mandates and receipts stay in the signed log, verifiable as before.
 */
export const DELETE = handle(async (req: Request) => {
  const c = getContainer();
  const user = currentUser(req);
  if (isPrivate(user)) {
    await disconnectWallet(c, user);
    const now = new Date().toISOString();
    for (const m of await c.mandates.list(user)) {
      for (const conn of await c.stores.connections.list(m.id)) if (!conn.revokedAt) await c.stores.connections.revoke(conn.id, now);
      if (m.status === "active") await c.governor.setStatus(m.id, "paused", { via: "sign out" });
    }
  }
  return json({ signedOut: true }, 200, { "set-cookie": clearSessionCookie(c.appUrl.startsWith("https:")) });
});
