import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");

function files(dir: string): string[] {
  const abs = path.join(root, dir);
  try {
    statSync(abs);
  } catch {
    return [];
  }
  return readdirSync(abs, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => path.join(dir, f));
}

const importsOf = (file: string) =>
  [...readFileSync(path.join(root, file), "utf8").matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]!);

describe("architecture: the agent cannot reach money", () => {
  it("agent code never imports PayPal, the executor, permits or signing keys", () => {
    const forbidden = [/paypal/i, /executor/, /gate\/permits/, /gate\/keys/, /agent-toolkit/];
    const offenders = files("lib/agent").flatMap((f) =>
      importsOf(f)
        .filter((i) => forbidden.some((re) => re.test(i)))
        .map((i) => `${f} -> ${i}`),
    );
    expect(offenders).toEqual([]);
  });

  it("only the executor and server wiring import a payment provider", () => {
    const allowed = new Set(["lib/core/executor.ts", "lib/server/container.ts"]);
    const offenders = [...files("lib"), ...files("app")]
      .filter((f) => !f.startsWith(`lib${path.sep}paypal`))
      .filter((f) => importsOf(f).some((i) => /paypal\/(toolkit-provider|fake-provider|provider)/.test(i) || /agent-toolkit/.test(i)))
      .filter((f) => !allowed.has(f.split(path.sep).join("/")));
    expect(offenders).toEqual([]);
  });

  it("API routes never call the executor's pay() directly", () => {
    const offenders = files("app").filter((f) => /\.pay\(/.test(readFileSync(path.join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
