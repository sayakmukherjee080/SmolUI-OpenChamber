# Maps (no tiles)

The frame has no network: no tiles, no geocoding while it renders. Two shapes work, and both keep working in the downloaded file.

## Schematic map (usually the right one)

A route with labelled stops reads better than a street map in a 400-500 px panel. Draw it in SVG: a polyline for the route, a dot per stop, a label per stop, optional blocks for districts or water.

- Number the stops so the order is visible (`1 · Ferry Building`).
- Label every pin — an unlabelled map is a puzzle.
- `<svg role="img" aria-label="...">` states the route and the finding.
- Filter chips (morning / afternoon / all) toggle `opacity` on the pins and route segments; keep an "All" state.
- Classes: `.svg-line` for the route, `.svg-dot` for stops (set `--c` for a series colour), `.svg-node` / `.svg-node-accent` for bigger nodes, `.svg-text` for labels, `.svg-muted` for secondary labels. Never a hex value.
- See `examples/11-route-map.visual.html`.

## Vector map (a real basemap, still offline)

`d3-geo` ships inside the d3 bundle. Embed a simplified GeoJSON extract and project it:

```js
const w = 360, h = 240;
const projection = d3.geoMercator().fitSize([w, h], land);
const path = d3.geoPath(projection);
// outlines: <path class="svg-line" d="...">
// pins:     const [x, y] = projection([lon, lat]);
```

- Get the extract before you write the file (a public GeoJSON, or an Overpass query through the shell); the fragment itself never fetches.
- Simplify hard: round coordinates to 3-4 decimals, drop every property you do not draw, and keep the whole fragment well under the 200 KB cap.
- Draw water and land first, boundaries next, the route and the pins last. Label the pins, not the streets.
- A one- or two-megabyte extract is not an option. If the data is that big, use the schematic shape, or fewer features.

## Data and honesty

- Coordinates, distances and times come from a source you actually read; name it in the caption.
- An illustrative route is labelled "Illustrative" in the caption.
- State units for distances, and the pace assumption for walking times (for example 4.5 km/h).
