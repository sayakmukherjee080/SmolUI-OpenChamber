# Chart.js (`libs: chart`)

`Chart` is a global; the theme is applied automatically (colours, fonts, grid, tooltips, dark mode, live re-theme). **Do not set colours, fonts or grid options.** Datasets without colours are painted from the series palette in order, with a different marker shape per series.

## Skeleton
```html
<!-- visuals: 1.2 libs: chart -->
<figure>
<div class="chart"><canvas id="c" role="img" aria-label="Finding in a sentence, with the key numbers."></canvas></div>
<figcaption>Source: ... As of ...</figcaption>
</figure>
<script type="application/json" id="data">{...}</script>
<script>
const data = JSON.parse(document.getElementById("data").textContent);
new Chart(document.getElementById("c"), { type: "line", data: {...}, options: {...} });
</script>
```
The canvas must sit alone inside `.chart` (the wrapper controls height; the chart fills it). Wrapper variants: `.chart.short`, `.tall`, `.square`, `.wide`. Lists of more than about eight categories: use `.tall` and horizontal bars.

## Choose the type
| Question | Type |
|---|---|
| Change over time | `line` (area: `fill: true` on the dataset) |
| Compare categories | `bar`; use `indexAxis: "y"` when labels are long or there are more than 6 |
| Part of a whole (3 to 6 parts) | `doughnut` (never `pie`, never Mermaid pie) |
| Two numeric variables | `scatter` |
| Profile across 3 to 8 dimensions | `radar` (rarely; prefer bars) |
| Parts changing over time | stacked `bar` (`scales.x.stacked`, `scales.y.stacked`) |

Stacked totals and cumulative shares: label the total in the caption or a callout. No dual axes: use two charts. No 3D, no gauges.

## Rules
- Bars: `beginAtZero: true` always. Sort bars by value unless the order is meaningful (time, ranking given).
- Axis titles carry units: `title: { display: true, text: "ms" }`. Skip the x title when the labels are self-explanatory.
- Thresholds and targets: add a dataset of type `line` in a neutral colour, as a function so it follows dark mode: `{ type: "line", label: "Budget", data: labels.map(() => 300), borderDash: [6, 4], pointRadius: 0, borderColor: () => Visuals.tokens().color["text-2"] }`. Without `borderColor` it takes the next series colour, which wrongly reads as another category. It is labelled in the legend.
- Any colour you must compute (annotations, highlights) goes in a function like that, never a constant: `() => Visuals.tokens().color["accent"]`. Token names are the ones in `tokens.md`.
- Time labels: pre-format as short strings in your data (`"Mon"`, `"14 Oct"`); no date adapter is loaded.
- Many x labels: `ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }`.
- Series limit is six. Aggregate the tail into "Other" before charting.
- Numbers in tooltips: `plugins.tooltip.callbacks.label: c => c.dataset.label + ": " + Visuals.fmt.compact(c.parsed.y)`. Use `c.parsed.x` for horizontal bars.
- Tick labels: `ticks: { callback: v => Visuals.fmt.compact(v) }`.
- Direct labels beat legends when the lines end apart; if you keep a legend, leave it on (it is styled).
- Provide a `<details><summary>Data table</summary>...</details>` when the user may need exact values, or when more than three series share a chart. Build rows with `createElement` and `textContent`.

## Formatters
`Visuals.fmt.num(n, digits?)`, `.compact(n)` (short form that follows the locale: lakh/crore style under en-IN, K/M under en-US), `.pct(fraction, digits?)` (0.46 gives `46%`), `.ms(n)`. `Visuals.setLocale("en-US")` switches grouping for the whole page. Pass fractions to `pct`, not percentages.

## What-if / sliders
Create the chart once, then change `chart.data.datasets[i].data` and call `chart.update("none")` on each `input` event. Never recreate the chart per event. Show the computed headline (`.stat`) next to the sliders and state the model in the caption. See `examples/08-what-if.visual.html`.

## Re-theming
Automatic. If you add custom drawing (annotations through a plugin), read colours with `Visuals.tokens()` inside the draw call, never at setup, and never hardcode.

## Do not
- Do not pass `backgroundColor`, `borderColor`, `color`, `font`, `family`; the lint rejects raw colours and font families anyway.
- Do not use `animation` longer than the default.
- Do not load another chart plugin; none are available.

## Example
`examples/02-line-chart`, `03-bar-compare`, `08-what-if` (sliders), `10-share-tabs` (doughnut with tabs and a table).
