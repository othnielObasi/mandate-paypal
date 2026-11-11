// Renders the demo video: timeline from the narration, every frame drawn by stage.html in Chromium,
// narration mixed at YouTube loudness, encoded to 1080p H.264 + AAC.
//
//   node video/render.mjs            full render -> video/out/mandate-demo.mp4
//   node video/render.mjs --sample   a few stills per scene -> video/out/sample/*.jpg (fast review)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const here = dirname(fileURLToPath(import.meta.url));
const FF = execFileSync("python", ["-c", "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"]).toString().trim();
const spec = JSON.parse(readFileSync(join(here, "script.json"), "utf8"));
const FPS = spec.fps;
const SAMPLE = process.argv.includes("--sample");
const AUDIO_ONLY = process.argv.includes("--audio-only");
const OUT_NAME = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "mandate-demo.mp4";

const TAIL = { still: 0.55, brand: 1.3, footage: 0.6, rules: 1.4, stack: 1.4, alerts: 1.8, stakes: 1.6, montage: 0.9, end: 3.2 };
const kettle = existsSync(join(here, "footage", "kettle.json")) ? JSON.parse(readFileSync(join(here, "footage", "kettle.json"), "utf8")).order : null;

// ---- timeline ----
let cursor = 0;
const scenes = spec.scenes.map((s, i) => {
  const a = JSON.parse(readFileSync(join(here, "audio", `${s.id}.json`), "utf8"));
  const lead = i === 0 ? 0.25 : 0.3;
  let dur = lead + a.duration + (s.tail ?? TAIL[s.kind]);
  // The voice service returns bare words; take each word with its punctuation from the script.
  const tokens = s.say.split(/\s+/);
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9$]/g, "");
  let ti = 0;
  const words = a.words.map(([b, e, w]) => {
    let text = w;
    for (let j = ti; j < Math.min(tokens.length, ti + 3); j++) {
      if (norm(tokens[j]) === norm(w) || norm(tokens[j]).startsWith(norm(w))) { text = tokens[j]; ti = j + 1; break; }
    }
    return [+(b + lead).toFixed(3), +(e + lead).toFixed(3), text];
  });
  const sc = { ...s, lead, start: 0, words };
  if (s.kind === "footage") {
    const idx = JSON.parse(readFileSync(join(here, "footage", s.clip, "index.json"), "utf8"));
    const frames = Array.isArray(idx) ? idx : idx.frames;
    const marks = Array.isArray(idx) ? {} : idx.marks;
    // Optional delay: hold the first frame so the action lands on the right words.
    const skip = -(s.delay ?? 0);
    const D = frames.at(-1).t + 0.6 - skip;
    let rate = Math.min(s.maxRate ?? 1.4, Math.max(s.minRate ?? 1, D / (dur - 0.2)));
    if (D / rate > dur) dur = D / rate + 0.2;
    sc.footage = { frames, rate, skip };
    sc.calloutAt = s.calloutAt ?? 1.0;
    // Zoom into marked elements once the footage reaches them.
    sc.zoomBoxes = [];
    for (const z of s.zooms ?? (s.zoom ? [s.zoom] : [])) {
      const m = marks[z.mark];
      if (!m) { console.warn(`  ! ${s.id}: no mark "${z.mark}" in ${s.clip}`); continue; }
      const at = (m.t - skip) / rate + 0.2;
      // Give the zoom room to play out: stretch the scene if the mark comes late in the clip.
      if (at + 0.75 + z.hold + 0.9 > dur) dur = at + 0.75 + z.hold + 0.9;
      sc.zoomBoxes.push({ ...m, at, z: z.z, hold: z.hold, ring: !!z.ring });
    }
  }
  const wordAt = (re, end = false) => { const w = sc.words.find((x) => re.test(x[2])); return w ? w[end ? 1 : 0] : null; };
  if (s.title) sc.titleAt = (sc.words.filter((x) => /^Mandate/.test(x[2])).at(-1)?.[0] ?? dur - 2) - 0.1;
  if (s.kind === "alerts") {
    sc.order = kettle;
    sc.tapAt = (wordAt(/^tap/, true) ?? 3) + 0.1;
    sc.paidAt = sc.tapAt + 1.1;
    sc.mailAt = (wordAt(/^email/) ?? sc.paidAt + 1) - 0.5;
  }
  if (s.kind === "montage") {
    // Quick cuts between clips, each landing on the word that names it.
    sc.shots = s.shots.map((sh, k) => {
      const idx = JSON.parse(readFileSync(join(here, "footage", sh.clip, "index.json"), "utf8"));
      const at = k === 0 ? 0 : (wordAt(new RegExp(`^${sh.word}`, "i")) ?? lead + k * 2) - 0.2;
      const m = sh.mark ? idx.marks[sh.mark] : null;
      return { ...sh, at, frames: idx.frames, box: m };
    });
  }
  if (s.kind === "stakes") {
    sc.cardAt = s.cards.map((c, k) => (wordAt(new RegExp(`^${c.word}`, "i")) ?? lead + 1 + k * 2) - 0.15);
    sc.titleAt = (sc.words.filter((x) => /^Mandate/.test(x[2])).at(-1)?.[0] ?? dur - 2) - 0.2;
  }
  if (s.kind === "end") {
    sc.ppAt = [/^PayPal/, /^Toolkit/, /^Vault/, /^Orders/, /^webhooks/, /^MCP/].map((re) => wordAt(re) ?? lead);
    if (!wordAt(/^MCP/)) sc.ppAt[5] = sc.ppAt[4] + 0.6;
    sc.ctaAt = (wordAt(/^live/i) ?? dur - 2.5) - 0.2;
    sc.tagAt = (sc.words.filter((x) => /^Mandate/.test(x[2])).at(-1)?.[0] ?? dur - 3) - 0.15;
  }
  if (s.headline) {
    const find = (re) => sc.words.find((w) => re.test(w[2]))?.[0] ?? lead;
    const hw = s.headWords ?? ["misread", "steer", "money"];
    sc.headAt = hw.map((h) => find(new RegExp(`^${h}`, "i")));
  }
  if (s.kind === "rules") {
    const from = lead + 1.2, to = dur - 3.4;
    sc.ruleAt = Array.from({ length: 7 }, (_, k) => from + ((to - from) * k) / 6);
    sc.outcomeAt = dur - 2.6;
  }
  if (s.kind === "stack") {
    const from = lead + 0.5, to = Math.max(from + 1, dur - 1.6);
    sc.cardAt = [lead, ...Array.from({ length: 9 }, (_, k) => from + ((to - from) * k) / 8)];
  }
  sc.fade = ["still", "brand", "rules", "stack", "alerts", "stakes", "end"].includes(s.kind) && (i === 0 || spec.scenes[i - 1].kind !== s.kind);
  sc.fadeOut = i === spec.scenes.length - 1;
  sc.dur = +dur.toFixed(3);
  sc.start = +cursor.toFixed(3);
  cursor += dur;
  return sc;
});
const total = cursor;
const nFrames = Math.ceil(total * FPS);
console.log(`timeline: ${scenes.length} scenes, ${total.toFixed(1)}s, ${nFrames} frames`);
if (total > 178) console.warn(`  ! ${total.toFixed(1)}s is too close to YouTube's 3-minute limit for this submission`);
for (const s of scenes) console.log(`  ${s.id} ${s.kind.padEnd(8)} ${s.start.toFixed(1).padStart(6)}s  +${s.dur.toFixed(1)}s${s.footage ? `  (footage x${s.footage.rate.toFixed(2)})` : ""}`);

// ---- frames ----
const out = join(here, "out");
const frameDir = join(here, "frames");
mkdirSync(out, { recursive: true });
const RESUME = process.argv.includes("--resume");
// A fresh browser every few hundred frames keeps memory flat on small machines.
async function openStage() {
  const browser = await chromium.launch();
  const pg = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  await pg.goto(pathToFileURL(join(here, "stage.html")).href);
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate((tl) => window.setup(tl), { fps: FPS, scenes });
  return { browser, pg };
}
let { browser: b, pg: page } = await openStage();

if (SAMPLE) {
  const dir = join(out, "sample");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const s of scenes) {
    const ks = [0.25, 0.6, 0.95].map((k) => [k, s.start + s.dur * k]);
    (s.zoomBoxes ?? []).forEach((zb, j) => ks.push([`zoom${j}`, s.start + zb.at + 0.75 + zb.hold / 2]));
    if (s.kind === "montage") s.shots.forEach((sh, j) => ks.push([`shot${j}`, s.start + sh.at + 0.9]));
    if (s.kind === "stakes") ks.push(["cards", s.start + s.titleAt - 0.3], ["title", s.start + s.dur - 0.3]);
    if (s.kind === "alerts") ks.push(["tap", s.start + s.tapAt + 0.6], ["mail", s.start + s.mailAt + 1]);
    for (const [k, at] of ks) {
      const f = Math.floor(at * FPS);
      await page.evaluate((fr) => window.render(fr), f);
      await page.screenshot({ path: join(dir, `${s.id}-${typeof k === "number" ? Math.round(k * 100) : k}.jpg`), type: "jpeg", quality: 80 });
    }
  }
  await b.close();
  console.log("samples in video/out/sample");
  process.exit(0);
}

if (!AUDIO_ONLY && !RESUME) rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
const t0 = Date.now();
const CHUNK = 500;
for (let f = 0; f < (AUDIO_ONLY ? 0 : nFrames); f++) {
  const file = join(frameDir, `${String(f).padStart(5, "0")}.jpg`);
  if (RESUME && existsSync(file)) continue;
  if (f > 0 && f % CHUNK === 0) {
    await b.close().catch(() => {});
    ({ browser: b, pg: page } = await openStage());
  }
  // Chromium occasionally fails a capture or crashes; reopen and redraw the frame.
  for (let tryNo = 1; ; tryNo++) {
    try {
      await page.evaluate((fr) => window.render(fr), f);
      await page.screenshot({ path: file, type: "jpeg", quality: 92 });
      break;
    } catch (e) {
      if (tryNo >= 4) throw e;
      await b.close().catch(() => {});
      await new Promise((r) => setTimeout(r, 1000 * tryNo));
      ({ browser: b, pg: page } = await openStage());
    }
  }
  if (f % 250 === 0) console.log(`  frame ${f}/${nFrames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await b.close().catch(() => {});

// ---- audio: each scene's narration at its start + lead, normalised for YouTube ----
const inputs = [];
const filters = [];
scenes.forEach((s, i) => {
  inputs.push("-i", join(here, "audio", `${s.id}.mp3`));
  const ms = Math.round((s.start + s.lead) * 1000);
  filters.push(`[${i}:a]aresample=48000,adelay=${ms}|${ms}[a${i}]`);
});
filters.push(`${scenes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${scenes.length}:normalize=0,apad,atrim=0:${total.toFixed(3)}[voice]`);
if (spec.music && existsSync(join(here, spec.music))) {
  // Music bed: fades in and out, and dips under the voice (sidechain).
  const m = scenes.length;
  inputs.push("-i", join(here, spec.music));
  filters.push(`[voice]asplit=2[v1][v2]`);
  filters.push(`[${m}:a]aresample=48000,volume=0.11,afade=t=in:d=2,afade=t=out:st=${(total - 4).toFixed(2)}:d=4,apad,atrim=0:${total.toFixed(3)}[mus]`);
  filters.push(`[mus][v2]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=600:makeup=1[duck]`);
  filters.push(`[v1][duck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`);
} else {
  filters.push(`[voice]loudnorm=I=-16:TP=-1.5:LRA=11[aout]`);
}
const wav = join(out, "narration.wav");
execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "[aout]", "-ar", "48000", "-ac", "2", wav]);

// ---- encode ----
// Encode in segments, then join: a single pass over 4,000+ frames runs out of memory on small machines.
const mp4 = join(out, OUT_NAME);
const partsDir = join(out, "parts");
rmSync(partsDir, { recursive: true, force: true });
mkdirSync(partsDir, { recursive: true });
const SEG = 1100;
const list = [];
for (let s0 = 0, k = 0; s0 < nFrames; s0 += SEG, k++) {
  const part = join(partsDir, `p${k}.mp4`);
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS), "-start_number", String(s0), "-i", join(frameDir, "%05d.jpg"), "-frames:v", String(Math.min(SEG, nFrames - s0)), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-threads", "2", "-x264-params", "rc-lookahead=10", "-pix_fmt", "yuv420p", part]);
  list.push(`file '${part.replace(/\\/g, "/")}'`);
}
writeFileSync(join(partsDir, "list.txt"), list.join("\n"));
execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(partsDir, "list.txt"), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", mp4]);
console.log(`done: ${mp4} (${total.toFixed(1)}s)`);
