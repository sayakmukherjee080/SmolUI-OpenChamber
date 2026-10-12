// Entry point. One page serves the rail panel, the full-screen page, and the
// file editor; the host's first snapshot says which one this frame is.

import { connectHost } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";
import { createAssets } from "./assets";
import { mountFileSurface } from "./file-surface";
import { mountPanelSurface, type Surface } from "./panel";

const root = document.querySelector<HTMLElement>("#root");
if (!root) throw new Error("panel root element is missing");

if (window.parent === window) {
  root.className = "standalone-note";
  root.textContent = "SmolUI runs inside OpenChamber. Open it from the rail or the Extensions menu.";
} else {
  const host = connectHost();
  const assets = createAssets(host);
  let surface: Surface | null = null;

  host.onReady((ctx) => {
    try {
      applyHostReady(ctx, document.documentElement);
    } catch {
      // The panel still mounts; the kit styles may not apply.
    }
    document.body.dataset.surface = ctx.surface;
    if (surface) {
      surface.setTheme(ctx.theme.mode);
      return;
    }
    try {
      surface = ctx.surface === "file" ? mountFileSurface({ host, assets, root }) : mountPanelSurface({ host, assets, root });
      surface.setTheme(ctx.theme.mode);
    } catch (error) {
      root.textContent = `SmolUI failed to start: ${error instanceof Error ? error.message : String(error)}`;
    }
  });
}
