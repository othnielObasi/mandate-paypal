import Kernel from "@onkernel/sdk";

/** A web page as the agent sees it: plain text, always untrusted. */
export interface WebPage {
  url: string;
  title: string;
  text: string;
  /** How it was read, shown in the activity feed. */
  via: string;
}

export interface PageReader {
  read(url: string): Promise<WebPage>;
}

export class PageReadError extends Error {}

export const MAX_PAGE_CHARS = 6_000;

/** Only http(s) URLs, with no credentials in them. */
export function parsePageUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new PageReadError("That is not a valid URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new PageReadError("Only http and https pages can be read.");
  if (u.username || u.password) throw new PageReadError("URLs with credentials are refused.");
  return u;
}

const isLocal = (u: URL) => /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname) || u.hostname.endsWith(".local");

const clip = (s: string) => {
  const t = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > MAX_PAGE_CHARS ? `${t.slice(0, MAX_PAGE_CHARS)}…` : t;
};

/** Visible text of an HTML document, without scripts or styles. Enough for the app's own demo pages. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const text = body
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'");
  return { title: decodeEntities(title), text };
}
const decodeEntities = (s: string) => s.replace(/&amp;/g, "&").replace(/&middot;/g, "·").replace(/&#x27;|&#39;/g, "'");

/**
 * Opens the page in a KERNEL cloud browser: a real Chromium in Kernel's cloud, so JavaScript-heavy
 * shops render, and the page is fetched from Kernel's network rather than Mandate's server. The
 * browser is created for one read and deleted afterwards.
 */
export class KernelPageReader implements PageReader {
  constructor(private client: Pick<Kernel, "browsers">) {}

  static fromApiKey(apiKey: string) {
    return new KernelPageReader(new Kernel({ apiKey, timeout: 45_000, maxRetries: 1 }));
  }

  async read(raw: string): Promise<WebPage> {
    const url = parsePageUrl(raw);
    if (isLocal(url)) throw new PageReadError("A cloud browser cannot open a local address.");
    const browser = await this.client.browsers.create({ headless: true, timeout_seconds: 60 });
    try {
      const code = `await page.goto(${JSON.stringify(url.toString())}, { waitUntil: "domcontentloaded", timeout: 20000 });
return { url: page.url(), title: await page.title(), text: await page.evaluate(() => document.body ? document.body.innerText : "") };`;
      const res = await this.client.browsers.playwright.execute(browser.session_id, { code, timeout_sec: 30 });
      if (!res.success) throw new PageReadError(`The cloud browser could not open the page${res.error ? `: ${res.error.slice(0, 160)}` : "."}`);
      const r = (res.result ?? {}) as { url?: string; title?: string; text?: string };
      return { url: String(r.url ?? url), title: String(r.title ?? ""), text: clip(String(r.text ?? "")), via: "KERNEL cloud browser" };
    } finally {
      await this.client.browsers.deleteByID(browser.session_id).catch(() => undefined);
    }
  }
}

/**
 * Without a Kernel key, the agent can read only Mandate's own demo pages, fetched directly.
 * The server never fetches arbitrary URLs from its own network.
 */
export class OwnPagesReader implements PageReader {
  private origin: string;
  private fetchImpl: typeof fetch;

  constructor(appUrl: string, o: { fetch?: typeof fetch } = {}) {
    this.origin = new URL(appUrl).origin;
    this.fetchImpl = o.fetch ?? fetch;
  }

  owns(url: URL) {
    return url.origin === this.origin && url.pathname.startsWith("/demo/");
  }

  async read(raw: string): Promise<WebPage> {
    const url = parsePageUrl(raw);
    if (!this.owns(url)) throw new PageReadError("Reading other websites needs a KERNEL cloud browser (set KERNEL_API_KEY). Without it, only Mandate's own /demo pages can be read.");
    const res = await this.fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new PageReadError(`The page answered ${res.status}.`);
    const { title, text } = htmlToText(await res.text());
    return { url: url.toString(), title, text: clip(text), via: "direct fetch (Mandate's own demo page)" };
  }
}

/** Kernel for the open web; the app's own demo pages directly when Kernel cannot reach them (local dev). */
export class WebReader implements PageReader {
  constructor(
    private own: OwnPagesReader,
    private kernel: PageReader | null,
  ) {}

  get mode(): "kernel" | "own-pages" {
    return this.kernel ? "kernel" : "own-pages";
  }

  read(raw: string): Promise<WebPage> {
    const url = parsePageUrl(raw);
    if (this.kernel && !(this.own.owns(url) && isLocal(url))) return this.kernel.read(raw);
    return this.own.read(raw);
  }
}
