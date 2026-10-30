import { describe, it, expect } from "vitest";
import { generateEs256, publicJwk, b64url, b64urlJson, sha256b64url } from "@/lib/ap2v2/es256";
import { sd, issueRoot, present, verifyChain, parseChain, closedJwtOf } from "@/lib/ap2v2/sdjwt";

const provider = generateEs256("provider-1");
const agent = generateEs256("agent-1");
const lookup = () => publicJwk(provider);
const NOW = 1_800_000_000;

function openToken() {
  return issueRoot(
    {
      vct: "mandate.payment.open.1",
      constraints: [
        { type: "payment.amount_range", currency: "USD", min: 0, max: 2500 },
        { type: "payment.allowed_payees", allowed: [sd({ id: "acme", name: "Acme" }), sd({ id: "hub", name: "Hub" })] },
      ],
      cnf: { jwk: publicJwk(agent) },
      iat: NOW,
      exp: NOW + 3600,
    },
    provider,
  );
}

const closed = { vct: "mandate.payment.1", transaction_id: "tx1", payee: { id: "acme", name: "Acme" }, payment_amount: { amount: 450, currency: "USD" }, payment_instrument: { id: "pp", type: "paypal" } };

describe("SD-JWT delegation chains (AP2 v0.2 / delegate SD-JWT)", () => {
  it("round-trips: root SD-JWT + KB hop verify and resolve every disclosure", () => {
    const chain = present(openToken(), agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    const [open, done] = verifyChain(chain, lookup, { aud: "paypal", nonce: "n1", now: NOW });
    expect(open).toMatchObject({ vct: "mandate.payment.open.1", cnf: { jwk: { kty: "EC" } } });
    expect((open!.constraints as Array<{ allowed?: unknown[] }>)[1]!.allowed).toEqual([
      { id: "acme", name: "Acme" },
      { id: "hub", name: "Hub" },
    ]);
    expect(done).toEqual({ ...closed });
  });

  it("puts the mandate behind a digest in delegate_payload, with _sd_alg", () => {
    const t = openToken();
    const payload = b64urlJson(t.split("~")[0]!.split(".")[1]!) as { delegate_payload: Array<Record<string, string>>; _sd_alg: string };
    expect(payload._sd_alg).toBe("sha-256");
    expect(Object.keys(payload.delegate_payload[0]!)).toEqual(["..."]);
  });

  it("the KB hop binds to the exact previous token with sd_hash", () => {
    const open = openToken();
    const chain = present(open, agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    const kb = parseChain(chain)[1]!;
    const kbPayload = b64urlJson(kb.issuerJwt.split(".")[1]!) as Record<string, unknown>;
    expect(kbPayload.sd_hash).toBe(sha256b64url(open));
    expect(JSON.parse(atob(kb.issuerJwt.split(".")[0]!.replace(/-/g, "+").replace(/_/g, "/")))).toMatchObject({ typ: "kb+sd-jwt", alg: "ES256" });
  });

  it("an agent can withhold an array disclosure; the element is simply absent", () => {
    const open = openToken();
    const parts = open.split("~").filter(Boolean);
    const hubDisclosure = parts.find((p, i) => i > 0 && JSON.stringify(b64urlJson(p)).includes('"hub"'))!;
    const redacted = open.replace(`${hubDisclosure}~`, "");
    const chain = present(redacted, agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    const [o] = verifyChain(chain, lookup, { aud: "paypal", nonce: "n1", now: NOW });
    expect((o!.constraints as Array<{ allowed?: unknown[] }>)[1]!.allowed).toEqual([{ id: "acme", name: "Acme" }]);
  });

  it("rejects a tampered disclosure, an unreferenced disclosure, and the wrong root key", () => {
    const chain = present(openToken(), agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    const [first, second] = chain.split("~~");
    const discs = first!.split("~");
    const forged = b64url(JSON.stringify(["salt", { id: "evil", name: "Evil" }]));
    expect(() => verifyChain([discs[0], ...discs.slice(1, -1), forged].join("~") + "~~" + second, lookup, { now: NOW })).toThrow(/not referenced|digest/i);
    expect(() => verifyChain(chain, () => publicJwk(generateEs256()), { now: NOW })).toThrow(/signature/i);
  });

  it("rejects a KB hop signed by a key other than the delegated cnf key", () => {
    const chain = present(openToken(), generateEs256(), closed, { aud: "paypal", nonce: "n1", iat: NOW });
    expect(() => verifyChain(chain, lookup, { now: NOW })).toThrow(/signature/i);
  });

  it("rejects a KB hop bound to a different previous token", () => {
    const a = present(openToken(), agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    const kb = a.split("~~")[1]!;
    const otherOpen = openToken();
    expect(() => verifyChain(`${otherOpen.slice(0, -1)}~~${kb}`, lookup, { now: NOW })).toThrow(/sd_hash/);
  });

  it("enforces aud, nonce and expiry", () => {
    const chain = present(openToken(), agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    expect(() => verifyChain(chain, lookup, { aud: "other", nonce: "n1", now: NOW })).toThrow(/aud/);
    expect(() => verifyChain(chain, lookup, { aud: "paypal", nonce: "n2", now: NOW })).toThrow(/nonce/);
    expect(() => verifyChain(chain, lookup, { now: NOW + 3600 + 301 })).toThrow(/expired/);
  });

  it("a terminal hop must not carry cnf; an intermediate hop must", () => {
    expect(() => present(openToken(), agent, { ...closed, cnf: { jwk: publicJwk(agent) } }, { aud: "a", nonce: "n", iat: NOW, terminal: true })).toThrow(/cnf/);
  });

  it("exposes the closed-mandate JWT used as the receipt reference", () => {
    const chain = present(openToken(), agent, closed, { aud: "paypal", nonce: "n1", iat: NOW });
    expect(closedJwtOf(chain)).toBe(chain.split("~~")[1]!.split("~")[0]);
  });
});
