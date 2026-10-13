// The `visuals` tool for OpenCode 2: lint a fragment and build its standalone
// download in one call, so the chat shows one card instead of two shell
// commands. The SmolUI service installs this file into the OpenCode plugin
// directory, next to the skill it drives.

import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** A build that runs longer than this is treated as stuck. */
const BUILD_TIMEOUT_MS = 120_000;

/** Where the skill's scripts live: next to the plugin, or the default config. */
function skillDir(): string {
  const sibling = path.resolve(HERE, "..", "skills", "visuals");
  if (existsSync(path.join(sibling, "scripts", "lint.mjs"))) return sibling;
  return path.join(homedir(), ".config", "opencode", "skills", "visuals");
}

/** Runs one skill script with the node on PATH, the runtime the skill needs. */
function runNode(script: string, args: string[], cwd: string, signal?: AbortSignal): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    execFile("node", [script, ...args], { cwd, maxBuffer: 8 * 1024 * 1024, timeout: BUILD_TIMEOUT_MS, signal }, (error, stdout, stderr) => {
      const code = error && typeof (error as { code?: unknown }).code === "number" ? (error as { code: number }).code : error ? 1 : 0;
      const output = `${stdout}${stderr}`.trim() || (error ? String((error as Error).message) : "");
      resolve({ code, output });
    });
  });
}

/** A byte count as a short label, KB under a megabyte. */
function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The libraries a fragment declares, from its first line. */
function libsOf(fragment: string): string[] {
  const match = fragment.match(/^\s*<!--\s*visuals:\s*[\d.]+\s+libs:\s*([^>]*?)\s*-->/i);
  if (!match || match[1].toLowerCase() === "none") return [];
  return match[1].toLowerCase().split(/[\s,]+/).filter(Boolean);
}

type LintIssue = { level: string; code: string; line: number; msg: string };
type LintReport = { issues: LintIssue[]; errors: number; warnings: number };

/** One lint issue as a line the agent can act on. */
function issueLine(issue: LintIssue): string {
  return `${issue.level === "ERROR" ? "ERROR" : "warn "} ${issue.code}${issue.line ? " line " + issue.line : ""}: ${issue.msg}`;
}

export default Plugin.define({
  id: "smolui-visuals",
  async setup(ctx) {
    // ctx.location is the plugin instance's location, not the session's, so
    // each call asks its own session where it runs; the location and the
    // process directory are the fallbacks.
    const fallbackDirectory = ctx.location?.directory || process.cwd();
    const sessionDirectory = async (sessionID: string): Promise<string> => {
      try {
        const session = await ctx.session.get({ sessionID });
        return session?.location?.directory || fallbackDirectory;
      } catch {
        return fallbackDirectory;
      }
    };

    await ctx.tool.transform((editor) => {
      editor.namespace({ name: "smolui", description: "SmolUI visuals" });
      editor.add({
        name: "visuals",
        description:
          "Lint a visuals fragment and build its standalone download in one call. Use it after writing or editing .visuals/<slug>.visual.html, fix every error it reports, and call it again until it passes.",
        // Direct rather than behind OpenCode's Code Mode execute tool, so the
        // call reads as one card and the model sees it without a catalog.
        options: { namespace: "smolui", codemode: false },
        input: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Fragment path, for example .visuals/watch.visual.html",
            },
          },
          required: ["file"],
          additionalProperties: false,
        },
        async execute(input, context) {
          // No output schema is declared, so a result carries content and
          // metadata only; an output field would be rejected.
          const requested = (input ?? {}) as { file?: unknown };
          const file = typeof requested.file === "string" ? requested.file.trim() : "";
          const failed = (text: string) => ({ content: text, metadata: { ok: false } });
          if (!file) return failed("Pass the fragment path, for example .visuals/watch.visual.html.");

          const projectDirectory = await sessionDirectory(context.sessionID);
          const target = path.isAbsolute(file) ? file : path.resolve(projectDirectory, file);
          const name = path.basename(target);
          const skill = skillDir();
          const lintPath = path.join(skill, "scripts", "lint.mjs");
          const assemblePath = path.join(skill, "scripts", "assemble.mjs");
          if (!existsSync(lintPath) || !existsSync(assemblePath)) {
            return failed(`The visuals skill is not installed (looked in ${skill}).`);
          }

          let fragment = "";
          try {
            fragment = await readFile(target, "utf8");
          } catch {
            return failed(`Cannot read ${file}. Write the fragment first, then call again.`);
          }

          await context.progress({ status: "Linting" });
          const linted = await runNode(lintPath, [target, "--json"], projectDirectory, context.signal);
          let report: LintReport | null = null;
          try {
            const parsed = JSON.parse(linted.output) as LintReport[];
            report = parsed[0] ?? null;
          } catch {
            report = null;
          }
          if (!report) return failed(`Lint could not run:\n\n${linted.output}`);
          if (report.errors > 0) {
            const errors = report.issues.filter((issue) => issue.level === "ERROR").map(issueLine).join("\n");
            return failed(`Lint failed:\n\n${errors}\n\nFix the errors and call again.`);
          }

          await context.progress({ status: "Building" });
          const assembled = await runNode(assemblePath, [target, "--force"], projectDirectory, context.signal);
          if (assembled.code !== 0) return failed(`Build failed:\n\n${assembled.output}`);

          const standalone = target.replace(/\.visual\.html$/, ".html");
          let bytes = 0;
          try {
            bytes = (await stat(standalone)).size;
          } catch {
            return failed(`The assembler reported success but ${standalone} is missing.`);
          }

          const libs = libsOf(fragment);
          const relative = (absolute: string) => {
            const rel = path.relative(projectDirectory, absolute);
            return rel && !rel.startsWith("..") ? rel : absolute;
          };
          const summary = `${libs.length > 0 ? libs.join(", ") : "no libraries"} · ${sizeLabel(bytes)}`;
          const warnings = report.issues.filter((issue) => issue.level !== "ERROR").map(issueLine);
          const content = [
            `Lint clean (0 errors${report.warnings > 0 ? `, ${report.warnings} warnings` : ""}).`,
            ...warnings,
            `Fragment: ${relative(target)}`,
            `Download: ${relative(standalone)} (${summary})`,
            "The download is self-contained: it opens offline and follows the viewer's light or dark setting.",
          ].join("\n");
          return {
            content,
            metadata: {
              ok: true,
              bytes,
              libs,
              summary,
              fragment: relative(target),
              download: relative(standalone),
              name: name.replace(/\.visual\.html$/, ""),
            },
          };
        },
      });
    });
  },
});
