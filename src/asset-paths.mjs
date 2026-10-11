// Which asset files a fragment needs. The panel fetches exactly this list,
// and the parity test asserts assemble-core asks for nothing else.

import { LIB_FILE, parseManifest } from "../skill/visuals/scripts/assemble-core.mjs";

/** Assets every fragment needs, in fetch order. */
export const TEXT_FILES = ["visuals.css", "visuals-theme.js", "VERSIONS.json"];

/**
 * Package-relative asset paths (under the skill's assets folder) that
 * assemble-core may read for this fragment.
 */
export function textAssetsFor(fragment) {
  const { libs } = parseManifest(fragment);
  const files = [...TEXT_FILES, ...libs.map((lib) => `vendor/${LIB_FILE[lib]}`)];
  if (libs.includes("katex")) files.push("vendor/katex.min.css");
  return files;
}
