// Small display helpers shared by the panel chrome and its tests.

/**
 * A short human size label ("180 KB", "0.4 MB") for a byte count.
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A label for the libraries a fragment declared ("chart, katex").
 */
export function libsLabel(libs) {
  return libs && libs.length > 0 ? libs.join(", ") : "no libraries";
}

/**
 * Compares two dotted version strings ("1.2" against "1.2.0"); returns 1, 0,
 * or -1. A missing version counts as older than any real one.
 */
export function compareVersions(left, right) {
  if (!left || !right) return left === right ? 0 : left ? 1 : -1;
  const a = String(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const b = String(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * A short local date-time label for a file mtime.
 */
export function dateLabel(mtime) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(mtime));
}

/**
 * A short stable hash of a text, used as the file editor's version token.
 */
export function hashText(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(16);
}
