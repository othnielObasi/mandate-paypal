import { z } from "zod";
import { verifyChain, type Receipt } from "@/lib/gate/receipts";
import { getContainer } from "@/lib/server/container";
import { handle, json, MAX_BODY_BYTES } from "@/lib/server/http";
import { HttpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Verify the server's own log. */
export const GET = handle(async () => {
  const c = getContainer();
  return json(verifyChain(await c.receipts.list(), c.signer.publicKey));
});

const Body = z.object({ receipts: z.array(z.record(z.unknown())).max(5000) });

/** Verify a copy supplied by the client, e.g. after editing a row in the ledger to show tamper detection. */
export const POST = handle(async (req: Request) => {
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES * 64) throw new HttpError(413, "Too many receipts.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Body must be JSON.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "Expected { receipts: [...] }.");
  return json(verifyChain(parsed.data.receipts as unknown as Receipt[], getContainer().signer.publicKey));
});
