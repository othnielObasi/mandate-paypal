/**
 * SD-JWT (RFC 9901) and delegate SD-JWT chains, as AP2 v0.2 uses them.
 *
 * - A root SD-JWT carries one mandate in `delegate_payload`, behind a digest.
 * - A key-binding hop (KB-SD-JWT) is signed by the key the previous hop named
 *   in `cnf`, binds to it with `sd_hash`, and carries the next mandate.
 * - Tokens in a chain are joined with "~~".
 *
 * Interoperability with Google's AP2 reference SDK is tested in
 * tests/ap2v2/interop.test.ts.
 */
import { b64url, b64urlDecode, b64urlJson, sha256b64url, signJws, decodeJws, verifyJws, importPublicJwk, type Es256Key, type PublicJwk } from "./es256";

const SD = Symbol("sd");
type SdValue = { [SD]: true; value: unknown };

/** Mark a value as selectively disclosable (an array element, or an object property). */
export function sd<T>(value: T): T {
  return { [SD]: true, value } as unknown as T;
}
const isSd = (v: unknown): v is SdValue => typeof v === "object" && v !== null && (v as Record<symbol, unknown>)[SD] === true;

export const TYP_TERMINAL = ["kb+sd-jwt", "kb-sd-jwt"];
export const TYP_INTERMEDIATE = ["kb+sd-jwt+kb", "kb-sd-jwt+kb"];

function salt(): string {
  return b64url(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

/** Replace sd() markers with digests, collecting disclosures. */
function conceal(value: unknown, out: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((el) => {
      if (isSd(el)) {
        const d = b64url(JSON.stringify([salt(), conceal(el.value, out)]));
        out.push(d);
        return { "...": sha256b64url(d) };
      }
      return conceal(el, out);
    });
  }
  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    const digests: string[] = [];
    for (const [k, v] of Object.entries(value)) {
      if (isSd(v)) {
        const d = b64url(JSON.stringify([salt(), k, conceal(v.value, out)]));
        out.push(d);
        digests.push(sha256b64url(d));
      } else obj[k] = conceal(v, out);
    }
    if (digests.length) obj._sd = digests.sort();
    return obj;
  }
  return value;
}

function issue(item: Record<string, unknown>, key: Es256Key, header: Record<string, unknown>, extra: Record<string, unknown>): string {
  const disclosures: string[] = [];
  const body = conceal(item, disclosures);
  const root = b64url(JSON.stringify([salt(), body]));
  disclosures.push(root);
  const payload = { delegate_payload: [{ "...": sha256b64url(root) }], ...extra, _sd_alg: "sha-256" };
  const jwt = signJws({ alg: "ES256", ...header }, payload, key);
  return `${jwt}~${disclosures.join("~")}~`;
}

/** Sign a root SD-JWT carrying one mandate (an open mandate when it has cnf). */
export function issueRoot(mandate: Record<string, unknown>, issuerKey: Es256Key, typ = "dc+sd-jwt"): string {
  return issue(mandate, issuerKey, { typ, ...(issuerKey.kid ? { kid: issuerKey.kid } : {}) }, {});
}

export interface ParsedToken {
  issuerJwt: string;
  disclosures: string[];
  /** issuer JWT + "~" + disclosures + "~": the form sd_hash is computed over. */
  sdJwt: string;
}

export function parseToken(token: string): ParsedToken {
  if (!token.includes("~")) throw new Error("Malformed SD-JWT: missing disclosure separator");
  const parts = token.split("~");
  const issuerJwt = parts[0]!;
  if (!issuerJwt || issuerJwt.split(".").length !== 3) throw new Error("Malformed SD-JWT: issuer JWT");
  if (!token.endsWith("~")) throw new Error("Malformed SD-JWT: trailing key-binding JWTs are not used in AP2 chains");
  const disclosures = parts.slice(1, -1);
  if (disclosures.some((d) => !d)) throw new Error("Malformed SD-JWT: empty disclosure");
  return { issuerJwt, disclosures, sdJwt: disclosures.length ? `${issuerJwt}~${disclosures.join("~")}~` : `${issuerJwt}~` };
}

/** Split a "~~"-joined chain into tokens, restoring each token's trailing "~". */
export function parseChain(chain: string): ParsedToken[] {
  const segs = chain.split("~~");
  return segs.map((s, i) => parseToken(i < segs.length - 1 && !s.endsWith("~") ? `${s}~` : s));
}

export function joinChain(tokens: string[]): string {
  return tokens.map((t, i) => (i < tokens.length - 1 && t.endsWith("~") ? t.slice(0, -1) : t)).join("~~");
}

/** The closed (last) hop's issuer JWT: what receipts reference by hash. */
export function closedJwtOf(chain: string): string {
  return chain.split("~~").at(-1)!.split("~")[0]!;
}

/**
 * Append a key-binding hop: `holderKey` (the previous hop's cnf key) signs
 * `mandate`, bound to `prev` by sd_hash. Terminal unless the mandate has cnf.
 */
export function present(prev: string, holderKey: Es256Key, mandate: Record<string, unknown>, o: { aud: string; nonce: string; iat?: number; terminal?: boolean }): string {
  if (!o.aud || !o.nonce) throw new Error("aud and nonce are required for KB-SD-JWT hops");
  const hasCnf = "cnf" in mandate;
  if (o.terminal && hasCnf) throw new Error("A terminal KB-SD-JWT must not carry cnf");
  const prevTok = parseToken(prev.endsWith("~") ? prev : `${prev}~`);
  const typ = hasCnf ? TYP_INTERMEDIATE[0]! : TYP_TERMINAL[0]!;
  const extra = { iat: o.iat ?? Math.floor(Date.now() / 1000), aud: o.aud, nonce: o.nonce, sd_hash: sha256b64url(prevTok.sdJwt) };
  const hop = issue(mandate, holderKey, { typ }, extra);
  return joinChain([prevTok.sdJwt, hop]);
}

/* ---------------- verification ---------------- */

function resolve(value: unknown, byDigest: Map<string, unknown[]>, used: Set<string>): unknown {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const el of value) {
      if (el && typeof el === "object" && !Array.isArray(el) && Object.keys(el).length === 1 && "..." in el) {
        const digest = (el as Record<string, unknown>)["..."];
        if (typeof digest !== "string") throw new Error("Invalid array digest");
        const d = byDigest.get(digest);
        if (!d) continue; // withheld element
        if (used.has(digest)) throw new Error("Disclosure digest referenced more than once");
        if (d.length !== 2) throw new Error("Array digest points at an object-property disclosure");
        used.add(digest);
        out.push(resolve(d[1], byDigest, used));
      } else out.push(resolve(el, byDigest, used));
    }
    return out;
  }
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) if (k !== "_sd" && k !== "_sd_alg") out[k] = resolve(v, byDigest, used);
    const list = src._sd;
    if (list !== undefined) {
      if (!Array.isArray(list)) throw new Error("_sd must be an array");
      for (const digest of list) {
        if (typeof digest !== "string") throw new Error("Invalid _sd digest");
        const d = byDigest.get(digest);
        if (!d) continue;
        if (used.has(digest)) throw new Error("Disclosure digest referenced more than once");
        if (d.length !== 3 || typeof d[1] !== "string") throw new Error("_sd digest points at an array-element disclosure");
        if (d[1] === "_sd" || d[1] === "..." || d[1] in out) throw new Error(`Disclosed claim name not allowed or duplicated: ${d[1]}`);
        used.add(digest);
        out[d[1]] = resolve(d[2], byDigest, used);
      }
    }
    return out;
  }
  return value;
}

/** Verify one token's signature and resolve its disclosures. Returns the payload and its delegate items. */
function verifyToken(t: ParsedToken, key: PublicJwk): { payload: Record<string, unknown>; header: Record<string, unknown>; items: Record<string, unknown>[] } {
  if (!verifyJws(t.issuerJwt, key)) throw new Error("Invalid signature");
  const { header, payload } = decodeJws(t.issuerJwt);
  const alg = payload._sd_alg ?? "sha-256";
  if (alg !== "sha-256") throw new Error(`Unsupported _sd_alg: ${String(alg)}`);
  const byDigest = new Map<string, unknown[]>();
  for (const d of t.disclosures) {
    const digest = sha256b64url(d);
    if (byDigest.has(digest)) throw new Error("Duplicate disclosure");
    const arr = JSON.parse(new TextDecoder().decode(b64urlDecode(d)));
    if (!Array.isArray(arr) || (arr.length !== 2 && arr.length !== 3) || typeof arr[0] !== "string") throw new Error("Malformed disclosure");
    byDigest.set(digest, arr);
  }
  const used = new Set<string>();
  const resolved = resolve(payload, byDigest, used) as Record<string, unknown>;
  if (used.size !== byDigest.size) throw new Error("A disclosure is not referenced by any digest");
  const dp = resolved.delegate_payload;
  const items = Array.isArray(dp) ? dp.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)) : [];
  return { payload: resolved, header, items };
}

function checkTimes(p: Record<string, unknown>, i: number, now: number, skew: number) {
  if (p.exp !== undefined) {
    if (typeof p.exp !== "number") throw new Error(`Token ${i} has an invalid exp`);
    if (now > p.exp + skew) throw new Error(`Token ${i} expired at ${p.exp}`);
  }
  if (p.iat !== undefined) {
    if (typeof p.iat !== "number") throw new Error(`Token ${i} has an invalid iat`);
    if (p.iat > now + skew) throw new Error(`Token ${i} iat is in the future`);
  }
}

export interface VerifyOptions {
  aud?: string;
  nonce?: string;
  now?: number;
  skewSeconds?: number;
}

/**
 * Verify a "~~"-joined chain. The root is checked with `rootKey(header)`;
 * each later hop with the previous hop's cnf.jwk. Returns one payload per
 * mandate, root first (the effective delegate items).
 */
export function verifyChain(chain: string, rootKey: (header: Record<string, unknown>) => PublicJwk, o: VerifyOptions = {}): Record<string, unknown>[] {
  const tokens = parseChain(chain);
  const now = o.now ?? Math.floor(Date.now() / 1000);
  const skew = o.skewSeconds ?? 300;
  const out: Record<string, unknown>[] = [];

  const rootHeader = decodeJws(tokens[0]!.issuerJwt).header;
  let current = verifyToken(tokens[0]!, rootKey(rootHeader));
  if (tokens.length > 1 && current.items.length !== 1) throw new Error("Token 0: expected exactly one delegated mandate");
  checkTimes(current.payload, 0, now, skew);
  current.items.forEach((it) => checkTimes(it, 0, now, skew));
  out.push(...current.items);

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]!;
    const last = i === tokens.length - 1;
    const typ = decodeJws(t.issuerJwt).header.typ;
    if (typeof typ !== "string" || ![...TYP_TERMINAL, ...TYP_INTERMEDIATE].includes(typ)) throw new Error(`Token ${i}: unexpected typ ${String(typ)}`);
    const cnf = current.items.find((it) => it.cnf && typeof it.cnf === "object")?.cnf as { jwk?: Record<string, unknown> } | undefined;
    if (!cnf?.jwk) throw new Error(`Token ${i - 1} delegates to no key (missing cnf.jwk)`);
    const next = verifyToken(t, importPublicJwk(cnf.jwk));
    const p = next.payload;
    const hasSd = "sd_hash" in p;
    const hasIss = "issuer_jwt_hash" in p;
    if (hasSd === hasIss) throw new Error(`Token ${i}: needs exactly one of sd_hash or issuer_jwt_hash`);
    if (hasSd && p.sd_hash !== sha256b64url(tokens[i - 1]!.sdJwt)) throw new Error(`Token ${i}: sd_hash mismatch`);
    if (hasIss && p.issuer_jwt_hash !== sha256b64url(tokens[i - 1]!.issuerJwt)) throw new Error(`Token ${i}: issuer_jwt_hash mismatch`);
    const terminal = TYP_TERMINAL.includes(typ);
    if (terminal) {
      if (typeof p.iat !== "number") throw new Error(`Token ${i}: missing iat`);
      if (last && o.aud !== undefined && p.aud !== o.aud) throw new Error(`Token ${i}: aud mismatch`);
      if (last && o.nonce !== undefined && p.nonce !== o.nonce) throw new Error(`Token ${i}: nonce mismatch`);
    }
    const carriesCnf = next.items.some((it) => it.cnf && typeof it.cnf === "object");
    if (terminal && carriesCnf) throw new Error(`Token ${i}: a terminal hop must not carry cnf`);
    if (!terminal && !carriesCnf) throw new Error(`Token ${i}: an intermediate hop requires cnf`);
    if (!last && next.items.length !== 1) throw new Error(`Token ${i}: expected exactly one delegated mandate`);
    checkTimes(p, i, now, skew);
    next.items.forEach((it) => checkTimes(it, i, now, skew));
    out.push(...next.items);
    current = next;
  }
  return out;
}

/** Decode a chain's mandates without verifying anything (for display only). */
export function peekChain(chain: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const t of parseChain(chain)) {
    const byDigest = new Map(t.disclosures.map((d) => [sha256b64url(d), b64urlJson(d) as unknown[]]));
    const resolved = resolve(decodeJws(t.issuerJwt).payload, byDigest, new Set()) as Record<string, unknown>;
    const dp = resolved.delegate_payload;
    if (Array.isArray(dp)) out.push(...(dp.filter((x) => x && typeof x === "object") as Record<string, unknown>[]));
  }
  return out;
}
