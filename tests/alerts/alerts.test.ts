import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validWebhook } from "@/lib/alerts/channels";
import { createContainer, setContainer, type Container } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { POST as runAgent } from "@/app/api/agent/run/route";
import { GET as getAlerts, POST as postAlerts } from "@/app/api/alerts/route";
import { POST as telegramHook } from "@/app/api/telegram/webhook/route";

const BASE = "https://mandate.test";
const ALICE = "a".repeat(43);
const BOB = "b".repeat(43);
const req = (path: string, body?: unknown, who?: string, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(who ? { cookie: `mandate_session=${who}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

type Sent = { url: string; body: Record<string, unknown> };
let sent: Sent[];
let c: Container;

beforeEach(() => {
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      sent.push({ url: String(url), body });
      if (String(url).includes("/getMe")) return Response.json({ ok: true, result: { username: "MandateAgentAlertsBot" } });
      if (String(url).startsWith("https://api.telegram.org")) return Response.json({ ok: true, result: {} });
      return new Response("ok");
    }),
  );
  c = createContainer({ APP_URL: BASE, TELEGRAM_BOT_TOKEN: "123:TEST" });
  setContainer(c);
});
afterEach(() => vi.unstubAllGlobals());

const flush = () => new Promise((r) => setTimeout(r, 30));
const telegramSends = () => sent.filter((s) => s.url.endsWith("/sendMessage"));
const secret = () => c.alerts.telegram!.webhookSecret;

async function mandate(who?: string) {
  const m = (await (await createMandate(req("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }, who))).json()) as { id: string };
  return m.id;
}
async function linkTelegram(who: string, chatId: number) {
  const { url } = (await (await postAlerts(req("/api/alerts", { action: "telegram_link" }, who))).json()) as { url: string };
  expect(url).toMatch(/^https:\/\/t\.me\/MandateAgentAlertsBot\?start=/);
  const code = new URL(url).searchParams.get("start")!;
  const r = await telegramHook(req("/api/telegram/webhook", { message: { chat: { id: chatId }, from: { username: "alice" }, text: `/start ${code}` } }, undefined, { "x-telegram-bot-api-secret-token": secret() }));
  expect(r.status).toBe(200);
}

describe("alert channels", () => {
  it("accepts only Slack, Discord and Zapier's own webhook addresses", () => {
    expect(validWebhook("slack", "https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXX")).toBe(true);
    expect(validWebhook("discord", "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz_-12")).toBe(true);
    expect(validWebhook("zapier", "https://hooks.zapier.com/hooks/catch/123/abc123/")).toBe(true);
    for (const bad of ["http://hooks.slack.com/services/T/B/X", "https://hooks.slack.com.evil.com/services/T000/B000/XXXX", "https://169.254.169.254/latest", "https://hooks.zapier.com/hooks/catch/1/a/../../x"])
      expect(validWebhook("slack", bad) || validWebhook("zapier", bad)).toBe(false);
  });

  it("the shared demo workspace can't set up alerts", async () => {
    expect((await postAlerts(req("/api/alerts", { action: "telegram_link" }))).status).toBe(403);
    expect(await (await getAlerts(req("/api/alerts"))).json()).toMatchObject({ available: false });
  });

  it("a bad address is refused; a good one is stored and shown masked", async () => {
    expect((await postAlerts(req("/api/alerts", { action: "set", channel: "slack", url: "https://example.com/hook" }, ALICE))).status).toBe(422);
    await postAlerts(req("/api/alerts", { action: "set", channel: "zapier", url: "https://hooks.zapier.com/hooks/catch/123/abcSECRET/" }, ALICE));
    const view = (await (await getAlerts(req("/api/alerts", undefined, ALICE))).json()) as { zapier: string };
    expect(view.zapier).toBe("hooks.zapier.com/…CRET");
  });
});

describe("Telegram", () => {
  it("refuses updates without Telegram's secret header", async () => {
    expect((await telegramHook(req("/api/telegram/webhook", { message: { chat: { id: 1 }, text: "/start x" } }))).status).toBe(401);
    expect((await telegramHook(req("/api/telegram/webhook", { message: { chat: { id: 1 }, text: "/start x" } }, undefined, { "x-telegram-bot-api-secret-token": "wrong" }))).status).toBe(401);
  });

  it("links with a one-time code, then sends this workspace's alerts, with Approve and Decline", async () => {
    const id = await mandate(ALICE);
    await linkTelegram(ALICE, 555);
    expect(await (await getAlerts(req("/api/alerts", undefined, ALICE))).json()).toMatchObject({ telegram: { connected: true, name: "@alice" } });
    sent.length = 0;
    await runAgent(req("/api/agent/run", { mandateId: id, task: "Buy an electric kettle" }, ALICE));
    await flush();
    const msg = telegramSends().find((s) => String(s.body.text).includes("Needs your approval"));
    expect(msg?.body.chat_id).toBe(555);
    const keyboard = (msg!.body.reply_markup as { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> }).inline_keyboard;
    expect(keyboard[0]!.map((b) => b.text)).toEqual(["✓ Approve", "✕ Decline"]);
    expect(keyboard[1]![0]!.url).toBe(`${BASE}/app`);
  });

  it("Approve in Telegram decides the approval, only for the chat linked to that workspace", async () => {
    const id = await mandate(ALICE);
    await mandate(BOB);
    await linkTelegram(ALICE, 555);
    await linkTelegram(BOB, 777);
    await runAgent(req("/api/agent/run", { mandateId: id, task: "Buy an electric kettle" }, ALICE));
    const [a] = await c.approvals.list(id);
    const tap = (chat: number, data: string) =>
      telegramHook(req("/api/telegram/webhook", { callback_query: { id: "q", data, message: { chat: { id: chat }, message_id: 9 } } }, undefined, { "x-telegram-bot-api-secret-token": secret() }));
    await tap(777, `a:${a!.id}`); // Bob's chat
    expect((await c.approvals.get(a!.id))?.status).toBe("pending");
    await tap(555, `a:${a!.id}`); // Alice's chat
    expect((await c.approvals.get(a!.id))?.status).not.toBe("pending");
    expect(sent.some((s) => s.url.endsWith("/answerCallbackQuery") && /Approved/.test(String(s.body.text)))).toBe(true);
  });

  it("shared demo mandates never send to anyone's channels", async () => {
    await linkTelegram(ALICE, 555);
    const shared = await mandate();
    sent.length = 0;
    await runAgent(req("/api/agent/run", { mandateId: shared, task: "Buy an electric kettle" }));
    await flush();
    expect(telegramSends()).toHaveLength(0);
  });

  it("/stop disconnects", async () => {
    await linkTelegram(ALICE, 555);
    await telegramHook(req("/api/telegram/webhook", { message: { chat: { id: 555 }, text: "/stop" } }, undefined, { "x-telegram-bot-api-secret-token": secret() }));
    expect(await (await getAlerts(req("/api/alerts", undefined, ALICE))).json()).toMatchObject({ telegram: { connected: false } });
  });
});

describe("Slack, Discord and Zapier", () => {
  it("each gets the alert in its own format; a test alert reaches every channel", async () => {
    const id = await mandate(ALICE);
    for (const [channel, url] of [
      ["slack", "https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXX"],
      ["discord", "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz_-12"],
      ["zapier", "https://hooks.zapier.com/hooks/catch/123/abc123/"],
    ])
      await postAlerts(req("/api/alerts", { action: "set", channel, url }, ALICE));
    sent.length = 0;
    await runAgent(req("/api/agent/run", { mandateId: id, task: "Buy toilet roll" }, ALICE));
    await flush();
    const to = (host: string) => sent.filter((s) => s.url.includes(host)).map((s) => s.body);
    expect(String(to("hooks.slack.com")[0]?.text)).toMatch(/Blocked/);
    expect(String(to("discord.com")[0]?.content)).toMatch(/Blocked/);
    expect(to("hooks.zapier.com")[0]).toMatchObject({ event: "purchase.blocked" });
    const r = (await (await postAlerts(req("/api/alerts", { action: "test" }, ALICE))).json()) as { sent: number };
    expect(r.sent).toBe(3);
  });
});
