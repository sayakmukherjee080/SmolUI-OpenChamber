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
  var VERSION = "1.3.0";

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
    "three-bg", "three-grid", "three-grid-sub", "three-axis-x", "three-axis-y", "three-axis-z", "three-label",
    "three-clay-1", "three-clay-2", "three-clay-3", "three-clay-4", "three-accent", "three-accent-soft"
  ];
  var NUMBERS = [
    "chart-area-alpha", "chart-line-width", "chart-point-radius", "chart-bar-radius", "chart-font-size",
    "chart-tension", "chart-legend-box", "chart-padding", "chart-bar-max", "chart-anim",
    "three-ambient", "three-key", "three-fill", "three-roughness", "three-metalness", "three-fov", "three-shadow",
    "three-grain", "three-env", "three-contact",
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
    /** A token name, a series index, or a function of the tokens (for derived mixes). */
    function value(key) {
      if (typeof key === "function") return key(tokens());
      var t = tokens();
      return typeof key === "number" ? series(key) : (t.color[key] || key);
    }
    function track(obj, key, opts) {
      tracked.push({ obj: obj, key: key, emissive: !!(opts && opts.emissive) });
      return obj;
    }
    function recolor() {
      tracked.forEach(function (r) {
        r.obj.color.copy(new THREE.Color(value(r.key)));
        if (r.emissive && r.obj.emissive) r.obj.emissive.copy(new THREE.Color(value(r.key)));
        if (r.obj.envMapIntensity !== undefined) r.obj.envMapIntensity = tokens().num["three-env"];
      });
      created.forEach(function (s) { s._retheme(); });
    }
    onTheme(recolor);

    // ---- procedural surfaces: no files, everything is drawn on a canvas
    var surfaces = {};
    function canvas2d(size) {
      if (!doc.createElement) return null;
      var el = doc.createElement("canvas");
      el.width = el.height = size;
      return el.getContext ? el.getContext("2d") : null;
    }
    function surface(name, size, draw) {
      if (surfaces[name]) return surfaces[name];
      var ctx = canvas2d(size);
      if (!ctx) return null;
      draw(ctx, size);
      var tex = new THREE.CanvasTexture(ctx.canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      surfaces[name] = tex;
      return tex;
    }
    /** Greyscale mottling for bump maps, at a per-part repeat. */
    function grainTexture(repeat) {
      var key = "grain" + repeat;
      if (surfaces[key]) return surfaces[key];
      var ctx = canvas2d(256);
      if (!ctx) return null;
      var size = 256, seed = 7, image = ctx.createImageData(size, size);
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (var i = 0; i < size * size; i += 1) {
        var v = 118 + rnd() * 137;
        image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v;
        image.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      ctx.globalAlpha = 0.45;
      ctx.drawImage(ctx.canvas, -1, 0); ctx.drawImage(ctx.canvas, 1, 0);
      ctx.drawImage(ctx.canvas, 0, -1); ctx.drawImage(ctx.canvas, 0, 1);
      ctx.globalAlpha = 1;
      var tex = new THREE.CanvasTexture(ctx.canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      surfaces[key] = tex;
      return tex;
    }
    /** Wound-wire stripes for coils and bobbins. */
    function coilTexture() {
      var tex = surface("coil", 128, function (ctx, size) {
        for (var x = 0; x < size; x += 8) {
          var grad = ctx.createLinearGradient(x, 0, x + 8, 0);
          grad.addColorStop(0, "#6f6f6f");
          grad.addColorStop(0.45, "#ffffff");
          grad.addColorStop(0.55, "#cfcfcf");
          grad.addColorStop(1, "#6a6a6a");
          ctx.fillStyle = grad;
          ctx.fillRect(x, 0, 8, size);
        }
      });
      if (tex && !tex.userData.vSet) { tex.repeat.set(6, 1); tex.userData.vSet = true; }
      return tex;
    }
    /** A faint board grid: traces and pads. */
    function boardTexture() {
      var tex = surface("board", 128, function (ctx, size) {
        ctx.fillStyle = "#b8b8b8";
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        for (var p = 8; p < size; p += 16) {
          ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
        }
        ctx.strokeStyle = "#909090";
        ctx.lineWidth = 3;
        for (var q = 24; q < size; q += 32) {
          ctx.beginPath(); ctx.moveTo(q, 0); ctx.lineTo(q, size); ctx.stroke();
        }
      });
      if (tex && !tex.userData.vSet) { tex.repeat.set(2, 2); tex.userData.vSet = true; }
      return tex;
    }
    /** A soft dark blob that grounds a part on the floor. */
    function contactTexture() {
      return surface("contact", 128, function (ctx, size) {
        var half = size / 2;
        var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
        grad.addColorStop(0.55, "rgba(0, 0, 0, 0.35)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      });
    }
    /** The stage sky: a token-tinted gradient turned into an environment map. */
    function environment(renderer) {
      if (!THREE.PMREMGenerator || !renderer || !renderer.getRenderTarget) return null;
      var ctx = canvas2d(64);
      if (!ctx) return null;
      var t = tokens();
      var grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, mix(t.color["three-bg"], "#ffffff", 0.5));
      grad.addColorStop(0.5, t.color["three-bg"]);
      grad.addColorStop(1, mix(t.color["three-bg"], "#000000", 0.4));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      var source = new THREE.CanvasTexture(ctx.canvas);
      source.mapping = THREE.EquirectangularReflectionMapping;
      var pmrem = new THREE.PMREMGenerator(renderer);
      var target = pmrem.fromEquirectangular(source);
      source.dispose();
      pmrem.dispose();
      return target;
    }
    /** The soft blob that grounds a part: dark, fading, drawn from the stage colour. */
    function contactMaterial() {
      var m = new THREE.MeshBasicMaterial({
        map: contactTexture(),
        transparent: true,
        opacity: tokens().num["three-contact"],
        depthWrite: false
      });
      var key = function (t) { return mix(t.color["three-bg"], "#000000", 0.55); };
      m.color = new THREE.Color(value(key));
      track(m, key, "material");
      return m;
    }
    /** The one standard material: token colour, matte, environment-lit, grain-bumped. */
    function standard(key, opts, textured) {
      var t = tokens(), o = opts || {};
      var config = {
        color: color(key),
        roughness: t.num["three-roughness"],
        metalness: t.num["three-metalness"],
        envMapIntensity: t.num["three-env"]
      };
      var grain = t.num["three-grain"];
      if (o.color === undefined && !o.bumpMap && grain > 0) {
        var tex = textured === "coil" ? coilTexture() : textured === "board" ? boardTexture() : grainTexture(o.repeat === undefined ? 2 : o.repeat);
        if (tex) {
          config.bumpMap = tex;
          config.bumpScale = (textured === "coil" ? 0.09 : textured === "board" ? 0.05 : 0.02) * grain;
        }
      }
      var m = new THREE.MeshStandardMaterial(Object.assign(config, o));
      if (o.color === undefined) track(m, key, "material");
      return m;
    }

    var api = {
      color: color,
      /** Standard (lit) material in a series or token colour, following the theme. */
      material: function (key, opts) {
        return standard(key, opts);
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
      /**
       * A matte clay material in one of four neutral tints. Order tints by role, not
       * decoration: th.clay(0) base and housing, th.clay(1) fixed hardware, th.clay(2)
       * moving parts, th.clay(3) small details. Tints separate parts; they rank nothing.
       */
      clay: function (i, opts) {
        return standard("three-clay-" + (Math.min(3, Math.max(0, Math.round(i || 0))) + 1), opts);
      },
      /** The single terracotta accent: the part the title is about, and nothing else. */
      accent: function (opts) {
        return standard("three-accent", opts);
      },
      /** Emissive light: beams, lamps, indicators. */
      light: function (opts) {
        var o = opts || {};
        var m = new THREE.MeshStandardMaterial({
          color: color("three-accent"),
          emissive: color("three-accent"),
          emissiveIntensity: o.emissiveIntensity === undefined ? 0.9 : o.emissiveIntensity,
          roughness: 1,
          metalness: 0
        });
        if (o.color === undefined) track(m, "three-accent", { emissive: true });
        return m;
      },
      /** A soft additive halo to wrap around a light: the poor man's bloom. */
      glow: function (geometry, opts) {
        var o = opts || {};
        var m = new THREE.MeshBasicMaterial({
          color: color("three-accent"),
          transparent: true,
          opacity: o.opacity === undefined ? 0.2 : o.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        if (o.color === undefined) track(m, "three-accent", "material");
        var mesh = new THREE.Mesh(geometry, m);
        mesh.userData.vNoShadow = true;
        return mesh;
      },
      /** Glass: lenses, windows, tubes. Stylised, not a refraction pass. */
      glass: function (opts) {
        var o = opts || {};
        var key = function (t) { return mix(t.color["three-bg"], "#ffffff", 0.5); };
        var m = new THREE.MeshStandardMaterial({
          roughness: 0.15,
          metalness: 0,
          transparent: true,
          opacity: o.opacity === undefined ? 0.28 : o.opacity,
          depthWrite: false,
          side: THREE.DoubleSide,
          envMapIntensity: tokens().num["three-env"] * 1.4
        });
        m.color = new THREE.Color(value(key));
        track(m, key, "material");
        return m;
      },
      /** Wound wire: a striped bump over a clay tint. */
      coil: function (i, opts) {
        return standard("three-clay-" + (Math.min(3, Math.max(0, Math.round(i || 0))) + 1), opts, "coil");
      },
      /** A board: a faint grid of traces. */
      board: function (i, opts) {
        return standard("three-clay-" + (Math.min(3, Math.max(0, Math.round(i || 0))) + 1), opts, "board");
      },
      /** A tube between two points, for leads and pipes. */
      wire: function (from, to, radius, tint) {
        var a = new THREE.Vector3(from[0], from[1], from[2]);
        var b = new THREE.Vector3(to[0], to[1], to[2]);
        var dir = new THREE.Vector3().subVectors(b, a);
        var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius || 0.06, radius || 0.06, dir.length(), 20), api.clay(tint === undefined ? 3 : tint));
        mesh.position.copy(a).addScaledVector(dir, 0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        return mesh;
      },
      /** A ring of recessed hole discs for a wheel or plate, lying in the part's own face. */
      holes: function (count, opts) {
        var o = opts || {};
        var group = new THREE.Group();
        var ring = o.ring === undefined ? 0.5 : o.ring;
        var size = o.size === undefined ? 0.14 : o.size;
        var material = api.clay(o.tint === undefined ? 3 : o.tint);
        for (var i = 0; i < count; i += 1) {
          var angle = (i / count) * Math.PI * 2 + (o.offset || 0);
          var mesh = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.02, 24), material);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.set(Math.cos(angle) * ring, Math.sin(angle) * ring, 0.012);
          mesh.userData.vNoShadow = true;
          group.add(mesh);
        }
        return group;
      },
      /** A ring of hex bolt heads for a flange. */
      boltRing: function (radius, count, opts) {
        var o = opts || {};
        var group = new THREE.Group();
        var size = o.size === undefined ? 0.07 : o.size;
        var material = api.clay(o.tint === undefined ? 3 : o.tint);
        for (var i = 0; i < count; i += 1) {
          var angle = (i / count) * Math.PI * 2;
          var mesh = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.06, 6), material);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.03);
          group.add(mesh);
        }
        return group;
      },
      /**
       * Ambient, a shadow-casting key light and a fill. Positions suit the scene's up
       * axis; shadowSize is the half-width of the shadowed area and shadowIntensity
       * comes from --three-shadow.
       */
      lights: function (scene, opts) {
        var t = tokens(), N = t.num, o = opts || {};
        var zUp = o.up === "z";
        var group = new THREE.Group();
        group.name = "visuals-lights";
        group.add(new THREE.AmbientLight(0xffffff, o.ambient === undefined ? N["three-ambient"] : o.ambient));
        var key = new THREE.DirectionalLight(0xffffff, o.key === undefined ? N["three-key"] : o.key);
        if (zUp) key.position.set(6, -5, 9); else key.position.set(6, 9, 7);
        key.castShadow = o.shadows !== false;
        if (key.castShadow) {
          var size = o.shadowSize === undefined ? 10 : o.shadowSize;
          key.shadow.mapSize.set(2048, 2048);
          key.shadow.camera.left = -size;
          key.shadow.camera.right = size;
          key.shadow.camera.top = size;
          key.shadow.camera.bottom = -size;
          key.shadow.camera.near = 1;
          key.shadow.camera.far = 60;
          key.shadow.bias = -0.0004;
          key.shadow.normalBias = 0.02;
          key.shadow.radius = o.radius === undefined ? 4 : o.radius;
          if ("blurSamples" in key.shadow) key.shadow.blurSamples = 8;
          if ("intensity" in key.shadow) key.shadow.intensity = o.shadowIntensity === undefined ? N["three-shadow"] : o.shadowIntensity;
        }
        group.add(key);
        var fill = new THREE.DirectionalLight(0xffffff, o.fill === undefined ? N["three-fill"] : o.fill);
        if (zUp) fill.position.set(-7, 6, 3); else fill.position.set(-7, 4, -5);
        group.add(fill);
        if (scene) scene.add(group);
        return group;
      },
      /**
       * Where a world point sits in the container, in pixels, so a .hud label
       * can be placed over it. Call it after the camera moves.
       */
      project: function (handle, point) {
        var v = new THREE.Vector3(point.x, point.y, point.z).project(handle.camera);
        var w = handle.host ? handle.host.clientWidth || 300 : 300;
        var h = handle.host ? handle.host.clientHeight || 225 : 225;
        return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
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
       * Scene bootstrap for the Studio clay stage. container is a .scene element.
       * Returns { scene, camera, renderer, controls, host, add, contact, reset, onFrame,
       * start, stop, render, dispose }. Pass OrbitControls (from three/addons) for drag
       * to orbit. Options: position [x, y, z], target [x, y, z]; fov, from --three-fov;
       * up "z" for subjects lying flat on the floor (gears, parts); orbit "studio" keeps
       * the old floor-level 15-75 view (free is the default: anywhere but the poles);
       * minDistance, maxDistance; shadowSize, the half-width of the shadowed area
       * (default 10); ground: false drops the shadow floor (it hides itself when the
       * camera goes under it); environment: false drops the stage sky; lights: false
       * brings your own; grid, gridSize, gridDivisions; axes; shadows (default true);
       * autoStart, to run the frame loop from the start.
       */
      create: function (opts) {
        var o = opts || {};
        var host = typeof o.container === "string" ? doc.querySelector(o.container) : o.container;
        var t = tokens(), N = t.num;
        var zUp = o.up === "z";
        var shadowSize = o.shadowSize === undefined ? 10 : o.shadowSize;
        var scene = new THREE.Scene();
        var backgroundKey = o.background || "three-bg";
        scene.background = color(backgroundKey);
        var target = o.target || [0, 0, 0];
        var camera = new THREE.PerspectiveCamera(o.fov || N["three-fov"] || 38, 1, 0.1, 1000);
        camera.up.set(0, zUp ? 0 : 1, zUp ? 1 : 0);
        var position = o.position || (zUp ? [7, -8, 9] : [7, 6, 9]);
        camera.position.set(position[0], position[1], position[2]);
        camera.lookAt(target[0], target[1], target[2]);
        var renderer = o.renderer || new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
        if (renderer.shadowMap && o.shadows !== false) {
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.VSMShadowMap !== undefined ? THREE.VSMShadowMap : THREE.PCFShadowMap;
        }
        if (host && renderer.domElement && !renderer.domElement.parentNode) host.appendChild(renderer.domElement);
        var controls = null;
        if (o.OrbitControls && renderer.domElement) {
          controls = new o.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.target.set(target[0], target[1], target[2]);
          // Free by default: the camera may go anywhere but the two poles, where
          // OrbitControls gimbals. orbit: "studio" keeps the old floor-level 15-75 view.
          var studio = o.orbit === "studio";
          controls.minPolarAngle = (o.minPolarAngle === undefined ? (studio ? 15 : 2) : o.minPolarAngle) * Math.PI / 180;
          controls.maxPolarAngle = (o.maxPolarAngle === undefined ? (studio ? 75 : 178) : o.maxPolarAngle) * Math.PI / 180;
          controls.minDistance = o.minDistance === undefined ? 2.5 : o.minDistance;
          controls.maxDistance = o.maxDistance === undefined ? 45 : o.maxDistance;
          controls.update();
        }
        var gridObj = null, axesObj = null, lightGroup = null, ground = null, envTarget = null;
        function build() {
          if (gridObj) { scene.remove(gridObj); gridObj.geometry.dispose(); gridObj.material.dispose(); gridObj = null; }
          if (axesObj) { scene.remove(axesObj); axesObj.children.forEach(function (c) { c.geometry.dispose(); c.material.dispose(); }); axesObj = null; }
          if (lightGroup) { scene.remove(lightGroup); lightGroup = null; }
          if (ground) { scene.remove(ground); ground.geometry.dispose(); ground.material.dispose(); ground = null; }
          if (envTarget) { envTarget.dispose(); envTarget = null; }
          if (o.lights !== false) lightGroup = api.lights(scene, { up: zUp ? "z" : "y", shadowSize: shadowSize, shadows: o.shadows !== false });
          envTarget = o.environment === false ? null : environment(renderer);
          scene.environment = envTarget ? envTarget.texture : null;
          if (o.ground !== false) {
            ground = new THREE.Mesh(new THREE.PlaneGeometry(shadowSize * 2, shadowSize * 2), new THREE.ShadowMaterial({ opacity: N["three-shadow"] }));
            ground.name = "visuals-ground";
            ground.receiveShadow = true;
            ground.material.side = THREE.DoubleSide;
            if (!zUp) ground.rotation.x = -Math.PI / 2;
            scene.add(ground);
          }
          if (o.grid === true) { gridObj = api.grid(o.gridSize, o.gridDivisions); if (zUp) gridObj.rotation.x = Math.PI / 2; scene.add(gridObj); }
          if (o.axes) { axesObj = api.axes(o.axes === true ? 5 : o.axes); scene.add(axesObj); }
          groundVisible();
        }
        /** The floor only shows while the camera is above it; underneath, the model floats free. */
        function groundVisible() {
          if (!ground) return;
          ground.visible = zUp ? camera.position.z >= 0 : camera.position.y >= 0;
        }
        build();
        var frameFns = [], raf = 0, pending = 0, running = false, ro = null;
        function size() {
          if (!host) return;
          var w = host.clientWidth || 300, h = host.clientHeight || 225;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        function frame() {
          if (!running) return;
          raf = root.requestAnimationFrame(frame);
          if (controls) controls.update();
          groundVisible();
          frameFns.forEach(function (fn) { fn(); });
          renderer.render(scene, camera);
        }
        function schedule() {
          if (running || pending || !root.requestAnimationFrame) return;
          pending = root.requestAnimationFrame(function () { pending = 0; renderer.render(scene, camera); });
        }
        var homePosition = camera.position.clone();
        var homeTarget = new THREE.Vector3(target[0], target[1], target[2]);
        var handle = {
          scene: scene, camera: camera, renderer: renderer, controls: controls, host: host,
          /** Adds an object to the scene and turns on its soft shadows. */
          add: function (obj) {
            obj.traverse(function (child) {
              if (!child.isMesh || child.userData.vNoShadow) return;
              child.castShadow = true;
              child.receiveShadow = true;
            });
            scene.add(obj);
            schedule();
            return obj;
          },
          /** A soft contact shadow on the floor under a part, in floor coordinates. */
          contact: function (x, y, radius) {
            var size = (radius === undefined ? 1 : radius) * 2;
            var mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), contactMaterial());
            mesh.userData.vNoShadow = true;
            mesh.name = "visuals-contact";
            if (zUp) mesh.position.set(x, y, 0.012);
            else { mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.012, y); }
            scene.add(mesh);
            schedule();
            return mesh;
          },
          /** Back to the framing the fragment chose. */
          reset: function () {
            camera.position.copy(homePosition);
            if (controls) { controls.target.copy(homeTarget); controls.update(); }
            else { camera.lookAt(homeTarget); }
            groundVisible();
            handle.render();
          },
          onFrame: function (fn) { frameFns.push(fn); },
          start: function () { if (!running) { running = true; frame(); } },
          stop: function () { running = false; if (raf) root.cancelAnimationFrame(raf); },
          render: function () { renderer.render(scene, camera); },
          _retheme: function () { scene.background = color(backgroundKey); build(); if (!running) handle.render(); },
          dispose: function () {
            handle.stop();
            if (pending) root.cancelAnimationFrame(pending);
            if (envTarget) envTarget.dispose();
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
        if (o.autoStart === true && root.requestAnimationFrame) handle.start();
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
