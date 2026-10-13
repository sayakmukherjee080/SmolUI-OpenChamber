// Packages the installable zip: the manifest, the built panel, the service,
// the skill the service installs, and the licenses. Development sources, the
// reference kit, and node_modules stay out.

import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const version = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8")).version;
const outputDir = path.join(ROOT, "dist");
const output = path.join(outputDir, `smolui-openchamber-${version}.zip`);

const INCLUDE = ["package.json", "icon.svg", "panel", "service", "plugin", "skill", "licenses", "README.md", "NOTICE.md"];

await mkdir(outputDir, { recursive: true });
await rm(output, { force: true });
execFileSync("zip", ["-r", "-q", output, ...INCLUDE], { cwd: ROOT });
const { size } = await stat(output);
console.log(`package: dist/smolui-openchamber-${version}.zip (${(size / (1024 * 1024)).toFixed(1)} MB)`);
