import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const spec = readFileSync(path.join(root, "public/openapi.yaml"), "utf8");
const collection = JSON.parse(readFileSync(path.join(root, "postman/Mandate.postman_collection.json"), "utf8"));

/** Paths and their methods from the spec (two-space path keys, four-space method keys). */
function specOperations(): Map<string, string[]> {
  const ops = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of spec.split(/\r?\n/)) {
    const p = /^ {2}(\/api\/\S+):\s*$/.exec(line);
    if (p) {
      current = p[1]!;
      ops.set(current, []);
      continue;
    }
    if (/^\S/.test(line)) current = null;
    const m = current && /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (m) ops.get(current!)!.push(m[1]!.toUpperCase());
  }
  return ops;
}

/** The route file for a spec path. A {param} matches any [dynamic] folder, whatever it is named. */
function routeFile(apiPath: string): string {
  let dir = path.join(root, "app");
  for (const seg of apiPath.split("/").filter(Boolean)) {
    const dynamic = seg.startsWith("{") ? readdirSync(dir).find((d) => d.startsWith("[")) : undefined;
    dir = path.join(dir, dynamic ?? seg);
    if (!existsSync(dir)) break;
  }
  return path.join(dir, "route.ts");
}

// Public endpoints a seller, PayPal or a reviewer uses: these must stay documented.
const PUBLIC = ["/api/verify/{paypalOrderId}", "/api/ap2/orders/{paypalOrderId}", "/api/ap2/jwks", "/api/seller", "/api/trust", "/api/receipts", "/api/receipts/verify"];

describe("OpenAPI spec (public/openapi.yaml)", () => {
  const ops = specOperations();

  it("documents every public verification endpoint", () => {
    for (const p of PUBLIC) expect(ops.has(p), p).toBe(true);
  });

  it("every documented operation exists in the app with that method", () => {
    expect(ops.size).toBeGreaterThan(10);
    for (const [p, methods] of ops) {
      const file = routeFile(p);
      expect(existsSync(file), `${p} -> ${file}`).toBe(true);
      const src = readFileSync(file, "utf8");
      for (const m of methods) expect(src, `${m} ${p}`).toMatch(new RegExp(`export (const|async function) ${m}\\b`));
    }
  });
});

describe("Postman collection", () => {
  const requests: Array<{ method: string; url: string }> = [];
  const walk = (items: Array<Record<string, any>>) =>
    items.forEach((it) => (it.item ? walk(it.item) : requests.push({ method: it.request.method, url: typeof it.request.url === "string" ? it.request.url : it.request.url.raw })));
  walk(collection.item);

  it("only calls documented endpoints", () => {
    const ops = specOperations();
    const patterns = [...ops].map(([p, methods]) => ({ re: new RegExp("^" + p.replace(/\{[^}]+\}/g, "[^/?]+") + "(\\?.*)?$"), methods }));
    for (const r of requests) {
      const apiPath = r.url.replace("{{baseUrl}}", "").replace(/\{\{[^}]+\}\}/g, "X");
      const hit = patterns.find((p) => p.re.test(apiPath));
      expect(hit, `${r.method} ${apiPath}`).toBeDefined();
      expect(hit!.methods, `${r.method} ${apiPath}`).toContain(r.method);
    }
  });

  it("walks the whole story: sign, shop, approve, drill, verify, tamper", () => {
    expect(requests.length).toBeGreaterThanOrEqual(15);
    const urls = requests.map((r) => r.url).join(" ");
    for (const part of ["/api/mandates", "/api/agent/run", "/api/approvals/", "/api/verify/", "/api/ap2/orders/", "/api/ap2/jwks", "/api/receipts/verify"]) expect(urls).toContain(part);
  });
});
