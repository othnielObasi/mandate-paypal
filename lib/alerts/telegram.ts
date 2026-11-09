import { createHash, timingSafeEqual } from "node:crypto";

export type Button = { text: string; url: string } | { text: string; callback_data: string };

/** The Telegram Bot API, for the one Mandate bot (TELEGRAM_BOT_TOKEN). */
export class TelegramBot {
  private fetchImpl: typeof fetch;
  private name: string | null = null;
  constructor(private o: { token: string; fetch?: typeof fetch }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  /** Telegram sends this back in a header on every webhook call; derived from the token, so no extra setting. */
  get webhookSecret(): string {
    return createHash("sha256").update(`mandate-telegram:${this.o.token}`).digest("hex").slice(0, 48);
  }

  secretMatches(header: string | null): boolean {
    if (!header) return false;
    const a = Buffer.from(header);
    const b = Buffer.from(this.webhookSecret);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await this.fetchImpl(`https://api.telegram.org/bot${this.o.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    return json.result as T;
  }

  /** The bot's @username, for t.me links. */
  async username(): Promise<string> {
    this.name ??= (await this.call<{ username: string }>("getMe", {})).username;
    return this.name;
  }

  send(chatId: number, text: string, buttons: Button[][] = []) {
    return this.call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}) });
  }

  answer(callbackId: string, text: string) {
    return this.call("answerCallbackQuery", { callback_query_id: callbackId, text: text.slice(0, 190) });
  }

  /** Remove the buttons from a message once it has been acted on. */
  clearButtons(chatId: number, messageId: number) {
    return this.call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
  }
}
