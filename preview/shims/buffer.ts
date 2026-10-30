/**
 * The npm "buffer" package with Node's "base64url" encoding added, which the
 * shared code uses for tokens, JWS and JWK. Imported by path so the
 * bundler alias for "buffer" (which points here) does not loop.
 */
import { Buffer as Base } from "../../node_modules/buffer/index.js";

const toStd = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return t + "=".repeat((4 - (t.length % 4)) % 4);
};
const toUrl = (s: string) => s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const B = Base as unknown as {
  from: (...a: unknown[]) => unknown;
  isEncoding: (e: string) => boolean;
  byteLength: (s: unknown, e?: string) => number;
  prototype: { toString: (enc?: string, start?: number, end?: number) => string; write: (...a: unknown[]) => number };
};

const from = B.from;
B.from = function (value: unknown, enc?: unknown, len?: unknown) {
  if (typeof value === "string" && enc === "base64url") return from.call(Base, toStd(value), "base64");
  return from.call(Base, value, enc, len);
};
const isEncoding = B.isEncoding;
B.isEncoding = (e: string) => e === "base64url" || isEncoding(e);
const byteLength = B.byteLength;
B.byteLength = (s: unknown, e?: string) => (e === "base64url" && typeof s === "string" ? byteLength(toStd(s), "base64") : byteLength(s, e));
const toString = B.prototype.toString;
B.prototype.toString = function (this: unknown, enc?: string, start?: number, end?: number) {
  return enc === "base64url" ? toUrl(toString.call(this, "base64", start, end)) : toString.call(this, enc, start, end);
};

/** Typed as Node's Buffer: the shared code is written against Node's API, which this matches. */
export const Buffer = Base as unknown as typeof globalThis.Buffer;
export default { Buffer: Base };
