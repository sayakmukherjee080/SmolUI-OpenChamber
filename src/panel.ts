// The rail panel and the full-screen page: a list of the project's visuals,
// the renderer, and the footer that names the standalone download.

import { HostRequestError, type HostClient } from "@openchamber/sdk";
import { mountBanner, mountButton, mountEmpty, mountList } from "@openchamber/sdk/ui";
import type { Assets } from "./assets";
import { createRenderer, RenderError, type RenderInfo } from "./render";
import { visualPathFromMessage } from "./message-path.mjs";
import { dateLabel, formatBytes, libsLabel } from "./format.mjs";
import { ensureSkill } from "./service-client";

export type Surface = {
  setTheme: (mode: "light" | "dark") => void;
};

type Disposable = { dispose: () => void };

type Entry = { path: string; slug: string; mtime: number };

type ListState = "ready" | "no-project" | "no-visuals" | "not-granted" | "disabled" | "error";

const FRAGMENT_SUFFIX = ".visual.html";

/** Creates an element with an optional class. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** The message of any thrown value, for a banner body. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A readable banner for a host error code. */
function explain(error: unknown): { title: string; body: string } {
  if (error instanceof HostRequestError) {
    switch (error.code) {
      case "NOT_FOUND":
        return { title: "Visual not found", body: "The file is not there anymore." };
      case "NOT_GRANTED":
        return { title: "File access not granted", body: "Approve the files capability in Settings → Extensions." };
      case "DISABLED":
        return { title: "Paused", body: "This extension is paused in Settings → Extensions." };
      case "NO_DIRECTORY":
        return { title: "No project open", body: "Open a project first." };
      case "FILE_TOO_LARGE":
        return { title: "Visual too large", body: "The file is over the read limit." };
      case "HOST_UNAVAILABLE":
        return { title: "Not connected", body: "This panel lost its connection to OpenChamber." };
      default:
        return { title: "Something went wrong", body: `${error.code}: ${error.message}` };
    }
  }
  return { title: "Something went wrong", body: messageOf(error) };
}

export function mountPanelSurface(deps: { host: HostClient; assets: Assets; root: HTMLElement }): Surface {
  const { host, assets, root } = deps;

  const app = el("div", "app");
  const bar = el("header", "bar");
  const title = el("span", "bar-title");
  title.textContent = "SmolUI";
  const barActions = el("div", "bar-actions");
  const backSlot = el("div", "slot");
  const refreshSlot = el("div", "slot");
  barActions.append(backSlot, refreshSlot);
  bar.append(title, barActions);

  const noticeHost = el("div", "notice");
  const listHost = el("div", "list-host");
  const listBox = el("div");
  const listStateHost = el("div");
  listHost.append(listBox, listStateHost);
  const viewHost = el("div", "view-host");
  viewHost.hidden = true;
  const metaHost = el("div", "meta-host");
  metaHost.hidden = true;

  app.append(bar, noticeHost, listHost, viewHost, metaHost);
  root.append(app);

  const renderer = createRenderer({ container: viewHost, host, assets });

  let entries: Entry[] = [];
  let listState: ListState = "ready";
  let listError = "";
  let state: "list" | "visual" = "list";
  let openPath: string | null = null;
  let openMtime = 0;
  let openInfo: RenderInfo | null = null;
  let lastDirectory: string | null | undefined;
  let stateBlock: Disposable | null = null;
  let noticeBlock: Disposable | null = null;
  let metaButton: Disposable | null = null;

  const list = mountList(listBox, {
    items: [],
    ariaLabel: "Visuals",
    onSelect: (id) => void openVisual(id),
  });
  mountButton(backSlot, { label: "Back", variant: "ghost", size: "sm", onClick: () => showList() });
  mountButton(refreshSlot, { label: "Refresh", variant: "ghost", size: "sm", onClick: () => void refresh() });

  /** Drops the empty or error block currently shown under the list. */
  function clearStateBlock(): void {
    stateBlock?.dispose();
    stateBlock = null;
  }

  /** Drops the current banner. */
  function clearNotice(): void {
    noticeBlock?.dispose();
    noticeBlock = null;
  }

  /** Shows one banner above the content, replacing any earlier one. */
  function showNotice(tone: "info" | "success" | "warning" | "error", titleText: string, body?: string): void {
    clearNotice();
    noticeBlock = mountBanner(noticeHost, { tone, title: titleText, body });
  }

  /** Empties the footer, disposing its copy button. */
  function clearMeta(): void {
    metaButton?.dispose();
    metaButton = null;
    metaHost.replaceChildren();
  }

  /** Switches the panel between the list and the open visual. */
  function paintState(): void {
    const visual = state === "visual";
    backSlot.hidden = !visual;
    listHost.hidden = visual;
    viewHost.hidden = !visual;
    metaHost.hidden = !visual;
  }

  /** Draws the list rows or the empty/error block for the current state. */
  function paintList(): void {
    clearStateBlock();
    if (listState === "ready" && entries.length > 0) {
      listBox.hidden = false;
      list.update({
        items: entries.map((entry) => ({
          id: entry.path,
          title: entry.slug,
          meta: entry.mtime ? dateLabel(entry.mtime) : "",
        })),
      });
      return;
    }
    listBox.hidden = true;
    if (listState === "no-project") {
      stateBlock = mountEmpty(listStateHost, {
        title: "No project open",
        body: "Open a project to see its visuals.",
      });
    } else if (listState === "no-visuals") {
      stateBlock = mountEmpty(listStateHost, {
        title: "No visuals yet",
        body: "Ask the agent for a chart, diagram, or any visual; it writes one into .visuals/.",
      });
    } else if (listState === "not-granted") {
      stateBlock = mountBanner(listStateHost, {
        tone: "error",
        title: "File access not granted",
        body: "Approve the files capability in Settings → Extensions.",
      });
    } else if (listState === "disabled") {
      stateBlock = mountBanner(listStateHost, {
        tone: "warning",
        title: "Paused",
        body: "This extension is paused in Settings → Extensions.",
      });
    } else if (listState === "error") {
      stateBlock = mountBanner(listStateHost, { tone: "error", title: "Could not read .visuals", body: listError });
    }
  }

  /** Reads .visuals and repaints the list; never throws. */
  async function refreshList(): Promise<void> {
    try {
      const { entries: directory } = await host.listDir(".visuals");
      const files = directory.filter((entry) => entry.kind === "file" && entry.name.endsWith(FRAGMENT_SUFFIX));
      const stats = await Promise.all(
        files.map(async (file): Promise<Entry> => {
          const path = `.visuals/${file.name}`;
          const slug = file.name.slice(0, -FRAGMENT_SUFFIX.length);
          try {
            const stat = await host.stat(path);
            return { path, slug, mtime: stat.kind === "file" ? stat.mtime : 0 };
          } catch {
            return { path, slug, mtime: 0 };
          }
        }),
      );
      entries = stats.sort((a, b) => b.mtime - a.mtime);
      listState = entries.length > 0 ? "ready" : "no-visuals";
    } catch (error) {
      entries = [];
      if (error instanceof HostRequestError && (error.code === "NOT_FOUND" || error.code === "BAD_PATH")) {
        listState = "no-visuals";
      } else if (error instanceof HostRequestError && error.code === "NO_DIRECTORY") {
        listState = "no-project";
      } else if (error instanceof HostRequestError && error.code === "NOT_GRANTED") {
        listState = "not-granted";
      } else if (error instanceof HostRequestError && error.code === "DISABLED") {
        listState = "disabled";
      } else {
        listState = "error";
        listError = error instanceof HostRequestError ? `${error.code}: ${error.message}` : messageOf(error);
      }
    }
    paintList();
  }

  /** Goes back to the list and refreshes it. */
  function showList(): void {
    state = "list";
    openPath = null;
    openInfo = null;
    clearNotice();
    clearMeta();
    renderer.clear();
    paintState();
    void refreshList();
  }

  /** Draws the footer: size, libraries, download path, and Copy path. */
  async function paintMeta(): Promise<void> {
    clearMeta();
    if (!openInfo || !openPath) return;
    const line = el("div", "meta-line");
    const size = el("span", "meta-item");
    size.textContent = `${formatBytes(openInfo.bytes)} · ${libsLabel(openInfo.libs)}`;
    line.append(size);
    const download = openPath.replace(/\.visual\.html$/, ".html");
    const downloadLabel = el("span", "meta-item meta-download");
    let exists = false;
    try {
      exists = (await host.stat(download)).kind === "file";
    } catch {
      exists = false;
    }
    downloadLabel.textContent = exists ? download : `${download} (not built yet)`;
    line.append(downloadLabel);
    const copySlot = el("div", "slot");
    line.append(copySlot);
    metaHost.append(line);
    metaButton = mountButton(copySlot, {
      label: "Copy path",
      variant: "outline",
      size: "xs",
      onClick: () => {
        void host
          .writeClipboard(download)
          .then(() => host.toast({ kind: "info", message: "Download path copied" }))
          .catch(() => host.toast({ kind: "error", message: "Could not copy the path" }));
      },
    });
  }

  /** Reads one fragment and renders it, showing a banner on any failure. */
  async function openVisual(path: string): Promise<void> {
    state = "visual";
    openPath = path;
    openInfo = null;
    clearNotice();
    clearMeta();
    renderer.clear();
    paintState();
    try {
      const { content } = await host.readFile(path);
      const info = await renderer.render(content);
      if (!info) return;
      openInfo = info;
      try {
        openMtime = (await host.stat(path)).mtime;
      } catch {
        openMtime = 0;
      }
      if (info.versionWarning) {
        showNotice(
          "warning",
          "Newer visual format",
          "This visual was written for a newer stylesheet version than this extension ships; it renders as best it can.",
        );
      }
      await paintMeta();
    } catch (error) {
      renderer.clear();
      if (error instanceof RenderError) {
        const titles: Record<string, string> = {
          "too-large": "Visual too large",
          assets: "Could not load visual assets",
          build: "Could not build this visual",
        };
        showNotice("error", titles[error.code] ?? "Could not render this visual", error.message);
      } else {
        const { title: heading, body } = explain(error);
        showNotice("error", heading, body);
      }
    }
  }

  /** Re-reads the open fragment when it changed on disk (or when forced). */
  async function reopenIfChanged(force: boolean): Promise<void> {
    if (!openPath) return;
    if (!force) {
      try {
        const stat = await host.stat(openPath);
        if (stat.kind !== "file" || stat.mtime === openMtime) return;
      } catch {
        return;
      }
    }
    await openVisual(openPath);
  }

  /** The Refresh button: reload the open visual, or re-list. */
  async function refresh(): Promise<void> {
    if (state === "visual" && openPath) await reopenIfChanged(true);
    else await refreshList();
  }

  host.onSessionLifecycle(({ phase }) => {
    if (phase !== "completed") return;
    if (state === "visual") void reopenIfChanged(false);
    else void refreshList();
  });

  host.onDirectory((directory) => {
    const changed = lastDirectory !== undefined && directory !== lastDirectory;
    lastDirectory = directory;
    if (!changed) return;
    if (state === "visual") showList();
    else void refreshList();
  });

  host.onItem((item) => {
    if (!item || item.kind !== "message") return;
    const path = visualPathFromMessage(item.text);
    if (!path) {
      showNotice("info", "No visual in that message", "The message does not name a .visuals/... file.");
      return;
    }
    void openVisual(path);
  });

  void ensureSkill(host).then((result) => {
    if (result === "installed") void host.toast({ kind: "success", message: "SmolUI skill installed for OpenCode." });
    else if (result === "updated") void host.toast({ kind: "success", message: "SmolUI skill updated for OpenCode." });
    else if (result === "unavailable") {
      void host.toast({ kind: "error", message: "Skill not installed: approve the local service in Settings → Extensions." });
    }
  });

  paintState();
  void refreshList();

  return {
    setTheme(mode) {
      renderer.setTheme(mode);
    },
  };
}
