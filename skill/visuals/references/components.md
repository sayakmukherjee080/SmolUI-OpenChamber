# Components (plain HTML)

Use these before reaching for a library. All colours come from classes; never write a colour.

## Page structure
- `<hgroup><h1>Takeaway</h1><p>Subtitle</p></hgroup>` at the top. One `h1` only. Use `h2` for sections.
- `<figure>` wraps each visual; `<figcaption>` holds the source and as-of line.
- `<p>` after the figure says what to notice (one or two sentences).

## Layout
- `.grid` with `.cols-2`, `.cols-3`, `.cols-4`: equal columns that collapse when narrow.
- `.stack`: vertical rhythm. `.row`: horizontal with wrap. `.split`: two sides, space between. `.grow`: take the rest of a row.
- `.card`: bordered surface. `.scroll`: horizontal scroll for wide tables. `.sticky`: sticks to top.
- Text helpers: `.muted`, `.dim`, `.mono`, `.num` (right-aligned tabular figures), `.center`, `.right`, `.nowrap`, `.truncate`, `.semibold`, `.text-xs`, `.sr-only`.

## Stat card
```html
<div class="card stat"><span class="label">Median</span><span class="value">131 ms</span><span class="delta up">12 ms faster</span></div>
```
`.delta.up` is the good direction, `.delta.down` the bad one. Direction is meaning, not arithmetic: a latency drop is `up`.

## Callouts and badges
- `<div class="callout">`, `.ok`, `.warn`, `.danger`, `.info`. Start with `<strong>Short heading.</strong>`.
- `<span class="badge ok">Healthy</span>` (`ok warn danger info plain`). Status only. Always include text, never a bare dot.

## Tables
- Always `<caption>` (or an `aria-label`), `<thead>`, `<th scope="row">` for the first column.
- `.num` on numeric cells. Variants on `<table>`: `.striped`, `.compact`, `.boxed`, `.sticky-head`.
- `tr.selected` highlights a row.
- Heat cells in plain HTML: `<td class="seq-1">` .. `seq-5` (low to high), `div-neg-2 div-neg-1 div-mid div-pos-1 div-pos-2`. Text colour is handled. The diverging middle is neutral on purpose, so also print the number.

## Series colour utilities
`.c1`..`.c6`, `.c-other` set the series colour variable `--c`, which legend markers and `.bar` fills read. `.fill-1`..`.fill-6`, `.fill-other`, `.stroke-1`..`.stroke-6`, `.fill-seq-N`, `.fill-div-*` colour SVG shapes. Use the same index for the same category across the whole visual.

## Legend
```html
<ul class="legend"><li class="c1">Mumbai</li><li class="c2">Delhi</li></ul>
```
The marker takes the series colour; the text stays neutral.

## Bars without a library
```html
<div class="bars">
  <div class="bar c1"><span>Kolkata</span><span class="track"><i style="--v:82%"></i></span><span class="val">330</span></div>
</div>
```
The label column is narrow (about 72 px) and the value column about 40 px: keep both short, put units in the subtitle. Set the length with `--v` (a percentage you computed); the colour comes from the `c1`..`c6` class on `.bar`. Good for 3 to 8 items; use Chart.js beyond that.

## Sequence and progress
- `.stepper`: `<ol class="stepper"><li class="done">..</li><li class="current">..</li><li>..</li></ol>` (for a guided tour with Back / Next, see `references/motion.md`)
- `.timeline`: `<ol class="timeline"><li><time>2026-10-01</time> Event text</li></ol>`
- `.breadcrumb`, `.pagination` for navigation-like content.

## Interactive
- Tabs (max four):
  ```html
  <div role="tablist"><button role="tab" aria-selected="true" aria-controls="p1" id="t1">Latency</button><button role="tab" aria-selected="false" aria-controls="p2" id="t2">Errors</button></div>
  <div role="tabpanel" id="p1" aria-labelledby="t1">...</div>
  <div role="tabpanel" id="p2" aria-labelledby="t2" hidden>...</div>
  ```
  You must write the click handler: set `aria-selected` and toggle `hidden`. Redraw or `chart.resize()` when a hidden chart is shown.
- `.segmented` (buttons with `aria-pressed`), `.chip` / `.chip.on`, `input[role="switch"]` (checkbox), `<input type="range">`, `<select>`, `<details>` (or `.accordion` for a group).
- Buttons: plain `<button>`, `<button class="primary">`, `<button class="sm">`. Put controls in `.toolbar`.
- Tooltip on plain HTML: `data-tip="Short text"` on any element.

## Other
`.avatar`, `.spinner`, `.skeleton`, `.empty` (use for no-data states, with a `<strong>` line and a reason), `.divider`, `<kbd>`, `<code>`, `<pre>`, `<blockquote>`, `<dl>`.

## Empty and error states
If a query returns no rows, make a visual only if the empty result is the answer: `<div class="empty"><strong>No failures in the last 7 days.</strong>The query returned 0 rows.</div>`. Otherwise tell the user in chat and skip the visual.

## Example
`examples/01-kpi-table.visual.html` (stat cards, table, badges, callout), `examples/10-share-tabs.visual.html` (tabs).
