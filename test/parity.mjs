// The panel must build byte-identical standalone pages to the skill's Node
// assembler, using the same io paths the fetch layer uses. Also proves the
// fonts payload round-trips and that no asset is requested outside the
// planned set.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStandalone } from "../skill/visuals/scripts/assemble-core.mjs";
import { assemble } from "../v1-reference-kit/skill/visuals/scripts/assemble.mjs";
import { textAssetsFor } from "../src/asset-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ASSETS = path.join(ROOT, "skill", "visuals", "assets");
const EXAMPLES = path.join(ROOT, "v1-reference-kit", "skill", "visuals", "examples");

const fontsPayload = JSON.parse(readFileSync(path.join(ASSETS, "fonts.gen.json"), "utf8"));
const requestedText = new Set();
const requestedBytes = new Set();

const io = {
  text(assetPath) {
    requestedText.add(assetPath);
    return readFileSync(path.join(ASSETS, assetPath), "utf8");
  },
  bytes(assetPath) {
    requestedBytes.add(assetPath);
    const encoded = fontsPayload[assetPath];
    if (!encoded) throw new Error(`fonts payload is missing ${assetPath}`);
    return new Uint8Array(Buffer.from(encoded, "base64"));
  },
};

const sha = (text) => createHash("sha256").update(text).digest("hex");

// 1. every font on disk is in the payload, byte for byte, and nothing else.
const fontPaths = [];
for (const directory of ["fonts", "vendor/fonts"]) {
  for (const name of readdirSync(path.join(ASSETS, directory))) {
    if (name.endsWith(".woff2")) fontPaths.push(`${directory}/${name}`);
  }
}
fontPaths.sort();
assert.deepEqual(Object.keys(fontsPayload).sort(), fontPaths, "fonts payload covers exactly the fonts on disk");
for (const fontPath of fontPaths) {
  const disk = readFileSync(path.join(ASSETS, fontPath));
  const decoded = Buffer.from(fontsPayload[fontPath], "base64");
  assert.ok(disk.equals(decoded), `font round-trip: ${fontPath}`);
}

// 2. every example, both themes, byte-identical to the Node assembler.
const examples = readdirSync(EXAMPLES).filter((name) => name.endsWith(".visual.html")).sort();
assert.equal(examples.length, 11, "eleven golden examples");
let comparisons = 0;
for (const file of examples) {
  const fragment = readFileSync(path.join(EXAMPLES, file), "utf8");
  for (const theme of ["light", "dark"]) {
    requestedText.clear();
    requestedBytes.clear();
    const node = assemble(fragment, { theme, title: file });
    const built = buildStandalone(fragment, io, { theme, title: file });
    assert.equal(sha(built.html), sha(node.html), `bytes differ: ${file} ${theme}`);
    assert.equal(built.bytes, node.bytes, `size differs: ${file} ${theme}`);
    const plannedText = new Set(textAssetsFor(fragment));
    for (const assetPath of requestedText) {
      assert.ok(plannedText.has(assetPath), `unplanned text asset ${assetPath} (${file})`);
    }
    for (const assetPath of requestedBytes) {
      assert.ok(assetPath in fontsPayload, `unplanned font ${assetPath} (${file})`);
    }
    comparisons += 1;
  }
}

// 3. the built panel exists (the harness and install need it committed).
const builtPanel = path.join(ROOT, "panel", "main.js");
assert.ok(statSync(builtPanel).size > 0, "panel/main.js is built");

console.log(`parity: ${comparisons} builds equal to assemble.mjs, fonts round-trip, assets planned`);
