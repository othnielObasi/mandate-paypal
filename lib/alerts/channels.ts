/** Where one workspace's alerts go. Each is optional; nothing is shared between workspaces. */
export interface AlertChannels {
  userId: string;
  telegram?: { chatId: number; name: string | null; linkedAt: string };
  slack?: string;
  discord?: string;
  zapier?: string;
}

export type WebhookChannel = "slack" | "discord" | "zapier";

/**
 * Only these services' own webhook addresses are accepted, so a pasted link can never
 * point the server at anything else.
 */
const PATTERNS: Record<WebhookChannel, RegExp> = {
  slack: /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{10,200}$/,
  discord: /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d{5,30}\/[A-Za-z0-9_-]{20,120}$/,
  // Catch Hooks, including custom ids (letters, digits, - and _) and the "/silent" variant.
  zapier: /^https:\/\/hooks\.zapier\.com\/hooks\/(?:catch|standard)\/\d{1,20}\/[A-Za-z0-9_-]{3,64}(?:\/silent)?\/?$/,
};

export function validWebhook(channel: WebhookChannel, url: string): boolean {
  return PATTERNS[channel].test(url.trim());
}

export interface AlertStore {
  get(userId: string): Promise<AlertChannels | undefined>;
  put(c: AlertChannels): Promise<void>;
  /** Which workspace a Telegram chat belongs to. */
  byTelegramChat(chatId: number): Promise<string | undefined>;
  /** A one-time code that links a Telegram chat to a workspace (valid for an hour). */
  putLink(code: string, userId: string): Promise<void>;
  takeLink(code: string): Promise<string | undefined>;
}

export class MemoryAlertStore implements AlertStore {
  private rows = new Map<string, AlertChannels>();
  private links = new Map<string, { userId: string; at: number }>();
  async get(userId: string) {
    const c = this.rows.get(userId);
    return c && structuredClone(c);
  }
  async put(c: AlertChannels) {
    this.rows.set(c.userId, structuredClone(c));
  }
  async byTelegramChat(chatId: number) {
    for (const c of this.rows.values()) if (c.telegram?.chatId === chatId) return c.userId;
    return undefined;
  }
  async putLink(code: string, userId: string) {
    this.links.set(code, { userId, at: Date.now() });
  }
  async takeLink(code: string) {
    const l = this.links.get(code);
    this.links.delete(code);
    return l && Date.now() - l.at < 3_600_000 ? l.userId : undefined;
  }
}
