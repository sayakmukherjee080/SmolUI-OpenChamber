#!/usr/bin/env node
// Lint a visual fragment. Dependency-free (Node 18+).
// Usage: node lint.mjs <fragment.html> [more files] [--json]
// Exit code 1 if any ERROR. Warnings never fail the run, but read them.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");
const LIBS = ["chart", "d3", "three", "katex", "mermaid"];
const MAX_BYTES = 200 * 1024, WARN_BYTES = 120 * 1024;

// ---- known tokens (every custom property the stylesheet defines)
const knownTokens = new Set();
let assetVersion = "";
try {
  const css = readFileSync(join(assets, "visuals.css"), "utf8");
  for (const m of css.matchAll(/--([\w-]+)\s*:/g)) knownTokens.add(m[1]);
  assetVersion = JSON.parse(readFileSync(join(assets, "VERSIONS.json"), "utf8")).visuals || "";
} catch { /* tokens unavailable: skip the unknown-token check */ }

// ---- helpers
const blank = (s) => s.replace(/[^\n]/g, " ");
function lineOf(text, idx) { let n = 1; for (let i = 0; i < idx && i < text.length; i++) if (text.charCodeAt(i) === 10) n++; return n; }

/** Blank JS comments and the text inside string literals, keeping code and ${} expressions. */
function stripJs(src) {
  let out = "", i = 0; const n = src.length;
  function template() {
    out += "`"; i++;
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { out += "  "; i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        out += "${"; i += 2; let depth = 1;
        while (i < n && depth > 0) {
          const c = src[i];
          if (c === "{") depth++;
          else if (c === "}") { depth--; if (!depth) break; }
          else if (c === '"' || c === "'") { out += c; i++; while (i < n && src[i] !== c) { if (src[i] === "\\") { out += "  "; i += 2; continue; } out += src[i] === "\n" ? "\n" : " "; i++; } out += c; i++; continue; }
          else if (c === "`") { template(); continue; }
          out += c; i++;
        }
        out += "}"; i++; continue;
      }
      out += src[i] === "\n" ? "\n" : " "; i++;
    }
    out += "`"; i++;
  }
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2), end = e < 0 ? n : e + 2; out += blank(src.slice(i, end)); i = end; continue; }
    if (c === '"' || c === "'") { out += c; i++; while (i < n && src[i] !== c) { if (src[i] === "\\") { out += "  "; i += 2; continue; } out += src[i] === "\n" ? "\n" : " "; i++; } out += c; i++; continue; }
    if (c === "`") { template(); continue; }
    out += c; i++;
  }
  return out;
}

function lint(path) {
  const raw = readFileSync(path, "utf8");
  const issues = [];
  const add = (level, code, idx, msg) => issues.push({ level, code, line: idx == null ? 0 : lineOf(raw, idx), msg });
  const err = (c, i, m) => add("ERROR", c, i, m), warn = (c, i, m) => add("WARN", c, i, m);

  // ---- size
  const bytes = Buffer.byteLength(raw);
  if (bytes > MAX_BYTES) err("E08", null, `file is ${(bytes / 1024).toFixed(0)} KB, limit is 200 KB. Aggregate the data before embedding it.`);
  else if (bytes > WARN_BYTES) warn("W20", null, `file is ${(bytes / 1024).toFixed(0)} KB. Consider aggregating the data.`);

  // ---- manifest
  const man = raw.match(/^\s*<!--\s*visuals:\s*([\d.]+)\s+libs:\s*([^>]*?)\s*-->/i);
  let declared = [];
  if (!man) err("E01", 0, 'first line must be the manifest, e.g. <!-- visuals: 1.2 libs: chart katex --> (use "libs: none" if no library is needed)');
  else {
    declared = man[2].toLowerCase() === "none" || man[2] === "" ? [] : man[2].toLowerCase().split(/[\s,]+/).filter(Boolean);
    const bad = declared.filter((l) => !LIBS.includes(l));
    if (bad.length) err("E01", 0, `unknown lib "${bad.join(", ")}". Allowed: ${LIBS.join(", ")}`);
    if (assetVersion && man[1].split(".").slice(0, 2).join(".") !== assetVersion.split(".").slice(0, 2).join("."))
      warn("W01", 0, `manifest says visuals ${man[1]} but the installed stylesheet is ${assetVersion}`);
  }

  // ---- split the fragment into markup, scripts, styles, mermaid sources
  const scripts = [], styles = [], mermaids = [];
  let markup = raw;
  markup = markup.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body, off) => {
    scripts.push({ attrs, body, idx: off + m.indexOf(body), full: m, off });
    return blank(m.slice(0, m.indexOf(">") + 1)).replace(/ /g, " ") + blank(body) + blank("</script>");
  });
  markup = markup.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, body, off) => {
    styles.push({ body, idx: off + m.indexOf(body) });
    return blank(m);
  });
  markup = markup.replace(/(<pre\b[^>]*class\s*=\s*["'][^"']*\bmermaid\b[^"']*["'][^>]*>)([\s\S]*?)(<\/pre>)/gi, (m, open, body, close, off) => {
    mermaids.push({ body, idx: off + open.length, open });
    return open + blank(body) + close;
  });
  markup = markup.replace(/<!--[\s\S]*?-->/g, (m) => blank(m));
  const jsonBlocks = scripts.filter((s) => /type\s*=\s*["']application\/json["']/i.test(s.attrs));
  const codeBlocks = scripts.filter((s) => !/type\s*=\s*["']application\/json["']/i.test(s.attrs));

  // ---- document-level tags
  for (const m of markup.matchAll(/<(!doctype|html|head|body)\b/gi)) err("E02", m.index, `<${m[1]}> found. Write a fragment only; the shell supplies the document.`);
  for (const m of markup.matchAll(/<(link|iframe|object|embed|base|frame|frameset|applet)\b/gi)) err("E03", m.index, `<${m[1]}> is not allowed.`);
  for (const m of markup.matchAll(/<meta\b[^>]*http-equiv/gi)) err("E03", m.index, "<meta http-equiv> is not allowed.");

  // ---- scripts: src, type, json
  for (const s of scripts) {
    if (/\bsrc\s*=/i.test(s.attrs)) err("E03", s.off, "<script src> is not allowed. Declare the library in the manifest instead.");
    if (/type\s*=\s*["']module["']/i.test(s.attrs)) err("E03", s.off, 'type="module" scripts are not allowed. Use a classic <script>.');
  }
  for (const j of jsonBlocks) { try { JSON.parse(j.body); } catch (e) { err("E07", j.idx, "JSON data block is not valid JSON: " + e.message + (/"[^"\n]*<\/script/i.test(raw) ? " (A data string contains \"</script\". Write every < inside data as \\u003c.)" : "")); } }
  if (jsonBlocks.length > 1) warn("W21", jsonBlocks[1].off, "more than one JSON data block. Keep all data in one block.");

  // ---- attributes in markup
  const tagRe = /<([a-zA-Z][\w:-]*)\b([^>]*)>/g;
  const NAMES = "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen";
  const NAMED = new RegExp("^(" + NAMES.split(" ").join("|") + ")$", "i");
  const NAMED_IN = new RegExp("(?:^|[;\\s{])(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|stop-color|caret-color|accent-color|text-decoration-color|column-rule-color)\\s*:\\s*(?:[^;{}]*?\\s)?(" + NAMES.split(" ").join("|") + ")\\b(?!\\s*[-(])", "i");
  let svgCount = 0;
  for (const t of markup.matchAll(tagRe)) {
    const tag = t[1].toLowerCase(), attrs = t[2], base = t.index;
    const attrRe = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    for (const a of attrs.matchAll(attrRe)) {
      const name = a[1].toLowerCase(), val = a[2] ?? a[3] ?? "";
      if (["src", "poster", "action", "srcset", "data", "formaction"].includes(name) && /^\s*(https?:)?\/\//i.test(val)) err("E03", base, `external ${name}="${val.slice(0, 40)}". Visuals cannot load anything from the network.`);
      if ((name === "href" || name === "xlink:href") && /^\s*(https?:)?\/\//i.test(val)) {
        err("E03", base, `external ${name}="${val.slice(0, 40)}". No external URLs: write the address as plain text if the reader needs it.`);
      }
      if (/^\s*javascript:/i.test(val)) err("E05", base, "javascript: URLs are not allowed.");
      if (name === "style") {
        if (/url\(\s*["']?(https?:)?\/\//i.test(val)) err("E03", base, "external url() in style.");
        checkColors(val, base, "style");
        const props = [...val.matchAll(/(^|;)\s*([\w-]+)\s*:/g)].map((x) => x[2].toLowerCase());
        const LAYOUT = /^(--[\w-]+|width|height|min-width|max-width|min-height|max-height|flex|flex-[\w-]+|grid|grid-[\w-]+|gap|row-gap|column-gap|margin|margin-[\w-]+|padding|padding-[\w-]+|aspect-ratio|display|justify-[\w-]+|align-[\w-]+|place-[\w-]+|position|top|left|right|bottom|inset|overflow|overflow-[xy]|z-index|text-align|white-space|transform|order|object-fit)$/;
        const offenders = props.filter((p) => !LAYOUT.test(p));
        if (offenders.length) warn("W03", base, `inline style sets ${[...new Set(offenders)].join(", ")}. Inline styles are for sizing and layout; use components and tokens for the look.`);
        const w = val.match(/(?:^|;)\s*(?:width|min-width)\s*:\s*(\d{3,4})px/i); if (w && +w[1] > 520) warn("W04", base, `fixed width ${w[1]}px is wider than the ~500px panel.`);
      }
      if (["fill", "stroke", "color", "stop-color", "flood-color", "bgcolor"].includes(name)) {
        if (/^#|^(rgb|hsl|oklch|oklab|lab|lch|hwb)a?\(/i.test(val.trim())) err("E04", base, `raw color ${name}="${val}". Use a token class (.fill-1, .stroke-2, .svg-*) or var(--token).`);
        else if (NAMED.test(val.trim())) err("E04", base, `named color ${name}="${val}". Use a token class or var(--token).`);
      }
      for (const v of val.matchAll(/var\(\s*--([\w-]+)/g)) unknownToken(v[1], base);
    }
    if (tag === "svg") {
      svgCount++;
      if (!/aria-hidden\s*=\s*["']true["']/i.test(attrs) && !(/role\s*=\s*["']img["']/i.test(attrs) && /aria-label(ledby)?\s*=/i.test(attrs))) {
        const after = markup.slice(base, base + 1500);
        if (!/role\s*=\s*["']img["']/i.test(attrs) || !/<title\b/i.test(after)) warn("W05", base, '<svg> needs role="img" and an aria-label (or <title>), or aria-hidden="true" if decorative.');
      }
    }
    if (tag === "canvas" && !/aria-label\s*=/i.test(attrs)) warn("W05", base, '<canvas> needs role="img" and an aria-label describing the chart.');
  }

  // ---- style blocks
  for (const s of styles) {
    if (/@import|@font-face/i.test(s.body)) err("E03", s.idx, "@import and @font-face are not allowed. Fonts come from the stylesheet.");
    if (/url\(\s*["']?(https?:)?\/\//i.test(s.body)) err("E03", s.idx, "external url() in <style>.");
    if (/font-family\s*:/i.test(s.body)) err("E04", s.idx, "font-family is not allowed. Fonts come from the tokens.");
    checkColors(s.body, s.idx, "<style>");
    if (/@media/i.test(s.body)) warn("W06", s.idx, "media queries are not used. Size with the container, not the viewport.");
    if (/!important/i.test(s.body)) warn("W07", s.idx, "avoid !important.");
    for (const v of s.body.matchAll(/var\(\s*--([\w-]+)/g)) unknownToken(v[1], s.idx);
  }

  function checkColors(text, idx, where) {
    for (const m of text.matchAll(/(^|[:\s,(])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g)) err("E04", idx, `raw color #${m[2]} in ${where}. Use var(--token).`);
    for (const m of text.matchAll(/\b(rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(/gi)) err("E04", idx, `${m[1]}() color in ${where}. Use var(--token) (color-mix with tokens is fine).`);
    const nm = NAMED_IN.exec(text.replace(/var\([^)]*\)/g, "")); if (nm) err("E04", idx, `named color "${nm[1]}" in ${where}. Use a token class or var(--token).`);
    if (/(^|[;\s{])font(-family)?\s*:[^;{}]*[A-Za-z"']/i.test(text) && /font-family\s*:|(^|[;\s{])font\s*:/i.test(text)) err("E04", idx, `font-family in ${where}. Fonts come from the tokens.`);
  }
  function unknownToken(name, idx) {
    if (!knownTokens.size || knownTokens.has(name)) return;
    const local = new RegExp("--" + name.replace(/[-]/g, "\\-") + "\\s*:").test(raw);
    if (!local) warn("W08", idx, `var(--${name}) is not a defined token.`);
  }

  // ---- script code
  let allCode = "";
  for (const c of codeBlocks) {
    const stripped = stripJs(c.body);
    allCode += "\n" + stripped;
    const at = (i) => c.idx + i;
    const banned = [
      [/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|SharedWorker|ServiceWorker)\b/g, "network access is not available in a visual"],
      [/\bnew\s+Worker\b/g, "workers are not allowed"],
      [/\beval\s*\(/g, "eval is not allowed"], [/\bnew\s+Function\b/g, "new Function is not allowed"],
      [/\bdocument\.write(ln)?\b/g, "document.write is not allowed"],
      [/\b(localStorage|sessionStorage|indexedDB|document\.cookie|caches)\b/g, "browser storage is not available"],
      [/\b(window\.open|window\.top|window\.opener|top\.location|parent\.location|location\.(href|assign|replace)|location\s*=)/g, "navigation is not allowed"],
      [/\bpostMessage\b/g, "use Visuals.ask(text) to talk to the host"],
      [/\bimport\s*\(|^\s*import\s+[\w{*]/gm, "imports are not allowed. Libraries are already loaded as globals"],
      [/\bDOMParser\b|\bcreateContextualFragment\b|\.srcdoc\b/g, "HTML parsing APIs are not allowed"]
    ];
    for (const [re, why] of banned) for (const m of stripped.matchAll(re)) err("E05", at(m.index), `${m[0].trim()}: ${why}.`);
    // HTML injection: only clearing assignments are allowed
    for (const m of stripped.matchAll(/\.(innerHTML|outerHTML)\s*(\+?=)/g)) {
      const tail = c.body.slice(m.index, m.index + 60);
      if (!/\.(innerHTML|outerHTML)\s*=\s*(""|'')\s*;?/.test(tail)) err("E06", at(m.index), `${m[1]} assignment. Use textContent, createElement or d3 .text(); data may contain markup.`);
    }
    for (const m of stripped.matchAll(/\binsertAdjacentHTML\b/g)) err("E06", at(m.index), "insertAdjacentHTML. Use createElement and textContent.");
    for (const m of c.body.matchAll(/\.html\(\s*(?!["']{2}\s*\))/g)) if (!/^\s*\/\//.test(c.body.slice(Math.max(0, m.index - 3), m.index))) err("E06", at(m.index), "d3 .html(...) injects markup. Use .text() or build elements.");
    // raw colors in code strings
    for (const m of c.body.matchAll(/["'`]\s*#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\s*["'`]/g)) err("E04", at(m.index), `raw color ${m[0].trim()} in script. Use Visuals.series(i), Visuals.tokens().color.name, or CSS variables.`);
    for (const m of c.body.matchAll(/["'`][^"'`\n]*\b(rgba?|hsla?)\(/gi)) err("E04", at(m.index), `${m[1]}() color in script. Use tokens (Visuals.alpha(color, a) for transparency).`);
    for (const m of c.body.matchAll(new RegExp("(?:[cC]olor|fill|stroke|Style|background\\w*|border\\w*)\\s*[:=]\\s*[\"'`](" + NAMES.split(" ").join("|") + ")[\"'`]", "g"))) err("E04", at(m.index), `named color "${m[1]}" in script. Use Visuals.series(i), Visuals.tokens().color.name, or CSS variables.`);
    for (const m of stripped.matchAll(/\bfontFamily\b|\bfamily\s*:|\.font\s*=|\bfont-family\b/g)) err("E04", at(m.index), "font family in script. Fonts come from the tokens.");
    for (const m of c.body.matchAll(/(["'])https?:\/\/(?!www\.w3\.org\/)[^"']*\1/g)) err("E03", at(m.index), `external URL ${m[0].slice(0, 50)} in script.`);
    for (const v of c.body.matchAll(/var\(\s*--([\w-]+)/g)) unknownToken(v[1], at(v.index));
  }

  // ---- motion discipline
  if (
    /\brequestAnimationFrame\s*\(|\bsetInterval\s*\(/.test(allCode) &&
    !/prefers-reduced-motion|reduceMotion/.test(raw)
  ) {
    warn(
      "W22",
      0,
      "animation loop without a reduced-motion guard. Read Visuals.tokens().reduceMotion (or matchMedia('(prefers-reduced-motion: reduce)')) and skip the animation when it is set.",
    );
  }

  // ---- libraries declared vs used
  const hay = allCode + "\n" + markup;
  const used = {
    chart: /\bnew\s+Chart\s*\(|\bChart\./.test(allCode),
    d3: /\bd3\./.test(allCode),
    three: /\bTHREE\./.test(allCode),
    katex: /\bdata-math\b/.test(markup) || /\bkatex\./.test(allCode),
    mermaid: mermaids.length > 0 || /\bmermaid\./.test(allCode)
  };
  for (const l of LIBS) {
    if (used[l] && !declared.includes(l)) err("E09", 0, `the visual uses ${l} but the manifest does not declare it. Add "${l}" to libs.`);
    if (!used[l] && declared.includes(l)) warn("W09", 0, `the manifest declares ${l} but nothing uses it. Remove it to keep the file light.`);
  }
  if (declared.includes("chart") && used.chart && !jsonBlocks.length) warn("W10", 0, "chart data should live in one <script type=\"application/json\"> block, separate from the code.");

  // ---- series cap
  for (const m of raw.matchAll(/--s([7-9]|[1-9]\d)\b|\.(c|fill-|stroke-)([7-9]|[1-9]\d)\b|\bclass\s*=\s*["'][^"']*\b(c|fill-|stroke-)([7-9]|[1-9]\d)\b/g)) err("E10", m.index, `series ${m[0].replace(/\D/g, "")} does not exist. The palette has six series plus "other" (.c-other). Group the rest.`);

  // ---- mermaid sources
  for (const mm of mermaids) {
    const src = mm.body;
    if (!/role\s*=\s*["']img["']/i.test(mm.open) || !/aria-label\s*=/i.test(mm.open)) warn("W05", mm.idx, '<pre class="mermaid"> needs role="img" and an aria-label.');
    if (/^\s*(flowchart|graph)\s+(LR|RL)\b/im.test(src)) warn("W11", mm.idx, "left-to-right flowcharts shrink to unreadable text in a narrow panel. Use TB.");
    if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(/.test(src)) err("E04", mm.idx, "raw color in a Mermaid diagram. Use `class NodeId accent|ok|warn|danger|info|muted` instead.");
    if (/^\s*(classDef|style|linkStyle)\b/im.test(src) && !/#[0-9a-fA-F]{3,8}\b/.test(src)) warn("W12", mm.idx, "classDef/style rarely needed: use `class NodeId accent|ok|warn|danger|info|muted`.");
        if (/^\s*click\s/im.test(src) || /https?:\/\//i.test(src)) err("E03", mm.idx, "Mermaid click directives and URLs are not allowed (they make nodes into external links).");
    if (/^\s*pie\b/im.test(src)) warn("W13", mm.idx, "pie charts: use Chart.js doughnut instead; Mermaid pie labels are not themed.");
    if (/<script|javascript:/i.test(src)) err("E05", mm.idx, "script content inside a Mermaid source.");
    const edges = (src.match(/-->|---|==>|->>|-->>|-\.->/g) || []).length;
    if (edges > 22) warn("W14", mm.idx, `${edges} edges is too many for a panel. Split into two diagrams.`);
  }

  // ---- content structure
  const h1 = markup.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1) warn("W15", 0, "no <h1>. The title should state the takeaway as a sentence.");
  else if (h1[1].replace(/<[^>]+>/g, "").trim().split(/\s+/).length < 3) warn("W15", h1.index, "the <h1> is a label, not a takeaway. State the finding as a sentence.");
  if (!/<p\b|class\s*=\s*["'][^"']*\bcallout\b/i.test(markup)) warn("W16", 0, "no text takeaway. Add a <p> or .callout that says what the visual shows.");
  const cap = markup.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi) || [];
  if (!cap.some((c) => /source|as of|illustrative/i.test(c))) warn("W17", 0, 'no source line. Add a <figcaption> with "Source: ..." and an as-of date, or mark the data "Illustrative".');
  const tabs = (markup.match(/role\s*=\s*["']tab["']/gi) || []).length;
  if (tabs > 4) warn("W18", 0, `${tabs} tabs. Keep it to four or split the visual.`);
  if (/<canvas\b/i.test(markup) && !/class\s*=\s*["'][^"']*\bchart\b/i.test(markup)) warn("W19", 0, 'wrap <canvas> in <div class="chart"> so Chart.js can size it.');

  issues.sort((a, b) => (a.level === b.level ? a.line - b.line : a.level === "ERROR" ? -1 : 1));
  return { path, bytes, issues, errors: issues.filter((i) => i.level === "ERROR").length, warnings: issues.filter((i) => i.level === "WARN").length };
}

// ---- cli
const args = process.argv.slice(2);
const json = args.includes("--json");
const files = args.filter((a) => !a.startsWith("--"));
if (!files.length) { console.error("usage: node lint.mjs <fragment.html> [...] [--json]"); process.exit(2); }
const results = files.map((f) => { if (!existsSync(f)) { console.error("not found: " + f); process.exit(2); } return lint(f); });
if (json) console.log(JSON.stringify(results, null, 2));
else for (const r of results) {
  console.log(`${r.path}  (${(r.bytes / 1024).toFixed(1)} KB)`);
  for (const i of r.issues) console.log(`  ${i.level === "ERROR" ? "ERROR" : "warn "} ${i.code}${i.line ? " line " + i.line : ""}: ${i.msg}`);
  console.log(r.errors ? `  ${r.errors} error(s), ${r.warnings} warning(s). Fix the errors and run again.` : `  OK: 0 errors, ${r.warnings} warning(s).`);
}
process.exit(results.some((r) => r.errors) ? 1 : 0);
