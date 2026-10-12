// The file editor surface: opening a .visual.html in Files renders it here.
// Read-only — the host owns the file; this surface never reports changes.
// "Open in panel" hands the file name to the rail panel through storage.

import type { HostClient } from "@openchamber/sdk";
import { mountBanner, mountButton, mountSpinner } from "@openchamber/sdk/ui";
import type { Assets } from "./assets";
import { createRenderer, RenderError } from "./render";
import { formatBytes, hashText, libsLabel } from "./format.mjs";
import type { Surface } from "./panel";

type Disposable = { dispose: () => void };

const OPEN_REQUEST_KEY = "open-request";

export function mountFileSurface(deps: { host: HostClient; assets: Assets; root: HTMLElement }): Surface {
  const { host, assets, root } = deps;

  const app = document.createElement("div");
  app.className = "app file-surface";
  const bar = document.createElement("div");
  bar.className = "file-bar";
  const name = document.createElement("span");
  name.className = "file-name";
  const openSlot = document.createElement("div");
  openSlot.className = "slot";
  bar.append(name, openSlot);
  const noticeHost = document.createElement("div");
  noticeHost.className = "notice";
  const viewHost = document.createElement("div");
  viewHost.className = "view-host";
  const loadingHost = document.createElement("div");
  loadingHost.className = "loading-host";
  viewHost.append(loadingHost);
  const metaHost = document.createElement("div");
  metaHost.className = "meta-host";
  app.append(bar, noticeHost, viewHost, metaHost);
  root.append(app);

  const renderer = createRenderer({ container: viewHost, host, assets });
  let fragment: string | null = null;
  let version = "";
  let fileName = "";
  let notice: Disposable | null = null;
  let loading: Disposable | null = null;

  mountButton(openSlot, {
    label: "Open in panel",
    variant: "outline",
    size: "xs",
    onClick: () => {
      void (async () => {
        try {
          await host.storage.set(OPEN_REQUEST_KEY, { name: fileName, at: Date.now() });
        } catch {
          // The panel falls back to its list when no request is waiting.
        }
        try {
          await host.openSurface("plugin:smolui");
        } catch {
          toast("error", "Could not open the SmolUI panel");
        }
      })();
    },
  });

  /** Shows a toast without ever leaking a rejection. */
  function toast(kind: "info" | "success" | "error", message: string): void {
    void host.toast({ kind, message }).catch(() => {});
  }

  /** Shows one banner above the visual, replacing any earlier one. */
  function show(tone: "info" | "warning" | "error", title: string, body?: string, action?: { label: string; onClick: () => void }): void {
    notice?.dispose();
    notice = mountBanner(noticeHost, { tone, title, body, action });
  }

  /** Shows the loading ring until the frame is up. */
  function showLoading(): void {
    loading?.dispose();
    loading = mountSpinner(loadingHost, { label: "Loading visual" });
  }

  /** Renders one fragment and draws its size line; banners on failure. */
  async function render(content: string): Promise<void> {
    notice?.dispose();
    notice = null;
    metaHost.replaceChildren();
    showLoading();
    try {
      const info = await renderer.render(content);
      if (!info) return;
      const line = document.createElement("div");
      line.className = "meta-line";
      line.textContent = `${formatBytes(info.bytes)} · ${libsLabel(info.libs)}`;
      metaHost.append(line);
      if (info.versionWarning) {
        show(
          "warning",
          "Newer visual format",
          "This visual was written for a newer stylesheet version than this extension ships; it renders as best it can.",
        );
      }
    } catch (error) {
      renderer.clear();
      if (error instanceof RenderError) {
        show(
          "error",
          error.code === "too-large" ? "Visual too large" : "Could not render this visual",
          error.message,
          { label: "Retry", onClick: () => void render(content) },
        );
      } else {
        show("error", "Could not render this visual", error instanceof Error ? error.message : String(error));
      }
    } finally {
      loading?.dispose();
      loading = null;
    }
  }

  host.onFileOpen((file) => {
    fileName = file.name;
    name.textContent = file.name;
    if (file.encoding !== "text") {
      renderer.clear();
      show("error", "Unsupported file", "This editor only opens text fragments.");
      return;
    }
    fragment = file.content;
    version = hashText(file.content);
    void render(file.content);
  });

  // The host asks for a snapshot to save or to hand the file to its source
  // view; this surface never edits, so it answers with the original text.
  host.onFileSnapshot(() => ({ content: fragment ?? "", version }));

  return {
    setTheme(mode) {
      renderer.setTheme(mode);
    },
  };
}
