#!/usr/bin/env node
// Turn a visual fragment into a complete HTML page.
//
//   node assemble.mjs .visuals/<slug>.visual.html            writes .visuals/<slug>.html  (standalone: one file, works offline)
//   node assemble.mjs <fragment> --theme dark                pin the mode (default: follow the viewer's system setting)
//   node assemble.mjs <fragment> --out path/file.html        choose the output path
//   node assemble.mjs <fragment> --linked                    dev preview: small file that links the skill's assets (writes .visuals/.build/)
//   node assemble.mjs <fragment> --force                     assemble even if the lint reports errors
//
// The standalone file is what a user downloads and shares. It contains the stylesheet, the fonts it needs (as data URIs),
// only the libraries the manifest declares, and a Content-Security-Policy that forbids every network request.
// Importable: `import { assemble } from "./assemble.mjs"` gives { html, bytes, libs, title } for a host that builds on the fly.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, basename, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { LIB_ORDER, LIB_FILE, parseManifest, titleOf, buildStandalone } from "./assemble-core.mjs";
export { parseManifest, titleOf };

const here = dirname(fileURLToPath(import.meta.url));
const defaultAssets = join(here, "..", "assets");

const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fsIo = (dir) => ({ text: (p) => readFileSync(join(dir, p), "utf8"), bytes: (p) => new Uint8Array(readFileSync(join(dir, p))) });

export function assemble(fragment, opts = {}) {
  return buildStandalone(fragment, fsIo(opts.assetsDir || defaultAssets), opts);
}

// Dev preview: links the skill's assets by relative path (small, fast, not shareable).
export function assembleLinked(fragment, outPath, opts = {}) {
  const assetsDir = opts.assetsDir || defaultAssets;
  const frag = fragment.replace(/^﻿/, "");
  const { libs } = parseManifest(frag);
  const rel = relative(dirname(outPath), assetsDir).split(sep).map(encodeURIComponent).join("/");
  const A = (p) => `${rel}/${p}`;
  const head = [`<link rel="stylesheet" href="${A("visuals.css")}">`];
  if (libs.includes("katex")) head.push(`<link rel="stylesheet" href="${A("vendor/katex.min.css")}">`);
  const scripts = [...libs.map((l) => "vendor/" + LIB_FILE[l]), "visuals-theme.js"];
  const theme = opts.theme === "light" || opts.theme === "dark" ? opts.theme : null;
  return `<!doctype html>\n<html lang="en"${theme ? ` data-theme="${theme}"` : ""}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escHtml(titleOf(frag))}</title>\n${head.join("\n")}\n${scripts.map((s) => `<script src="${A(s)}"></script>`).join("\n")}\n<script>Visuals.auto();</script>\n</head>\n<body>\n<main>\n${frag}\n</main>\n</body>\n</html>\n`;
}

function cli(args) {
  const opt = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
  const input = args.find((a, i) => !a.startsWith("--") && !["--theme", "--out"].includes(args[i - 1]));
  if (!input || !existsSync(input)) { console.error("usage: node assemble.mjs <fragment.html> [--theme light|dark] [--out file.html] [--linked] [--force]"); process.exit(2); }
  if (!args.includes("--force")) {
    const r = spawnSync(process.execPath, [join(here, "lint.mjs"), input], { encoding: "utf8" });
    if (r.status !== 0) { process.stdout.write(r.stdout || ""); console.error("Not assembled: fix the lint errors first (or pass --force)."); process.exit(1); }
  }
  const frag = readFileSync(input, "utf8");
  const name = basename(input).replace(/\.visual\.html$|\.html$/i, "");
  const linked = args.includes("--linked");
  const out = resolve(opt("out") || (linked ? join(dirname(resolve(input)), ".build", name + ".html") : join(dirname(resolve(input)), name + ".html")));
  if (out === resolve(input)) { console.error("Refusing to overwrite the fragment. Choose another --out."); process.exit(2); }
  mkdirSync(dirname(out), { recursive: true });
  if (linked) {
    writeFileSync(out, assembleLinked(frag, out, { theme: opt("theme") }));
    console.log("Linked preview (not shareable): " + out);
  } else {
    const r = assemble(frag, { theme: opt("theme"), title: name });
    writeFileSync(out, r.html);
    console.log(`Standalone: ${out} (${(r.bytes / 1048576).toFixed(2)} MB, libs: ${r.libs.join(" ") || "none"})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) cli(process.argv.slice(2));
