import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";
import { currentUser, isPrivate } from "@/lib/server/session";
import { disconnectWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Is a PayPal wallet saved for this workspace? */
export const GET = handle(async (req: Request) => {
  const c = getContainer();
  const user = currentUser(req);
  const w = isPrivate(user) ? await c.stores.wallets.get(user) : undefined;
  return json({
    available: isPrivate(user),
    simulated: c.vault.name !== "paypal-vault",
    connected: !!w,
    email: w?.email ?? null,
    connectedAt: w?.connectedAt ?? null,
  });
});

/** Start saving PayPal: returns the PayPal page where the buyer agrees. */
export const POST = handle(async (req: Request) => {
  const c = getContainer();
  const user = currentUser(req);
  if (!isPrivate(user)) throw new HttpError(403, "Open the app in a browser to connect PayPal to your own workspace.");
  const { setupTokenId, approveUrl } = await c.vault.startSetup({
    returnUrl: `${c.appUrl}/api/paypal/wallet/return`,
    cancelUrl: `${c.appUrl}/api/paypal/wallet/cancel`,
  });
  await c.stores.wallets.putSetup(setupTokenId, user);
  return json({ approveUrl }, 201);
});

/** Forget the saved wallet here and at PayPal. Purchases go back to one PayPal approval each. */
export const DELETE = handle(async (req: Request) => {
  const c = getContainer();
  const user = currentUser(req);
  if (!isPrivate(user)) throw new HttpError(403, "No wallet in the shared demo workspace.");
  return json({ disconnected: await disconnectWallet(c, user) });
});
