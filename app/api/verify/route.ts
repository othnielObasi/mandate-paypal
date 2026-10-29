import { z } from "zod";
import type { Chain } from "@/lib/ap2/verify";
import { verifyPaymentChain } from "@/lib/ap2/verify";
import { getContainer } from "@/lib/server/container";
import { DEMO_USER } from "@/lib/server/demo";
import { handle, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ intent: z.record(z.unknown()), cart: z.record(z.unknown()), payment: z.record(z.unknown()) }).strict();

/** Verify a credential chain someone hands you, using only the published public keys. */
export const POST = handle(async (req: Request) => {
  const chain = (await readBody(req, Body)) as unknown as Chain;
  const c = getContainer();
  return json(verifyPaymentChain(chain, c.credentials.trust(c.merchants, [DEMO_USER]), new Date()));
});
