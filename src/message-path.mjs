// Finds the visual a chat message refers to. The skill's reply names the
// fragment it wrote, so the message action reads the path from the text.

const REFERENCE = /\.visuals\/([A-Za-z0-9][A-Za-z0-9._-]{0,63})\.visual\.html(?![\w.-])/g;

/**
 * The project-relative path of the last `.visuals/<slug>.visual.html`
 * reference in `text`, or null when the message names none.
 */
export function visualPathFromMessage(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  let last = null;
  REFERENCE.lastIndex = 0;
  for (let match = REFERENCE.exec(text); match; match = REFERENCE.exec(text)) {
    last = match[1];
  }
  return last ? `.visuals/${last}.visual.html` : null;
}
