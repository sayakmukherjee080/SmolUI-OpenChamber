// The file editor surface: opening a .visual.html in Files renders it here.
// Read-only — the host owns the file; this surface never reports changes.

import type { HostClient } from "@openchamber/sdk";
import { mountBanner } from "@openchamber/sdk/ui";
import type { Assets } from "./assets";
import { createRenderer, RenderError } from "./render";
import { formatBytes, hashText, libsLabel } from "./format.mjs";
import type { Surface } from "./panel";

type Disposable = { dispose: () => void };

export function mountFileSurface(deps: { host: HostClient; assets: Assets; root: HTMLElement }): Surface {
  const { host, assets, root } = deps;

  const app = document.createElement("div");
  app.className = "app file-surface";
  const noticeHost = document.createElement("div");
  noticeHost.className = "notice";
  const viewHost = document.createElement("div");
  viewHost.className = "view-host";
  const metaHost = document.createElement("div");
  metaHost.className = "meta-host";
  app.append(noticeHost, viewHost, metaHost);
  root.append(app);

  const renderer = createRenderer({ container: viewHost, host, assets });
  let fragment: string | null = null;
  let version = "";
  let notice: Disposable | null = null;

  /** Shows one banner above the visual, replacing any earlier one. */
  function show(tone: "info" | "warning" | "error", title: string, body?: string): void {
    notice?.dispose();
    notice = mountBanner(noticeHost, { tone, title, body });
  }

  /** Renders one fragment and draws its size line; banners on failure. */
  async function render(content: string): Promise<void> {
    notice?.dispose();
    notice = null;
    metaHost.replaceChildren();
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
        show("error", error.code === "too-large" ? "Visual too large" : "Could not render this visual", error.message);
      } else {
        show("error", "Could not render this visual", error instanceof Error ? error.message : String(error));
      }
    }
  }

  host.onFileOpen((file) => {
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
