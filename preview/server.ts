/**
 * Runs Mandate's real API route handlers inside the page. fetch("/api/…")
 * is answered by the same code the server runs, with an in-memory container
 * (offline mode: simulated PayPal, offline planner, simulated market).
 */
import { ROUTES } from "./routes.generated";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response> | Response;
type Mod = Partial<Record<"GET" | "POST" | "PATCH" | "PUT" | "DELETE", Handler>>;

const ORIGIN = "https://mandate-preview.local";

const table = ROUTES.map(({ pattern, mod }) => {
  const names: string[] = [];
  const rx = new RegExp(
    "^" +
      pattern.replace(/\[([^\]]+)\]/g, (_m, n: string) => {
        names.push(n);
        return "([^/]+)";
      }) +
      "$",
  );
  return { rx, names, mod: mod as Mod, pattern };
})
  // Static segments win over dynamic ones, as in Next.js: /api/mandates/preview before /api/mandates/[id].
  .sort((a, b) => a.names.length - b.names.length || b.pattern.length - a.pattern.length);

export async function dispatch(input: Request): Promise<Response> {
  const url = new URL(input.url);
  for (const r of table) {
    const m = r.rx.exec(url.pathname);
    if (!m) continue;
    const fn = r.mod[input.method as keyof Mod];
    if (!fn) return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "content-type": "application/json" } });
    const params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1]!)]));
    return fn(input, { params: Promise.resolve(params) });
  }
  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "content-type": "application/json" } });
}

/** Absolute URL for an app path, in the preview's private origin. */
export const toUrl = (path: string) => new URL(path, ORIGIN).toString();

/** Route same-origin /api requests to the in-page server; everything else goes to the network. */
export function installFetch() {
  const real = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const u = new URL(raw, ORIGIN);
    const local = (u.origin === ORIGIN || raw.startsWith("/")) && u.pathname.startsWith("/api/");
    if (!local) return real(input, init);
    const headers = new Headers(init?.headers);
    if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", "127.0.0.1");
    return dispatch(new Request(toUrl(u.pathname + u.search), { ...init, headers }));
  };
}
