# 3D (Three.js, `libs: three`, Studio clay)

`THREE` is a global (r186, with `THREE.OrbitControls`). Use 3D only when the subject is spatial: a mechanism, a structure, a layout, a surface. Never for ordinary bar or line data; use a chart.

## The look
Matte clay objects on a warm grey backdrop, lit softly, with shadows on a floor. Calm and tactile, never glossy.
- **Clay tints:** `th.clay(0..3)` gives four neutral tints. Use them to separate parts or categories. They are not series colours and carry no meaning ranking.
- **One accent:** `th.accent()` (terracotta) goes on the single thing the title is about, and nowhere else. If two things are accented, nothing is.
- **Surfaces are procedural.** Clay materials carry a drawn grain bump (`--three-grain`), and the stage carries a token-tinted environment map (`--three-env`), so parts pick up soft sky light instead of looking like flat plastic. There are no texture files: everything is drawn on a canvas at runtime, greyscale, and tinted by the tokens.
- **No grid** by default. No axes unless the data is plotted in space. No textures from files, no glossy or metal materials, no model files, no raw colours.
- Never recolour by hand. Tokens follow light and dark mode.

## Materials
| Call | Use for |
|---|---|
| `th.clay(0..3)` | housing and base (0), fixed hardware (1), moving parts (2), small details (3) |
| `th.accent()` | the one thing the title is about |
| `th.light()` | beams, lamps, indicators, hot cores: emissive in the accent |
| `th.glass()` | lenses, windows, tubes: translucent, so you can see inside |
| `th.coil(2)` | wound bobbins and solenoids: a striped wire bump |
| `th.board(1)` | circuit boards: a faint grid of traces |
| `th.wire([x,y,z], [x,y,z], r)` | a tube between two points, for leads and pipes |
| `th.glow(geometry)` | the halo that wraps a light: additive, never casts a shadow |

`th.glow()` takes a slightly larger geometry than the light it wraps, e.g. `s.add(th.glow(new THREE.CylinderGeometry(0.24, 0.24, 3.4, 32)))` around a 0.13-radius beam. Nothing else is allowed: if a part needs a look no call here gives, the answer is a different tint, not a new material.

## Bootstrap
```html
<figure>
<div class="scene wide" id="scene" role="img" aria-label="What the scene shows and the main finding."></div>
<figcaption>Illustrative model, simplified. Drag to orbit, scroll to zoom.</figcaption>
</figure>
<script>
const th = Visuals.three;
const s = th.create({ container: "#scene", OrbitControls: THREE.OrbitControls, position: [7, 6, 9] });
const body = s.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), th.clay(0)));
const focus = s.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 48, 32), th.accent()));
focus.position.set(0, 1.1, 0);
</script>
```
`s.add(obj)` adds an object and turns on its soft shadows. Meshes added with plain `s.scene.add` also get shadows on the next frame. Glow and contact-shadow meshes are exempt.

## Camera
The orbit is **free by default**: drag to any angle, scroll to zoom, right-drag or two-finger drag to pan. Polar angles stop just short of the poles (2°-178°), because OrbitControls gimbals there. The camera may go under the floor; the shadow floor hides itself when it does, and comes back above.
- `orbit: "studio"` restores the framed floor-level view (15°-75°). Use it when the floor is the chart's ground plane (clay bars, floor plans), so a reader cannot float under the data.
- `minDistance` / `maxDistance` bound the zoom (default 2.5 to 45) so nobody flies inside a part or loses the model.
- Give every free-camera fragment a way home: a **Reset view** button calling `s.reset()`, which returns to the position and target the fragment set.
- Say how to interact in the caption: "Drag to orbit, scroll to zoom, right-drag to pan."

## Options for `create`
- `up: "z"` for mechanical subjects that lie flat on a floor (gears, parts). Default is y-up.
- `position: [x, y, z]`, `target: [x, y, z]`, `fov` (default 38), `shadowSize` (half-width of the shadowed area, default 10).
- `orbit: "studio"`, `minDistance`, `maxDistance`, `minPolarAngle`, `maxPolarAngle`.
- `grid: true` (or `gridSize` / `gridDivisions`) only when scale matters. `axes: true` only for plotted data.
- `ground: false` removes the shadow floor. `environment: false` removes the stage sky. `lights: false` for your own lights (rare).
- Handle: `s.scene`, `s.camera`, `s.controls`, `s.add`, `s.contact`, `s.reset`, `s.onFrame(fn)`, `s.start()`, `s.stop()`, `s.render()`, `s.dispose()`.
- It renders on demand. Call `s.start()` only when something animates, and give every animation a Pause button.

## Composition
- Frame the object to fill about 60% of the view, camera slightly above, 3/4 angle. Target the middle of the subject: `s.controls.target.set(x, y, z)`.
- Keep the whole scene within about 10 units so the shadows stay sharp.
- Order tints by weight: the largest masses darkest (`clay(2)` or `clay(3)`), moving parts mid (`clay(1)`), small details lightest (`clay(0)`), so the subject separates from the stage behind it. A subject lighter than the backdrop disappears.
- Rounded edges read as clay. Prefer `CylinderGeometry`, `SphereGeometry`, `CapsuleGeometry` and bevelled `ExtrudeGeometry` to sharp boxes where it fits.

## Detail: holes, bolts, contact shadows
- `s.contact(x, y, r)` drops a soft contact shadow on the floor at floor coordinates `(x, y)`. Use it under parts that float clear of the floor: exploded layers, lifted lids, anything the directional shadow cannot reach. One per layer is enough.
- `th.holes(count, { ring, size })` returns a group of recessed discs for a wheel or plate. Add it to the part's own group, on its face, so the holes turn with it. Gears and flanges with holes read as made, not cast.
- `th.boltRing(radius, count)` returns a group of hex heads for a flange, same placement rule.
- These are detail, not decoration: a part with no reason to show bolts does not get them.

## Labels and legend
- Text in 3D is always an HTML overlay: `.hud` (top-left caption) or absolutely positioned `.scene-label` elements. No 3D text, no fonts from files.
- **Label the parts, by default.** A 3D visual ships with its `.scene-label` chips visible, placed with `th.project(s, point)` — one per important part, two to four words each.
- **Give a Labels toggle.** A button in `.controls` shows and hides them, so the model can also be read bare. They start visible.
- Re-place the chips whenever the camera or a labelled part moves: once after setup, on `s.controls` `change`, and inside `s.onFrame` while the animation runs.
- Legend with `.legend`: `<span class="k-clay">Housing</span>`, `k-clay-2`, `k-clay-3`, `k-clay-4`, and `<span class="k-accent">Escape wheel</span>`.
- Say how to interact in the caption ("Drag to orbit, scroll to zoom").

```html
<div class="scene wide" id="scene" role="img" aria-label="...">
  <span class="scene-label" id="label-gear">Escape wheel</span>
  <div class="controls">
    <button id="labels" class="sm">Labels</button>
    <button id="reset" class="sm">Reset view</button>
  </div>
</div>
<script>
const th = Visuals.three;
const s = th.create({ container: "#scene", OrbitControls: THREE.OrbitControls, up: "z", position: [7, -8, 9] });
const gear = s.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 48), th.accent()));
gear.rotation.x = Math.PI / 2;
gear.add(th.holes(5, { ring: 0.5, size: 0.16 }));
const at = new THREE.Vector3(0, 0, 0.4);
const label = document.getElementById("label-gear");
function place() {
  const p = th.project(s, at);
  label.style.left = p.x + "px";
  label.style.top = p.y + "px";
}
place();
if (s.controls) s.controls.addEventListener("change", place);
document.getElementById("labels").addEventListener("click", function () {
  document.querySelectorAll(".scene-label").forEach(function (el) { el.hidden = !el.hidden; });
});
document.getElementById("reset").addEventListener("click", s.reset);
</script>
```

## Motion and exploded views
- Gears and parts turn: `s.onFrame(function () { gear.rotation.z = performance.now() * 0.0006; })`, with a Pause button, and `s.start()` only after the fragment loads.
- An exploded view separates parts along their axis with a slider: move each part on `input` and call `s.render()` — no loop, no reduced-motion guard needed for a slider. Give the layers `s.contact()` blobs so they read as floating sheets.
- Reduced motion: `if (Visuals.tokens().reduceMotion) { s.render(); } else { s.start(); }`, and hide the Pause button the same way as an ask button.

## Rules
- At most about 500 meshes. Use `InstancedMesh` beyond that.
- Normalise to a fixed range so the scene fits the camera; state the true scale in the caption.
- Label illustrative geometry as "Illustrative" and say what was simplified.
- Do not set `scene.background`, `scene.environment` or `setClearColor`, and do not add `window` listeners; `create` handles theme, resize and the stage sky.
- WebGL may be missing in a host. Always include a `<details>` data table or a plain-language description beneath the scene.
- Dark mode is automatic; check that the accent still stands out and no tint becomes the focus by accident.

## When not to use it
Ranked comparisons, trends, shares, tables: use Chart.js or HTML. If a 2D view tells the story as well, use the 2D view.

## Blueprint (planned second style, not in this version)
For purely mechanical subjects, a line-drawn "blueprint" look may be added later. Until then, Studio clay is the only 3D style.
