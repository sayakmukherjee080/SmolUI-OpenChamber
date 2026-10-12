# Images and media (no network)

The frame cannot load anything: `img-src data: blob:`. Every picture travels inside the fragment, or is drawn.

## Small photos (a data URI)

1. Fetch a **thumbnail-sized** file with the shell — a Wikimedia `.../thumb/.../320px-....jpg` is usually 20-80 KB. Never fetch a full-size original.
2. `base64 -w0 photo.jpg`, then embed:
   ```html
   <img src="data:image/jpeg;base64,..." alt="Golden Gate Bridge at dusk" style="width:100%;height:auto">
   ```
3. Budget: the whole fragment is 200 KB. One or two small photos, never more. A photo is decoration — if it pushes the data out, drop the photo.
4. `alt` states what the photo shows. The caption keeps the source and the licence line: Wikimedia images carry an author and a licence — name them.

## Draw instead

Diagrams, maps, icons and charts made of SVG cost bytes, not kilobytes, and they re-theme with the page. When the photo is not the point, draw.

## In the chat reply (the gallery)

OpenChamber collects images an assistant **references** in its reply into a gallery under the message (PNG, JPEG, GIF, WebP, up to 10 MiB, from the project or OpenCode's temp directory). So a picture that belongs beside the answer can be downloaded into the project and referenced in the reply: the fragment stays light and the reader still sees it. The markdown line itself renders as an icon and the file name, so keep the sentence useful without the image.

## Never

- No remote `src`, no `@import`, no web fonts, no video or audio files, no `<iframe>`.
- No CSS `background-image` with a URL; a data URI is the only image the frame can paint.
