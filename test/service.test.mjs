// The local service: health, bearer auth, skill install, and idempotency.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKEN = "smolui-test-token";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const home = await mkdtemp(path.join(os.tmpdir(), "smolui-service-"));
const port = await freePort();
const child = spawn(process.execPath, [path.join(ROOT, "service", "main.cjs")], {
  env: { ...process.env, HOME: home, OPENCHAMBER_SERVICE_PORT: String(port), OPENCHAMBER_SERVICE_TOKEN: TOKEN },
  stdio: ["ignore", "ignore", "pipe"],
});
let serviceError = "";
child.stderr.on("data", (chunk) => {
  serviceError += String(chunk);
});

const call = async (method, servicePath, authorized = true) => {
  const response = await fetch(`http://127.0.0.1:${port}${servicePath}`, {
    method,
    headers: authorized ? { authorization: `Bearer ${TOKEN}` } : {},
  });
  return { status: response.status, body: await response.json() };
};

try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt += 1) {
    try {
      ready = (await call("GET", "/health")).status === 200;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assert.ok(ready, `service did not become ready: ${serviceError}`);

  const denied = await call("GET", "/setup/status", false);
  assert.equal(denied.status, 401, "unauthenticated requests are refused");

  const before = await call("GET", "/setup/status");
  assert.equal(before.status, 200);
  assert.equal(before.body.installed, false);
  assert.equal(before.body.packageVersion, "0.1.0");

  const install = await call("POST", "/setup/install");
  assert.equal(install.status, 200);
  assert.equal(install.body.changed, true);

  const skillDir = path.join(home, ".config", "opencode", "skills", "visuals");
  assert.ok((await stat(path.join(skillDir, "SKILL.md"))).isFile(), "SKILL.md installed");
  assert.ok((await stat(path.join(skillDir, "assets", "visuals.css"))).isFile(), "skill assets installed");
  assert.ok((await stat(path.join(skillDir, "scripts", "assemble.mjs"))).isFile(), "skill scripts installed");
  assert.equal((await readFile(path.join(skillDir, ".smolui-version"), "utf8")).trim(), "0.1.0");

  const again = await call("POST", "/setup/install");
  assert.equal(again.status, 200);
  assert.equal(again.body.changed, false, "second install is a no-op");

  const after = await call("GET", "/setup/status");
  assert.equal(after.body.installed, true);
  assert.equal(after.body.installedVersion, "0.1.0");

  const unknown = await call("GET", "/nope");
  assert.equal(unknown.status, 404);

  console.log("service: health, auth, install, idempotency OK");
} finally {
  child.kill("SIGTERM");
  await rm(home, { recursive: true, force: true });
}
