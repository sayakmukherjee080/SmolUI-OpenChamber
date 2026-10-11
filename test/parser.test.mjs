// Message-path and display-helper behaviour.

import assert from "node:assert/strict";
import { visualPathFromMessage } from "../src/message-path.mjs";
import { compareVersions, formatBytes, hashText, libsLabel } from "../src/format.mjs";

assert.equal(visualPathFromMessage(""), null);
assert.equal(visualPathFromMessage("no paths here"), null);
assert.equal(visualPathFromMessage("`.visuals/download.html` only"), null);
assert.equal(visualPathFromMessage("see .visuals/x.visual.html.bak"), null);
assert.equal(visualPathFromMessage("Wrote `.visuals/latency.visual.html` for you."), ".visuals/latency.visual.html");
assert.equal(
  visualPathFromMessage("/home/u/proj/.visuals/one.visual.html and then .visuals/two.visual.html"),
  ".visuals/two.visual.html",
);
assert.equal(visualPathFromMessage("./.visuals/a-b_c.visual.html"), ".visuals/a-b_c.visual.html");
assert.equal(visualPathFromMessage(".visuals/UPPER.visual.html"), ".visuals/UPPER.visual.html");

assert.equal(compareVersions("1.3", "1.2.0"), 1);
assert.equal(compareVersions("1.2", "1.2.0"), 0);
assert.equal(compareVersions("1.1.9", "1.2.0"), -1);
assert.equal(compareVersions(null, "1.2"), -1);
assert.equal(compareVersions("1.2", null), 1);

assert.equal(formatBytes(500), "500 B");
assert.equal(formatBytes(2048), "2 KB");
assert.equal(formatBytes(1.5 * 1024 * 1024), "1.5 MB");
assert.equal(libsLabel([]), "no libraries");
assert.equal(libsLabel(["chart", "katex"]), "chart, katex");
assert.equal(hashText("abc"), hashText("abc"));
assert.notEqual(hashText("abc"), hashText("abd"));

console.log("parser: message paths and helpers OK");
