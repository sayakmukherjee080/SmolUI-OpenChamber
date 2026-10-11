// SmolUI local service. Installs the agent skill into the user's OpenCode
// skills directory and reports its state. Loopback only; every request needs
// the bearer token the host issued at spawn.

"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PORT = Number.parseInt(process.env.OPENCHAMBER_SERVICE_PORT ?? "", 10);
const TOKEN = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILL_SOURCE = path.join(PACKAGE_ROOT, "skill", "visuals");
const SKILL_DESTINATION = path.join(os.homedir(), ".config", "opencode", "skills", "visuals");
const VERSION_MARKER = ".smolui-version";

if (!Number.isInteger(PORT) || PORT <= 0 || !TOKEN) {
  process.stderr.write("smolui service: OPENCHAMBER_SERVICE_PORT and OPENCHAMBER_SERVICE_TOKEN are required\n");
  process.exit(1);
}

/** The version this package advertises to the host and the skill marker. */
function packageVersion() {
  return JSON.parse(readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")).version;
}

/** The error's message, for a JSON answer. */
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

/** The version marker in the installed skill, or null when it is missing. */
async function installedVersion() {
  try {
    const raw = await fs.readFile(path.join(SKILL_DESTINATION, VERSION_MARKER), "utf8");
    return raw.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Copies the skill into the user's skills directory when it is missing or
 * from an older extension version. Staged next to the destination, then
 * renamed, so a reader never sees a half-written skill.
 */
async function installSkill() {
  const version = packageVersion();
  const installed = await installedVersion();
  if (installed === version) return { changed: false, version };
  const staging = `${SKILL_DESTINATION}.staging-${process.pid}`;
  await fs.mkdir(path.dirname(SKILL_DESTINATION), { recursive: true });
  await fs.rm(staging, { recursive: true, force: true });
  await fs.cp(SKILL_SOURCE, staging, { recursive: true });
  await fs.writeFile(path.join(staging, VERSION_MARKER), `${version}\n`, "utf8");
  await fs.rm(SKILL_DESTINATION, { recursive: true, force: true });
  await fs.rename(staging, SKILL_DESTINATION);
  return { changed: true, version };
}

const server = http.createServer(async (request, response) => {
  const send = (status, body) => {
    const payload = JSON.stringify(body);
    response.writeHead(status, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    });
    response.end(payload);
  };

  if (request.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(401, { error: "unauthorized" });
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && url.pathname === "/health") {
    return send(200, { ok: true });
  }

  if (request.method === "GET" && url.pathname === "/setup/status") {
    try {
      const installed = await installedVersion();
      return send(200, {
        installed: installed !== null,
        installedVersion: installed,
        packageVersion: packageVersion(),
        skillDir: SKILL_DESTINATION,
      });
    } catch (error) {
      return send(500, { error: describe(error) });
    }
  }

  if (request.method === "POST" && url.pathname === "/setup/install") {
    try {
      const result = await installSkill();
      return send(200, { ok: true, ...result, skillDir: SKILL_DESTINATION });
    } catch (error) {
      return send(500, { error: describe(error) });
    }
  }

  return send(404, { error: "not-found" });
});

server.listen(PORT, "127.0.0.1");
