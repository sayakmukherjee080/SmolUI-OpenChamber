# SmolUI

SmolUI is an experimental OpenChamber extension, plus a skill and a tool for OpenCode. The agent writes a visual, the panel renders it while the agent is still working, and every visual leaves as one HTML file that opens offline.

Three parts do that. The **skill** teaches the agent to write `.visuals/<slug>.visual.html`, a themed fragment with its data in one JSON block and a lint that runs before it ships. The **extension** renders those fragments, in the rail panel, from a message action, in the file editor, and full screen. And `smolui_visuals` is the one call the agent makes once the fragment is written: it lints and builds the download together, so the chat shows one card instead of two shell commands.

The agent decides the form per answer. A fact stays text, a trend becomes a chart, a process becomes a diagram.

## What it renders

| Visual | Best for |
|---|---|
| Charts and tables | Trends, comparisons, rankings, structured data |
| Maps | Routes, numbered stops, travel sequences |
| Diagrams | Flowcharts, sequence diagrams, state machines, architecture |
| 3D scenes | Parts and structures that occupy space, in the Studio clay style |
| Equations | Typeset maths and derivations |
| Interactive tools | Calculators, filters, planners, checklists |
| Animated processes | Step-by-step walkthroughs, drawing paths, engines that run |

Charts come from Chart.js or plain HTML, diagrams from Mermaid, equations from KaTeX, 3D from Three.js, and D3 is there for custom data visualisations.

## Install

- OpenChamber 2.2.0 or newer, web and desktop. VS Code and mobile do not load extensions.
- OpenCode 2.x for the skill and the tool.
- Node 22 or newer to build the package and to run the skill's scripts.

Build the package:

```
git clone https://github.com/sayakmukherjee080/SmolUI-OpenChamber.git
cd SmolUI-OpenChamber
npm install
npm run package        # writes dist/smolui-openchamber-<version>.zip
```

Then:

1. Settings -> Extensions: add the zip, the folder, or the repository URL.
2. Approve the asks: `files` and the local service.
3. Open the SmolUI panel once. The service installs the skill and the tool, and re-syncs both when the extension version changes:

```
~/.config/opencode/skills/visuals/       the visuals skill
~/.config/opencode/plugins/visuals.js    the smolui_visuals tool
```

4. Restart OpenCode once so it loads the tool. After that a visuals run shows as one card in the chat.

Ask for something with a shape:

```text
How does an internal combustion engine work?
Chart the deployment frequency in this project.
Map this route with times and stops.
```

The visual opens in the SmolUI panel; a message action, the file editor and the full-screen view open it too.

## Design thinking system prompt

By default the skill waits to be asked. To let the agent decide when a visual helps, paste this into your agent instructions: a project `AGENTS.md`, `~/.config/opencode/AGENTS.md`, or a custom agent. It reads as a standing request, so the skill's ask-first rule is satisfied once, in advance.

```text
You think in visuals as well as words, and you decide the form before you write.

Decide the one shape of the answer first.
- A number that moves, compares or shares a whole: a chart.
- Many numbers to look up or rank: a table, or text when it is short.
- Things that connect, flow or change state: a diagram.
- Parts that occupy space or move: a 3D scene.
- An equation or a derivation: typeset math.
- A choice with trade-offs, or an answer that depends on inputs: a comparison or sliders.
- One fact, one sentence, or an explanation of code: text. Leave it alone.

This is a standing request. The user has asked for visuals in advance, so when the shape
above is a chart, a diagram, a scene, a map or a tool, write it in the same turn as the
answer, without waiting to be asked again. The rules that still hold:
- Every number comes from a command, file or query you ran in this session. Never invent
  data; when there is none, say so in text.
- One idea per visual. A second idea is a second visual, or it waits.
- Never visualise for decoration: no chart of two numbers, no diagram of a straight line,
  no 3D of flat data.
- Text still leads. The reply is one line: the finding, the fragment path, the download
  path, and where it opens.

Then hand it over.
- Write the fragment with the visuals skill, then call the `smolui_visuals` tool on it.
  Fix what the lint reports and call it again until it passes; never hand back a fragment
  that failed.
- Keep the slug stable while iterating. A better version of the same idea overwrites the
  same file, and the open panel follows it in place.
- End with two or three related-query buttons that continue the thought ("Add the lunch
  stop", "Chart the last 12 weeks"), so the reader keeps going without typing a new prompt.
- When the visual's data has a source you can re-run, add a refresh button that asks you
  for the same visual with fresh numbers.
- If a later message changes a number, a label or a conclusion the visual shows, update the
  same fragment in the same turn. A visual that contradicts the text is worse than no visual.
- If the visual still will not build after honest attempts, say so in one line and answer
  in text. Never hold the answer back for a picture.
```

Then ask a question that has a shape ("why is deploy time up this month") and the chart, diagram or scene arrives in the panel as part of the answer.

## How it works

1. The agent writes `.visuals/<slug>.visual.html` with the skill: a first line like `<!-- visuals: 1.2 libs: chart katex -->`, the data in one JSON block, and no colours or fonts of its own.
2. `smolui_visuals` lints and builds together. It checks the format, refuses raw colours, font families and external URLs, stops on errors, and writes `.visuals/<slug>.html`, the standalone download. The agent fixes what the lint reports and calls it again, so the chat shows one combined card instead of separate lint and build commands.
3. The extension rebuilds the same page in the browser. It renders in the panel, a message action, the file editor and full screen. The panel watches the open project: it opens a new visual by itself, follows the agent onto a new one as it appears, and lands an edit to the visual you are reading in place.
4. The export carries the stylesheet, the fonts it needs and only the declared libraries, so it opens anywhere offline, with no SmolUI service or account involved. The fragment stays for the agent to update; keeping the slug stable lets an iteration overwrite the same file.

The panel and the Node build are separate rendering paths, checked against each other for the twelve example fragments in both themes. One stylesheet and one theme adapter set the tokens, the fonts (Geist, Geist Mono, nine bundled Noto Indic scripts) and the light and dark modes.

## Rendering and security

An agent-written visual runs in a nested frame with `sandbox="allow-scripts"` and no same-origin, and its content security policy blocks network requests. Two messages cross back to the host: the frame height and an optional ask.

Permissions:

- `files`: read the project's `.visuals` folder and stat the download.
- The local service: install and re-sync the skill and the tool, and serve package assets. It binds to loopback, and every request carries the bearer token the host issues at spawn.

That is the whole list. No origins, no integrations, no accounts, no keys, no telemetry, no hosted service.

The sandbox covers embedding only. A standalone export opened in a browser follows that browser's security model, so treat a visual from an untrusted source like any other HTML file.

## Specs

- Fragment: up to 200 KB, first line `<!-- visuals: 1.2 libs: chart katex -->`, all data in one JSON block.
- Panel bundle: about 120 KB.
- Refresh: 1 s polling while the agent works, 2.5 s idle.
- Assets: package fetch first, the extension's service reading in chunks as fallback.
- Themes: light and dark from the shared tokens. Fonts: Geist, Geist Mono and nine bundled Noto Indic scripts.

A library enters a visual only when the fragment declares it. Sizes are approximate, and the export bundles what the fragment uses.

| Library | For | Size |
|---|---|---|
| Chart.js 4.5.1 | Charts | 0.2 MB |
| D3 7.9.0 | Custom data visualisations | 0.3 MB |
| KaTeX 0.19.0 | Typeset maths | 0.3 MB |
| Three.js 0.186.1 | 3D scenes | 0.8 MB |
| Mermaid 12.1.0 | Diagrams | 5.4 MB |

## Limits

- No inline rendering in chat: a message can carry a tool-call card, but the visual itself lives in the panel, the file editor or the page.
- One project at a time: the panel follows the project OpenChamber has open.
- Context-panel file links: OpenChamber's context panel uses its built-in preview for chat file links, because `fileEditors` does not apply there.
- First-open setup: OpenCode has no install-time hook for skills, so the skill and the tool install on the first panel open, not at extension install time.

## Troubleshooting

### The `smolui_visuals` tool is missing

Open the panel once and confirm the local service is available with its permissions approved, then restart OpenCode. The skill and the tool live under `~/.config/opencode/`.

### A visual fails to build

The lint names what is wrong. Check the first-line declaration, the JSON block, the declared libraries, raw colours or fonts and external URLs, fix those, and call `smolui_visuals` again.

### A visual does not appear or update

Check the intended project is open and the fragment sits under `.visuals/`. When iterating, keep the slug: the panel follows the same file.

### The export does not open offline

Check the fragment declares every library it uses and that the build finished. The browser console names any missing asset or runtime error.

## Develop

Node 22 or newer, for the build and for the skill's scripts (the tool runs them with `node`).

```
npm install
npm run build          # syncs skill/ when the kit is present, bundles panel/main.js and plugin/visuals.js
npm test               # parser, parity vs assemble.mjs, service behaviour, plugin tool
npm run test:browser   # Playwright stub-host harness (npx playwright install chromium first)
npm run typecheck
npm run package        # build + dist/smolui-openchamber-<version>.zip
```

The skill ships built in `skill/visuals/` (stylesheet, theme adapter, scripts, references, examples) and that is what the package uses. The kit that generates the stylesheet and the adapter is maintained outside this repository; without it the build uses the committed skill as is.

Changing the fragment format or the rendering means touching the parser, the Node build, the browser path and the parity tests together. The browser harness runs against a stub host, so it needs no live OpenChamber session.

## Layout

```
panel/index.html        one page for panel, page, and file editor
panel/main.js           built IIFE (committed)
src/                    panel sources (TypeScript + two tested .mjs modules)
service/main.cjs        local service: installs the skill and tool, serves package assets
plugin/visuals.ts       the OpenCode 2 plugin: the smolui_visuals tool
plugin/visuals.js       built ESM (committed)
skill/visuals/          the shipped skill: assets, scripts, references, examples
scripts/                build.mjs, package.mjs
test/                   parity, parser, service, plugin, browser harness
licenses/               third-party license texts
NOTICE.md               notices summary
LICENSE                 MIT
```

## Credits

Libraries: Chart.js 4.5.1 (MIT), D3 7.9.0 (ISC), Three.js 0.186.1 (MIT), KaTeX 0.19.0 (MIT), Mermaid 12.1.0 (MIT). Fonts: Geist and Geist Mono (OFL), Noto Sans Indic scripts (OFL). License texts are in `licenses/`; the summary is in [`NOTICE.md`](NOTICE.md).

## License

MIT. See [`LICENSE`](LICENSE).
