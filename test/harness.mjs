// Browser harness: mounts the built panel behind a stub OpenChamber host and
// checks the list, rendering, the ask path, theme following, and the other
// two surfaces. Needs Playwright's chromium: npx playwright install chromium.

import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("harness: playwright is not installed (npm install, then npx playwright install chromium)");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }
    const filePath = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!filePath.startsWith(ROOT) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.setHeader("content-type", TYPES[path.extname(filePath)] ?? "application/octet-stream");
    // A sandboxed guest has an opaque origin; its fetches are cross-origin.
    response.setHeader("access-control-allow-origin", "null");
    response.end(readFileSync(filePath));
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const problems = [];
let checks = 0;

async function newHarnessPage(query) {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`[${query || "panel"}] console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`[${query || "panel"}] pageerror: ${error.message}`));
  await page.goto(`${base}/test/harness-host.html${query}`);
  return page;
}

try {
  // --- rail panel: list, render, height, theme, ask, copy path ---
  const page = await newHarnessPage("");
  const guest = page.frameLocator("#guest");

  const rows = guest.locator('[role="option"]');
  await rows.first().waitFor({ timeout: 15000 });
  const titles = await guest.locator('[role="option"] .oc-sdk-row-title').allTextContents();
  assert.deepEqual(titles, ["kpi", "whatif", "line"], "list is newest first and hides the standalone .html");
  checks += 1;

  await guest.locator('[role="option"]', { hasText: "kpi" }).click();
  const visual = guest.frameLocator("iframe.visual-frame");
  await visual.locator("h1").waitFor({ timeout: 15000 });
  assert.ok(/Rerank/.test(await visual.locator("h1").innerText()), "example 01 renders in the panel");
  checks += 1;

  const height = await guest.locator("iframe.visual-frame").evaluate((node) => Number.parseFloat(node.style.height));
  assert.ok(height > 200, `height message grew the frame (got ${height}px)`);
  checks += 1;

  await guest.locator(".meta-download").waitFor();
  assert.ok((await guest.locator(".meta-download").innerText()).includes(".visuals/kpi.html"), "footer names the download");
  checks += 1;

  await page.evaluate(() => window.__harness.setTheme("light"));
  await visual.locator('html[data-theme="light"]').waitFor({ timeout: 5000 });
  checks += 1;

  await guest.locator("button", { hasText: "Back" }).click();
  await rows.first().waitFor();

  await guest.locator('[role="option"]', { hasText: "whatif" }).click();
  await visual.locator("#ask").waitFor({ timeout: 15000 });
  await visual.locator("#ask").click();
  await page.waitForFunction(() => window.__harness.logs.compose.length > 0, null, { timeout: 5000 });
  const composed = await page.evaluate(() => window.__harness.logs.compose);
  assert.ok(composed.length === 1 && composed[0].text.includes("cache hit rate"), "ask composes the question");
  assert.equal(composed[0].mode, "append", "compose uses append");
  checks += 1;

  const toasts = await page.evaluate(() => window.__harness.logs.toasts);
  assert.ok(toasts.some((toast) => /Added to the chat box/.test(toast.message)), "ask confirms with a toast");
  checks += 1;

  await guest.locator("button", { hasText: "Copy path" }).click();
  await page.waitForFunction(() => window.__harness.logs.clipboard.length > 0, null, { timeout: 5000 });
  const copied = await page.evaluate(() => window.__harness.logs.clipboard[0]);
  assert.ok(copied.includes(".visuals/whatif.html"), "copy path writes the download path");
  checks += 1;

  // --- message action: ready carries a message item naming a visual ---
  const itemPage = await newHarnessPage("?item=message");
  const itemGuest = itemPage.frameLocator("#guest");
  const itemVisual = itemGuest.frameLocator("iframe.visual-frame");
  await itemVisual.locator("h1").waitFor({ timeout: 15000 });
  assert.ok((await itemVisual.locator("h1").innerText()).length > 0, "message action opens the named visual");
  assert.ok(await itemGuest.locator(".list-host").isHidden(), "message action starts in the visual view");
  checks += 1;

  // --- file editor surface: host pushes the file, no panel chrome ---
  const filePage = await newHarnessPage("?surface=file");
  const fileGuest = filePage.frameLocator("#guest");
  const fileVisual = fileGuest.frameLocator("iframe.visual-frame");
  await fileVisual.locator("h1").waitFor({ timeout: 15000 });
  assert.equal(await fileGuest.locator(".bar").count(), 0, "file surface has no panel chrome");
  assert.ok((await fileGuest.locator(".meta-line").innerText()).includes("chart"), "file surface shows size and libs");
  checks += 1;

  // --- full-screen page surface: same panel, page context ---
  const pageSurface = await newHarnessPage("?surface=page");
  const pageGuest = pageSurface.frameLocator("#guest");
  await pageGuest.locator('[role="option"]').first().waitFor({ timeout: 15000 });
  checks += 1;

  // --- empty project: the "no visuals yet" state ---
  const emptyPage = await newHarnessPage("?empty=1");
  const emptyGuest = emptyPage.frameLocator("#guest");
  await emptyGuest.locator(".oc-sdk-empty-title").waitFor({ timeout: 15000 });
  assert.equal(await emptyGuest.locator(".oc-sdk-empty-title").innerText(), "No visuals yet");
  checks += 1;
} finally {
  await browser.close();
  server.close();
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`harness: ${checks} checks OK, no console errors`);
