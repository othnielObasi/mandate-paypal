import { PasskeyError } from "@/lib/core/governor";
import { getContainer } from "@/lib/server/container";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Update = {
  message?: { chat: { id: number }; from?: { first_name?: string; username?: string }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number } };
};

const HELP = "This bot sends alerts from Mandate. To connect it, open Mandate → Notifications → Connect Telegram.";

/**
 * Telegram calls this for every message to the bot. Only Telegram knows the secret header.
 * /start <code> links a chat to a workspace; Approve/Decline buttons decide an approval,
 * but only for the workspace this chat is linked to, and never when that workspace requires a passkey.
 */
export async function POST(req: Request) {
  const c = getContainer();
  const bot = c.alerts.telegram;
  if (!bot || !bot.secretMatches(req.headers.get("x-telegram-bot-api-secret-token"))) return json({ ok: false }, 401);
  const u = (await req.json().catch(() => ({}))) as Update;
  try {
    if (u.message?.text) await onMessage(u.message);
    if (u.callback_query) await onButton(u.callback_query);
  } catch (e) {
    console.warn("Telegram update failed:", e instanceof Error ? e.message : e);
  }
  // Always 200, or Telegram keeps retrying the same update.
  return json({ ok: true });

  async function onMessage(m: NonNullable<Update["message"]>) {
    const chat = m.chat.id;
    const [cmd, arg] = m.text!.trim().split(/\s+/, 2);
    if (cmd === "/start" && arg) {
      const user = await c.stores.alerts.takeLink(arg);
      if (!user) return bot!.send(chat, "That link has expired. In Mandate, open Notifications and click Connect Telegram again.");
      // One workspace per chat: unlink it from any other first.
      const prev = await c.stores.alerts.byTelegramChat(chat);
      if (prev && prev !== user) {
        const old = await c.stores.alerts.get(prev);
        if (old) {
          delete old.telegram;
          await c.stores.alerts.put(old);
        }
      }
      const ch = (await c.stores.alerts.get(user)) ?? { userId: user };
      await c.stores.alerts.put({ ...ch, telegram: { chatId: chat, name: m.from?.username ? `@${m.from.username}` : (m.from?.first_name ?? null), linkedAt: new Date().toISOString() } });
      return bot!.send(chat, "✅ Connected to Mandate.\nYou'll get a message here when a purchase needs your approval, is blocked, or is paid. Send /stop to disconnect.");
    }
    if (cmd === "/stop") {
      const user = await c.stores.alerts.byTelegramChat(chat);
      if (user) {
        const ch = await c.stores.alerts.get(user);
        if (ch) {
          delete ch.telegram;
          await c.stores.alerts.put(ch);
        }
      }
      return bot!.send(chat, "Disconnected. You won't get Mandate alerts here any more.");
    }
    return bot!.send(chat, HELP);
  }

  async function onButton(q: NonNullable<Update["callback_query"]>) {
    const m = /^([ad]):(.{1,80})$/.exec(q.data ?? "");
    const chat = q.message?.chat.id;
    if (!m || chat === undefined) return bot!.answer(q.id, "Unknown action.");
    const [, kind, approvalId] = m;
    const user = await c.stores.alerts.byTelegramChat(chat);
    const a = await c.approvals.get(approvalId!);
    const mandate = a ? await c.mandates.get(a.mandateId) : undefined;
    if (!user || !mandate || mandate.userId !== user) return bot!.answer(q.id, "This chat isn't linked to that workspace.");
    try {
      const r = await c.governor.decide(approvalId!, kind === "a" ? "approve" : "decline");
      if (q.message) await bot!.clearButtons(chat, q.message.message_id).catch(() => undefined);
      const said =
        kind === "d" ? "Declined. No money moved." : r.status === "paid" ? "Approved and paid with PayPal." : r.status === "awaiting_buyer" ? "Approved. Finish the payment in PayPal (open Mandate)." : `Approved: ${r.status}.`;
      await bot!.answer(q.id, said);
      const payUrl = "approveUrl" in r && typeof r.approveUrl === "string" ? r.approveUrl : null;
      return bot!.send(chat, kind === "d" ? "✕ Declined. No money moved." : `✓ ${said}`, payUrl ? [[{ text: "Pay in PayPal", url: payUrl }]] : []);
    } catch (e) {
      if (e instanceof PasskeyError) return bot!.answer(q.id, "This workspace requires your passkey. Open Mandate to approve.");
      const msg = e instanceof Error ? e.message : "Couldn't decide this approval.";
      return bot!.answer(q.id, /already/i.test(msg) ? "Already decided." : /expired/i.test(msg) ? "This approval has expired." : msg);
    }
  }
}
