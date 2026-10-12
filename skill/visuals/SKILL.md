---
name: visuals
description: Use ONLY when the user explicitly asks for a visual - to chart, graph, plot, visualize or draw something, or for a diagram, flowchart, dashboard, 3D view, rendered equation, or interactive explorer. Writes one themed HTML fragment to .visuals/ that a side panel or browser renders. Do NOT use for ordinary text answers, code explanations, tables nobody asked to visualize, or to illustrate a reply unprompted.
---

# Visuals

Turn a request for a visual into one self-contained, themed HTML fragment at `.visuals/<slug>.visual.html`. A panel renders it, and `scripts/assemble.mjs` wraps it with the stylesheet and libraries into a standalone `.html` the user can download, so the look, dark mode and fonts are identical everywhere. You write content and a little script. You never write colours, fonts or page boilerplate.

## Workflow

`<skill-dir>` below is the folder that contains this file.

1. **Pick the form** with the matrix below. Open the one reference file it names.
2. **Get real data.** Every number must come from a command, file or query you ran in this session. Compute aggregates in code, not in your head. If you cannot get the data, say so; never invent it. If the query returns nothing, say that in chat instead of drawing an empty chart. If the user asks for an example or mock-up, label it "Illustrative" in the caption.
3. **Copy the closest file from `examples/`**, keep its structure, replace the content.
4. **Write** `.visuals/<slug>.visual.html` (create the folder if needed; kebab-case slug, 40 characters or fewer). To change an existing visual, edit the same file; do not create a new slug.
5. **Lint:** `node <skill-dir>/scripts/lint.mjs .visuals/<slug>.visual.html`. Fix every ERROR and read every warning. Do not report done until it prints `OK: 0 errors`. If Node is unavailable, say the lint was not run.
6. **Build the download (always).** `node <skill-dir>/scripts/assemble.mjs .visuals/<slug>.visual.html` writes `.visuals/<slug>.html`: one self-contained file (styles, fonts, libraries all inside, works offline, follows the viewer's light/dark setting). This is the file the user downloads and shares, so build it after every change. It lints again and refuses on errors. Never edit that file by hand.
7. **Optional dark check:** `node <skill-dir>/scripts/assemble.mjs .visuals/<slug>.visual.html --theme dark --out .visuals/.build/<slug>-dark.html` and open the result.
8. **Reply with one line:** the takeaway in one sentence, then the two paths: the fragment and the download, then where to open it — "open it from the SmolUI panel, or ⋯ → Open as visualization on this message". Never paste HTML into the chat. If `.gitignore` does not list `.visuals/`, mention it once; do not edit it.

## Which tool

| The visual is | Use | Read |
|---|---|---|
| KPIs, tables, comparisons, checklists, cards, timelines | Plain HTML with components | `references/components.md` |
| Trend, comparison, share, distribution (line, bar, doughnut, scatter, radar) | Chart.js (`libs: chart`) | `references/charts.md` |
| Heatmap, treemap, network, histogram, small multiples, custom scales | D3 (`libs: d3`) | `references/d3.md` |
| Flow, architecture, sequence, state, ER, schedule, timeline, mind map | Mermaid (`libs: mermaid`) | `references/diagrams.md` |
| How a mechanism or machine works: gears, escapement, engine, moving parts | Motion first: animated SVG (no library) or Three.js (`libs: three`); label illustrative geometry | `references/motion.md` |
| Spatial structure, 3D surface or bars | Three.js (`libs: three`) | `references/three.md` |
| Route, places, geography | Schematic SVG map, or a D3 vector map with an embedded GeoJSON extract (no tiles) | `references/maps.md` |
| Formula, derivation, worked example | KaTeX (`libs: katex`) | `references/math.md` |
| What-if with sliders | Chart.js or plain HTML plus a short script | `references/charts.md` |

Use the simplest tool that works: HTML before Chart.js, Chart.js before D3. Pie charts are Chart.js doughnuts, never Mermaid. 3D only when the data is truly spatial. A mechanism with moving parts is temporal or spatial: animate it instead of drawing a static flowchart. Libraries are already loaded as globals once declared in the manifest. Nothing else exists: no CDN, no other libraries.

## The fragment

First line is the manifest. Then, in this order:

```html
<!-- visuals: 1.2 libs: chart katex -->
<hgroup><h1>Takeaway as a sentence</h1><p>Subtitle: what, over what period, in what unit</p></hgroup>
...the visual, inside <figure> with a <figcaption>Source: ... As of ...</figcaption>...
<p>One or two sentences saying what to notice.</p>
<script type="application/json" id="data">{ ... }</script>   <!-- all data, one block -->
<script> ...code that reads #data... </script>
```

- `libs:` lists only what you use (`chart d3 three katex mermaid`), or `none`.
- A fragment only: no `<html>`, `<head>`, `<body>`, `<link>`, `<script src>`.
- Keep data in the JSON block, separate from code, so edits are small. Aggregate before embedding; the file limit is 200 KB. Write every `<` inside a JSON string as `\u003c` (so `</script>` in data cannot end the block).

## Hard rules (the lint rejects these)

- No colours or fonts of your own: no hex, `rgb()`, named colours, `font-family`, in markup or script. Use classes (`.c1`, `.fill-2`, `.callout.warn`), `var(--token)`, or colours returned by the helpers (`Visuals.d3.sequential`, `Visuals.tokens().color.name`). Charts take their colours from the theme automatically; do not set them.
- No network or browser state: no `fetch`, `XMLHttpRequest`, storage, cookies, navigation, `eval`, imports, `postMessage`.
- No HTML injection: no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, d3 `.html()`. Use `textContent`, `createElement`, d3 `.text()`. Data may contain markup.
- No external URLs of any kind, including links and Mermaid `click`. Write an address as plain text if the reader needs it.
- At most six series (`.c1` to `.c6`). Group the rest into "Other" (`.c-other`).
- Every library you use is declared in the manifest.

## Quality rules

- **Title is the finding**, written as a sentence ("Kolkata is the slowest region"), not a label ("Latency by region").
- **One idea per visual.** Up to four tabs if needed.
- **Source line** in a `<figcaption>`: what you read or ran, and as-of date. Illustrative data is labelled as such.
- **Accessible:** every `<canvas>`, `<svg>` and Mermaid block gets `role="img"` and an `aria-label` that states the finding. Colour is never the only cue: label directly, or provide a data table in `<details>`.
- **Honest charts:** bars start at zero, units in axis titles, sort bars by value, mark thresholds with a reference line, no dual axes, no 3D for ordinary data.
- **Colour meaning:** status colours (ok, warn, danger) only for status. Series colours only for categories.
- **Width:** design for a 400 to 500 px panel; the download shows it in a centred column up to 760 px. Size with the container, not the viewport; no media queries. Keep labels short.
- **Language:** write labels in the user's language (Indic scripts render). Format numbers with `Visuals.fmt.num / compact / pct / ms` (en-IN grouping by default; `Visuals.setLocale("en-US")` to change).

## Motion

A process that moves should be shown moving. Animate process, mechanism and state change — never decoration. One-shot entrance animations on load are fine; a repeating loop needs a visible control (play / pause / step) and must stop when paused. Read `Visuals.tokens().reduceMotion` and skip or instant-complete your animation when it is true (charts follow it themselves). The lint warns (W22) on an animation loop with no reduced-motion guard. Recipes: `references/motion.md`.

## Interactivity

Allowed: tabs, toggles, filters, sliders, hover tooltips, expand/collapse, theme-aware redraws (`Visuals.onTheme(fn)`). The visual runs in a sandbox, so it cannot reach the network or the page. To ask the agent something from inside a visual, call `Visuals.ask("question")`. It works only in the panel: in a downloaded file there is no agent, so hide the button there with `if (!Visuals.hasHost) button.hidden = true`. The visual must make sense without it.

- **Related queries.** End an answer with two or three `Visuals.ask(...)` buttons that refine it ("Add a lunch stop", "Avoid steep walks"). They are the reader's next prompt, so make each one specific.
- **Ask as a control.** Anything the reader picks — a step, a stop, a segment — can travel with the ask: name the choice inside the text ("In `.visuals/route-map.visual.html` the reader selected the escapement; explain the impulse").
- **Refresh loop.** A "Refresh data" button may ask the agent to re-run the query and update the same file; the panel shows the new version within seconds. Offer it only when the data has a source the agent can re-run.

## References (open only the one you need)

- `references/components.md` - classes, layout helpers, tables, tabs, tooltips
- `references/charts.md` - Chart.js recipes and rules
- `references/d3.md` - D3 helpers and recipes
- `references/diagrams.md` - Mermaid types, direction, node classes, size limits
- `references/three.md` - 3D scene bootstrap
- `references/motion.md` - animation, reduced motion, guided tours, exploded views
- `references/maps.md` - schematic and vector maps without tiles
- `references/media.md` - photos as data URIs, the chat gallery, what never loads
- `references/math.md` - KaTeX markup and macros
- `references/tokens.md` - every design token by name
- `references/shell.md` - what a host must provide (for people building the panel, not for you)
- `examples/` - eleven linted, rendered, working visuals: `01-kpi-table`, `02-line-chart`, `03-bar-compare`, `04-flow`, `05-architecture`, `06-scene-3d`, `07-formula`, `08-what-if`, `09-heatmap-d3`, `10-share-tabs` (doughnut with tabs and a data table), `11-route-map` (schematic route with filter chips and related queries)
