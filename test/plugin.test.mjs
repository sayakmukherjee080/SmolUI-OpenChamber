// The bundled OpenCode plugin: its `visuals` tool lints and builds in one call.
// The plugin is loaded here the way OpenCode 2 loads it, with a stub context
// that records the registered tool.

import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const home = await mkdtemp(path.join(os.tmpdir(), "smolui-plugin-"));
const config = path.join(home, ".config", "opencode");
const project = path.join(home, "project");

try {
  await mkdir(path.join(config, "plugins"), { recursive: true });
  await mkdir(path.join(project, ".visuals"), { recursive: true });
  // OpenCode resolves `@opencode/plugin` for a loaded plugin; the fixture
  // mirrors that by linking the repo's modules beside the temp config.
  await symlink(path.join(ROOT, "node_modules"), path.join(home, "node_modules"), "dir");
  await cp(path.join(ROOT, "skill", "visuals"), path.join(config, "skills", "visuals"), { recursive: true });
  await cp(path.join(ROOT, "plugin", "visuals.js"), path.join(config, "plugins", "visuals.js"));
  await cp(
    path.join(ROOT, "skill", "visuals", "examples", "01-kpi-table.visual.html"),
    path.join(project, ".visuals", "kpi.visual.html"),
  );

  const module = await import(pathToFileURL(path.join(config, "plugins", "visuals.js")).href);
  const plugin = module.default;
  assert.equal(plugin.id, "smolui-visuals", "the plugin exports a v2 definition with an id");
  assert.equal(typeof plugin.setup, "function", "the definition carries a setup function");

  let registered = null;
  let namespace = null;
  const context = {
    location: { directory: project },
    tool: {
      transform: async (callback) => {
        callback({
          add: (info) => {
            registered = info;
          },
          namespace: (value) => {
            namespace = value;
          },
        });
      },
    },
    session: {
      get: async ({ sessionID }) => {
        assert.equal(sessionID, "ses_test", "the tool asks for the session that called it");
        return { location: { directory: project } };
      },
    },
  };
  await plugin.setup(context);
  assert.ok(registered, "setup registers a tool");
  assert.equal(registered.name, "visuals");
  assert.equal(registered.options.namespace, "smolui", "the tool sits in the plugin's namespace");
  assert.equal(registered.options.codemode, false, "the tool stays a direct call");
  assert.equal(namespace?.name, "smolui", "the namespace is declared before the tool");
  assert.deepEqual(registered.input.required, ["file"]);
  assert.equal(registered.output, undefined, "no output schema is declared");

  const toolContext = { sessionID: "ses_test", signal: undefined, progress: async () => {} };
  const built = await registered.execute({ file: ".visuals/kpi.visual.html" }, toolContext);
  assert.equal(built.metadata.ok, true);
  assert.ok(built.content.includes("Lint clean"), "a clean fragment reports the lint");
  assert.ok(built.content.includes(".visuals/kpi.html"), "the output names the download");
  assert.equal(built.output, undefined, "the result carries no output field");
  assert.equal(built.metadata.name, "kpi");
  assert.deepEqual(built.metadata.libs, []);
  assert.ok(existsSync(path.join(project, ".visuals", "kpi.html")), "the download is written");
  assert.ok((await stat(path.join(project, ".visuals", "kpi.html"))).size > 0);

  await writeFile(
    path.join(project, ".visuals", "broken.visual.html"),
    '<!-- visuals: 1.2 libs: none -->\n<h1>Bad colour in a broken fragment</h1>\n<p style="color: #ff0000">x</p>\n<figcaption>Source: test. As of 2026-10-12.</figcaption>\n',
  );
  const failed = await registered.execute({ file: ".visuals/broken.visual.html" }, toolContext);
  assert.equal(failed.metadata.ok, false);
  assert.ok(failed.content.includes("Lint failed"), "a lint error is reported to the agent");
  assert.ok(!existsSync(path.join(project, ".visuals", "broken.html")), "nothing is built when the lint fails");

  const empty = await registered.execute({}, toolContext);
  assert.equal(empty.metadata.ok, false, "a call without a file is refused");

  const text = await readFile(path.join(config, "plugins", "visuals.js"), "utf8");
  assert.ok(text.includes('from "@opencode/plugin"'), "the plugin imports the SDK the runtime resolves");
  assert.ok(text.includes("Plugin.define"), "the plugin defines itself with Plugin.define");

  console.log("plugin: visuals tool registers, lints, builds and reports OK");
} finally {
  await rm(home, { recursive: true, force: true });
}
