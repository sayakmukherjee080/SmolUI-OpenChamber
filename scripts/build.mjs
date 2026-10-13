// Builds the installable package from the reference kit:
//   1. syncs v1-reference-kit/skill/visuals into skill/visuals (committed)
//   2. generates skill/visuals/assets/fonts.gen.json (base64 fonts payload)
//   3. bundles src/main.ts into panel/main.js (IIFE, committed)
//   4. copies the licenses into the package
// The service (service/main.cjs) is hand-written and needs no build step.

import { cp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const KIT_SKILL = path.join(ROOT, "v1-reference-kit", "skill", "visuals");
const SKILL = path.join(ROOT, "skill", "visuals");
const ASSETS = path.join(SKILL, "assets");

async function syncSkill() {
  await rm(SKILL, { recursive: true, force: true });
  await cp(KIT_SKILL, SKILL, { recursive: true });
}

/** The panel cannot fetch .woff2 from the host; fonts ship as one JSON payload. */
async function buildFontsPayload() {
  const fonts = {};
  for (const directory of ["fonts", "vendor/fonts"]) {
    const absolute = path.join(ASSETS, directory);
    for (const name of (await readdir(absolute)).sort()) {
      if (!name.endsWith(".woff2")) continue;
      const bytes = await readFile(path.join(absolute, name));
      fonts[`${directory}/${name}`] = bytes.toString("base64");
    }
  }
  await writeFile(path.join(ASSETS, "fonts.gen.json"), `${JSON.stringify(fonts)}\n`);
  return Object.keys(fonts).length;
}

/** Bundles the panel sources into the single IIFE the host loads. */
async function buildPanel() {
  await build({
    entryPoints: [path.join(ROOT, "src", "main.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    outfile: path.join(ROOT, "panel", "main.js"),
    logLevel: "warning",
  });
}

/** Bundles the OpenCode plugin (the `visuals` tool); the plugin SDK stays external. */
async function buildPlugin() {
  await build({
    entryPoints: [path.join(ROOT, "plugin", "visuals.ts")],
    bundle: true,
    external: ["@opencode/plugin"],
    format: "esm",
    platform: "node",
    target: "es2022",
    outfile: path.join(ROOT, "plugin", "visuals.js"),
    logLevel: "warning",
  });
}

/** Copies the kit's license texts into the package. */
async function copyLicenses() {
  const target = path.join(ROOT, "licenses");
  await rm(target, { recursive: true, force: true });
  await cp(path.join(ROOT, "v1-reference-kit", "licenses"), target, { recursive: true });
}

await syncSkill();
const fontCount = await buildFontsPayload();
await buildPanel();
await buildPlugin();
await copyLicenses();
console.log(`smolui: skill synced, ${fontCount} fonts embedded as payload, panel/main.js and plugin/visuals.js built, licenses copied`);
