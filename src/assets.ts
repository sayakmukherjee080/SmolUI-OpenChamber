// Loads the skill's assets for the renderer. Two transports:
//   1. fetch from the extension's own package path, with the frame's URL
//      token appended — fast, but that token lives only about a minute;
//   2. the extension's local service, which reads the package in chunks and
//      needs no token at all — the fallback that keeps a long-open panel
//      working after the token expires.
// Fonts travel as a base64 payload because the host's asset route does not
// serve .woff2. The io object feeds assemble-core unchanged.

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

type Host = {
  serviceRequest: (request: {
    method: "GET";
    path: string;
    query?: Record<string, string>;
  }) => Promise<{ status: number; body: string }>;
};

const ASSET_ROOT = "skill/visuals/assets/";
const FONTS_PAYLOAD = "fonts.gen.json";
const SERVICE_PATH = "/assets";
const SERVICE_CHUNK = 150_000;
const FETCH_ATTEMPTS = 2;

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

/** Turns one base64 chunk into bytes. */
function decodeBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Joins chunks into one text; the bytes are exactly what the file holds. */
function decodeChunks(chunks: Uint8Array[]): string {
  let size = 0;
  for (const chunk of chunks) size += chunk.length;
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(joined);
}

async function fetchText(relative: string): Promise<string> {
  const response = await fetch(assetUrl(relative));
  if (!response.ok) throw new Error(`${relative} answered ${response.status}`);
  return response.text();
}

/** Builds the asset store the renderer preloads from and reads through. */
export function createAssets(host: Host): Assets {
  const textCache = new Map<string, string>();
  let fonts: Map<string, Uint8Array> | null = null;
  let serviceUsable = true;

  /** Reads one asset through the local service, in chunks of base64 bytes. */
  async function readViaService(relative: string): Promise<string> {
    const chunks: Uint8Array[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    while (offset < total) {
      const response = await host.serviceRequest({
        method: "GET",
        path: SERVICE_PATH,
        query: { path: `${ASSET_ROOT}${relative}`, offset: String(offset), length: String(SERVICE_CHUNK) },
      });
      if (response.status !== 200) throw new Error(`${relative}: service answered ${response.status}`);
      const payload = JSON.parse(response.body) as { data?: unknown; offset?: unknown; length?: unknown; total?: unknown };
      if (typeof payload.data !== "string" || typeof payload.length !== "number" || typeof payload.total !== "number") {
        throw new Error(`${relative}: service answered an unexpected shape`);
      }
      chunks.push(decodeBase64(payload.data));
      total = payload.total;
      if (payload.length <= 0) break;
      offset += payload.length;
    }
    return decodeChunks(chunks);
  }

  /** Fetches one asset, retrying once, then falling back to the service. */
  async function loadText(relative: string): Promise<string> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
      try {
        return await fetchText(relative);
      } catch (error) {
        lastError = error;
        if (attempt + 1 < FETCH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    if (serviceUsable) {
      try {
        return await readViaService(relative);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/NO_SERVICE|not granted|not running|failed/i.test(message)) serviceUsable = false;
        lastError = error;
      }
    }
    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`${relative} could not be loaded (${detail})`);
  }

  /** Fetches one text asset once and keeps it for later renders. */
  async function ensureText(path: string): Promise<string> {
    const cached = textCache.get(path);
    if (cached !== undefined) return cached;
    const text = await loadText(path);
    textCache.set(path, text);
    return text;
  }

  /** Fetches and decodes the whole fonts payload once per frame. */
  async function ensureFonts(): Promise<Map<string, Uint8Array>> {
    if (fonts) return fonts;
    const payload = await ensureText(FONTS_PAYLOAD);
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
