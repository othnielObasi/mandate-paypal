import { describe, it, expect, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createContainer, setContainer, getContainer } from "@/lib/server/container";
import { POST as createMandate } from "@/app/api/mandates/route";
import { PATCH as patchMandate } from "@/app/api/mandates/[id]/route";
import { GET as listConnections, POST as createConnection } from "@/app/api/mandates/[id]/connections/route";
import { DELETE as revokeConnection } from "@/app/api/connections/[id]/route";
import { DELETE as mcpDelete, GET as mcpGet, POST as mcpPost } from "@/app/api/mcp/[token]/route";
import { POST as mcpBearer } from "@/app/api/mcp/route";
import { GET as listReceipts } from "@/app/api/receipts/route";

const BASE = "http://localhost:3000";
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const params = <K extends string>(k: K, v: string) => ({ params: Promise.resolve({ [k]: v } as Record<K, string>) });

/** Routes the SDK client's HTTP calls into our route handlers, in-process. */
const appFetch: typeof fetch = async (input, init) => {
  const req = new Request(input instanceof Request ? input : String(input), init);
  const path = new URL(req.url).pathname;
  const m = path.match(/^\/api\/mcp\/([^/]+)$/);
  if (!m) return new Response("not found", { status: 404 });
  const ctx = params("token", decodeURIComponent(m[1]!));
  if (req.method === "POST") return mcpPost(req, ctx);
  if (req.method === "GET") return mcpGet(req, ctx);
  if (req.method === "DELETE") return mcpDelete(req, ctx);
  return new Response(null, { status: 405 });
};

async function setup() {
  const m = (await (await createMandate(post("/api/mandates", { text: "Household basics, up to $80 a month, nothing over $25, verified sellers only" }))).json()) as { id: string };
  const conn = (await (await createConnection(post(`/api/mandates/${m.id}/connections`, { label: "Claude Desktop" }), params("id", m.id))).json()) as {
    id: string;
    url: string;
    token: string;
  };
  return { mandateId: m.id, conn };
}

async function connect(url: string) {
  const client = new Client({ name: "test-agent", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { fetch: appFetch }));
  return client;
}

const text = (r: unknown) => ((r as { content: Array<{ text: string }> }).content[0]?.text ?? "");

beforeEach(() => setContainer(createContainer({ APP_URL: BASE })));

describe("Mandate MCP server, driven by the official MCP client", () => {
  it("issues a connection URL once and lists connections without secrets", async () => {
    const { mandateId, conn } = await setup();
    expect(conn.url).toBe(`${BASE}/api/mcp/${conn.token}`);
    expect(conn.token.length).toBeGreaterThanOrEqual(40);
    const list = (await (await listConnections(new Request(`${BASE}/api/mandates/${mandateId}/connections`), params("id", mandateId))).json()) as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ label: "Claude Desktop", revoked: false });
    expect(JSON.stringify(list)).not.toContain(conn.token);
  });

  it("offers shopping tools, none of which can pay directly", async () => {
    const { conn } = await setup();
    const client = await connect(conn.url);
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(["buy", "get_mandate", "get_product", "search_products"]);
    expect(client.getServerVersion()?.name).toBe("mandate");
    await client.close();
  });

  it("tells the agent its limits and remaining budget", async () => {
    const { conn } = await setup();
    const client = await connect(conn.url);
    const r = await client.callTool({ name: "get_mandate", arguments: {} });
    expect(text(r)).toMatch(/\$25\.00 per item/);
    expect(text(r)).toMatch(/\$80\.00 left this month/);
    await client.close();
  });

  it("an outside agent's purchase goes through the gate, is signed, and is logged with who tried", async () => {
    const { mandateId, conn } = await setup();
    const client = await connect(conn.url);
    await client.callTool({ name: "search_products", arguments: { query: "sponges" } });
    const r = await client.callTool({ name: "buy", arguments: { sku: "sponge-3", qty: 1 } });
    expect(text(r)).toMatch(/^Paid \$1\.99/);
    expect((r as { structuredContent?: { status: string; paymentMandateId?: string } }).structuredContent).toMatchObject({ status: "paid", paymentMandateId: expect.stringMatching(/^pm_/) });
    const receipts = (await (await listReceipts(new Request(`${BASE}/api/receipts?mandateId=${mandateId}`))).json()) as Array<{ type: string; summary: string }>;
    expect(receipts.find((x) => x.type === "decision")!.summary).toContain("via Claude Desktop");
    await client.close();
  });

  it("over the limit, it tells the agent to ask the user", async () => {
    const { conn } = await setup();
    const client = await connect(conn.url);
    await client.callTool({ name: "search_products", arguments: { query: "electric kettle" } });
    const r = await client.callTool({ name: "buy", arguments: { sku: "kettle", qty: 1 } });
    expect(text(r)).toMatch(/needs the user's approval/i);
    expect(text(r)).toContain(BASE);
    await client.close();
  });

  it("blocks an outside agent that was steered by a product page", async () => {
    const { conn } = await setup();
    const client = await connect(conn.url);
    await client.callTool({ name: "search_products", arguments: { query: "cleaning spray" } });
    const page = await client.callTool({ name: "get_product", arguments: { sku: "clean-spray" } });
    expect(text(page)).toContain("UNTRUSTED");
    await client.callTool({ name: "search_products", arguments: { query: "platinum bundle" } });
    const r = await client.callTool({ name: "buy", arguments: { sku: "platinum-bundle", qty: 1 } });
    expect(text(r)).toMatch(/^Blocked/);
    expect(text(r)).toMatch(/untrusted content/);
    const direct = await client.callTool({ name: "buy", arguments: { sku: "gift-card-50", qty: 1 } });
    expect(text(direct)).toMatch(/^Blocked/);
    await client.close();
  });

  it("pausing the mandate stops the outside agent too", async () => {
    const { mandateId, conn } = await setup();
    await patchMandate(new Request(`${BASE}/api/mandates/${mandateId}`, { method: "PATCH", body: JSON.stringify({ status: "paused" }) }), params("id", mandateId));
    const client = await connect(conn.url);
    await client.callTool({ name: "search_products", arguments: { query: "sponges" } });
    expect(text(await client.callTool({ name: "buy", arguments: { sku: "sponge-3", qty: 1 } }))).toMatch(/paused/);
    await client.close();
  });

  it("rejects unknown and revoked connections, and connections to a revoked mandate", async () => {
    const { mandateId, conn } = await setup();
    await expect(connect(`${BASE}/api/mcp/not-a-token`)).rejects.toThrow();
    expect((await revokeConnection(new Request(`${BASE}/api/connections/${conn.id}`, { method: "DELETE" }), params("id", conn.id))).status).toBe(200);
    await expect(connect(conn.url)).rejects.toThrow();

    const second = (await (await createConnection(post(`/api/mandates/${mandateId}/connections`, { label: "Other" }), params("id", mandateId))).json()) as { url: string };
    await patchMandate(new Request(`${BASE}/api/mandates/${mandateId}`, { method: "PATCH", body: JSON.stringify({ status: "revoked" }) }), params("id", mandateId));
    await expect(connect(second.url)).rejects.toThrow();
  });

  it("accepts the token as a bearer header too", async () => {
    const { conn } = await setup();
    const res = await mcpBearer(post("/api/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" }, { authorization: `Bearer ${conn.token}` }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { result: { tools: unknown[] } }).result.tools).toHaveLength(4);
    expect((await mcpBearer(post("/api/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" }))).status).toBe(401);
  });
});

describe("Mandate MCP server: protocol edges", () => {
  let token: string;
  beforeEach(async () => {
    token = (await setup()).conn.token;
  });
  const call = (body: unknown, headers: Record<string, string> = {}) => mcpPost(post(`/api/mcp/${token}`, body, headers), params("token", token));

  it("negotiates the protocol version", async () => {
    const r = (await (await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "1" } } })).json()) as {
      result: { protocolVersion: string; capabilities: { tools: unknown } };
    };
    expect(r.result.protocolVersion).toBe("2025-06-18");
    expect(r.result.capabilities.tools).toBeDefined();
    const future = (await (await call({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2099-01-01", capabilities: {}, clientInfo: { name: "x", version: "1" } } })).json()) as {
      result: { protocolVersion: string };
    };
    expect(future.result.protocolVersion).toBe("2025-11-25");
  });

  it("returns a session id on initialize and 404s an unknown session", async () => {
    const res = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "1" } } });
    expect(res.headers.get("mcp-session-id")).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect((await call({ jsonrpc: "2.0", id: 2, method: "tools/list" }, { "mcp-session-id": "nope" })).status).toBe(404);
  });

  it("acknowledges notifications with 202 and no body", async () => {
    const res = await call({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("answers ping, rejects unknown methods, bad JSON, batches and unknown tools", async () => {
    expect(await (await call({ jsonrpc: "2.0", id: 1, method: "ping" })).json()).toEqual({ jsonrpc: "2.0", id: 1, result: {} });
    expect(await (await call({ jsonrpc: "2.0", id: 2, method: "resources/list" })).json()).toMatchObject({ id: 2, error: { code: -32601 } });
    const bad = await mcpPost(post(`/api/mcp/${token}`, "{not json"), params("token", token));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: -32700 } });
    expect(await (await call([{ jsonrpc: "2.0", id: 1, method: "ping" }])).json()).toMatchObject({ error: { code: -32600 } });
    expect(await (await call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "wire_money", arguments: {} } })).json()).toMatchObject({ id: 3, error: { code: -32602 } });
  });

  it("reports bad tool arguments as a tool error the agent can read", async () => {
    const r = (await (await call({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "buy", arguments: { sku: "sponge-3", qty: -1 } } })).json()) as {
      result: { isError: boolean; content: Array<{ text: string }> };
    };
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0]!.text).toMatch(/qty/);
  });

  it("refuses browser requests from other sites (DNS rebinding guard)", async () => {
    expect((await call({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await call({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: BASE })).status).toBe(200);
  });

  it("has no server-initiated stream (GET is 405)", async () => {
    expect((await mcpGet(new Request(`${BASE}/api/mcp/${token}`), params("token", token))).status).toBe(405);
  });

  it("sessions are bound to their connection", async () => {
    const init = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "1" } } });
    const sid = init.headers.get("mcp-session-id")!;
    const other = (await setup()).conn.token;
    const res = await mcpPost(post(`/api/mcp/${other}`, { jsonrpc: "2.0", id: 2, method: "tools/list" }, { "mcp-session-id": sid }), params("token", other));
    expect(res.status).toBe(404);
    void getContainer();
  });
});
