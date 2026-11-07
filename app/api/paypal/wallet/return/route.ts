import { getContainer } from "@/lib/server/container";
import { currentUser } from "@/lib/server/session";
import { connectWallet } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PayPal sends the buyer back here after they agree to save PayPal (?approval_token_id=<setup token>). */
export async function GET(req: Request) {
  const c = getContainer();
  const q = new URL(req.url).searchParams;
  const id = q.get("approval_token_id") ?? q.get("token");
  const back = (outcome: string) => Response.redirect(`${c.appUrl}/app?wallet=${outcome}`, 303);
  if (!id) return back("unknown");
  const owner = await c.stores.wallets.takeSetup(id);
  // Only the workspace that started this can finish it.
  if (!owner || owner !== currentUser(req)) return back("unknown");
  try {
    await connectWallet(c, owner, id);
    return back("connected");
  } catch (e) {
    console.warn("Saving PayPal failed:", e instanceof Error ? e.message : e);
    return back("failed");
  }
}
