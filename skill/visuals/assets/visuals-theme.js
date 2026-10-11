/* visuals-theme.js
   Token-driven theming for Chart.js, D3, Three.js, KaTeX and Mermaid.
   Reads the CSS custom properties from visuals.css, so a chart, a 3D scene and an
   equation all share one palette, follow light/dark, and re-theme when the mode changes.
   Libraries are passed in (nothing is imported), so it works with any bundling.

   Usage after loading the libraries and visuals.css:
     Visuals.auto();                    // themes whichever of Chart, d3, THREE, katex are loaded
   or one at a time:
     Visuals.chart(Chart); Visuals.d3(d3); Visuals.three(THREE); Visuals.katex(katex);
*/
(function (root) {
  "use strict";
  var doc = root.document;
  var VERSION = "1.2.0";

  // ---------------------------------------------------------------- token reading
  var COLORS = [
    "bg", "surface", "surface-sunken", "track", "text", "text-2", "text-muted",
    "border", "border-strong", "control-border",
    "accent", "accent-hover", "on-accent", "accent-soft", "accent-text",
    "ok", "ok-soft", "ok-text", "warn", "warn-soft", "warn-text",
    "danger", "danger-soft", "danger-text", "info", "info-soft", "info-text",
    "s1", "s2", "s3", "s4", "s5", "s6", "s-other",
    "seq-1", "seq-2", "seq-3", "seq-4", "seq-5",
    "div-neg-2", "div-neg-1", "div-mid", "div-pos-1", "div-pos-2",
    "chart-grid", "chart-axis", "chart-label", "chart-crosshair", "chart-tooltip-bg", "chart-tooltip-border",
    "syn-comment", "syn-keyword", "syn-string", "syn-number", "syn-function", "syn-type", "syn-tag", "syn-attr", "syn-operator",
    "three-bg", "three-grid", "three-grid-sub", "three-axis-x", "three-axis-y", "three-axis-z", "three-label"
  ];
  var NUMBERS = [
    "chart-area-alpha", "chart-line-width", "chart-point-radius", "chart-bar-radius", "chart-font-size",
    "chart-tension", "chart-legend-box", "chart-padding", "chart-bar-max", "chart-anim",
    "three-ambient", "three-key", "three-fill", "three-roughness", "three-metalness", "three-fov",
    "radius", "radius-sm", "radius-lg", "text-xs", "text-sm", "text-base"
  ];
  var cache = null, signature = "", listeners = [], warnedMissing = false, warnedOther = false;

  function readVar(name) {
    return root.getComputedStyle(doc.documentElement).getPropertyValue("--" + name).trim();
  }
  function mode() {
    var a = doc.documentElement.getAttribute("data-theme");
    if (a === "dark" || a === "light") return a;
    return root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function tokens() {
    if (cache) return cache;
    var t = { mode: mode(), color: {}, num: {}, str: {}, font: {}, series: [], seq: [], div: [] };
    COLORS.forEach(function (n) { t.color[n] = readVar(n); });
    NUMBERS.forEach(function (n) { var v = parseFloat(readVar(n)); t.num[n] = isNaN(v) ? 0 : v; });
    t.str["chart-donut-cutout"] = readVar("chart-donut-cutout") || "66%";
    t.font.sans = readVar("font-sans") || "system-ui, sans-serif";
    t.font.mono = readVar("font-mono") || "ui-monospace, monospace";
    for (var i = 1; i <= 6; i++) t.series.push(t.color["s" + i]);
    t.other = t.color["s-other"];
    for (i = 1; i <= 5; i++) t.seq.push(t.color["seq-" + i]);
    t.div = ["div-neg-2", "div-neg-1", "div-mid", "div-pos-1", "div-pos-2"].map(function (n) { return t.color[n]; });
    t.reduceMotion = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!t.color.surface && !warnedMissing) {
      warnedMissing = true;
      if (root.console) console.warn("Visuals: tokens not found. Load visuals.css before theming.");
    }
    cache = t;
    return t;
  }
  function sig() {
    var t = tokens();
    return t.mode + "|" + t.color.surface + "|" + t.color.text + "|" + t.color.accent + "|" + t.color.s1;
  }

  // ---------------------------------------------------------------- theme change events
  function refresh() {
    cache = null;
    var s = sig();
    if (s === signature) return;
    signature = s;
    listeners.slice().forEach(function (fn) { try { fn(tokens()); } catch (e) { if (root.console) console.error(e); } });
  }
  function onTheme(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }
  if (doc && root.MutationObserver) {
    new root.MutationObserver(refresh).observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  }
  if (root.matchMedia) {
    var mq = root.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", refresh);
  }
  signature = doc ? sig() : "";

  // ---------------------------------------------------------------- color utilities
  function hexToRgb(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h.split("").map(function (x) { return x + x; }).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function isHex(c) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c).trim()); }
  function rgbToHex(r) {
    return "#" + r.map(function (x) { var v = Math.max(0, Math.min(255, Math.round(x))).toString(16); return v.length < 2 ? "0" + v : v; }).join("");
  }
  function alpha(c, a) {
    if (isHex(c)) { var r = hexToRgb(c); return "rgba(" + r[0] + ", " + r[1] + ", " + r[2] + ", " + a + ")"; }
    return "color-mix(in srgb, " + c + " " + Math.round(a * 100) + "%, transparent)";
  }
  function mix(a, b, t) {
    if (!isHex(a) || !isHex(b)) return t < 0.5 ? a : b;
    var x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  function luminance(c) {
    var v = hexToRgb(c).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  /** Ink or paper, whichever reads better on this background (for labels inside cells). */
  function readable(bg) {
    var ink = "#0b130e", paper = "#ffffff";
    if (!isHex(bg)) return tokens().color.text;
    return contrast(bg, ink) >= contrast(bg, paper) ? ink : paper;
  }

  // ---------------------------------------------------------------- series and ramps
  /** Color for series i (0-based). Beyond six series the neutral "other" color is used. */
  function series(i) {
    var t = tokens();
    if (i < t.series.length) return t.series[i];
    if (!warnedOther && root.console) { warnedOther = true; console.warn("Visuals: more than 6 series. Group the smallest into one 'Other' series."); }
    return t.other;
  }
  function lerpStops(stops, t) {
    if (!(t === t)) t = 0;
    t = Math.max(0, Math.min(1, t));
    var s = t * (stops.length - 1), i = Math.floor(s);
    if (i >= stops.length - 1) return stops[stops.length - 1];
    return mix(stops[i], stops[i + 1], s - i);
  }
  /** Sequential color function: value in [min, max] to a green ramp color. */
  function seq(min, max) {
    return function (v) { return lerpStops(tokens().seq, max === min ? 0 : (v - min) / (max - min)); };
  }
  /** Diverging color function: min..mid..max to blue, neutral, orange. */
  function div(min, mid, max) {
    return function (v) {
      var t = v <= mid ? (mid === min ? 0.5 : 0.5 * (v - min) / (mid - min)) : (max === mid ? 0.5 : 0.5 + 0.5 * (v - mid) / (max - mid));
      return lerpStops(tokens().div, t);
    };
  }

  // ---------------------------------------------------------------- number formatting
  var locale = "en-IN";
  function nf(opts) { try { return new Intl.NumberFormat(locale, opts); } catch (e) { return new Intl.NumberFormat("en", opts); } }
  var fmt = {
    num: function (v, digits) { return nf({ maximumFractionDigits: digits == null ? 1 : digits }).format(v); },
    compact: function (v) { return nf({ notation: "compact", maximumFractionDigits: 1 }).format(v); },
    pct: function (v, digits) { return nf({ style: "percent", maximumFractionDigits: digits == null ? 0 : digits }).format(v); },
    ms: function (v) { return fmt.num(v, 0) + " ms"; }
  };

  // ---------------------------------------------------------------- Chart.js (v4)
  var POINT_STYLES = ["circle", "rect", "triangle", "rectRot", "star", "cross"];
  var chartLib = null;

  function ensure(o, k) { if (!o[k] || typeof o[k] !== "object") o[k] = {}; return o[k]; }

  function chartDefaults(Chart) {
    var t = tokens(), C = t.color, N = t.num, D = Chart.defaults;
    D.responsive = true;
    D.maintainAspectRatio = false;
    D.color = C["text-2"];
    D.borderColor = C["chart-grid"];
    D.backgroundColor = alpha(C.s1, 0.4);
    var font = ensure(D, "font");
    font.family = t.font.sans; font.size = N["chart-font-size"]; font.weight = "400";
    ensure(ensure(D, "animation"), "duration");
    D.animation.duration = t.reduceMotion ? 0 : N["chart-anim"];
    ensure(ensure(D, "layout"), "padding");
    D.layout.padding = N["chart-padding"];

    var plugins = ensure(D, "plugins");
    var legend = ensure(plugins, "legend");
    legend.position = "top"; legend.align = "start";
    var ll = ensure(legend, "labels");
    ll.color = C["text-2"]; ll.usePointStyle = true; delete ll.pointStyle;
    ll.boxWidth = N["chart-legend-box"]; ll.boxHeight = N["chart-legend-box"]; ll.padding = 14;
    var title = ensure(plugins, "title");
    title.color = C.text; title.align = "start";
    ensure(title, "font").weight = "600"; title.font.size = N["text-base"] || 14;
    var sub = ensure(plugins, "subtitle"); sub.color = C["text-muted"]; sub.align = "start";
    var tip = ensure(plugins, "tooltip");
    tip.backgroundColor = C["chart-tooltip-bg"]; tip.borderColor = C["chart-tooltip-border"]; tip.borderWidth = 1;
    tip.titleColor = C.text; tip.bodyColor = C["text-2"]; tip.footerColor = C["text-muted"];
    tip.padding = 10; tip.cornerRadius = N.radius || 8; tip.caretSize = 5; tip.boxPadding = 4;
    tip.usePointStyle = true; ensure(tip, "titleFont").weight = "600";

    var scale = ensure(D, "scale");
    scale.grace = "5%";
    var grid = ensure(scale, "grid"); grid.color = C["chart-grid"]; grid.drawTicks = false;
    var border = ensure(scale, "border"); border.color = C["chart-axis"];
    var ticks = ensure(scale, "ticks"); ticks.color = C["chart-label"]; ticks.padding = 6;
    var stitle = ensure(scale, "title"); stitle.color = C["text-muted"];
    var scales = ensure(D, "scales");
    ensure(ensure(scales, "category"), "grid").display = false;
    var radial = ensure(scales, "radialLinear");
    ensure(radial, "grid").color = C["chart-grid"];
    ensure(radial, "angleLines").color = C["chart-grid"];
    ensure(radial, "pointLabels").color = C["text-2"];
    ensure(radial, "ticks").backdropColor = "transparent";
    radial.ticks.color = C["chart-label"];

    var el = ensure(D, "elements");
    var line = ensure(el, "line"); line.borderWidth = N["chart-line-width"]; line.tension = N["chart-tension"]; line.borderCapStyle = "round"; line.borderJoinStyle = "round";
    var point = ensure(el, "point"); point.radius = N["chart-point-radius"]; point.hoverRadius = N["chart-point-radius"] + 2; point.borderWidth = 2; point.borderColor = C.surface;
    var bar = ensure(el, "bar"); bar.borderRadius = N["chart-bar-radius"]; bar.borderWidth = 0;
    var arc = ensure(el, "arc"); arc.borderColor = C.surface; arc.borderWidth = 2;
    var ds = ensure(D, "datasets");
    var dbar = ensure(ds, "bar"); dbar.maxBarThickness = N["chart-bar-max"]; dbar.categoryPercentage = 0.7; dbar.barPercentage = 0.9;
    if (Chart.overrides && Chart.overrides.doughnut) Chart.overrides.doughnut.cutout = t.str["chart-donut-cutout"];
  }

  /** Paints datasets from the palette unless the author set colors. Re-runs on theme change. */
  var palettePlugin = {
    id: "visualsPalette",
    beforeUpdate: function (chart) {
      var t = tokens(), C = t.color, type = chart.config.type, sets = chart.data.datasets || [];
      sets.forEach(function (d, i) {
        if (d._vAuto === undefined) d._vAuto = d.backgroundColor === undefined && d.borderColor === undefined;
        if (!d._vAuto) return;
        var c = series(i);
        if (type === "pie" || type === "doughnut" || type === "polarArea") {
          var n = (d.data || []).length;
          d.backgroundColor = Array.apply(null, Array(n)).map(function (_, k) { return series(k); });
          d.borderColor = C.surface;
        } else if (type === "bar") {
          d.backgroundColor = c; d.borderColor = c;
        } else if (type === "bubble") {
          d.backgroundColor = alpha(c, 0.55); d.borderColor = c;
        } else if (type === "scatter") {
          d.backgroundColor = c; d.borderColor = C.surface;
          if (sets.length > 1 && d.pointStyle === undefined) d.pointStyle = POINT_STYLES[i % POINT_STYLES.length];
        } else {
          d.borderColor = c; d.backgroundColor = alpha(c, t.num["chart-area-alpha"]);
          d.pointBackgroundColor = c; d.pointBorderColor = C.surface;
          if (sets.length > 1 && d.pointStyle === undefined) d.pointStyle = POINT_STYLES[i % POINT_STYLES.length];
        }
      });
    }
  };

  function chart(Chart) {
    if (!Chart || !Chart.defaults) throw new Error("Visuals.chart: pass the Chart.js v4 Chart class");
    chartLib = Chart;
    chartDefaults(Chart);
    if (!Chart._vRegistered) { Chart.register(palettePlugin); Chart._vRegistered = true; }
    if (!Chart._vSubscribed) {
      Chart._vSubscribed = true;
      onTheme(function () {
        chartDefaults(Chart);
        var inst = Chart.instances || {};
        Object.keys(inst).forEach(function (k) { try { inst[k].update("none"); } catch (e) { /* chart may be mid-teardown */ } });
      });
    }
    return Chart;
  }

  // ---------------------------------------------------------------- D3 (v7)
  function d3api(d3) {
    var api = {
      /** Ordinal color scale for named series; the 7th and later map to the neutral "other". */
      series: function (domain) {
        return d3.scaleOrdinal().domain(domain).range(domain.map(function (_, i) { return series(i); }));
      },
      sequential: function (min, max) { return d3.scaleSequential(function (t) { return lerpStops(tokens().seq, t); }).domain([min, max]); },
      diverging: function (min, mid, max) { return d3.scaleDiverging(function (t) { return lerpStops(tokens().div, t); }).domain([min, mid, max]); },
      steps: function (min, max) { return d3.scaleQuantize().domain([min, max]).range(tokens().seq.slice()); },
      /** Call on an axis group so the stylesheet's .axis rules apply (removes d3's inline defaults). */
      axis: function (g) {
        g.classed("axis", true).attr("fill", null).attr("font-size", null).attr("font-family", null);
        return g;
      },
      /** Light grid lines from an axis generator: g.call(api.grid(d3.axisLeft(y), width)). */
      grid: function (axisGen, length) {
        return function (g) {
          g.call(axisGen.tickSize(-length).tickFormat(""));
          g.classed("gridlines", true).attr("fill", null).attr("font-size", null).attr("font-family", null);
          g.select(".domain").remove();
        };
      },
      /** Hover tooltip using the .tooltip styles. container must contain the chart. show(html) takes HTML: pass data through Visuals.esc(). */
      tooltip: function (container) {
        var host = typeof container === "string" ? doc.querySelector(container) : container;
        if (root.getComputedStyle(host).position === "static") host.style.position = "relative";
        var el = doc.createElement("div");
        el.className = "tooltip"; el.hidden = true; host.appendChild(el);
        return {
          el: el,
          show: function (html, event) {
            el.innerHTML = html; el.hidden = false;
            var r = host.getBoundingClientRect();
            var x = event.clientX - r.left + 12, y = event.clientY - r.top + 12;
            if (x + el.offsetWidth > r.width) x = event.clientX - r.left - el.offsetWidth - 12;
            if (y + el.offsetHeight > r.height) y = event.clientY - r.top - el.offsetHeight - 12;
            el.style.left = Math.max(0, x) + "px"; el.style.top = Math.max(0, y) + "px";
          },
          hide: function () { el.hidden = true; }
        };
      },
      fmt: fmt
    };
    return api;
  }

  // ---------------------------------------------------------------- Three.js
  function threeApi(THREE) {
    var tracked = [];       // { obj, key, kind } so colors follow the mode
    var created = [];       // scenes made by create()

    function color(key) {
      var t = tokens();
      var v = typeof key === "number" ? series(key) : (t.color[key] || key);
      return new THREE.Color(v);
    }
    function track(obj, key, kind) { tracked.push({ obj: obj, key: key, kind: kind }); return obj; }

    function recolor() {
      tracked.forEach(function (r) {
        if (r.kind === "material") r.obj.color.copy(color(r.key));
      });
      created.forEach(function (s) { s._retheme(); });
    }
    onTheme(recolor);

    var api = {
      color: color,
      /** Standard (lit) material in a series or token color, following the theme. */
      material: function (key, opts) {
        var t = tokens(), o = opts || {};
        var m = new THREE.MeshStandardMaterial(Object.assign({ color: color(key), roughness: t.num["three-roughness"], metalness: t.num["three-metalness"] }, o));
        if (o.color === undefined) track(m, key, "material");
        return m;
      },
      /** Flat unlit material, good for wireframes and 2D-looking shapes. */
      basic: function (key, opts) {
        var m = new THREE.MeshBasicMaterial(Object.assign({ color: color(key) }, opts || {}));
        if (!opts || opts.color === undefined) track(m, key, "material");
        return m;
      },
      line: function (key, opts) {
        var m = new THREE.LineBasicMaterial(Object.assign({ color: color(key) }, opts || {}));
        if (!opts || opts.color === undefined) track(m, key, "material");
        return m;
      },
      /** Ambient + key + fill lights from the tokens. */
      lights: function (scene) {
        var t = tokens(), N = t.num, group = new THREE.Group();
        group.name = "visuals-lights";
        group.add(new THREE.AmbientLight(0xffffff, N["three-ambient"]));
        var key = new THREE.DirectionalLight(0xffffff, N["three-key"]); key.position.set(5, 8, 6); group.add(key);
        var fill = new THREE.DirectionalLight(0xffffff, N["three-fill"]); fill.position.set(-6, 2, -4); group.add(fill);
        if (scene) scene.add(group);
        return group;
      },
      grid: function (size, divisions) {
        var g = new THREE.GridHelper(size || 10, divisions || 10, color("three-grid"), color("three-grid-sub"));
        g.userData.vGrid = { size: size || 10, divisions: divisions || 10 };
        return g;
      },
      /** X (orange), Y (green), Z (blue) axis lines from the tokens. */
      axes: function (size) {
        var s = size || 5, g = new THREE.Group();
        g.userData.vAxes = s;
        [["three-axis-x", [s, 0, 0]], ["three-axis-y", [0, s, 0]], ["three-axis-z", [0, 0, s]]].forEach(function (a) {
          var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(a[1][0], a[1][1], a[1][2])]);
          g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color(a[0]) })));
        });
        return g;
      },
      /**
       * Scene bootstrap. container is a .scene element. Returns { scene, camera, renderer, controls, onFrame, dispose }.
       * Pass OrbitControls (from three/addons) to enable drag to orbit.
       */
      create: function (opts) {
        var o = opts || {};
        var host = typeof o.container === "string" ? doc.querySelector(o.container) : o.container;
        var t = tokens();
        var scene = new THREE.Scene();
        scene.background = color("three-bg");
        var camera = new THREE.PerspectiveCamera(o.fov || t.num["three-fov"] || 40, 1, 0.1, 1000);
        var p = o.position || [6, 5, 8]; camera.position.set(p[0], p[1], p[2]); camera.lookAt(0, 0, 0);
        var renderer = o.renderer || new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
        if (host && renderer.domElement && !renderer.domElement.parentNode) host.appendChild(renderer.domElement);
        var controls = null;
        if (o.OrbitControls && renderer.domElement) {
          controls = new o.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
        }
        if (o.lights !== false) api.lights(scene);
        var gridObj = null, axesObj = null;
        function build() {
          if (gridObj) { scene.remove(gridObj); gridObj.geometry.dispose(); gridObj.material.dispose(); gridObj = null; }
          if (axesObj) { scene.remove(axesObj); axesObj.children.forEach(function (c) { c.geometry.dispose(); c.material.dispose(); }); axesObj = null; }
          if (o.grid !== false) { gridObj = api.grid(o.gridSize, o.gridDivisions); scene.add(gridObj); }
          if (o.axes) { axesObj = api.axes(o.axes === true ? 5 : o.axes); scene.add(axesObj); }
        }
        build();
        var frameFns = [], raf = 0, running = false, ro = null;
        function size() {
          if (!host) return;
          var w = host.clientWidth || 300, h = host.clientHeight || 225;
          renderer.setSize(w, h, false);
          camera.aspect = w / h; camera.updateProjectionMatrix();
        }
        function tick() {
          if (!running) return;
          raf = root.requestAnimationFrame(tick);
          if (controls) controls.update();
          frameFns.forEach(function (fn) { fn(); });
          renderer.render(scene, camera);
        }
        var handle = {
          scene: scene, camera: camera, renderer: renderer, controls: controls,
          onFrame: function (fn) { frameFns.push(fn); },
          start: function () { if (!running) { running = true; tick(); } },
          stop: function () { running = false; if (raf) root.cancelAnimationFrame(raf); },
          render: function () { renderer.render(scene, camera); },
          _retheme: function () { scene.background = color("three-bg"); build(); if (!running) handle.render(); },
          dispose: function () {
            handle.stop();
            if (ro) ro.disconnect();
            if (controls && controls.dispose) controls.dispose();
            created.splice(created.indexOf(handle), 1);
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
        created.push(handle);
        size();
        if (root.ResizeObserver && host) { ro = new root.ResizeObserver(function () { size(); if (!running) handle.render(); }); ro.observe(host); }
        if (o.autoStart !== false && root.requestAnimationFrame) handle.start();
        return handle;
      }
    };
    return api;
  }

  // ---------------------------------------------------------------- KaTeX
  var MACRO_NAMES = ["accent", "muted", "sA", "sB", "sC", "sD", "sE", "sF"];
  function katexApi(katex) {
    var tracked = [];
    function macros() {
      var t = tokens(), C = t.color;
      // In a macro body "#" starts an argument, so a hex color's "#" is written "##".
      function esc(h) { return String(h).replace(/#/g, "##"); }
      var m = {
        "\\R": "\\mathbb{R}", "\\N": "\\mathbb{N}", "\\Z": "\\mathbb{Z}", "\\Q": "\\mathbb{Q}", "\\C": "\\mathbb{C}",
        "\\E": "\\operatorname{\\mathbb{E}}", "\\Var": "\\operatorname{Var}", "\\argmax": "\\operatorname*{arg\\,max}", "\\argmin": "\\operatorname*{arg\\,min}",
        "\\accent": "\\textcolor{" + esc(C.accent) + "}{#1}",
        "\\muted": "\\textcolor{" + esc(C["text-muted"]) + "}{#1}"
      };
      ["sA", "sB", "sC", "sD", "sE", "sF"].forEach(function (n, i) { m["\\" + n] = "\\textcolor{" + esc(t.series[i]) + "}{#1}"; });
      return m;
    }
    function options(extra) {
      return Object.assign({ throwOnError: false, errorColor: "var(--math-error)", strict: "ignore", trust: false, output: "htmlAndMathml", macros: macros() }, extra || {});
    }
    var api = {
      /** Render TeX into an element. */
      render: function (el, tex, opts) { katex.render(tex, el, options(opts)); return el; },
      /** TeX to an HTML string. */
      html: function (tex, opts) { return katex.renderToString(tex, options(opts)); },
      /**
       * Render every element marked data-math under root: <span data-math>E=mc^2</span>,
       * <div data-math="display">\int_0^1 x\,dx</div>. Re-renders on theme change so \accent and \sA..\sF follow the mode.
       */
      renderAll: function (scope) {
        var host = scope || doc;
        Array.prototype.forEach.call(host.querySelectorAll("[data-math]"), function (el) {
          var tex = el._vTex !== undefined ? el._vTex : el.textContent;
          el._vTex = tex;
          var display = el.getAttribute("data-math") === "display" || el.hasAttribute("data-display") || el.tagName === "DIV";
          api.render(el, tex, { displayMode: display });
          if (tracked.indexOf(el) < 0) tracked.push(el);
        });
      }
    };
    onTheme(function () {
      tracked = tracked.filter(function (el) { return doc.contains(el); });
      tracked.forEach(function (el) {
        if (MACRO_NAMES.some(function (n) { return el._vTex.indexOf("\\" + n) >= 0; })) {
          api.render(el, el._vTex, { displayMode: el.getAttribute("data-math") === "display" || el.hasAttribute("data-display") || el.tagName === "DIV" });
        }
      });
    });
    return api;
  }


  // ---------------------------------------------------------------- Mermaid (v11/v12)
  function mermaidApi(mermaid) {
    var tracked = [], counter = 0;
    function tint(c, i) { return mix(c, tokens().color.surface, 0.35 + 0.1 * (i % 3)); }
    function scale(n) {
      var t = tokens(), out = [];
      for (var i = 0; i < n; i++) out.push(i < 6 ? t.series[i] : tint(t.series[i % 6], i));
      return out;
    }
    function themeVars() {
      var t = tokens(), C = t.color, cs = scale(12), v = {
        darkMode: t.mode === "dark", dropShadow: "none", fontFamily: t.font.sans, fontSize: "13px", background: "transparent",
        primaryColor: C.surface, primaryTextColor: C.text, primaryBorderColor: C["border-strong"],
        secondaryColor: C["accent-soft"], secondaryTextColor: C["accent-text"], secondaryBorderColor: C.accent,
        tertiaryColor: C["surface-sunken"], tertiaryTextColor: C["text-2"], tertiaryBorderColor: C.border,
        lineColor: C["text-muted"], textColor: C["text-2"], titleColor: C.text,
        mainBkg: C.surface, nodeBorder: C["border-strong"], nodeTextColor: C.text,
        clusterBkg: C["surface-sunken"], clusterBorder: C.border, edgeLabelBackground: C.bg,
        actorBkg: C.surface, actorBorder: C["border-strong"], actorTextColor: C.text, actorLineColor: C["border-strong"],
        signalColor: C["text-muted"], signalTextColor: C["text-2"],
        labelBoxBkgColor: C["accent-soft"], labelBoxBorderColor: C.accent, labelTextColor: C["accent-text"], loopTextColor: C["text-2"],
        noteBkgColor: C["warn-soft"], noteTextColor: C["warn-text"], noteBorderColor: C.warn,
        activationBkgColor: C["accent-soft"], activationBorderColor: C.accent, sequenceNumberColor: C["on-accent"],
        altBackground: C["surface-sunken"], compositeBackground: C["surface-sunken"], compositeBorder: C.border, compositeTitleBackground: C.surface,
        attributeBackgroundColorOdd: C.surface, attributeBackgroundColorEven: C["surface-sunken"],
        gridColor: C.border, sectionBkgColor: C["surface-sunken"], altSectionBkgColor: C.surface, sectionBkgColor2: C["surface-sunken"],
        taskBkgColor: C.accent, taskBorderColor: C["accent-hover"], taskTextColor: C["on-accent"], taskTextLightColor: C["on-accent"],
        taskTextDarkColor: C.text, taskTextOutsideColor: C["text-2"], taskTextClickableColor: C["accent-text"],
        activeTaskBkgColor: C.s4, activeTaskBorderColor: C.s4, doneTaskBkgColor: C.track, doneTaskBorderColor: C["border-strong"],
        critBkgColor: C.danger, critBorderColor: C.danger, todayLineColor: C.danger,
        quadrant1Fill: C["ok-soft"], quadrant2Fill: C["accent-soft"], quadrant3Fill: C["surface-sunken"], quadrant4Fill: C["warn-soft"],
        quadrant1TextFill: C["ok-text"], quadrant2TextFill: C["accent-text"], quadrant3TextFill: C["text-2"], quadrant4TextFill: C["warn-text"],
        quadrantPointFill: C.accent, quadrantPointTextFill: C.text, quadrantXAxisTextFill: C["text-muted"], quadrantYAxisTextFill: C["text-muted"],
        quadrantInternalBorderStrokeFill: C["border-strong"], quadrantExternalBorderStrokeFill: C["border-strong"], quadrantTitleFill: C.text,
        commitLabelColor: C.text, commitLabelBackground: C.surface, tagLabelColor: C.text, tagLabelBackground: C["surface-sunken"], tagLabelBorder: C["border-strong"]
      };
      cs.forEach(function (c, i) { v["cScale" + i] = c; v["cScaleLabel" + i] = readable(c); v["cScalePeer" + i] = c; });
      cs.slice(0, 8).forEach(function (c, i) { v["fillType" + i] = c; v["git" + i] = c; v["gitBranchLabel" + i] = readable(c); });
      return v;
    }
    function init() {
      var t = tokens();
      mermaid.initialize({
        startOnLoad: false, theme: "base", securityLevel: "strict", fontFamily: t.font.sans, themeVariables: themeVars(),
        flowchart: { curve: "basis", htmlLabels: true, useMaxWidth: true, padding: 12 },
        sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 40, noteMargin: 8 },
        er: { useMaxWidth: true }, gantt: { useMaxWidth: true, barHeight: 22, fontSize: 12, axisFormat: "%d %b", tickInterval: "1week" },
        state: { useMaxWidth: true }, journey: { useMaxWidth: true }, timeline: { useMaxWidth: true }
      });
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    // The source sits in a <pre>, so the HTML parser turns <br/> (and <b>, <i>) in labels into elements.
    // Put them back as text, or textContent would silently drop the line breaks.
    function sourceOf(el) {
      var out = "";
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3) out += n.data;
        else if (n.nodeName === "BR") out += "<br/>";
        else if (n.outerHTML) out += n.outerHTML;
        else out += n.textContent || "";
      });
      return out.trim();
    }
    function one(el) {
      if (el._vSrc === undefined) el._vSrc = sourceOf(el);
      var id = "vm" + (++counter);
      return mermaid.render(id, el._vSrc).then(function (r) {
        el.innerHTML = r.svg; el.classList.add("rendered");
      }).catch(function (err) {
        var stray = doc.getElementById("d" + id); if (stray) stray.remove();
        el.classList.remove("rendered");
        el.innerHTML = '<div class="callout danger"><strong>Diagram error.</strong> ' + esc(err && err.message ? err.message : err) + "</div>";
        if (root.console) console.error(err);
      });
    }
    init();
    var api = {
      /** Render every .mermaid element under scope (source is the element's text). Returns a promise. */
      renderAll: function (scope) {
        var host = scope || doc, list = Array.prototype.slice.call(host.querySelectorAll(".mermaid"));
        list.forEach(function (el) { if (tracked.indexOf(el) < 0) tracked.push(el); });
        return list.reduce(function (p, el) { return p.then(function () { return one(el); }); }, Promise.resolve());
      },
      themeVariables: themeVars
    };
    onTheme(function () {
      tracked = tracked.filter(function (el) { return doc.contains(el); });
      init();
      tracked.reduce(function (p, el) { return p.then(function () { return one(el); }); }, Promise.resolve());
    });
    return api;
  }

  // ---------------------------------------------------------------- host bridge
  var inFrame = false;
  try { inFrame = root.parent && root.parent !== root; } catch (e) { inFrame = true; }
  function post(msg) { try { if (inFrame) root.parent.postMessage(msg, "*"); } catch (e) { /* host unreachable */ } }
  // A sandboxed host cannot reach into the frame, so it sends the mode instead:
  // postMessage({ type: "visuals:theme", value: "light" | "dark" | "system" }). Only the parent window is trusted.
  if (inFrame && root.addEventListener) {
    root.addEventListener("message", function (e) {
      var d = e && e.data;
      if (e.source !== root.parent || !d || d.type !== "visuals:theme") return;
      if (d.value === "light" || d.value === "dark") doc.documentElement.setAttribute("data-theme", d.value);
      else if (d.value === "system") doc.documentElement.removeAttribute("data-theme");
    });
  }
  if (doc && root.ResizeObserver && inFrame) {
    var lastH = 0;
    var ro = new root.ResizeObserver(function () {
      var h = Math.ceil(doc.documentElement.getBoundingClientRect().height);
      if (h !== lastH) { lastH = h; post({ type: "visuals:height", value: h }); }
    });
    ro.observe(doc.documentElement);
  }

  // ---------------------------------------------------------------- public API
  var Visuals = {
    version: VERSION,
    tokens: tokens, onTheme: onTheme, mode: mode,
    series: series, seq: seq, div: div, alpha: alpha, mix: mix, readable: readable, contrast: contrast,
    fmt: fmt,
    /** Escape text before putting data into an HTML string (tooltips, labels). */
    esc: function (v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); },
    setLocale: function (l) { locale = l; },
    chart: chart,
    d3: function (lib) { Visuals.d3 = Object.assign(function () {}, d3api(lib)); return Visuals.d3; },
    three: function (lib) { Visuals.three = Object.assign(function () {}, threeApi(lib)); return Visuals.three; },
    katex: function (lib) { Visuals.katex = Object.assign(function () {}, katexApi(lib)); return Visuals.katex; },
    mermaid: function (lib) { Visuals.mermaid = Object.assign(function () {}, mermaidApi(lib)); return Visuals.mermaid; },
    /** Ask the agent something from inside a visual. Posts {type:"visuals:ask", text} to the host; does nothing without one. */
    /** True when the visual runs inside a host frame (the panel). False in a downloaded file, where ask() does nothing. */
    hasHost: !!inFrame,
    ask: function (text) { post({ type: "visuals:ask", text: String(text).slice(0, 2000) }); },
    /** Theme whichever libraries are loaded as globals. */
    auto: function () {
      if (root.Chart) Visuals.chart(root.Chart);
      if (root.d3 && typeof Visuals.d3 === "function" && !Visuals.d3.series) Visuals.d3(root.d3);
      if (root.THREE && typeof Visuals.three === "function" && !Visuals.three.create) Visuals.three(root.THREE);
      if (root.katex && typeof Visuals.katex === "function" && !Visuals.katex.renderAll) {
        Visuals.katex(root.katex);
        if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { Visuals.katex.renderAll(); });
        else Visuals.katex.renderAll();
      }
      if (root.mermaid && typeof Visuals.mermaid === "function" && !Visuals.mermaid.renderAll) {
        Visuals.mermaid(root.mermaid);
        if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { Visuals.mermaid.renderAll(); });
        else Visuals.mermaid.renderAll();
      }
      return Visuals;
    }
  };
  root.Visuals = Visuals;
})(typeof window !== "undefined" ? window : globalThis);
