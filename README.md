# SmolUI

I liked ChatGPT's Intelligent UI and wanted to see if it would work in OpenChamber. This is that experiment, and it works: the agent writes a visual, the panel renders it while the agent is still writing, and every visual leaves as one HTML file that opens offline.

## What it is

SmolUI is an OpenChamber extension plus an OpenCode skill, working together.

- The **skill** teaches the agent to write `.visuals/<slug>.visual.html`: a themed HTML fragment with all its data in one JSON block, checked by a lint before it ships.
- The **extension** renders those fragments in a rail panel, from a message action, in the file editor, and full screen, updating live while the agent writes.
- The **tool** (`smolui_visuals`) is one call the agent makes after writing a fragment. It lints the fragment and builds the download in one step, so the chat shows a single card instead of two shell commands.

The agent picks the format per answer. A fact stays text, a trend becomes a chart, a process becomes a diagram, and the skill says when a plain answer is the right one.

## What it renders

- Charts and tables, from Chart.js or plain HTML.
- Maps: a route with numbered stops and times, drawn offline from data in the file.
- Diagrams, flowcharts, sequence and state machines, from Mermaid.
- 3D in the Studio clay style: matte clay parts, soft shadows, one accent on the thing the title is about, free orbit, labels on by default with a toggle, and detail helpers for holes, bolts and contact shadows.
- Equations and derivations, typeset with KaTeX.
- Small tools: what-if calculators, filters, planners, checklists.
- Processes in motion: a path that draws itself, a guided tour with steps, an engine that runs.

## Install

Build the package, then add it to OpenChamber:

```
git clone https://github.com/sayakmukherjee080/SmolUI-OpenChamber.git
cd SmolUI-OpenChamber
npm install
npm run package        # writes dist/smolui-openchamber-<version>.zip
```

1. Settings -> Extensions -> add the zip, the folder, or the repository URL.
2. Approve the asks: `files` and the local service.
3. Open the SmolUI panel once. The service copies the `visuals` skill into `~/.config/opencode/skills/visuals/` and the `smolui_visuals` tool into `~/.config/opencode/plugins/`, then re-syncs both on update. Restart OpenCode once so it loads the tool; after that a visuals run shows as one card in the chat.

Then ask the agent: "chart the deploy frequency", "map this route", "how does an internal combustion engine work".

## How it works

1. The agent writes `.visuals/<slug>.visual.html` with the skill: a first line like `<!-- visuals: 1.2 libs: chart katex -->`, the data in one JSON block, and no colours or fonts of its own.
2. `smolui_visuals` lints it and builds `.visuals/<slug>.html`, the standalone download, with the skill's own Node scripts. The lint refuses raw colours, font families and external URLs, and it stops the build on errors.
3. The extension rebuilds the same page in the browser. The bytes match the Node build exactly, checked for twelve example fragments in both themes.
4. The page runs in a nested `sandbox="allow-scripts"` frame: no same-origin, no network, every request blocked by CSP. Only the frame height and an optional ask cross back.
5. The panel watches the project while it is open: it opens a new visual by itself, follows the agent onto a new one as it appears, and lands an edit to the visual you are reading in place.
6. The download carries the stylesheet, the fonts it needs and only the declared libraries, so it opens anywhere, offline.

One stylesheet and one theme adapter set the tokens, the fonts (Geist, Geist Mono, nine Noto Indic scripts, all bundled) and the light and dark modes.

## Specs

- OpenChamber 2.2.0 or newer, web and desktop. VS Code and mobile do not load extensions.
- OpenCode 2.x for the skill and the tool.
- Panel bundle about 125 KB. A library is fetched only when a fragment declares it: Chart.js 0.2 MB, D3 0.3 MB, KaTeX 0.3 MB, Three.js 0.8 MB, Mermaid 5.4 MB.
- Fragment: up to 200 KB, first line `<!-- visuals: 1.2 libs: chart katex -->`, all data in one JSON block.
- The page SmolUI builds is byte-identical to the skill's Node build. The test suite checks twelve example fragments in both themes.
- Refresh: 1 s polling while the agent works, 2.5 s idle. A new visual auto-opens; an edited one updates in place.
- Assets: package fetch first, the extension's service reading in chunks as fallback.

## Permissions

| Asked for | Used for |
| --- | --- |
| `files` | reading the project's `.visuals` folder; stat of the download |
| local service | installing and re-syncing the `visuals` skill and the `smolui_visuals` tool; serving package assets |

No origins, no integrations, no accounts, no API keys, no telemetry, no hosted service.

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

The skill ships built in `skill/visuals/` (stylesheet, theme adapter, scripts, references, examples) and that is what the package uses. The kit that generates the stylesheet and the adapter is maintained outside this repository; when it is absent the build uses the committed skill as is.

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
licenses/               third-party notices, also summarised in NOTICE.md
LICENSE                 MIT
```

## Limits

- The message action opens the visual in the panel. OpenChamber's context panel from a chat file link uses the built-in preview instead, because `fileEditors` does not apply there.
- OpenCode has no install-time hook for skills, so the skill and the tool are installed on the first panel open, not at extension install time.
- There is no inline rendering inside chat messages. A message can carry a card for the tool call; the visual itself lives in the panel, the file editor or the page.
- One extension, one project at a time: the panel follows the project OpenChamber has open.

## Credits

Libraries: Chart.js 4.5.1 (MIT), D3 7.9.0 (ISC), Three.js 0.186.1 (MIT), KaTeX 0.19.0 (MIT), Mermaid 12.1.0 (MIT). Fonts: Geist and Geist Mono (OFL), Noto Sans Indic scripts (OFL). License texts are in `licenses/`; the summary is in `NOTICE.md`.

## License

MIT. See `LICENSE`.
