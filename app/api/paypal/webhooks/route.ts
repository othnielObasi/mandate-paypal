import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json } from "@/lib/server/http";
import { handleWebhook, WebhookEventSchema } from "@/lib/server/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 65_536;

/** PayPal webhook receiver: signature-verified, size-limited, idempotent. */
export const POST = handle(async (req: Request) => {
  const c = getContainer();
  if (!c.webhookVerifier) throw new HttpError(503, "Webhooks are not configured (set PAYPAL_WEBHOOK_ID with sandbox credentials).");

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_WEBHOOK_BYTES) throw new HttpError(413, "Payload too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Body must be JSON.");
  }
  const parsed = WebhookEventSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "Not a PayPal webhook event.");

  if (!(await c.webhookVerifier.verify(req.headers, raw))) throw new HttpError(401, "Signature verification failed.");

  // Handlers are idempotent; the id is recorded after a successful run so a
  // failed attempt is retried by PayPal rather than skipped.
  const result = await handleWebhook(c, parsed.data);
  const first = await c.stores.events.firstSeen(parsed.data.id);
  return json({ ...result, duplicate: !first });
});
