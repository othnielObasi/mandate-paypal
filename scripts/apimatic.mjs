#!/usr/bin/env node
// APIMatic: validate the OpenAPI spec and generate SDKs from it.
//
//   npm run api:validate                 # lint public/openapi.yaml with APIMatic
//   npm run sdk:generate                 # regenerate sdks/typescript
//   npm run sdk:generate -- python csharp
//
// Needs an APIMatic API key in APIMATIC_API_KEY (APImatic_API_KEY also works), e.g. from .env.render.
// The key is passed to the CLI per command and never written to disk or printed.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = "@apimatic/cli@2.2.0";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = join(root, "public", "openapi.yaml");
const LANGS = ["typescript", "python", "csharp", "java", "php", "ruby", "go"];

function apiKey() {
  const fromEnv = process.env.APIMATIC_API_KEY ?? process.env.APImatic_API_KEY;
  if (fromEnv) return fromEnv.trim();
  // Fall back to the local env files the project already uses (gitignored).
  for (const f of [".env.local", ".env.render", ".env"]) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(/^APIMATIC_API_KEY=(.+)$/im);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  console.error("Set APIMATIC_API_KEY (an APIMatic API key: app.apimatic.io > Account > API Keys).");
  process.exit(1);
}

function cli(args, key) {
  const r = spawnSync("npx", ["--yes", CLI, ...args, "-k", key], { cwd: root, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32", encoding: "utf8" });
  // The CLI draws spinners; keep the readable lines and never echo the key.
  const clean = `${r.stdout}${r.stderr}`
    .replaceAll(key, "[key]")
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .split("\n")
    .filter((l) => l.trim() && !/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(l))
    .join("\n");
  console.log(clean);
  return r.status ?? 1;
}

const [cmd = "validate", ...rest] = process.argv.slice(2);
const key = apiKey();

// The CLI reads specs from <input>/src/spec, so stage the one spec in a temp input folder,
// with the portal's config and guide pages from apimatic/src.
const input = mkdtempSync(join(tmpdir(), "mandate-apimatic-"));
mkdirSync(join(input, "src", "spec"), { recursive: true });
cpSync(join(root, "apimatic", "src"), join(input, "src"), { recursive: true });
cpSync(spec, join(input, "src", "spec", "openapi.yaml"));

let status = 0;
try {
  if (cmd === "validate") {
    status = cli(["api", "validate", "-i", input], key);
  } else if (cmd === "sdk") {
    const langs = rest.length ? rest : ["typescript"];
    for (const lang of langs) {
      if (!LANGS.includes(lang)) throw new Error(`Unknown language "${lang}". One of: ${LANGS.join(", ")}`);
      const dest = join(root, "sdks", lang);
      console.log(`\n== ${lang} -> sdks/${lang}`);
      status ||= cli(["sdk", "generate", "-i", input, "-l", lang, "-d", dest, "-f"], key);
      // The TypeScript SDK's own runtime dependency (zod 4) lives beside it, as in a published package.
      if (lang === "typescript" && !status) {
        spawnSync("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: dest, stdio: "inherit", shell: process.platform === "win32" });
      }
    }
  } else if (cmd === "portal") {
    // The API documentation portal, served by the app at /docs.
    const dest = join(root, "public", "docs");
    rmSync(dest, { recursive: true, force: true });
    status = cli(["portal", "generate", "-i", input, "-d", dest, "-f"], key);
  } else if (cmd === "plugin") {
    // The context plugin that teaches AI coding assistants to use Mandate's SDKs.
    status = cli(["plugin", "generate", "-i", input, "-d", join(root, "apimatic", "plugin"), "-f"], key);
  } else {
    throw new Error(`Unknown command "${cmd}". Use "validate", "sdk", "portal" or "plugin".`);
  }
} finally {
  rmSync(input, { recursive: true, force: true });
}
process.exit(status);
