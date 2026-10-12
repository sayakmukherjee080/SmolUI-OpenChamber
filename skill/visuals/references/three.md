# 3D (Three.js, `libs: three`)

`THREE` is a global (r186, with `THREE.OrbitControls`). Use 3D only when the data is truly spatial (a model, a surface, a layout). Never for ordinary bar or line data.

## Bootstrap
```html
<figure>
<div class="scene" id="scene" role="img" aria-label="What the scene shows and the main finding."></div>
<figcaption>Source: ... Axes: x = ..., y = ..., z = ....</figcaption>
</figure>
<script>
const th = Visuals.three;
const s = th.create({ container: "#scene", OrbitControls: THREE.OrbitControls, position: [7, 6, 8.5], gridSize: 8, gridDivisions: 8 });
// s.scene, s.camera, s.renderer, s.controls, s.onFrame(fn), s.start(), s.stop(), s.render(), s.dispose()
</script>
```
`.scene` variants: `.scene.square`, `.scene.wide`. Overlay text with `.hud` (children of `.scene`, absolutely positioned) and buttons in `.controls`.

`create` sets the background, camera, lights, grid and resize handling. It renders on demand and on control changes; call `s.start()` only when you animate (rotation); it re-themes on mode change.

## Materials (theme-aware)
- `th.material(keyOrIndex, opts?)`: lit material. A number is a series index (0 to 5); a string is a token name (`"accent"`).
- `th.basic(key, opts?)`: unlit. `th.line(key, opts?)`: line material.
- Colours follow dark/light automatically. Never `new THREE.Color("#...")`; the lint rejects raw colours.

## Helpers
- `create` adds lights and a grid by default. Options: `lights: false`, `grid: false`, `gridSize`, `gridDivisions`, `axes: true` (or a length) for x orange, y green, z blue lines, `fov`, `position: [x, y, z]`.
- Standalone: `th.lights(scene)`, `th.grid(size, divisions)`, `th.axes(size)`.
- Camera: `s.camera.position.set(x, y, z)`; target: `s.controls.target.set(0, 1.5, 0)`.

## Rules
- Normalise heights to a fixed range (for example 0 to 4) so the scene fits the camera; state the true scale in the caption.
- Label axes. Provide a legend (`.legend`) for colours and tell the user how to interact ("Drag to orbit, scroll to zoom") in the subtitle.
- At most about 500 meshes. Use `InstancedMesh` beyond that.
- No textures from URLs, no model loaders, no fonts from files. Text in 3D: use `.hud` HTML overlays instead.
- Do not call `setClearColor` or set `scene.background` yourself; `create` does it from the theme.
- WebGL may be missing in some hosts. The 2D alternative is a `<details>` data table beneath; include it.
- Do not add listeners on `window`; `create` already resizes with its container.

## Motion and exploded views
- `s.start()` runs the render loop; `s.stop()` pauses it. Start only when something moves; when `Visuals.tokens().reduceMotion` is true, render one frame and keep the still scene interactive.
- Exploded view (a mechanism, an assembly, layers): one slider separates the parts; move each mesh on `input` and call `s.render()` — no loop needed.
  ```html
  <div class="toolbar"><label for="split">Explode <output id="splitOut">0%</output></label><input id="split" type="range" min="0" max="100" value="0"></div>
  <script>
  const parts = []; // { mesh, base: Vector3, dir: Vector3 }
  document.getElementById("split").addEventListener("input", (e) => {
    const k = e.target.value / 100;
    document.getElementById("splitOut").textContent = e.target.value + "%";
    parts.forEach((p) => p.mesh.position.copy(p.base).addScaledVector(p.dir, k * 2.4));
    s.render();
  });
  </script>
  ```
- Guided tours: a step change moves `s.camera` (or `s.controls.target`) and calls `s.render()`; see `references/motion.md`.

## Example
`examples/06-scene-3d.visual.html`
