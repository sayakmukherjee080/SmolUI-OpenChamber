# Motion (animation and guided tours)

Animate process, mechanism and state change — never decoration. Everything runs in a sandboxed 400-500 px panel: animate with the platform (CSS, the Web Animations API, D3, Three.js), never with a library that is not in the manifest.

## The contract

- Read the preference once: `const calm = Visuals.tokens().reduceMotion;` (the adapter reads `prefers-reduced-motion`).
- `calm` → skip the animation, show the end state, keep every control working.
- A repeating loop needs a visible control (play / pause / step) in `.toolbar` or `.controls`. Never autoplay-only.
- One-shot entrance animations on load (up to about 400 ms) are fine without a control.
- In a loop, animate `transform`, `opacity`, `stroke-dashoffset` or canvas/WebGL content — not layout (`width`, `height`, `top`, `left`).
- No `setTimeout` chains longer than a few steps; no animation on every hover.
- The lint warns (W22) on `requestAnimationFrame` / `setInterval` with no reduced-motion guard.

## Draw-on (an SVG path that traces itself)

```html
<figure>
<svg viewBox="0 0 200 60" role="img" aria-label="Power path from the mainspring to the hands.">
  <path id="route" class="stroke-1" pathLength="1" d="M8 52 C 60 52, 60 8, 112 8 S 168 8, 192 8" fill="none"/>
</svg>
<figcaption>Source: ... As of ...</figcaption>
</figure>
<script>
const route = document.getElementById("route");
const calm = Visuals.tokens().reduceMotion;
route.style.strokeDasharray = "1";
route.style.strokeDashoffset = calm ? "0" : "1";
if (!calm) {
  route.style.transition = "stroke-dashoffset 1.4s ease-out";
  requestAnimationFrame(() => { route.style.strokeDashoffset = "0"; });
}
</script>
```

## State change (a class and a CSS transition)

```html
<style>
  .part { transition: transform 200ms ease-out, opacity 200ms ease-out; opacity: .55; }
  .part.on { opacity: 1; transform: translateY(-2px); }
</style>
```

Toggle `on` from the control (a step, a filter, a hover-less click). CSS handles the interpolation.

## One-shot entrance (Web Animations API)

```js
el.animate(
  [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
  { duration: 300, easing: "ease-out" },
);
```

## D3 transitions

```js
d3.selectAll("rect")
  .transition().duration(500)
  .attr("y", (d) => y(d.value))
  .attr("height", (d) => h - y(d.value));
```

Rebuild the chart once, then update data and transition on each input — never recreate it per event.

## Three.js scenes

- `s.start()` runs the frame loop, `s.stop()` pauses it. Start only when something moves; when `calm`, render one frame and keep the still scene interactive.
- Exploded view: a slider separates the parts; move each mesh along its axis on `input` and call `s.render()` — no loop. Details in `references/three.md`.

## Guided tour (stepper plus sections)

One `.stepper` above, one `<section>` per step, Back / Next in `.toolbar`. Steps are buttons with `aria-current="step"`; sections toggle with the `hidden` attribute; redraw the chart or move the camera when the step changes.

```html
<ol class="stepper"><li class="done">Wind</li><li class="current">Escapement</li><li>Hands</li></ol>
<div class="toolbar">
  <button id="prev" class="sm">Back</button>
  <button id="next" class="sm primary">Next</button>
</div>
<section id="step-0">...</section>
<section id="step-1" hidden>...</section>
<section id="step-2" hidden>...</section>
<script>
const steps = [...document.querySelectorAll("section")];
const marks = [...document.querySelectorAll(".stepper li")];
let at = 0;
function show(next) {
  at = Math.max(0, Math.min(steps.length - 1, next));
  steps.forEach((section, i) => { section.hidden = i !== at; });
  marks.forEach((mark, i) => { mark.className = i < at ? "done" : i === at ? "current" : ""; });
  // redraw what the new step needs: chart.update(), draw(at), or scene.render()
}
document.getElementById("prev").addEventListener("click", () => show(at - 1));
document.getElementById("next").addEventListener("click", () => show(at + 1));
</script>
```

## Mechanisms

Gears, escapements, engines: show the motion (a draw-on path, an animated SVG, or a Three.js scene with an exploded view). Keep the geometry illustrative and say so in the caption; the numbers that matter (ratios, periods, part counts) go in the text or a `<details>` table. A flowchart is for the abstract path only.
