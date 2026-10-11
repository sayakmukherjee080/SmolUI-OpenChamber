// Environment-neutral assembler core: no fs, no path, no process. Runs in Node and in a browser bundle.
// Everything it needs from disk arrives through `io`:
//   io.text(path)  -> string       (paths are relative to the assets folder: "visuals.css", "vendor/chart.umd.js", ...)
//   io.bytes(path) -> Uint8Array   (fonts)
// The same fragment and the same assets produce the same bytes in both environments.

export const LIB_ORDER = ["d3", "chart", "three", "katex", "mermaid"];
export const LIB_FILE = { d3: "d3.min.js", chart: "chart.umd.js", three: "three.iife.js", katex: "katex.min.js", mermaid: "mermaid.min.js" };
export const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toBase64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const dataUri = (bytes, mime) => `data:${mime};base64,${toBase64(bytes)}`;
const byteLength = (s) => new TextEncoder().encode(s).length;
const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "");

export function parseManifest(frag) {
  const m = frag.replace(/^﻿/, "").match(/^\s*<!--\s*visuals:\s*([\d.]+)\s+libs:\s*([^>]*?)\s*-->/i);
  const libs = m && m[2].toLowerCase() !== "none" ? m[2].toLowerCase().split(/[\s,]+/).filter((l) => LIB_FILE[l]) : [];
  return { version: m ? m[1] : null, libs: LIB_ORDER.filter((l) => libs.includes(l)) };
}

export function titleOf(frag, fallback = "Visual") {
  return (frag.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || fallback).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Characters outside the shared Indic punctuation decide which per-script font files travel with the page.
const SHARED = new Set([0x951, 0x952, 0x964, 0x965, 0x200c, 0x200d, 0x20b9, 0x25cc]);
function codePointsOf(text) { const s = new Set(); for (const ch of text) { const c = ch.codePointAt(0); if (c >= 0x900 && !SHARED.has(c)) s.add(c); } return s; }
function rangeHits(range, points) {
  for (const part of range.split(",")) {
    const m = part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/); if (!m) continue;
    const lo = parseInt(m[1], 16), hi = m[2] ? parseInt(m[2], 16) : lo;
    for (const p of points) if (p >= lo && p <= hi) return true;
  }
  return false;
}

function inlineCss(io, fragment) {
  const points = codePointsOf(fragment);
  return io.text("visuals.css").replace(/@font-face\{[^}]*\}/g, (block) => {
    const url = block.match(/url\(([^)]+)\)/)?.[1].replace(/["']/g, "");
    if (!url) return block;
    const range = block.match(/unicode-range:([^;}]+)/)?.[1];
    if (range && /font-family:"Indic"/.test(block) && !rangeHits(range, points)) return ""; // script not used on this page
    return block.replace(/url\(([^)]+)\)/, `url(${dataUri(io.bytes(url), "font/woff2")})`);
  });
}

function inlineKatexCss(io) {
  const dir = dirOf("vendor/katex.min.css");
  return io.text("vendor/katex.min.css").replace(/url\(([^)]+)\)/g, (m, u) => `url(${dataUri(io.bytes(dir + u.replace(/["']/g, "")), "font/woff2")})`);
}

// A library inlined into <script> must not contain a literal end tag.
function safeScript(src) {
  let s = src.replace(/<\/script/gi, "<\\/script");
  if (/<script/i.test(s)) s = s.replace(/<!--/g, "<\\!--");
  return s;
}

// opts: { theme: "light"|"dark"|undefined, title, lang }
export function buildStandalone(fragment, io, opts = {}) {
  const theme = opts.theme === "light" || opts.theme === "dark" ? opts.theme : null;
  const frag = fragment.replace(/^﻿/, "");
  const { libs, version } = parseManifest(frag);
  const title = titleOf(frag, opts.title);
  const gen = JSON.parse(io.text("VERSIONS.json")).visuals;
  const parts = [];
  parts.push(`<!doctype html>\n<html lang="${escHtml(opts.lang || "en")}"${theme ? ` data-theme="${theme}"` : ""}>\n<head>\n<meta charset="utf-8">`);
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  parts.push(`<meta name="color-scheme" content="${theme || "light dark"}">`);
  parts.push(`<meta name="generator" content="visuals ${gen}${version ? ` (fragment ${escHtml(version)})` : ""}">`);
  parts.push(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
  parts.push(`<title>${escHtml(title)}</title>`);
  parts.push(`<style>\n${inlineCss(io, frag)}\n</style>`);
  if (libs.includes("katex")) parts.push(`<style>\n${inlineKatexCss(io)}\n</style>`);
  for (const l of libs) parts.push(`<script>\n${safeScript(io.text("vendor/" + LIB_FILE[l]))}\n</script>`);
  parts.push(`<script>\n${safeScript(io.text("visuals-theme.js"))}\n</script>`);
  parts.push(`<script>Visuals.auto();</script>\n</head>\n<body>\n<main>\n${frag}\n</main>\n</body>\n</html>\n`);
  const html = parts.join("\n");
  return { html, bytes: byteLength(html), libs, title };
}

// The files the core may ask `io` for, given a fragment: lets a bundler embed only what a page needs, or everything.
export function assetsFor(fragment) {
  const { libs } = parseManifest(fragment);
  const text = ["visuals.css", "visuals-theme.js", "VERSIONS.json", ...libs.map((l) => "vendor/" + LIB_FILE[l])];
  if (libs.includes("katex")) text.push("vendor/katex.min.css");
  return { text, bytesPattern: "fonts/*.woff2, vendor/fonts/*.woff2" };
}
