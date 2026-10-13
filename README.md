# SmolUI

I liked ChatGPT's Intelligent UI and wanted to see if it would work in
OpenChamber. This is that experiment. It works: the agent writes a visual, the
panel renders it while the agent is still writing, and every visual leaves as
one HTML file that opens offline.

## What it renders

- Charts and tables, from Chart.js or plain HTML.
- Maps: a route with numbered stops and times, drawn offline from data in the file.
- Diagrams, flowcharts, sequence and state machines, from Mermaid.
- 3D scenes with Three.js, with orbit controls and sliders.
- Equations and derivations, typeset with KaTeX.
- Small tools: what-if calculators, filters, planners, checklists, games.
- Processes in motion: a path that draws itself, a guided tour with steps.

The agent picks the format per answer. A fact stays text, a trend becomes a
chart, a process becomes a diagram, and the skill says when a simple text
answer is the right one.

## How it renders everything

1. The agent writes `.visuals/<slug>.visual.html` using the bundled `visuals` skill: a first line like `<!-- visuals: 1.2 libs: chart katex -->`, the data in one JSON block, and no colours or fonts of its own.
2. SmolUI rebuilds that fragment into a standalone page in the browser. The bytes match the skill's Node build exactly, checked for all eleven golden examples in both themes.
3. The page runs in a nested `sandbox="allow-scripts"` frame: no same-origin, no network, every request blocked by CSP. Only the frame height and an optional ask cross back.
4. The panel watches the project while it is open. It polls every second while the agent works, opens a new visual by itself, and updates an open one in place when the file changes.
5. The same bytes are what you download. `.visuals/<slug>.html` carries the stylesheet, the fonts it needs and only the declared libraries, so it opens anywhere, offline.

It renders in the rail panel, the file editor and full-screen. A message action
opens a visual named in an assistant message, and the panel's prompt box sends
what you type into the chat.

One stylesheet and one theme adapter set the tokens, the fonts (Geist, Geist
Mono, nine Noto Indic scripts, all bundled) and the light and dark modes. The
lint rejects raw colours, font families and external URLs, so a visual cannot
drift, and the skill requires a source line, so it cannot invent data.

## Install

1. Settings → Extensions → add this folder, the git URL, or the zip in `dist/`.
2. Approve the three asks: `files`, `prompt`, the local service.
3. Open the SmolUI panel once. The service copies the `visuals` skill into `~/.config/opencode/skills/visuals/` and the `smolui_visuals` tool into `~/.config/opencode/plugins/`, then re-syncs both on update. Restart OpenCode once so it loads the tool; the tool call then shows as one card in the chat.

Then ask in the panel: "chart the deploy frequency", "map this route", "show
how a watch escapement works".

## Specs

- OpenChamber 2.2.0 or newer, web and desktop. VS Code and mobile do not load extensions.
- Panel bundle about 125 KB. A library is fetched only when a fragment declares it: Chart.js 0.2 MB, D3 0.3 MB, KaTeX 0.3 MB, Three.js 0.8 MB, Mermaid 5.4 MB.
- Fragment: up to 200 KB, first line `<!-- visuals: 1.2 libs: chart katex -->`, all data in one JSON block.
- The page SmolUI builds is byte-identical to the skill's Node build. The test suite checks twelve golden examples in both themes.
- Refresh: 1 s polling while the agent works, 2.5 s idle. A new visual auto-opens; an edited one updates in place.
- Assets: package fetch first, the extension's service reading in chunks as fallback.

Permissions:

| Asked for | Used for |
| --- | --- |
| `files` | reading the project's `.visuals` folder; stat of the download |
| `prompt` | sending what you type in the panel's prompt box into the open session |
| local service | installing and re-syncing the `visuals` skill; serving package assets |

No origins, no integrations, no accounts, no API keys, no hosted service.

## Develop

```
npm install
npm run build          # syncs skill/, generates the fonts payload, bundles panel/main.js
npm test               # parser, parity vs assemble.mjs, service behaviour
npm run test:browser   # Playwright stub-host harness (npx playwright install chromium first)
npm run typecheck
npm run package        # build + dist/smolui-openchamber-<version>.zip
```

## Layout

```
panel/index.html        one page for panel, page, and file editor
panel/main.js           built IIFE (committed)
src/                    panel sources (TS + two tested .mjs modules)
service/main.cjs        local service: installs the skill, serves package assets
skill/visuals/          copied from v1-reference-kit/ by the build, committed
v1-reference-kit/       stylesheet, adapter, skill source, tests
scripts/                build.mjs, package.mjs
test/                   parity, parser, service, browser harness
```

## If something fails

- A failed render shows a banner with a Retry button.
- The skill-install notice shows at most once a day.

## Updates

Bump `version`, run `npm run package`, commit, push. In Settings → Extensions
choose Update; the next panel open re-syncs the skill.
