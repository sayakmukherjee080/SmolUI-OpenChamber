# Coder memory

Ad-hoc decisions for this project, in the order they were made. Append-only; a changed decision is a new entry that supersedes the old one.

[2026-10-11] [naming] Extension package and repo are `smolui-openchamber`; rail label SmolUI, panel id `smolui`.
[2026-10-11] [architecture] Repo root is the installable extension package. The uploaded kit lives at `v1-reference-kit/` as the source of truth; the build syncs the complete skill into `skill/visuals/`, which both the panel fetch and the service install use.
[2026-10-11] [architecture] Render mode is lean + fetch: the bundle stays ~250 KB and vendor libraries and fonts are fetched from the package path at render time, with `oc_url_token` appended when present. No megabyte embedding in the bundle.
[2026-10-11] [architecture] The agent skill is installed by a local service (`contributes.service`) into `~/.config/opencode/skills/visuals/` on first panel open, and re-synced when the extension version changes.
[2026-10-11] [architecture] Surfaces: rail panel, message action, file editor, full-screen page. Ask buttons compose into the chat box only; the extension never sends on its own.
[2026-10-11] [process] Verification split: parity test and a Playwright stub-host harness are automated in-repo; live acceptance runs in the installed app by the user.
