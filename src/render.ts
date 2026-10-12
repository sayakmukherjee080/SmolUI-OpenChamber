// Builds the standalone page for a fragment and shows it in a nested
// sandboxed frame. One frame at a time; a re-render replaces it and keeps
// the scroll position. The frame is untrusted: only its height and its ask
// text cross back, and only from the frame this renderer mounted.

import { buildStandalone, parseManifest } from "../skill/visuals/scripts/assemble-core.mjs";
import { compareVersions } from "./format.mjs";
import type { Assets } from "./assets";

type Host = {
  compose: (request: { text: string; mode?: "append" | "replace" }) => Promise<void>;
  toast: (request: { kind: "info" | "success" | "error"; message: string }) => Promise<void>;
};

export type RenderInfo = {
  bytes: number;
  libs: string[];
  title: string;
  versionWarning: boolean;
};

export type RenderErrorCode = "too-large" | "assets" | "build";

export class RenderError extends Error {
  readonly code: RenderErrorCode;

  constructor(code: RenderErrorCode, message: string) {
    super(message);
    this.name = "RenderError";
    this.code = code;
  }
}

const MAX_FRAGMENT_CHARS = 200_000;
const COMPOSE_MAX_CHARS = 16_000;
const HEIGHT_MIN = 120;
const HEIGHT_MAX = 4000;

export type Renderer = {
  /** Renders the fragment; null when a newer render superseded this one. */
  render: (fragment: string) => Promise<RenderInfo | null>;
  setTheme: (mode: "light" | "dark") => void;
  clear: () => void;
  dispose: () => void;
};

export function createRenderer(options: { container: HTMLElement; host: Host; assets: Assets }): Renderer {
  const { container, host, assets } = options;
  let frame: HTMLIFrameElement | null = null;
  let mode: "light" | "dark" = "dark";
  let generation = 0;

  /** Removes the current frame. */
  function release(): void {
    if (frame) {
      frame.remove();
      frame = null;
    }
  }

  /** Sends the current mode into the frame so a live switch needs no rebuild. */
  function postTheme(): void {
    frame?.contentWindow?.postMessage({ type: "visuals:theme", value: mode }, "*");
  }

  /** Handles the two messages a mounted frame may send: height and ask. */
  function onMessage(event: MessageEvent): void {
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data as { type?: unknown; value?: unknown; text?: unknown } | null;
    if (!data || typeof data !== "object") return;
    if (data.type === "visuals:height") {
      const height = Math.round(Number(data.value));
      if (Number.isFinite(height) && frame) {
        frame.style.height = `${Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, height))}px`;
      }
      return;
    }
    if (data.type === "visuals:ask") {
      const text = String(data.text ?? "").trim().slice(0, COMPOSE_MAX_CHARS);
      if (!text) return;
      void host
        .compose({ text, mode: "append" })
        .then(() => host.toast({ kind: "info", message: "Added to the chat box" }))
        .catch((error: unknown) => {
          const detail = error instanceof Error ? error.message : String(error);
          void host.toast({ kind: "error", message: `Could not add to the chat box: ${detail}` });
        });
    }
  }
  window.addEventListener("message", onMessage);

  /** Builds the standalone page and mounts it, replacing any previous frame. */
  async function render(fragment: string): Promise<RenderInfo | null> {
    const current = (generation += 1);
    if (fragment.length > MAX_FRAGMENT_CHARS) {
      throw new RenderError(
        "too-large",
        `This fragment is ${fragment.length.toLocaleString()} characters; the limit is ${MAX_FRAGMENT_CHARS.toLocaleString()}.`,
      );
    }
    try {
      await assets.preload(fragment);
    } catch (error) {
      throw new RenderError("assets", error instanceof Error ? error.message : String(error));
    }
    if (current !== generation) return null;

    let built: { html: string; bytes: number; libs: string[]; title: string };
    try {
      built = buildStandalone(fragment, assets.io, { theme: mode });
    } catch (error) {
      throw new RenderError("build", error instanceof Error ? error.message : String(error));
    }

    const scrollTop = container.scrollTop;
    release();
    const iframe = document.createElement("iframe");
    iframe.className = "visual-frame";
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("title", built.title || "Visual");
    iframe.style.height = `${HEIGHT_MIN}px`;
    iframe.addEventListener("load", postTheme);
    // srcdoc, not a blob URL: OpenChamber's own HTML previews render this way,
    // every browser loads it from a sandboxed parent, and the standalone page
    // is self-contained, so it needs no URL of its own.
    iframe.srcdoc = built.html;
    frame = iframe;
    container.append(iframe);
    container.scrollTop = scrollTop;

    let hostVersion: string | null = null;
    try {
      hostVersion = (JSON.parse(assets.io.text("VERSIONS.json")) as { visuals?: string }).visuals ?? null;
    } catch {
      hostVersion = null;
    }
    const fragmentVersion = parseManifest(fragment).version;
    return {
      bytes: built.bytes,
      libs: built.libs,
      title: built.title,
      versionWarning: Boolean(fragmentVersion && hostVersion && compareVersions(fragmentVersion, hostVersion) > 0),
    };
  }

  return {
    render,
    setTheme(next) {
      if (next === mode) return;
      mode = next;
      postTheme();
    },
    clear: release,
    dispose() {
      window.removeEventListener("message", onMessage);
      release();
    },
  };
}
