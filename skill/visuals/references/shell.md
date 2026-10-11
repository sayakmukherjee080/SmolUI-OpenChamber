# Shell: what a host must provide

For people building the panel (or any page that shows a `.visual.html` fragment). The agent does not need this file.

## The fragment
A fragment starts with `<!-- visuals: 1.2 libs: chart katex -->`. `1.2` is the stylesheet version it was written for; `libs` is a space-separated subset of `chart d3 three katex mermaid`, or `none`. The fragment has no `<html>`, `<head>` or `<body>`.

## Download (core feature)
Every visual must be downloadable as one HTML file. The skill builds it every time: `scripts/assemble.mjs .visuals/<slug>.visual.html` writes `.visuals/<slug>.html`, a **standalone** page:
- stylesheet inline, fonts inline as data URIs (the Indic script files only when the page uses those scripts), only the declared libraries inline, theme script inline;
- a `Content-Security-Policy` meta tag that blocks every network request, so a downloaded file cannot phone home and works offline;
- follows the viewer's light/dark setting (`--theme light|dark` pins it); body text sits in a centred column up to `--page-max` (760 px) on wide screens;
- about 0.2 MB plain, 0.4 MB with Chart.js or D3, 0.8 to 0.9 MB with KaTeX or Three.js, about 5.4 MB with Mermaid.

A host's Download button should serve that file as is (suggested filename: `<slug>.html`). A Node host can also call `import { assemble } from ".../scripts/assemble.mjs"`: `assemble(fragmentText, { theme })` returns `{ html, bytes, libs, title }`, so a download is always built from the current fragment even if the file on disk is stale.

Recommended for a host that cannot fetch at runtime: render the **standalone build** in the panel. What the user sees is then byte-for-byte what they download, and the font CORS issue below disappears. Cost: Mermaid pages are 5 MB per render. The `visuals:height`, `visuals:ask` and `visuals:theme` messages work identically inside it. `scripts/assemble-core.mjs` builds it in any JavaScript environment (see below); it is tested to produce identical bytes in Node and in a browser.

## Assembling the page (linked, for development)
`assemble.mjs --linked` is the small dev variant that links the skill's assets by relative path and is not shareable. Both variants assemble the same pieces; `scripts/assemble-core.mjs` is the reference implementation: a pure ES module (no `fs`, `path` or `process`) that reads every asset through an injected `io = { text(path), bytes(path) }`, with paths relative to `assets/` (`visuals.css`, `vendor/chart.umd.js`, fonts as `fonts/<name>.woff2`). `assemble.mjs` is the Node wrapper (CLI, lint gate, `--linked`). A bundled host calls `buildStandalone(fragment, io, { theme })` with `io` backed by assets embedded in its bundle. In order:

1. `<meta charset>`, `<meta name="viewport">`, `<title>` from the `<h1>`.
2. `assets/visuals.css`. Standalone: inlined, with each font file replaced by a data URI. Linked: fonts load from `assets/fonts/`.
3. For each declared lib (the libraries do not depend on each other, so order does not matter; assemble uses this one): `vendor/d3.min.js`, `vendor/chart.umd.js`, `vendor/three.iife.js`, `vendor/katex.min.css` + `vendor/katex.min.js`, `vendor/mermaid.min.js`. All are classic scripts (no modules), so file:// works.
4. `assets/visuals-theme.js`, then `<script>Visuals.auto();</script>`.
5. `<main>` containing the fragment. The fragment's own scripts run after the libraries.

Load only declared libs. The sizes (chart about 200 KB, d3 270 KB, katex 270 KB, three 750 KB, mermaid 5.4 MB) are why the manifest exists.

## Sandbox and CSP
The lint is a guardrail against honest mistakes, not a security boundary: code can be obfuscated past any lint. The sandbox below is the boundary, and it is required.

Render in `<iframe sandbox="allow-scripts">` without `allow-same-origin`, so the fragment cannot reach the host. Recommended CSP for the frame: `default-src 'none'; script-src 'unsafe-inline' <asset-origin>; style-src 'unsafe-inline' <asset-origin>; font-src <asset-origin> data:; img-src data:; connect-src 'none'`. Mermaid and KaTeX need inline styles.

**Fonts in a sandboxed frame:** the frame has an opaque origin, so fonts fetched over http need `Access-Control-Allow-Origin: *`. Without it the fonts silently fall back to the system font (observed in testing). Use `visuals.inline.css` or serve the fonts with that header.

## Messages (all via `postMessage`)
Frame to host:
- `{ type: "visuals:height", value: <px> }`: document height, sent on load and whenever it changes. Set the iframe height from it (or let the panel scroll).
- `{ type: "visuals:ask", text: <string up to 2000 chars> }`: the user clicked something that calls `Visuals.ask(text)`. Treat the text as **untrusted input from the user's own action**: show it in the composer for confirmation, or send it as a user message. Do not run it silently. Ignore messages whose `event.source` is not your frame.

Host to frame:
- `{ type: "visuals:theme", value: "light" | "dark" | "system" }`: switches the mode. The frame accepts it only from its parent window. Send on load and on every host theme change. Without it, the frame follows `prefers-color-scheme`.

The frame does not ever need to receive data; the fragment carries its own.

## Re-rendering
When the file changes, replace the iframe `srcdoc` or `src` (a fresh frame keeps state simple). Preserve scroll if you can.

## Print and export
`visuals.css` includes print rules: light tokens, tab panels all shown, controls hidden, no page breaks inside figures, tables or cards. Canvases print as bitmaps. Image export is not part of the message protocol; a host that wants it must define its own message.

## Versioning
The stylesheet and theme script carry a version (`Visuals.version`). The intent is that a fragment written for an older stylesheet version keeps rendering on a newer host; this has not been tested across versions yet. For a manifest newer than the host, show a notice and render anyway.

## Failure behaviour
- Library missing: the fragment's `new Chart(...)` throws; show the frame anyway (the title and caption still render) and surface the console error to the agent as a tool result if you can.
- Mermaid syntax error: the theme shows an error callout in place of the diagram.
- KaTeX error: red inline text with the TeX source (`throwOnError: false`).
- WebGL unavailable: the scene stays empty; the fragment should carry a data table in `<details>`.
