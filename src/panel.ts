// The rail panel and the full-screen page: a list of the project's visuals,
// the renderer, and the footer that names the standalone download. The list
// and the open visual follow the disk on their own — a light poll while the
// panel is visible, plus an immediate check when the session goes idle.

import { HostRequestError, type HostClient } from "@openchamber/sdk";
import { mountBanner, mountButton, mountEmpty, mountList, mountSpinner } from "@openchamber/sdk/ui";
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

/** What changed in the list since the last look, for the auto-open rule. */
type ListChange = { newest: Entry | null; isNew: boolean; changed: boolean };

type ListState = "loading" | "ready" | "no-project" | "no-visuals" | "not-granted" | "disabled" | "error";

const FRAGMENT_SUFFIX = ".visual.html";
const OPEN_REQUEST_KEY = "open-request";
const OPEN_REQUEST_TTL_MS = 60_000;
const SKILL_NOTICE_KEY = "skill-notice";
const SKILL_NOTICE_TTL_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 2500;
const POLL_MS_BUSY = 1000;
/** A visual this fresh opens by itself when the panel first loads mid-turn. */
const AUTO_OPEN_FRESH_MS = 2 * 60 * 1000;

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
  const barStatus = el("span", "bar-status");
  const barActions = el("div", "bar-actions");
  const backSlot = el("div", "slot");
  barActions.append(backSlot);
  bar.append(title, barStatus, barActions);

  const noticeHost = el("div", "notice");
  const listHost = el("div", "list-host");
  const listBox = el("div");
  const listLoadingHost = el("div", "loading-host");
  const listStateHost = el("div");
  listHost.append(listBox, listLoadingHost, listStateHost);
  const viewHost = el("div", "view-host");
  viewHost.hidden = true;
  const loadingHost = el("div", "loading-host");
  viewHost.append(loadingHost);
  const metaHost = el("div", "meta-host");
  metaHost.hidden = true;

  app.append(bar, noticeHost, listHost, viewHost, metaHost);
  root.append(app);

  const renderer = createRenderer({ container: viewHost, host, assets });

  let entries: Entry[] = [];
  let listState: ListState = "loading";
  let listError = "";
  let paintedSignature: string | null = null;
  let state: "list" | "visual" = "list";
  let openPath: string | null = null;
  let openMtime = 0;
  let openInfo: RenderInfo | null = null;
  let lastDirectory: string | null | undefined;
  let pollTimer: number | null = null;
  let lastPollAt = 0;
  let ticking = false;
  let listGeneration = 0;
  let busy = false;
  let knownPaths = new Set<string>();
  let newestSeen: { path: string; mtime: number } | null = null;
  let stateBlock: Disposable | null = null;
  let noticeBlock: Disposable | null = null;
  let metaButton: Disposable | null = null;
  let loadingBlock: Disposable | null = null;

  const list = mountList(listBox, {
    items: [],
    ariaLabel: "Visuals",
    onSelect: (id) => void openVisual(id),
  });
  mountButton(backSlot, { label: "Back", variant: "ghost", size: "sm", onClick: () => showList() });

  /** Shows a toast without ever leaking a rejection. */
  function toast(kind: "info" | "success" | "error", message: string): void {
    void host.toast({ kind, message }).catch(() => {});
  }

  /** Drops the empty, loading, or error block currently shown under the list. */
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

  /** Shows the loading ring over the visual area until the frame is up. */
  function showLoading(label: string): void {
    loadingBlock?.dispose();
    loadingBlock = mountSpinner(loadingHost, { label });
  }

  /** Removes the loading ring. */
  function clearLoading(): void {
    loadingBlock?.dispose();
    loadingBlock = null;
  }

  /** Switches the panel between the list and the open visual. */
  function paintState(): void {
    const visual = state === "visual";
    backSlot.hidden = !visual;
    listHost.hidden = visual;
    viewHost.hidden = !visual;
    metaHost.hidden = !visual;
  }

  /** Draws the list rows or the loading/empty/error block for the current state. */
  function paintList(): void {
    const signature = entries.map((entry) => `${entry.path}:${entry.mtime}`).join("|");
    if (listState === "ready" && entries.length > 0 && signature === paintedSignature) return;
    paintedSignature = signature;
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
    if (listState === "loading") {
      stateBlock = mountSpinner(listLoadingHost, { label: "Loading visuals" });
    } else if (listState === "no-project") {
      stateBlock = mountEmpty(listStateHost, {
        title: "No project open",
        body: "Open a project to see its visuals.",
      });
    } else if (listState === "no-visuals") {
      stateBlock = mountEmpty(listStateHost, {
        title: "No visuals yet",
        body: "Ask the agent in chat: the chart, map or plan lands here.",
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

  /** Reads .visuals and repaints the list; never throws. Returns what changed. */
  async function refreshList(quiet: boolean): Promise<ListChange | null> {
    const generation = (listGeneration += 1);
    if (!quiet && entries.length === 0) {
      listState = "loading";
      paintedSignature = null;
      paintList();
    }
    let nextEntries: Entry[] = [];
    let nextState: ListState;
    let nextError = "";
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
      nextEntries = stats.sort((a, b) => b.mtime - a.mtime);
      nextState = nextEntries.length > 0 ? "ready" : "no-visuals";
    } catch (error) {
      if (error instanceof HostRequestError && (error.code === "NOT_FOUND" || error.code === "BAD_PATH")) {
        nextState = "no-visuals";
      } else if (error instanceof HostRequestError && error.code === "NO_DIRECTORY") {
        nextState = "no-project";
      } else if (error instanceof HostRequestError && error.code === "NOT_GRANTED") {
        nextState = "not-granted";
      } else if (error instanceof HostRequestError && error.code === "DISABLED") {
        nextState = "disabled";
      } else {
        nextState = "error";
        nextError = error instanceof HostRequestError ? `${error.code}: ${error.message}` : messageOf(error);
      }
    }
    if (generation !== listGeneration) return null;
    const newest = nextEntries[0] ?? null;
    const change: ListChange = {
      newest,
      isNew: newest ? !knownPaths.has(newest.path) : false,
      changed: newest && newestSeen ? newestSeen.path === newest.path && newestSeen.mtime !== newest.mtime : false,
    };
    knownPaths = new Set(nextEntries.map((entry) => entry.path));
    newestSeen = newest ? { path: newest.path, mtime: newest.mtime } : null;
    entries = nextEntries;
    listState = nextState;
    listError = nextError;
    paintList();
    return change;
  }

  /** Opens the newest visual by itself when the agent just wrote it. */
  function considerAutoOpen(change: ListChange, firstLoad: boolean): void {
    if (state !== "list" || !change.newest) return;
    const fresh = Date.now() - change.newest.mtime < AUTO_OPEN_FRESH_MS;
    const shouldOpen = firstLoad ? fresh : change.isNew || (busy && change.changed);
    if (shouldOpen) void openVisual(change.newest.path);
  }

  /** Opens the visual the file editor asked for, when one is waiting. */
  async function consumeOpenRequest(): Promise<void> {
    try {
      const raw = await host.storage.get(OPEN_REQUEST_KEY);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const name = (raw as { name?: unknown }).name;
      if (typeof name !== "string") return;
      await host.storage.delete(OPEN_REQUEST_KEY);
      const at = (raw as { at?: unknown }).at;
      if (typeof at === "number" && Date.now() - at > OPEN_REQUEST_TTL_MS) return;
      const slug = name.endsWith(FRAGMENT_SUFFIX) ? name.slice(0, -FRAGMENT_SUFFIX.length) : name;
      const entry = entries.find((candidate) => candidate.slug === slug);
      if (entry) void openVisual(entry.path);
    } catch {
      // Storage is optional; a missing request is the normal case.
    }
  }

  /** Goes back to the list and refreshes it. */
  function showList(): void {
    state = "list";
    openPath = null;
    openInfo = null;
    clearNotice();
    clearMeta();
    clearLoading();
    renderer.clear();
    paintState();
    void refreshList(false);
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
          .then(() => toast("info", "Download path copied"))
          .catch(() => toast("error", "Could not copy the path"));
      },
    });
  }

  /** Reads one fragment and renders it, showing a banner on any failure. */
  async function openVisual(path: string): Promise<void> {
    const switching = openPath !== path;
    state = "visual";
    openPath = path;
    openInfo = null;
    clearNotice();
    clearMeta();
    if (switching) renderer.clear();
    paintState();
    showLoading("Loading visual");
    try {
      const { content } = await host.readFile(path);
      if (openPath !== path) return;
      const info = await renderer.render(content);
      if (openPath !== path || state !== "visual") {
        renderer.clear();
        return;
      }
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
      if (openPath !== path || state !== "visual") return;
      renderer.clear();
      if (error instanceof RenderError) {
        const titles: Record<string, string> = {
          "too-large": "Visual too large",
          assets: "Could not load visual assets",
          build: "Could not build this visual",
        };
        clearNotice();
        noticeBlock = mountBanner(noticeHost, {
          tone: "error",
          title: titles[error.code] ?? "Could not render this visual",
          body: error.message,
          action: { label: "Retry", onClick: () => void openVisual(path) },
        });
      } else {
        const { title: heading, body } = explain(error);
        const permanent =
          error instanceof HostRequestError &&
          ["NOT_FOUND", "NOT_GRANTED", "DISABLED", "NO_DIRECTORY", "FILE_TOO_LARGE"].includes(error.code);
        if (permanent) {
          showNotice("error", heading, body);
        } else {
          clearNotice();
          noticeBlock = mountBanner(noticeHost, {
            tone: "error",
            title: heading,
            body,
            action: { label: "Retry", onClick: () => void openVisual(path) },
          });
        }
      }
    } finally {
      clearLoading();
    }
  }

  /** Re-reads the open fragment when its mtime moved. */
  async function reopenIfChanged(): Promise<void> {
    if (!openPath) return;
    try {
      const stat = await host.stat(openPath);
      if (stat.kind !== "file" || stat.mtime === openMtime) return;
    } catch {
      return;
    }
    await openVisual(openPath);
  }

  /** One live check: follow the newest visual, or re-read the open one in place. */
  async function tick(): Promise<void> {
    if (ticking || document.visibilityState !== "visible") return;
    ticking = true;
    try {
      const change = await refreshList(true);
      if (state === "visual" && openPath) {
        const newest = change?.newest ?? null;
        // The agent writes its next visual under a new slug: follow that file while it
        // works, or as soon as it appears. A reader parked on an older file keeps it
        // until then, and an edit to the open file still lands in place.
        if (newest && newest.path !== openPath && (busy || change?.isNew) && newest.mtime >= openMtime) {
          await openVisual(newest.path);
          return;
        }
        await reopenIfChanged();
        return;
      }
      if (change) considerAutoOpen(change, false);
      await consumeOpenRequest();
    } finally {
      ticking = false;
    }
  }

  /** Polls while visible; faster while the session works so edits stream in. */
  function startPolling(): void {
    if (pollTimer !== null) return;
    pollTimer = window.setInterval(() => {
      const now = Date.now();
      if (!busy && now - lastPollAt < POLL_MS) return;
      lastPollAt = now;
      void tick();
    }, POLL_MS_BUSY);
  }

  host.onSession((session) => {
    const next = Boolean(session?.busy);
    if (next === busy) return;
    busy = next;
    barStatus.textContent = busy ? "The agent is writing…" : "";
  });

  host.onSessionLifecycle(({ phase }) => {
    if (phase !== "completed") return;
    void tick();
  });

  host.onDirectory((directory) => {
    const changed = lastDirectory !== undefined && directory !== lastDirectory;
    lastDirectory = directory;
    if (!changed) return;
    if (state === "visual") showList();
    else void refreshList(true);
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

  void ensureSkill(host).then(async (result) => {
    if (result === "installed") toast("success", "SmolUI skill and tool installed for OpenCode. Restart OpenCode once to load the tool.");
    else if (result === "updated") toast("success", "SmolUI skill and tool updated. Restart OpenCode once to load the tool.");
    else if (result === "unavailable") {
      try {
        const raw = await host.storage.get(SKILL_NOTICE_KEY);
        const at = raw && typeof raw === "object" && !Array.isArray(raw) ? Number((raw as { at?: unknown }).at) : 0;
        if (Number.isFinite(at) && Date.now() - at < SKILL_NOTICE_TTL_MS) return;
        await host.storage.set(SKILL_NOTICE_KEY, { at: Date.now() });
      } catch {
        // Storage is optional.
      }
      toast("error", "Skill not installed: approve the local service in Settings → Extensions.");
    }
  });

  paintState();
  void (async () => {
    const change = await refreshList(false);
    if (change) considerAutoOpen(change, true);
    await consumeOpenRequest();
    startPolling();
  })();

  return {
    setTheme(mode) {
      renderer.setTheme(mode);
    },
  };
}
