// Loads the skill's assets from the extension's own package path. Guest
// frames may fetch their package (the host's connect-src allows it) but not
// the network; fonts are served as a base64 payload because the host's asset
// route does not serve .woff2. The io object feeds assemble-core unchanged.

import { textAssetsFor } from "./asset-paths.mjs";

export type AssetIo = {
  text: (path: string) => string;
  bytes: (path: string) => Uint8Array;
};

export type Assets = {
  /** Fetches everything a fragment may need; safe to call repeatedly. */
  preload: (fragment: string) => Promise<void>;
  io: AssetIo;
};

const ASSET_ROOT = "skill/visuals/assets/";
const FONTS_PAYLOAD = "fonts.gen.json";

/** The scoped token the host put on this frame's URL; fetches need it back. */
function urlToken(): string | null {
  try {
    return new URL(window.location.href).searchParams.get("oc_url_token");
  } catch {
    return null;
  }
}

/** A fetchable URL for one asset inside this extension's own package. */
function assetUrl(relative: string): string {
  const url = new URL(`../${ASSET_ROOT}${relative}`, document.baseURI);
  const token = urlToken();
  if (token) url.searchParams.set("oc_url_token", token);
  return url.toString();
}

/** Turns one base64 font from the payload into the bytes assemble-core wants. */
function decodeBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Fetches one text asset from the package; the caller checks the status. */
async function fetchText(path: string): Promise<string> {
  const response = await fetch(assetUrl(path));
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return response.text();
}

/** Builds the asset store the renderer preloads from and reads through. */
export function createAssets(): Assets {
  const textCache = new Map<string, string>();
  let fonts: Map<string, Uint8Array> | null = null;

  /** Fetches one text asset once and keeps it for later renders. */
  async function ensureText(path: string): Promise<string> {
    const cached = textCache.get(path);
    if (cached !== undefined) return cached;
    const text = await fetchText(path);
    textCache.set(path, text);
    return text;
  }

  /** Fetches and decodes the whole fonts payload once per frame. */
  async function ensureFonts(): Promise<Map<string, Uint8Array>> {
    if (fonts) return fonts;
    const payload = await fetchText(FONTS_PAYLOAD);
    const decoded = new Map<string, Uint8Array>();
    for (const [name, base64] of Object.entries(JSON.parse(payload) as Record<string, string>)) {
      decoded.set(name, decodeBase64(base64));
    }
    fonts = decoded;
    return decoded;
  }

  return {
    async preload(fragment) {
      const wanted = textAssetsFor(fragment);
      await Promise.all(wanted.map(ensureText));
      await ensureFonts();
    },
    io: {
      text(path) {
        const value = textCache.get(path);
        if (value === undefined) throw new Error(`asset not preloaded: ${path}`);
        return value;
      },
      bytes(path) {
        const value = fonts?.get(path);
        if (!value) throw new Error(`font not found: ${path}`);
        return value;
      },
    },
  };
}
