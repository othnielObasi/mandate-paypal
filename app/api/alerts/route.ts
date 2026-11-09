import { randomBytes } from "node:crypto";
import { z } from "zod";
import { validWebhook, type WebhookChannel } from "@/lib/alerts/channels";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";
import { currentUser, isPrivate } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Shows only that a webhook is set and which service, never the secret part of its address. */
const mask = (url?: string) => (url ? `${new URL(url).host}/…${url.replace(/\/$/, "").slice(-4)}` : null);

function privateUser(req: Request) {
  const user = currentUser(req);
  if (!isPrivate(user)) throw new HttpError(403, "Open the app in a browser to set up alerts for your own workspace.");
  return user;
}

/** Where this workspace's alerts go. */
export const GET = handle(async (req: Request) => {
  const c = getContainer();
  const user = currentUser(req);
  const ch = isPrivate(user) ? await c.stores.alerts.get(user) : undefined;
  return json({
    available: isPrivate(user),
    telegram: { enabled: !!c.alerts.telegram, connected: !!ch?.telegram, name: ch?.telegram?.name ?? null },
    slack: mask(ch?.slack),
    discord: mask(ch?.discord),
    zapier: mask(ch?.zapier),
  });
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("telegram_link") }).strict(),
  z.object({ action: z.literal("set"), channel: z.enum(["slack", "discord", "zapier"]), url: z.string().trim().max(300) }).strict(),
  z.object({ action: z.literal("remove"), channel: z.enum(["telegram", "slack", "discord", "zapier"]) }).strict(),
  z.object({ action: z.literal("test") }).strict(),
]);

export const POST = handle(async (req: Request) => {
  const c = getContainer();
  const user = privateUser(req);
  const b = await readBody(req, Body);
  const ch = (await c.stores.alerts.get(user)) ?? { userId: user };

  if (b.action === "telegram_link") {
    if (!c.alerts.telegram) throw new HttpError(503, "Telegram alerts are not set up on this server.");
    const code = randomBytes(12).toString("base64url");
    await c.stores.alerts.putLink(code, user);
    return json({ url: `https://t.me/${await c.alerts.telegram.username()}?start=${code}` }, 201);
  }
  if (b.action === "set") {
    if (!validWebhook(b.channel as WebhookChannel, b.url)) throw new HttpError(422, `That isn't a ${b.channel === "zapier" ? "Zapier Catch Hook" : b.channel === "slack" ? "Slack incoming webhook" : "Discord webhook"} address.`);
    await c.stores.alerts.put({ ...ch, [b.channel]: b.url.trim() });
    return json({ saved: true });
  }
  if (b.action === "remove") {
    const next = { ...ch };
    delete next[b.channel];
    await c.stores.alerts.put(next);
    return json({ removed: true });
  }
  const sent = await c.alerts.router.send(ch, {
    event: "purchase.blocked",
    message: "Mandate: Test alert. This is how a blocked purchase will look.",
    mandateId: "test",
    at: new Date().toISOString(),
    link: `${c.appUrl}/app/notifications`,
    receipt: { seq: 0, hash: "" },
  });
  return json({ sent });
});
